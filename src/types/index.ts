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

export interface SliceInfo {
  id: string;
  taskId: string;
  sliceIndex: number;
  startTime: number;
  endTime: number;
  duration: number;
  filePath?: string;
  createdAt: string;
}

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

export interface SlicesResponse {
  success: boolean;
  message: string;
  data?: {
    taskId: string;
    slices: SliceInfo[];
    totalDuration: number;
    sliceCount: number;
  };
}

export interface UploadError {
  message: string;
  code?: string;
}
