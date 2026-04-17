import React from 'react';
import { SliceInfo } from '../types';

interface SliceListProps {
  slices: SliceInfo[];
  totalDuration: number;
  sliceCount: number;
  sliceDurationSeconds: number;
  taskInfo?: {
    programName: string;
    episodeNumber: string;
    fileName: string;
  };
}

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 1000);
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(3, '0')}`;
}

function formatDuration(seconds: number): string {
  if (seconds < 60) {
    return `${seconds.toFixed(2)} 秒`;
  }
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins} 分 ${secs} 秒`;
}

const SliceList: React.FC<SliceListProps> = ({ slices, totalDuration, sliceCount, sliceDurationSeconds, taskInfo }) => {
  if (slices.length === 0) {
    return (
      <div className="slice-list-container">
        <div className="slice-list-empty">
          <p>暂无切片数据</p>
        </div>
      </div>
    );
  }

  return (
    <div className="slice-list-container">
      <div className="slice-list-header">
        <h2>切片结果列表</h2>
        {taskInfo && (
          <div className="task-info">
            <span className="task-info-item">
              <strong>节目：</strong>{taskInfo.programName}
            </span>
            <span className="task-info-item">
              <strong>期数：</strong>第 {taskInfo.episodeNumber} 期
            </span>
            <span className="task-info-item">
              <strong>文件：</strong>{taskInfo.fileName}
            </span>
          </div>
        )}
        <div className="slice-summary">
          <span className="summary-item">
            <strong>切片数量：</strong>{sliceCount} 段
          </span>
          <span className="summary-item">
            <strong>切片时长：</strong>{formatDuration(sliceDurationSeconds)}
          </span>
          <span className="summary-item">
            <strong>总时长：</strong>{formatDuration(totalDuration)}
          </span>
        </div>
      </div>

      <div className="slice-table-container">
        <table className="slice-table">
          <thead>
            <tr>
              <th className="col-index">序号</th>
              <th className="col-time">开始时间</th>
              <th className="col-time">结束时间</th>
              <th className="col-duration">时长</th>
            </tr>
          </thead>
          <tbody>
            {slices.map((slice) => (
              <tr key={slice.id} className="slice-row">
                <td className="col-index">
                  <span className="slice-badge">{slice.sliceIndex + 1}</span>
                </td>
                <td className="col-time">{formatTime(slice.startTime)}</td>
                <td className="col-time">{formatTime(slice.endTime)}</td>
                <td className="col-duration">{formatDuration(slice.duration)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default SliceList;