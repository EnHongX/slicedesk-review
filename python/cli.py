import argparse
import os
import json
from audio_slicer import AudioSlicer, SlicingResult, AudioFormat


def print_result(result: SlicingResult, json_output: bool = False, verbose: bool = False):
    if json_output:
        output = {
            "success": result.success,
            "total_duration": result.total_duration,
            "slice_count": result.slice_count,
            "slice_duration": result.slice_duration,
            "slices": [
                {
                    "index": s.index,
                    "start_time": s.start_time,
                    "end_time": s.end_time,
                    "duration": s.duration,
                    "file_path": s.file_path
                }
                for s in result.slices
            ]
        }
        if result.error_message:
            output["error_message"] = result.error_message
        if verbose and result.error_details:
            output["error_details"] = result.error_details
        print(json.dumps(output, indent=2, ensure_ascii=False))
    else:
        if result.success:
            print("=" * 60)
            print("音频切片完成！")
            print("=" * 60)
            print(f"总时长: {result.total_duration:.2f} 秒")
            print(f"切片数量: {result.slice_count} 个")
            print(f"切片时长: {result.slice_duration} 秒/个")
            print("-" * 60)
            print("切片详情:")
            for i, slice_info in enumerate(result.slices):
                print(f"  [{i:03d}] {slice_info.start_time:.2f}s - {slice_info.end_time:.2f}s "
                      f"(时长: {slice_info.duration:.2f}s)")
                if slice_info.file_path:
                    print(f"        文件: {slice_info.file_path}")
            print("=" * 60)
        else:
            print("=" * 60)
            print("音频切片失败！")
            print("=" * 60)
            print(f"错误信息: {result.error_message}")
            if verbose and result.error_details:
                print("-" * 60)
                print("详细错误信息:")
                print(result.error_details)
            print("=" * 60)


def print_audio_info(info: dict, json_output: bool = False, verbose: bool = False):
    if json_output:
        output = info.copy()
        if not verbose and "error_details" in output:
            del output["error_details"]
        if not verbose and "media_info" in output:
            del output["media_info"]
        print(json.dumps(output, indent=2, ensure_ascii=False))
    else:
        if info.get("success"):
            print("=" * 60)
            print("音频文件信息")
            print("=" * 60)
            print(f"文件路径: {info['file_path']}")
            print(f"文件大小: {info.get('file_size_bytes', 'N/A')} 字节")
            print(f"格式: {info['format']}")
            print(f"总时长: {info['duration_seconds']:.2f} 秒 ({info['duration_ms']} ms)")
            print(f"声道数: {info['channels']}")
            print(f"采样率: {info['frame_rate']} Hz")
            print(f"采样宽度: {info['sample_width']} 字节")
            print(f"帧数: {info.get('frame_count', 'N/A')}")
            
            if verbose and info.get("media_info"):
                print("-" * 60)
                print("媒体详细信息 (ffprobe):")
                print(json.dumps(info["media_info"], indent=2, ensure_ascii=False))
            
            print("=" * 60)
        else:
            print("=" * 60)
            print("获取音频信息失败！")
            print("=" * 60)
            print(f"错误信息: {info.get('error_message')}")
            if verbose and info.get("error_details"):
                print("-" * 60)
                print("详细错误信息:")
                print(info["error_details"])
            print("=" * 60)


def main():
    parser = argparse.ArgumentParser(
        description="音频切片工具 - 支持固定时长切片",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
示例:
  # 计算切片时间段（不生成文件）
  python cli.py info -f audio.mp3
  python cli.py calculate -f audio.mp3 -d 300
  
  # 生成切片文件
  python cli.py slice -f audio.mp3 -d 300
  python cli.py slice -f audio.mp3 -d 300 -o ./output
  python cli.py slice -f audio.mp3 -d 300 -o ./output --format wav
  
  # JSON 格式输出
  python cli.py info -f audio.mp3 --json
  python cli.py calculate -f audio.mp3 -d 300 --json
  
  # 详细错误信息（用于调试）
  python cli.py info -f audio.mp3 -v
  python cli.py calculate -f audio.mp3 -d 300 -v
  
  # 指定 ffmpeg/ffprobe 路径
  python cli.py info -f audio.mp3 --ffmpeg /opt/homebrew/opt/ffmpeg/bin/ffmpeg --ffprobe /opt/homebrew/opt/ffmpeg/bin/ffprobe
        """
    )
    
    parser.add_argument("--ffmpeg", help="指定 ffmpeg 可执行文件路径")
    parser.add_argument("--ffprobe", help="指定 ffprobe 可执行文件路径")
    parser.add_argument("-v", "--verbose", action="store_true", help="显示详细错误信息和调试信息")
    
    subparsers = parser.add_subparsers(dest="command", help="可用命令")
    
    info_parser = subparsers.add_parser("info", help="获取音频文件信息")
    info_parser.add_argument("-f", "--file", required=True, help="音频文件路径")
    info_parser.add_argument("--json", action="store_true", help="以 JSON 格式输出")
    
    calc_parser = subparsers.add_parser("calculate", help="计算切片时间段（不生成文件）")
    calc_parser.add_argument("-f", "--file", required=True, help="音频文件路径")
    calc_parser.add_argument("-d", "--duration", type=float, required=True, help="每个切片的时长（秒）")
    calc_parser.add_argument("--json", action="store_true", help="以 JSON 格式输出")
    
    slice_parser = subparsers.add_parser("slice", help="生成切片文件")
    slice_parser.add_argument("-f", "--file", required=True, help="音频文件路径")
    slice_parser.add_argument("-d", "--duration", type=float, required=True, help="每个切片的时长（秒）")
    slice_parser.add_argument("-o", "--output", help="输出目录（默认为原文件同目录下的 [文件名]_slices）")
    slice_parser.add_argument("--format", choices=["mp3", "wav", "ogg", "flac", "m4a", "aac"], 
                              help="输出格式（默认为原格式）")
    slice_parser.add_argument("--json", action="store_true", help="以 JSON 格式输出")
    
    args = parser.parse_args()
    
    if args.verbose:
        print(f"[调试] ffmpeg 路径参数: {args.ffmpeg}")
        print(f"[调试] ffprobe 路径参数: {args.ffprobe}")
    
    slicer = AudioSlicer(ffmpeg_path=args.ffmpeg, ffprobe_path=args.ffprobe)
    
    if args.verbose:
        from pydub import AudioSegment
        print(f"[调试] 使用的 ffmpeg: {AudioSegment.converter}")
        print(f"[调试] 使用的 ffprobe: {AudioSegment.ffprobe}")
    
    if args.command == "info":
        if not os.path.exists(args.file):
            print(f"错误: 文件不存在 - {args.file}")
            return
        info = slicer.get_audio_info(args.file)
        print_audio_info(info, args.json, args.verbose)
        
    elif args.command == "calculate":
        if not os.path.exists(args.file):
            print(f"错误: 文件不存在 - {args.file}")
            return
        result = slicer.calculate_slices(args.file, args.duration)
        print_result(result, args.json, args.verbose)
        
    elif args.command == "slice":
        if not os.path.exists(args.file):
            print(f"错误: 文件不存在 - {args.file}")
            return
        
        output_format = None
        if args.format:
            output_format = AudioFormat(args.format.lower())
        
        result = slicer.slice_audio(
            file_path=args.file,
            slice_duration_seconds=args.duration,
            output_dir=args.output,
            output_format=output_format
        )
        print_result(result, args.json, args.verbose)
        
    else:
        parser.print_help()


if __name__ == "__main__":
    main()
