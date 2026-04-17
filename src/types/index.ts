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

export interface UploadResponse {
  success: boolean;
  message: string;
  data?: {
    id: string;
    fileName: string;
    programName: string;
    episodeNumber: string;
    uploadTime: string;
  };
}

export interface UploadError {
  message: string;
  code?: string;
}
