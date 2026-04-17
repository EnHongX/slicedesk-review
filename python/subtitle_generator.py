from typing import List, Dict, Optional, Any
from dataclasses import dataclass
from enum import Enum
import os
import traceback
import json


class ASRModelType(Enum):
    FUNASR_PARAformer = "paraformer"
    FUNASR_Paraformer_large = "paraformer_large"


@dataclass
class SubtitleSegment:
    index: int
    start_time: float
    end_time: float
    text: str
    confidence: Optional[float] = None


@dataclass
class SubtitleResult:
    success: bool
    total_duration: float
    segment_count: int
    segments: List[SubtitleSegment]
    full_text: str
    language: str = "zh"
    error_message: Optional[str] = None
    error_details: Optional[str] = None


class SubtitleGenerator:
    def __init__(
        self,
        model_type: ASRModelType = ASRModelType.FUNASR_PARAformer,
        model_dir: Optional[str] = None,
    ):
        self.model_type = model_type
        self.model_dir = model_dir
        self._model = None
        self._vad_model = None
        self._punc_model = None
        self._initialized = False

    def _initialize_models(self) -> bool:
        if self._initialized:
            return True

        try:
            from modelscope import snapshot_download
            from funasr import AutoModel

            model_id = "iic/speech_paraformer-large_asr_nat-zh-cn-16k-common-vocab8404-pytorch"
            vad_model_id = "iic/speech_fsmn_vad_zh-cn-16k-common-pytorch"
            punc_model_id = "iic/punc_ct-transformer_zh-cn-common-vocab272727-pytorch"

            if self.model_dir:
                model_path = os.path.join(self.model_dir, "paraformer")
                vad_model_path = os.path.join(self.model_dir, "vad")
                punc_model_path = os.path.join(self.model_dir, "punc")
            else:
                model_path = snapshot_download(model_id)
                vad_model_path = snapshot_download(vad_model_id)
                punc_model_path = snapshot_download(punc_model_id)

            self._model = AutoModel(
                model=model_path,
                model_revision="v2.0.4",
            )

            self._vad_model = AutoModel(
                model=vad_model_path,
                model_revision="v2.0.4",
            )

            self._punc_model = AutoModel(
                model=punc_model_path,
                model_revision="v2.0.0",
            )

            self._initialized = True
            return True

        except ImportError as e:
            raise RuntimeError(
                f"缺少必要的依赖: {e}. "
                f"请安装: pip install funasr modelscope torch"
            )
        except Exception as e:
            raise RuntimeError(f"模型初始化失败: {e}")

    def _format_time(self, seconds: float) -> str:
        hours = int(seconds // 3600)
        minutes = int((seconds % 3600) // 60)
        secs = int(seconds % 60)
        millis = int((seconds % 1) * 1000)
        return f"{hours:02d}:{minutes:02d}:{secs:02d},{millis:03d}"

    def generate_subtitles(
        self,
        audio_path: str,
        output_format: str = "json",
        language: str = "zh",
    ) -> SubtitleResult:
        try:
            if not os.path.exists(audio_path):
                return SubtitleResult(
                    success=False,
                    total_duration=0,
                    segment_count=0,
                    segments=[],
                    full_text="",
                    language=language,
                    error_message=f"音频文件不存在: {audio_path}",
                )

            file_size = os.path.getsize(audio_path)
            if file_size == 0:
                return SubtitleResult(
                    success=False,
                    total_duration=0,
                    segment_count=0,
                    segments=[],
                    full_text="",
                    language=language,
                    error_message=f"音频文件为空: {audio_path}",
                )

            self._initialize_models()

            if self._model is None:
                return SubtitleResult(
                    success=False,
                    total_duration=0,
                    segment_count=0,
                    segments=[],
                    full_text="",
                    language=language,
                    error_message="ASR 模型未初始化",
                )

            vad_result = self._vad_model.generate(input=audio_path, batch_size=1)
            asr_result = self._model.generate(
                input=audio_path,
                batch_size=1,
                vad_model=self._vad_model,
                punc_model=self._punc_model,
            )

            segments: List[SubtitleSegment] = []
            full_text_parts: List[str] = []
            total_duration = 0.0

            if asr_result and len(asr_result) > 0:
                result_data = asr_result[0]

                if isinstance(result_data, dict):
                    text = result_data.get("text", "")
                    timestamp = result_data.get("timestamp", [])

                    if timestamp and len(timestamp) > 0:
                        for i, ts in enumerate(timestamp):
                            if len(ts) >= 2:
                                start_time = ts[0] / 1000.0
                                end_time = ts[1] / 1000.0
                                segment_text = text[i] if isinstance(text, list) and i < len(text) else text

                                if segment_text:
                                    segment = SubtitleSegment(
                                        index=len(segments),
                                        start_time=start_time,
                                        end_time=end_time,
                                        text=str(segment_text).strip(),
                                        confidence=1.0,
                                    )
                                    segments.append(segment)
                                    full_text_parts.append(segment.text)
                                    total_duration = max(total_duration, end_time)
                    else:
                        if text:
                            text_str = str(text).strip() if not isinstance(text, list) else " ".join([str(t) for t in text])
                            if text_str:
                                segment = SubtitleSegment(
                                    index=0,
                                    start_time=0.0,
                                    end_time=0.0,
                                    text=text_str,
                                    confidence=1.0,
                                )
                                segments.append(segment)
                                full_text_parts.append(text_str)

            full_text = "".join(full_text_parts)

            if not segments:
                return SubtitleResult(
                    success=False,
                    total_duration=0,
                    segment_count=0,
                    segments=[],
                    full_text="",
                    language=language,
                    error_message="未能识别出有效字幕内容",
                )

            return SubtitleResult(
                success=True,
                total_duration=total_duration,
                segment_count=len(segments),
                segments=segments,
                full_text=full_text,
                language=language,
            )

        except Exception as e:
            tb_str = traceback.format_exc()
            return SubtitleResult(
                success=False,
                total_duration=0,
                segment_count=0,
                segments=[],
                full_text="",
                language=language,
                error_message=str(e),
                error_details=tb_str,
            )

    def to_srt(self, segments: List[SubtitleSegment]) -> str:
        srt_lines: List[str] = []
        for seg in segments:
            srt_lines.append(str(seg.index + 1))
            srt_lines.append(
                f"{self._format_time(seg.start_time)} --> {self._format_time(seg.end_time)}"
            )
            srt_lines.append(seg.text)
            srt_lines.append("")
        return "\n".join(srt_lines)

    def to_json(self, result: SubtitleResult) -> str:
        json_data = {
            "success": result.success,
            "total_duration": result.total_duration,
            "segment_count": result.segment_count,
            "language": result.language,
            "full_text": result.full_text,
            "segments": [
                {
                    "index": seg.index,
                    "start_time": seg.start_time,
                    "end_time": seg.end_time,
                    "text": seg.text,
                    "confidence": seg.confidence,
                }
                for seg in result.segments
            ],
        }
        if result.error_message:
            json_data["error_message"] = result.error_message
        if result.error_details:
            json_data["error_details"] = result.error_details
        return json.dumps(json_data, ensure_ascii=False, indent=2)


if __name__ == "__main__":
    import sys

    if len(sys.argv) < 2:
        print("Usage: python subtitle_generator.py <audio_file_path> [output_file_path]")
        sys.exit(1)

    audio_path = sys.argv[1]
    output_path = sys.argv[2] if len(sys.argv) > 2 else None

    generator = SubtitleGenerator()
    result = generator.generate_subtitles(audio_path)

    if result.success:
        print(f"字幕生成成功！")
        print(f"总时长: {result.total_duration:.2f} 秒")
        print(f"片段数量: {result.segment_count}")
        print(f"\n完整文本:\n{result.full_text}")

        if output_path:
            if output_path.endswith(".srt"):
                srt_content = generator.to_srt(result.segments)
                with open(output_path, "w", encoding="utf-8") as f:
                    f.write(srt_content)
                print(f"\nSRT 文件已保存到: {output_path}")
            elif output_path.endswith(".json"):
                json_content = generator.to_json(result)
                with open(output_path, "w", encoding="utf-8") as f:
                    f.write(json_content)
                print(f"\nJSON 文件已保存到: {output_path}")
    else:
        print(f"字幕生成失败: {result.error_message}")
        if result.error_details:
            print(f"\n详细错误:\n{result.error_details}")
        sys.exit(1)
