import React, { useState, useCallback } from 'react';
import { SubtitleSegment, SubtitleResponse, TranslatedSegment, TranslationResponse } from '../types';
import { convertToSRT, downloadSRT } from '../utils/subtitleUtils';
import { uploadService } from '../api/uploadService';

interface SubtitleListProps {
  subtitleData: SubtitleResponse;
  taskInfo?: {
    programName: string;
    episodeNumber: string;
    fileName: string;
  };
}

type DisplayMode = 'original' | 'translated' | 'bilingual';

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
  const [exportSuccess, setExportSuccess] = useState(false);
  const [activeTab, setActiveTab] = useState<'segments' | 'fulltext'>('fulltext');
  
  const [isTranslating, setIsTranslating] = useState(false);
  const [translationData, setTranslationData] = useState<TranslationResponse | null>(null);
  const [translationError, setTranslationError] = useState<string>('');
  const [displayMode, setDisplayMode] = useState<DisplayMode>('original');

  const segments = subtitleData.data?.segments || [];
  const fullText = subtitleData.data?.fullText || '';
  const totalDuration = subtitleData.data?.totalDuration || 0;
  const segmentCount = subtitleData.data?.segmentCount || 0;
  const taskId = subtitleData.data?.taskId;

  const generateFileName = useCallback((suffix: string = '') => {
    const baseName = (() => {
      if (taskInfo?.programName && taskInfo?.episodeNumber) {
        return `${taskInfo.programName}_第${taskInfo.episodeNumber}期`;
      }
      if (taskInfo?.fileName) {
        return taskInfo.fileName.replace(/\.[^/.]+$/, '');
      }
      return 'subtitle';
    })();
    return suffix ? `${baseName}_${suffix}.srt` : `${baseName}.srt`;
  }, [taskInfo]);

  const handleExportSRT = useCallback((isEnglish: boolean = false) => {
    try {
      let exportSegments: SubtitleSegment[];
      let fileName: string;
      
      if (isEnglish && translationData?.data) {
        exportSegments = translationData.data.segments.map((seg: TranslatedSegment) => ({
          index: seg.index,
          startTime: seg.startTime,
          endTime: seg.endTime,
          text: seg.translatedText,
          confidence: seg.confidence
        }));
        fileName = generateFileName('en');
      } else {
        exportSegments = segments;
        fileName = generateFileName();
      }
      
      const srtContent = convertToSRT(exportSegments);
      downloadSRT(srtContent, fileName);
      setExportSuccess(true);
      setTimeout(() => setExportSuccess(false), 2000);
    } catch (err) {
      console.error('导出失败:', err);
    }
  }, [segments, translationData, generateFileName]);

  const handleCopyFullText = useCallback(async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (err) {
      console.error('复制失败:', err);
    }
  }, []);

  const handleCopySegment = useCallback(async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (err) {
      console.error('复制失败:', err);
    }
  }, []);

  const handleTranslate = useCallback(async () => {
    if (!taskId || isTranslating) return;
    
    setIsTranslating(true);
    setTranslationError('');
    
    try {
      const response = await uploadService.getTaskTranslation(taskId, 'en');
      
      if (response.success && response.data) {
        setTranslationData(response);
        setDisplayMode('bilingual');
      } else {
        setTranslationError(response.message || '翻译失败');
      }
    } catch (err) {
      const error = err as { message?: string };
      setTranslationError(error.message || '翻译失败，请稍后重试');
      console.error('翻译失败:', err);
    } finally {
      setIsTranslating(false);
    }
  }, [taskId, isTranslating]);

  const getTranslatedSegment = (index: number): TranslatedSegment | undefined => {
    return translationData?.data?.segments.find(seg => seg.index === index);
  };

  const getDisplayLanguageLabel = () => {
    switch (displayMode) {
      case 'original':
        return '中文';
      case 'translated':
        return '英文';
      case 'bilingual':
        return '双语对照';
    }
  };

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
            <strong>语言：</strong>{getDisplayLanguageLabel()}
          </span>
        </div>
        <div className="subtitle-actions">
          {!translationData ? (
            <button
              type="button"
              className="translate-btn"
              onClick={handleTranslate}
              disabled={isTranslating}
            >
              {isTranslating ? (
                <>
                  <span className="loading-spinner"></span>
                  翻译中...
                </>
              ) : (
                '🌐 转换为英文'
              )}
            </button>
          ) : (
            <>
              <button
                type="button"
                className={`language-toggle-btn ${displayMode === 'original' ? 'active' : ''}`}
                onClick={() => setDisplayMode('original')}
              >
                中文
              </button>
              <button
                type="button"
                className={`language-toggle-btn ${displayMode === 'translated' ? 'active' : ''}`}
                onClick={() => setDisplayMode('translated')}
              >
                英文
              </button>
              <button
                type="button"
                className={`language-toggle-btn ${displayMode === 'bilingual' ? 'active' : ''}`}
                onClick={() => setDisplayMode('bilingual')}
              >
                双语对照
              </button>
            </>
          )}
          {translationData && (
            <button
              type="button"
              className="export-btn export-btn-secondary"
              onClick={() => handleExportSRT(true)}
            >
              {exportSuccess ? '✓ 已导出' : '📥 导出英文 SRT'}
            </button>
          )}
          <button
            type="button"
            className="export-btn"
            onClick={() => handleExportSRT(false)}
          >
            {exportSuccess ? '✓ 已导出' : '📥 导出 SRT'}
          </button>
        </div>
      </div>

      {translationError && (
        <div className="translation-error">
          <span className="status-icon">⚠️</span>
          {translationError}
        </div>
      )}

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
          {displayMode === 'bilingual' && translationData?.data ? (
            <div className="bilingual-fulltext">
              <div className="fulltext-column">
                <div className="fulltext-header">
                  <h3>中文原文</h3>
                  <button
                    type="button"
                    className="copy-btn"
                    onClick={() => handleCopyFullText(fullText)}
                  >
                    {copySuccess ? '✓ 已复制' : '📋 一键复制'}
                  </button>
                </div>
                <div className="fulltext-content">
                  <pre>{fullText}</pre>
                </div>
              </div>
              <div className="fulltext-column">
                <div className="fulltext-header">
                  <h3>英文译文</h3>
                  <button
                    type="button"
                    className="copy-btn"
                    onClick={() => handleCopyFullText(translationData.data!.fullTranslatedText)}
                  >
                    {copySuccess ? '✓ 已复制' : '📋 一键复制'}
                  </button>
                </div>
                <div className="fulltext-content">
                  <pre>{translationData.data.fullTranslatedText}</pre>
                </div>
              </div>
            </div>
          ) : (
            <>
              <div className="fulltext-header">
                <h3>
                  {displayMode === 'translated' ? '完整英文文本' : '完整字幕文本'}
                </h3>
                <button
                  type="button"
                  className="copy-btn"
                  onClick={() => handleCopyFullText(
                    displayMode === 'translated' && translationData?.data
                      ? translationData.data.fullTranslatedText
                      : fullText
                  )}
                >
                  {copySuccess ? '✓ 已复制' : '📋 一键复制'}
                </button>
              </div>
              <div className="fulltext-content">
                <pre>
                  {displayMode === 'translated' && translationData?.data
                    ? translationData.data.fullTranslatedText
                    : fullText}
                </pre>
              </div>
            </>
          )}
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
                  {displayMode === 'bilingual' ? (
                    <>
                      <th className="col-text">中文原文</th>
                      <th className="col-text">英文译文</th>
                    </>
                  ) : (
                    <th className="col-text">
                      {displayMode === 'translated' ? '英文译文' : '字幕内容'}
                    </th>
                  )}
                  <th className="col-action">操作</th>
                </tr>
              </thead>
              <tbody>
                {segments.map((segment: SubtitleSegment) => {
                  const translatedSeg = getTranslatedSegment(segment.index);
                  return (
                    <tr key={segment.index} className="segment-row">
                      <td className="col-index">
                        <span className="segment-badge">{segment.index + 1}</span>
                      </td>
                      <td className="col-time">{formatTime(segment.startTime)}</td>
                      <td className="col-time">{formatTime(segment.endTime)}</td>
                      {displayMode === 'bilingual' ? (
                        <>
                          <td className="col-text">{segment.text}</td>
                          <td className="col-text translated-text">
                            {translatedSeg?.translatedText || '-'}
                          </td>
                        </>
                      ) : (
                        <td className="col-text">
                          {displayMode === 'translated'
                            ? translatedSeg?.translatedText || segment.text
                            : segment.text}
                        </td>
                      )}
                      <td className="col-action">
                        <button
                          type="button"
                          className="copy-segment-btn"
                          onClick={() => {
                            const textToCopy = displayMode === 'translated' && translatedSeg
                              ? translatedSeg.translatedText
                              : segment.text;
                            handleCopySegment(textToCopy);
                          }}
                        >
                          复制
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default SubtitleList;
