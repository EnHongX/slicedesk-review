import React, { useState, useRef, useCallback } from 'react';
import { UploadFormData, UploadFormErrors, UploadStatus, UploadResponse, UploadError } from '../types';
import { validationUtils, formatFileSize } from '../utils/validation';
import { uploadService } from '../api/uploadService';

const UploadForm: React.FC = () => {
  const [formData, setFormData] = useState<UploadFormData>({
    audioFile: null,
    programName: '',
    episodeNumber: ''
  });

  const [errors, setErrors] = useState<UploadFormErrors>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [uploadStatus, setUploadStatus] = useState<UploadStatus>('idle');
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [successResponse, setSuccessResponse] = useState<UploadResponse | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [isDragging, setIsDragging] = useState<boolean>(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const allTouched = {
      audioFile: true,
      programName: true,
      episodeNumber: true
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

    try {
      const response = await uploadService.mockUpload(formData, (progress) => {
        setUploadProgress(progress);
      });

      setUploadStatus('success');
      setSuccessResponse(response);
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
      episodeNumber: ''
    });
    setErrors({});
    setTouched({});
    setUploadStatus('idle');
    setUploadProgress(0);
    setSuccessResponse(null);
    setErrorMessage('');
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

  return (
    <div className="container">
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

        {uploadStatus === 'success' && successResponse && (
          <div className="status-message success">
            <span className="status-icon">✅</span>
            <div>
              <strong>上传成功！</strong>
              <p>节目：{successResponse.data?.programName} | 第 {successResponse.data?.episodeNumber} 期</p>
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
    </div>
  );
};

export default UploadForm;
