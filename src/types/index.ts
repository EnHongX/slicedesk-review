export interface UploadFormData {
  audioFile: File | null;
  programName: string;
  episodeNumber: string;
  sliceDurationSeconds: string;
  taskType: TaskType;
}

export interface UploadFormErrors {
  audioFile?: string;
  programName?: string;
  episodeNumber?: string;
  sliceDurationSeconds?: string;
  taskType?: string;
}

export type UploadStatus = 'idle' | 'loading' | 'success' | 'error';

export type TaskStatus = 'pending' | 'processing' | 'completed' | 'failed';

export type TaskType = 'slice' | 'subtitle';

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

export interface SubtitleSegment {
  index: number;
  startTime: number;
  endTime: number;
  text: string;
  confidence?: number;
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
    taskType?: TaskType;
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

export interface UploadError {
  message: string;
  code?: string;
}
