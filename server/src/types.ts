export type TaskStatus = 'pending' | 'processing' | 'completed' | 'failed';
export type TaskType = 'slice' | 'subtitle';

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

export interface Task {
  id: string;
  programName: string;
  episodeNumber: string;
  status: TaskStatus;
  taskType: TaskType;
  sliceDurationSeconds: number;
  createdAt: string;
  updatedAt: string;
}

export interface TaskWithFile extends Task {
  audioFile?: AudioFile;
}

export interface TaskWithSlices extends TaskWithFile {
  slices?: SliceInfo[];
  totalDuration?: number;
  sliceCount?: number;
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
    sliceDurationSeconds: number;
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
    sliceDurationSeconds: number;
  };
}

export interface ErrorResponse {
  success: boolean;
  message: string;
  code?: string;
}

export interface SubtitleSegment {
  index: number;
  startTime: number;
  endTime: number;
  text: string;
  confidence?: number;
}

export interface SubtitleInfo {
  id: string;
  taskId: string;
  segmentIndex: number;
  startTime: number;
  endTime: number;
  text: string;
  confidence: number;
  createdAt: string;
}

export interface SubtitleResponse {
  success: boolean;
  message: string;
  data?: {
    taskId: string;
    taskType: TaskType;
    totalDuration: number;
    segmentCount: number;
    language: string;
    fullText: string;
    segments: SubtitleSegment[];
  };
}

export interface TranslatedSegment {
  index: number;
  startTime: number;
  endTime: number;
  originalText: string;
  translatedText: string;
  confidence?: number;
}

export interface TranslationResponse {
  success: boolean;
  message: string;
  data?: {
    taskId: string;
    sourceLanguage: string;
    targetLanguage: string;
    totalDuration: number;
    segmentCount: number;
    fullOriginalText: string;
    fullTranslatedText: string;
    segments: TranslatedSegment[];
  };
}
