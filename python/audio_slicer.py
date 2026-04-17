from pydub import AudioSegment
from typing import List, Dict, Optional, Tuple
import os
import math
import shutil
from dataclasses import dataclass
from enum import Enum


class AudioFormat(Enum):
    MP3 = "mp3"
    WAV = "wav"
    OGG = "ogg"
    M4A = "m4a"
    AAC = "aac"
    FLAC = "flac"


@dataclass
class SliceInfo:
    index: int
    start_time: float
    end_time: float
    duration: float
    file_path: Optional[str] = None


@dataclass
class SlicingResult:
    success: bool
    total_duration: float
    slice_count: int
    slice_duration: float
    slices: List[SliceInfo]
    error_message: Optional[str] = None


class AudioSlicer:
    SUPPORTED_FORMATS = {
        AudioFormat.MP3: ["mp3"],
        AudioFormat.WAV: ["wav"],
        AudioFormat.OGG: ["ogg"],
        AudioFormat.M4A: ["m4a"],
        AudioFormat.AAC: ["aac"],
        AudioFormat.FLAC: ["flac"],
    }

    def __init__(self, ffmpeg_path: Optional[str] = None):
        if ffmpeg_path:
            if not os.path.exists(ffmpeg_path):
                raise FileNotFoundError(f"指定的 ffmpeg 路径不存在: {ffmpeg_path}")
            AudioSegment.converter = ffmpeg_path
        else:
            self._auto_detect_ffmpeg()

    def _auto_detect_ffmpeg(self):
        common_paths = [
            "/opt/homebrew/opt/ffmpeg/bin/ffmpeg",
            "/usr/local/bin/ffmpeg",
            "/usr/bin/ffmpeg",
        ]
        
        for path in common_paths:
            if os.path.exists(path):
                try:
                    AudioSegment.converter = path
                    return
                except Exception:
                    continue
        
        system_ffmpeg = shutil.which("ffmpeg")
        if system_ffmpeg:
            AudioSegment.converter = system_ffmpeg

    def _detect_format(self, file_path: str) -> AudioFormat:
        ext = os.path.splitext(file_path)[1].lower().lstrip(".")
        for format_enum, extensions in self.SUPPORTED_FORMATS.items():
            if ext in extensions:
                return format_enum
        raise ValueError(f"不支持的音频格式: {ext}")

    def _load_audio(self, file_path: str, audio_format: AudioFormat) -> AudioSegment:
        if not os.path.exists(file_path):
            raise FileNotFoundError(f"音频文件不存在: {file_path}")

        try:
            if audio_format == AudioFormat.MP3:
                return AudioSegment.from_mp3(file_path)
            elif audio_format == AudioFormat.WAV:
                return AudioSegment.from_wav(file_path)
            elif audio_format == AudioFormat.OGG:
                return AudioSegment.from_ogg(file_path)
            elif audio_format == AudioFormat.M4A:
                return AudioSegment.from_file(file_path, format="m4a")
            elif audio_format == AudioFormat.AAC:
                return AudioSegment.from_file(file_path, format="aac")
            elif audio_format == AudioFormat.FLAC:
                return AudioSegment.from_file(file_path, format="flac")
            else:
                return AudioSegment.from_file(file_path)
        except Exception as e:
            raise RuntimeError(f"加载音频文件失败: {str(e)}")

    def calculate_slices(
        self, 
        file_path: str, 
        slice_duration_seconds: float
    ) -> SlicingResult:
        try:
            audio_format = self._detect_format(file_path)
            audio = self._load_audio(file_path, audio_format)
            
            total_duration_ms = len(audio)
            total_duration_seconds = total_duration_ms / 1000.0
            
            if slice_duration_seconds <= 0:
                raise ValueError("切片时长必须大于0")
            
            if slice_duration_seconds >= total_duration_seconds:
                raise ValueError(
                    f"切片时长({slice_duration_seconds}秒)不能大于等于音频总时长({total_duration_seconds:.2f}秒)"
                )
            
            slice_duration_ms = slice_duration_seconds * 1000
            slice_count = math.ceil(total_duration_ms / slice_duration_ms)
            
            slices: List[SliceInfo] = []
            
            for i in range(slice_count):
                start_ms = i * slice_duration_ms
                end_ms = min((i + 1) * slice_duration_ms, total_duration_ms)
                
                slice_info = SliceInfo(
                    index=i,
                    start_time=start_ms / 1000.0,
                    end_time=end_ms / 1000.0,
                    duration=(end_ms - start_ms) / 1000.0
                )
                slices.append(slice_info)
            
            return SlicingResult(
                success=True,
                total_duration=total_duration_seconds,
                slice_count=slice_count,
                slice_duration=slice_duration_seconds,
                slices=slices
            )
            
        except Exception as e:
            return SlicingResult(
                success=False,
                total_duration=0,
                slice_count=0,
                slice_duration=slice_duration_seconds,
                slices=[],
                error_message=str(e)
            )

    def slice_audio(
        self,
        file_path: str,
        slice_duration_seconds: float,
        output_dir: Optional[str] = None,
        output_format: Optional[AudioFormat] = None
    ) -> SlicingResult:
        try:
            result = self.calculate_slices(file_path, slice_duration_seconds)
            
            if not result.success:
                return result
            
            audio_format = self._detect_format(file_path)
            audio = self._load_audio(file_path, audio_format)
            
            if output_dir is None:
                base_dir = os.path.dirname(file_path)
                file_name = os.path.splitext(os.path.basename(file_path))[0]
                output_dir = os.path.join(base_dir, f"{file_name}_slices")
            
            os.makedirs(output_dir, exist_ok=True)
            
            actual_format = output_format if output_format else audio_format
            slice_duration_ms = slice_duration_seconds * 1000
            total_duration_ms = len(audio)
            base_name = os.path.splitext(os.path.basename(file_path))[0]
            
            for i, slice_info in enumerate(result.slices):
                start_ms = int(slice_info.start_time * 1000)
                end_ms = int(slice_info.end_time * 1000)
                
                audio_slice = audio[start_ms:end_ms]
                
                output_file_name = f"{base_name}_slice_{i:03d}.{actual_format.value}"
                output_file_path = os.path.join(output_dir, output_file_name)
                
                if actual_format == AudioFormat.MP3:
                    audio_slice.export(output_file_path, format="mp3")
                elif actual_format == AudioFormat.WAV:
                    audio_slice.export(output_file_path, format="wav")
                elif actual_format == AudioFormat.OGG:
                    audio_slice.export(output_file_path, format="ogg")
                elif actual_format == AudioFormat.FLAC:
                    audio_slice.export(output_file_path, format="flac")
                elif actual_format == AudioFormat.M4A:
                    audio_slice.export(output_file_path, format="m4a")
                elif actual_format == AudioFormat.AAC:
                    audio_slice.export(output_file_path, format="aac")
                else:
                    audio_slice.export(output_file_path, format=actual_format.value)
                
                result.slices[i].file_path = output_file_path
            
            return result
            
        except Exception as e:
            return SlicingResult(
                success=False,
                total_duration=0,
                slice_count=0,
                slice_duration=slice_duration_seconds,
                slices=[],
                error_message=str(e)
            )

    def get_audio_info(self, file_path: str) -> Dict:
        try:
            audio_format = self._detect_format(file_path)
            audio = self._load_audio(file_path, audio_format)
            
            return {
                "success": True,
                "file_path": file_path,
                "format": audio_format.value,
                "duration_seconds": len(audio) / 1000.0,
                "duration_ms": len(audio),
                "channels": audio.channels,
                "frame_rate": audio.frame_rate,
                "sample_width": audio.sample_width,
                "frame_count": audio.frame_count()
            }
        except Exception as e:
            return {
                "success": False,
                "file_path": file_path,
                "error_message": str(e)
            }
