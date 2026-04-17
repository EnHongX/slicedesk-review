export interface UploadFormData {
  audioFile: File | null;
  programName: string;
  episodeNumber: string;
}

export interface UploadFormErrors {
  audioFile?: string;
  programName?: string;
  episodeNumber?: string;
}

export type UploadStatus = 'idle' | 'loading' | 'success' | 'error';

export type TaskStatus = 'pending' | 'processing' | 'completed' | 'failed';

export interface UploadResponse {
  success: boolean;
  message: string;
  data?: {
    taskId: string;
    status: TaskStatus;
    createdAt: string;
    fileName: string;
    programName: string;
    episodeNumber: string;
  };
}

export interface UploadError {
  message: string;
  code?: string;
}
