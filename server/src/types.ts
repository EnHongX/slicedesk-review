export type TaskStatus = 'pending' | 'processing' | 'completed' | 'failed';

export interface AudioFile {
  id: string;
  taskId: string;
  originalName: string;
  fileName: string;
  filePath: string;
  fileSize: number;
  mimeType: string;
  createdAt: string;
}

export interface Task {
  id: string;
  programName: string;
  episodeNumber: string;
  status: TaskStatus;
  createdAt: string;
  updatedAt: string;
}

export interface TaskWithFile extends Task {
  audioFile?: AudioFile;
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

export interface ErrorResponse {
  success: boolean;
  message: string;
  code?: string;
}
