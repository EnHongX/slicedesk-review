import React, { useState, useCallback } from 'react';
import { SubtitleSegment, SubtitleResponse } from '../types';

interface SubtitleListProps {
  subtitleData: SubtitleResponse;
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

const SubtitleList: React.FC<SubtitleListProps> = ({ subtitleData, taskInfo }) => {
  const [copySuccess, setCopySuccess] = useState(false);
  const [activeTab, setActiveTab] = useState<'segments' | 'fulltext'>('fulltext');

  const segments = subtitleData.data?.segments || [];
  const fullText = subtitleData.data?.fullText || '';
  const totalDuration = subtitleData.data?.totalDuration || 0;
  const segmentCount = subtitleData.data?.segmentCount || 0;

  const handleCopyFullText = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(fullText);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (err) {
      console.error('复制失败:', err);
    }
  }, [fullText]);

  const handleCopySegment = useCallback(async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (err) {
      console.error('复制失败:', err);
    }
  }, []);

  if (segments.length === 0 && !fullText) {
    return (
      <div className="subtitle-list-container">
        <div className="subtitle-list-empty">
          <p>暂无字幕数据</p>
        </div>
      </div>
    );
  }

  return (
    <div className="subtitle-list-container">
      <div className="subtitle-list-header">
        <h2>字幕生成结果</h2>
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
        <div className="subtitle-summary">
          <span className="summary-item">
            <strong>片段数量：</strong>{segmentCount} 段
          </span>
          <span className="summary-item">
            <strong>总时长：</strong>{formatDuration(totalDuration)}
          </span>
          <span className="summary-item">
            <strong>语言：</strong>中文
          </span>
        </div>
      </div>

      <div className="subtitle-tabs">
        <button
          type="button"
          className={`tab-btn ${activeTab === 'fulltext' ? 'active' : ''}`}
          onClick={() => setActiveTab('fulltext')}
        >
          完整文本
        </button>
        <button
          type="button"
          className={`tab-btn ${activeTab === 'segments' ? 'active' : ''}`}
          onClick={() => setActiveTab('segments')}
        >
          分段字幕
        </button>
      </div>

      {activeTab === 'fulltext' && (
        <div className="fulltext-section">
          <div className="fulltext-header">
            <h3>完整字幕文本</h3>
            <button
              type="button"
              className="copy-btn"
              onClick={handleCopyFullText}
            >
              {copySuccess ? '✓ 已复制' : '📋 一键复制'}
            </button>
          </div>
          <div className="fulltext-content">
            <pre>{fullText}</pre>
          </div>
        </div>
      )}

      {activeTab === 'segments' && (
        <div className="segments-section">
          <div className="segments-table-container">
            <table className="segments-table">
              <thead>
                <tr>
                  <th className="col-index">序号</th>
                  <th className="col-time">开始时间</th>
                  <th className="col-time">结束时间</th>
                  <th className="col-text">字幕内容</th>
                  <th className="col-action">操作</th>
                </tr>
              </thead>
              <tbody>
                {segments.map((segment: SubtitleSegment) => (
                  <tr key={segment.index} className="segment-row">
                    <td className="col-index">
                      <span className="segment-badge">{segment.index + 1}</span>
                    </td>
                    <td className="col-time">{formatTime(segment.startTime)}</td>
                    <td className="col-time">{formatTime(segment.endTime)}</td>
                    <td className="col-text">{segment.text}</td>
                    <td className="col-action">
                      <button
                        type="button"
                        className="copy-segment-btn"
                        onClick={() => handleCopySegment(segment.text)}
                      >
                        复制
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default SubtitleList;
