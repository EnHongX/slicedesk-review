import React, { useState, useRef, useCallback } from 'react';
import { UploadFormData, UploadFormErrors, UploadStatus, UploadResponse, UploadError, SlicesResponse, SubtitleResponse, TaskType } from '../types';
import { validationUtils, formatFileSize } from '../utils/validation';
import { uploadService } from '../api/uploadService';
import SliceList from './SliceList';
import SubtitleList from './SubtitleList';

const UploadForm: React.FC = () => {
  const [formData, setFormData] = useState<UploadFormData>({
    audioFile: null,
    programName: '',
    episodeNumber: '',
    sliceDurationSeconds: '60',
    taskType: 'slice'
  });

  const [errors, setErrors] = useState<UploadFormErrors>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [uploadStatus, setUploadStatus] = useState<UploadStatus>('idle');
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [successResponse, setSuccessResponse] = useState<UploadResponse | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [slicesData, setSlicesData] = useState<SlicesResponse | null>(null);
  const [showSlices, setShowSlices] = useState<boolean>(false);
  const [loadingSlices, setLoadingSlices] = useState<boolean>(false);
  const [subtitleData, setSubtitleData] = useState<SubtitleResponse | null>(null);
  const [showSubtitles, setShowSubtitles] = useState<boolean>(false);
  const [loadingSubtitles, setLoadingSubtitles] = useState<boolean>(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleTaskTypeChange = (type: TaskType) => {
    setFormData(prev => ({ ...prev, taskType: type }));
    setTouched(prev => ({ ...prev, taskType: true }));
  };

  const handleFileChange = useCallback((file: File | null) => {
    setFormData(prev => ({ ...prev, audioFile: file }));
    setTouched(prev => ({ ...prev, audioFile: true }));
    
    if (file) {
      const error = validationUtils.validateAudioFile(file);
      setErrors(prev => ({
        ...prev,
        audioFile: error
      }));
    } else {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors.audioFile;
        return newErrors;
      });
    }
  }, []);

  const handleInputFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    handleFileChange(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const file = e.dataTransfer.files?.[0] || null;
    handleFileChange(file);
  };

  const handleProgramNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setFormData(prev => ({ ...prev, programName: value }));
    
    if (touched.programName) {
      const error = validationUtils.validateProgramName(value);
      setErrors(prev => ({
        ...prev,
        programName: error
      }));
    }
  };

  const handleProgramNameBlur = () => {
    setTouched(prev => ({ ...prev, programName: true }));
    const error = validationUtils.validateProgramName(formData.programName);
    setErrors(prev => ({
      ...prev,
      programName: error
    }));
  };

  const handleEpisodeNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setFormData(prev => ({ ...prev, episodeNumber: value }));
    
    if (touched.episodeNumber) {
      const error = validationUtils.validateEpisodeNumber(value);
      setErrors(prev => ({
        ...prev,
        episodeNumber: error
      }));
    }
  };

  const handleEpisodeNumberBlur = () => {
    setTouched(prev => ({ ...prev, episodeNumber: true }));
    const error = validationUtils.validateEpisodeNumber(formData.episodeNumber);
    setErrors(prev => ({
      ...prev,
      episodeNumber: error
    }));
  };

  const handleSliceDurationSecondsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setFormData(prev => ({ ...prev, sliceDurationSeconds: value }));
    
    if (touched.sliceDurationSeconds) {
      const error = validationUtils.validateSliceDurationSeconds(value);
      setErrors(prev => ({
        ...prev,
        sliceDurationSeconds: error
      }));
    }
  };

  const handleSliceDurationSecondsBlur = () => {
    setTouched(prev => ({ ...prev, sliceDurationSeconds: true }));
    const error = validationUtils.validateSliceDurationSeconds(formData.sliceDurationSeconds);
    setErrors(prev => ({
      ...prev,
      sliceDurationSeconds: error
    }));
  };

  const loadSlices = async (taskId: string) => {
    setLoadingSlices(true);
    try {
      const response = await uploadService.getTaskSlices(taskId);
      setSlicesData(response);
      setShowSlices(true);
    } catch (err) {
      const error = err as UploadError;
      console.error('获取切片列表失败:', error.message);
    } finally {
      setLoadingSlices(false);
    }
  };

  const loadSubtitles = async (taskId: string) => {
    setLoadingSubtitles(true);
    try {
      const response = await uploadService.getTaskSubtitles(taskId);
      setSubtitleData(response);
      setShowSubtitles(true);
    } catch (err) {
      const error = err as UploadError;
      console.error('获取字幕失败:', error.message);
    } finally {
      setLoadingSubtitles(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const allTouched = {
      audioFile: true,
      programName: true,
      episodeNumber: true,
      sliceDurationSeconds: true,
      taskType: true
    };
    setTouched(allTouched);

    const validationErrors = validationUtils.validateForm(formData);
    setErrors(validationErrors);

    if (validationUtils.hasErrors(validationErrors)) {
      return;
    }

    setUploadStatus('loading');
    setUploadProgress(0);
    setSuccessResponse(null);
    setErrorMessage('');
    setSlicesData(null);
    setShowSlices(false);
    setSubtitleData(null);
    setShowSubtitles(false);

    try {
      const response = await uploadService.uploadAudio(formData, (progress) => {
        setUploadProgress(progress);
      });

      setUploadStatus('success');
      setSuccessResponse(response);

      if (response.data?.taskId) {
        if (formData.taskType === 'slice') {
          await loadSlices(response.data.taskId);
        } else if (formData.taskType === 'subtitle') {
          await loadSubtitles(response.data.taskId);
        }
      }
    } catch (err) {
      const error = err as UploadError;
      setUploadStatus('error');
      setErrorMessage(error.message);
    }
  };

  const handleReset = () => {
    setFormData({
      audioFile: null,
      programName: '',
      episodeNumber: '',
      sliceDurationSeconds: '60',
      taskType: 'slice'
    });
    setErrors({});
    setTouched({});
    setUploadStatus('idle');
    setUploadProgress(0);
    setSuccessResponse(null);
    setErrorMessage('');
    setSlicesData(null);
    setShowSlices(false);
    setSubtitleData(null);
    setShowSubtitles(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleUploadAreaClick = () => {
    if (uploadStatus !== 'loading') {
      fileInputRef.current?.click();
    }
  };

  const showError = (field: keyof UploadFormErrors): boolean => {
    return touched[field] === true && errors[field] !== undefined;
  };

  const isLoadingResults = loadingSlices || loadingSubtitles;

  const showResults = showSlices || showSubtitles;

  return (
    <div className={`container ${!showResults ? 'narrow' : ''}`}>
      <h1>播客音频上传</h1>
      
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label>音频文件</label>
          <div
            className={`file-upload ${isDragging ? 'dragover' : ''} ${showError('audioFile') ? 'error' : ''}`}
            onClick={handleUploadAreaClick}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".mp3,.wav,.ogg,.m4a,.aac,.flac,audio/*"
              onChange={handleInputFileChange}
              disabled={uploadStatus === 'loading'}
            />
            
            {!formData.audioFile ? (
              <>
                <div className="upload-icon">🎵</div>
                <p className="upload-text">点击或拖拽音频文件到此处</p>
                <p className="upload-hint">支持 MP3、WAV、OGG、M4A、AAC、FLAC 格式，最大 100MB</p>
              </>
            ) : (
              <div className="file-info">
                <div>
                  <div className="file-name">{formData.audioFile.name}</div>
                  <div className="file-size">{formatFileSize(formData.audioFile.size)}</div>
                </div>
                <button
                  type="button"
                  className="reset-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleFileChange(null);
                  }}
                >
                  更换
                </button>
              </div>
            )}
          </div>
          
          {showError('audioFile') && (
            <div className="error-message">{errors.audioFile}</div>
          )}
        </div>

        <div className="form-group">
          <label>处理方式</label>
          <div className="task-type-options">
            <label className={`task-type-option ${formData.taskType === 'slice' ? 'active' : ''}`}>
              <input
                type="radio"
                name="taskType"
                value="slice"
                checked={formData.taskType === 'slice'}
                onChange={() => handleTaskTypeChange('slice')}
                disabled={uploadStatus === 'loading'}
              />
              <span className="task-type-icon">✂️</span>
              <span className="task-type-label">切片</span>
              <span className="task-type-desc">将音频按指定时长切分成多个片段</span>
            </label>
            <label className={`task-type-option ${formData.taskType === 'subtitle' ? 'active' : ''}`}>
              <input
                type="radio"
                name="taskType"
                value="subtitle"
                checked={formData.taskType === 'subtitle'}
                onChange={() => handleTaskTypeChange('subtitle')}
                disabled={uploadStatus === 'loading'}
              />
              <span className="task-type-icon">📝</span>
              <span className="task-type-label">字幕生成</span>
              <span className="task-type-desc">自动识别音频内容生成中文字幕</span>
            </label>
          </div>
        </div>

        <div className="form-group">
          <label htmlFor="programName">节目名称</label>
          <input
            id="programName"
            type="text"
            value={formData.programName}
            onChange={handleProgramNameChange}
            onBlur={handleProgramNameBlur}
            placeholder="例如：科技前沿播客"
            disabled={uploadStatus === 'loading'}
            className={showError('programName') ? 'error' : ''}
          />
          
          {showError('programName') && (
            <div className="error-message">{errors.programName}</div>
          )}
        </div>

        <div className="form-group">
          <label htmlFor="episodeNumber">期数</label>
          <input
            id="episodeNumber"
            type="number"
            value={formData.episodeNumber}
            onChange={handleEpisodeNumberChange}
            onBlur={handleEpisodeNumberBlur}
            placeholder="例如：1"
            min="1"
            disabled={uploadStatus === 'loading'}
            className={showError('episodeNumber') ? 'error' : ''}
          />
          
          {showError('episodeNumber') && (
            <div className="error-message">{errors.episodeNumber}</div>
          )}
        </div>

        {formData.taskType === 'slice' && (
          <div className="form-group">
            <label htmlFor="sliceDurationSeconds">切片时长（秒）</label>
            <input
              id="sliceDurationSeconds"
              type="number"
              value={formData.sliceDurationSeconds}
              onChange={handleSliceDurationSecondsChange}
              onBlur={handleSliceDurationSecondsBlur}
              placeholder="例如：60"
              min="1"
              max="3600"
              step="1"
              disabled={uploadStatus === 'loading'}
              className={showError('sliceDurationSeconds') ? 'error' : ''}
            />
            
            {showError('sliceDurationSeconds') && (
              <div className="error-message">{errors.sliceDurationSeconds}</div>
            )}
          </div>
        )}

        <button
          type="submit"
          className="submit-btn"
          disabled={uploadStatus === 'loading'}
        >
          {uploadStatus === 'loading' ? (
            <>
              <span className="loading-spinner"></span>
              上传中 ({uploadProgress}%)
            </>
          ) : uploadStatus === 'success' ? (
            '重新上传'
          ) : (
            '提交上传'
          )}
        </button>

        {uploadStatus === 'success' && successResponse && !showSlices && !showSubtitles && (
          <div className="status-message success">
            <span className="status-icon">✅</span>
            <div>
              <strong>上传成功！</strong>
              <p>任务ID：{successResponse.data?.taskId}</p>
              <p>节目：{successResponse.data?.programName} | 第 {successResponse.data?.episodeNumber} 期</p>
              <p>当前状态：{successResponse.data?.status}</p>
              {isLoadingResults && <p className="loading-text">正在加载{formData.taskType === 'slice' ? '切片' : '字幕'}...</p>}
            </div>
            <button type="button" className="reset-btn" onClick={handleReset}>
              重置
            </button>
          </div>
        )}

        {uploadStatus === 'error' && errorMessage && (
          <div className="status-message error">
            <span className="status-icon">❌</span>
            <div>
              <strong>上传失败</strong>
              <p>{errorMessage}</p>
            </div>
            <button type="button" className="reset-btn" onClick={handleReset}>
              重试
            </button>
          </div>
        )}
      </form>

      {showSlices && slicesData && slicesData.data && (
        <div className="slices-section">
          <SliceList
            slices={slicesData.data.slices}
            totalDuration={slicesData.data.totalDuration}
            sliceCount={slicesData.data.sliceCount}
            sliceDurationSeconds={slicesData.data.sliceDurationSeconds}
            taskInfo={
              successResponse?.data
                ? {
                    programName: successResponse.data.programName,
                    episodeNumber: successResponse.data.episodeNumber,
                    fileName: successResponse.data.fileName
                  }
                : undefined
            }
          />
          <div className="action-buttons">
            <button type="button" className="reset-btn" onClick={handleReset}>
              返回上传
            </button>
          </div>
        </div>
      )}

      {showSubtitles && subtitleData && subtitleData.data && (
        <div className="subtitle-section">
          <SubtitleList
            subtitleData={subtitleData}
            taskInfo={
              successResponse?.data
                ? {
                    programName: successResponse.data.programName,
                    episodeNumber: successResponse.data.episodeNumber,
                    fileName: successResponse.data.fileName
                  }
                : undefined
            }
          />
          <div className="action-buttons">
            <button type="button" className="reset-btn" onClick={handleReset}>
              返回上传
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default UploadForm;
