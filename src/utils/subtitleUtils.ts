import { SubtitleSegment } from '../types';

export function formatSRTTime(seconds: number): string {
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 1000);
  
  return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')},${ms.toString().padStart(3, '0')}`;
}

export function convertToSRT(segments: SubtitleSegment[]): string {
  if (!segments || segments.length === 0) {
    return '';
  }

  const srtLines: string[] = [];

  segments.forEach((segment, index) => {
    const startStr = formatSRTTime(segment.startTime);
    const endStr = formatSRTTime(segment.endTime);

    srtLines.push(`${index + 1}`);
    srtLines.push(`${startStr} --> ${endStr}`);
    srtLines.push(segment.text);
    srtLines.push('');
  });

  return srtLines.join('\n');
}

export function downloadSRT(content: string, fileName: string): void {
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
