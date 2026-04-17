import { UploadFormData, UploadResponse, UploadError, SlicesResponse, SubtitleResponse } from '../types';

const API_BASE_URL = '/api';

export const uploadService = {
  async uploadAudio(formData: UploadFormData, onProgress?: (progress: number) => void): Promise<UploadResponse> {
    const { audioFile, programName, episodeNumber, sliceDurationSeconds, taskType } = formData;
    
    if (!audioFile) {
      throw {
        message: '音频文件不能为空',
        code: 'FILE_REQUIRED'
      } as UploadError;
    }

    const formDataObj = new FormData();
    formDataObj.append('audioFile', audioFile);
    formDataObj.append('programName', programName);
    formDataObj.append('episodeNumber', episodeNumber);
    formDataObj.append('sliceDurationSeconds', sliceDurationSeconds);
    formDataObj.append('taskType', taskType);

    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      
      xhr.upload.addEventListener('progress', (event) => {
        if (event.lengthComputable && onProgress) {
          const progress = Math.round((event.loaded / event.total) * 100);
          onProgress(progress);
        }
      });

      xhr.addEventListener('load', () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const response = JSON.parse(xhr.responseText);
            resolve(response);
          } catch {
            resolve({
              success: true,
              message: '上传成功',
              data: {
                taskId: `upload_${Date.now()}`,
                status: 'completed',
                createdAt: new Date().toISOString(),
                fileName: audioFile.name,
                programName,
                episodeNumber,
                taskType
              }
            });
          }
        } else {
          let errorMessage = '上传失败';
          try {
            const errorResponse = JSON.parse(xhr.responseText);
            errorMessage = errorResponse.message || errorMessage;
          } catch {
            if (xhr.status === 413) {
              errorMessage = '文件过大，请上传小于 100MB 的音频文件';
            } else if (xhr.status === 400) {
              errorMessage = '请求参数错误';
            } else if (xhr.status === 500) {
              errorMessage = '服务器内部错误，请稍后重试';
            }
          }
          
          reject({
            message: errorMessage,
            code: `HTTP_${xhr.status}`
          } as UploadError);
        }
      });

      xhr.addEventListener('error', () => {
        reject({
          message: '网络错误，请检查网络连接后重试',
          code: 'NETWORK_ERROR'
        } as UploadError);
      });

      xhr.addEventListener('abort', () => {
        reject({
          message: '上传已取消',
          code: 'UPLOAD_ABORTED'
        } as UploadError);
      });

      xhr.open('POST', `${API_BASE_URL}/upload`);
      xhr.send(formDataObj);
    });
  },

  async getTaskSlices(taskId: string): Promise<SlicesResponse> {
    try {
      const response = await fetch(`${API_BASE_URL}/task/${taskId}/slices`);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw {
          message: errorData.message || '获取切片列表失败',
          code: `HTTP_${response.status}`
        } as UploadError;
      }

      return await response.json();
    } catch (error) {
      if (error instanceof Error) {
        throw {
          message: error.message,
          code: 'NETWORK_ERROR'
        } as UploadError;
      }
      throw error;
    }
  },

  async getTaskSubtitles(taskId: string): Promise<SubtitleResponse> {
    try {
      const response = await fetch(`${API_BASE_URL}/task/${taskId}/subtitles`);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw {
          message: errorData.message || '获取字幕失败',
          code: `HTTP_${response.status}`
        } as UploadError;
      }

      return await response.json();
    } catch (error) {
      if (error instanceof Error) {
        throw {
          message: error.message,
          code: 'NETWORK_ERROR'
        } as UploadError;
      }
      throw error;
    }
  },

  async mockUpload(formData: UploadFormData, onProgress?: (progress: number) => void): Promise<UploadResponse> {
    const { audioFile, programName, episodeNumber, sliceDurationSeconds, taskType } = formData;
    
    if (!audioFile) {
      throw {
        message: '音频文件不能为空',
        code: 'FILE_REQUIRED'
      } as UploadError;
    }

    const totalSteps = 10;
    let currentStep = 0;

    const progressInterval = setInterval(() => {
      currentStep++;
      const progress = Math.round((currentStep / totalSteps) * 100);
      if (onProgress) {
        onProgress(progress);
      }
      if (currentStep >= totalSteps) {
        clearInterval(progressInterval);
      }
    }, 300);

    await new Promise(resolve => setTimeout(resolve, 3000));

    return {
      success: true,
      message: '上传成功',
      data: {
        taskId: `upload_${Date.now()}`,
        status: 'completed',
        createdAt: new Date().toISOString(),
        fileName: audioFile.name,
        programName,
        episodeNumber,
        sliceDurationSeconds: parseFloat(sliceDurationSeconds) || 60,
        taskType
      }
    };
  }
};
