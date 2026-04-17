import { Router, Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { fileURLToPath } from 'url';
import { 
  createTask, 
  createAudioFile, 
  getTaskWithFile, 
  createSlicesBulk, 
  getSlicesByTaskId,
  updateTaskStatus,
  createSubtitlesBulk,
  getSubtitlesByTaskId
} from '../database.js';
import { 
  UploadResponse, 
  ErrorResponse, 
  SlicesResponse, 
  SliceInfo, 
  TaskType,
  SubtitleResponse,
  SubtitleSegment,
  TranslationResponse,
  TranslatedSegment
} from '../types.js';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = Router();

const UPLOAD_DIR = path.join(__dirname, '../../../uploads');

const ALLOWED_MIME_TYPES = [
  'audio/mpeg',
  'audio/wav',
  'audio/ogg',
  'audio/mp4',
  'audio/x-m4a',
  'audio/aac',
  'audio/flac',
  'audio/x-flac'
];

const ALLOWED_EXTENSIONS = ['.mp3', '.wav', '.ogg', '.m4a', '.aac', '.flac'];

const MAX_FILE_SIZE = 100 * 1024 * 1024;

const DEFAULT_SLICE_DURATION_SECONDS = 60;
const VALID_TASK_TYPES: TaskType[] = ['slice', 'subtitle'];

function calculateSlices(
  totalDurationSeconds: number,
  sliceDurationSeconds: number
): Array<{
  sliceIndex: number;
  startTime: number;
  endTime: number;
  duration: number;
}> {
  if (totalDurationSeconds <= 0 || sliceDurationSeconds <= 0) {
    return [];
  }

  if (sliceDurationSeconds >= totalDurationSeconds) {
    return [{
      sliceIndex: 0,
      startTime: 0,
      endTime: totalDurationSeconds,
      duration: totalDurationSeconds
    }];
  }

  const sliceDurationMs = sliceDurationSeconds * 1000;
  const totalDurationMs = totalDurationSeconds * 1000;
  const sliceCount = Math.ceil(totalDurationMs / sliceDurationMs);

  const slices: Array<{
    sliceIndex: number;
    startTime: number;
    endTime: number;
    duration: number;
  }> = [];

  for (let i = 0; i < sliceCount; i++) {
    const startMs = i * sliceDurationMs;
    const endMs = Math.min((i + 1) * sliceDurationMs, totalDurationMs);

    slices.push({
      sliceIndex: i,
      startTime: startMs / 1000,
      endTime: endMs / 1000,
      duration: (endMs - startMs) / 1000
    });
  }

  return slices;
}

function estimateAudioDuration(fileSize: number, mimeType: string): number {
  const bitrateKbps: Record<string, number> = {
    'audio/mpeg': 128,
    'audio/mp3': 128,
    'audio/wav': 1411,
    'audio/ogg': 128,
    'audio/mp4': 128,
    'audio/x-m4a': 128,
    'audio/aac': 128,
    'audio/flac': 1000,
    'audio/x-flac': 1000
  };

  const rate = bitrateKbps[mimeType] || 128;
  const fileSizeBits = fileSize * 8;
  const durationSeconds = fileSizeBits / (rate * 1000);

  return Math.max(durationSeconds, 60);
}

function generateMockSubtitles(totalDurationSeconds: number): { segments: SubtitleSegment[], fullText: string } {
  const sampleTexts = [
    "欢迎收听今天的节目",
    "我们今天要讨论的话题非常有趣",
    "首先让我们来看一下最新的数据",
    "这些数据显示了一些重要的趋势",
    "接下来我想分享一些个人的见解",
    "希望大家能够从中获得一些启发",
    "如果有任何问题欢迎随时提问",
    "感谢大家的收听我们下期再见"
  ];

  const segments: SubtitleSegment[] = [];
  const segmentDuration = Math.max(5, totalDurationSeconds / sampleTexts.length);
  const fullTextParts: string[] = [];

  for (let i = 0; i < Math.min(sampleTexts.length, Math.ceil(totalDurationSeconds / 5)); i++) {
    const startTime = i * segmentDuration;
    const endTime = Math.min((i + 1) * segmentDuration, totalDurationSeconds);
    const text = sampleTexts[i % sampleTexts.length];
    
    segments.push({
      index: i,
      startTime,
      endTime,
      text,
      confidence: 0.95
    });
    fullTextParts.push(text);
  }

  return {
    segments,
    fullText: fullTextParts.join('')
  };
}

const CHINESE_TO_ENGLISH_DICTIONARY: Record<string, string> = {
  "欢迎收听今天的节目": "Welcome to today's program",
  "我们今天要讨论的话题非常有趣": "The topic we're discussing today is very interesting",
  "首先让我们来看一下最新的数据": "First, let's look at the latest data",
  "这些数据显示了一些重要的趋势": "These data show some important trends",
  "接下来我想分享一些个人的见解": "Next, I'd like to share some personal insights",
  "希望大家能够从中获得一些启发": "I hope everyone can gain some inspiration from it",
  "如果有任何问题欢迎随时提问": "If you have any questions, please feel free to ask",
  "感谢大家的收听我们下期再见": "Thank you for listening, see you next time"
};

function translateText(text: string): string {
  if (CHINESE_TO_ENGLISH_DICTIONARY[text]) {
    return CHINESE_TO_ENGLISH_DICTIONARY[text];
  }
  
  return `[Translated] ${text}`;
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOAD_DIR);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const uniqueName = `${uuidv4()}${ext}`;
    cb(null, uniqueName);
  }
});

const fileFilter = (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const ext = path.extname(file.originalname).toLowerCase();
  const isValidExtension = ALLOWED_EXTENSIONS.includes(ext);
  const isValidMimeType = ALLOWED_MIME_TYPES.includes(file.mimetype);
  
  if (isValidExtension || isValidMimeType) {
    cb(null, true);
  } else {
    cb(new Error(`不支持的文件格式。支持格式：${ALLOWED_EXTENSIONS.join(', ')}`));
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: MAX_FILE_SIZE
  }
});

router.post('/upload', upload.single('audioFile'), (req: Request, res: Response) => {
  try {
    const { programName, episodeNumber, sliceDurationSeconds, taskType } = req.body;
    const file = req.file;

    if (!file) {
      const errorResponse: ErrorResponse = {
        success: false,
        message: '音频文件不能为空',
        code: 'FILE_REQUIRED'
      };
      return res.status(400).json(errorResponse);
    }

    if (!programName || !programName.trim()) {
      const errorResponse: ErrorResponse = {
        success: false,
        message: '节目名称不能为空',
        code: 'PROGRAM_NAME_REQUIRED'
      };
      return res.status(400).json(errorResponse);
    }

    if (!episodeNumber || !episodeNumber.trim()) {
      const errorResponse: ErrorResponse = {
        success: false,
        message: '期数不能为空',
        code: 'EPISODE_NUMBER_REQUIRED'
      };
      return res.status(400).json(errorResponse);
    }

    const validTaskType: TaskType = VALID_TASK_TYPES.includes(taskType as TaskType) 
      ? (taskType as TaskType) 
      : 'slice';

    const sliceDuration = sliceDurationSeconds 
      ? parseFloat(sliceDurationSeconds) 
      : DEFAULT_SLICE_DURATION_SECONDS;
    
    if (isNaN(sliceDuration) || sliceDuration <= 0) {
      const errorResponse: ErrorResponse = {
        success: false,
        message: '切片时长必须是大于0的数字',
        code: 'INVALID_SLICE_DURATION'
      };
      return res.status(400).json(errorResponse);
    }

    const task = createTask(
      programName.trim(), 
      episodeNumber.trim(), 
      sliceDuration,
      validTaskType
    );
    
    const audioFile = createAudioFile(
      task.id,
      file.originalname,
      file.filename,
      file.path,
      file.size,
      file.mimetype
    );

    updateTaskStatus(task.id, 'processing');

    const estimatedDuration = estimateAudioDuration(file.size, file.mimetype);
    
    if (validTaskType === 'slice') {
      const slices = calculateSlices(estimatedDuration, sliceDuration);
      
      if (slices.length > 0) {
        createSlicesBulk(task.id, slices);
      }
    } else if (validTaskType === 'subtitle') {
      const mockSubtitles = generateMockSubtitles(estimatedDuration);
      createSubtitlesBulk(task.id, mockSubtitles.segments);
    }

    updateTaskStatus(task.id, 'completed');

    const message = validTaskType === 'subtitle' 
      ? '上传成功，字幕生成完成' 
      : '上传成功，切片处理完成';

    const response: UploadResponse = {
      success: true,
      message,
      data: {
        taskId: task.id,
        status: 'completed',
        createdAt: task.createdAt,
        fileName: audioFile.originalName,
        programName: task.programName,
        episodeNumber: task.episodeNumber,
        sliceDurationSeconds: sliceDuration
      }
    };

    res.status(200).json(response);
  } catch (error) {
    console.error('Upload error:', error);
    
    if (error instanceof multer.MulterError) {
      if (error.code === 'LIMIT_FILE_SIZE') {
        const errorResponse: ErrorResponse = {
          success: false,
          message: '文件过大，请上传小于 100MB 的音频文件',
          code: 'FILE_TOO_LARGE'
        };
        return res.status(413).json(errorResponse);
      }
    }

    const errorMessage = error instanceof Error ? error.message : '上传失败';
    const errorResponse: ErrorResponse = {
      success: false,
      message: errorMessage,
      code: 'UPLOAD_FAILED'
    };

    res.status(500).json(errorResponse);
  }
});

router.get('/task/:taskId', (req: Request, res: Response) => {
  const { taskId } = req.params;
  
  const taskWithFile = getTaskWithFile(taskId);
  
  if (!taskWithFile) {
    const errorResponse: ErrorResponse = {
      success: false,
      message: '任务不存在',
      code: 'TASK_NOT_FOUND'
    };
    return res.status(404).json(errorResponse);
  }

  res.status(200).json({
    success: true,
    data: taskWithFile
  });
});

router.get('/task/:taskId/slices', (req: Request, res: Response) => {
  const { taskId } = req.params;
  
  const taskWithFile = getTaskWithFile(taskId);
  
  if (!taskWithFile) {
    const errorResponse: ErrorResponse = {
      success: false,
      message: '任务不存在',
      code: 'TASK_NOT_FOUND'
    };
    return res.status(404).json(errorResponse);
  }

  const slices = getSlicesByTaskId(taskId);
  const totalDuration = slices.reduce((sum, slice) => sum + slice.duration, 0);

  const response: SlicesResponse = {
    success: true,
    message: '获取切片列表成功',
    data: {
      taskId: taskId,
      slices: slices,
      totalDuration: totalDuration,
      sliceCount: slices.length,
      sliceDurationSeconds: taskWithFile.sliceDurationSeconds
    }
  };

  res.status(200).json(response);
});

router.get('/task/:taskId/subtitles', (req: Request, res: Response) => {
  const { taskId } = req.params;
  
  const taskWithFile = getTaskWithFile(taskId);
  
  if (!taskWithFile) {
    const errorResponse: ErrorResponse = {
      success: false,
      message: '任务不存在',
      code: 'TASK_NOT_FOUND'
    };
    return res.status(404).json(errorResponse);
  }

  const subtitles = getSubtitlesByTaskId(taskId);
  
  const segments: SubtitleSegment[] = subtitles.map((sub, index) => ({
    index: sub.segmentIndex,
    startTime: sub.startTime,
    endTime: sub.endTime,
    text: sub.text,
    confidence: sub.confidence
  }));

  const fullText = segments.map(s => s.text).join('');
  const totalDuration = segments.length > 0 
    ? segments[segments.length - 1].endTime 
    : 0;

  const response: SubtitleResponse = {
    success: true,
    message: '获取字幕成功',
    data: {
      taskId: taskId,
      taskType: taskWithFile.taskType,
      totalDuration: totalDuration,
      segmentCount: segments.length,
      language: 'zh',
      fullText: fullText,
      segments: segments
    }
  };

  res.status(200).json(response);
});

router.get('/task/:taskId/translate', (req: Request, res: Response) => {
  const { taskId } = req.params;
  const { targetLang = 'en' } = req.query;
  
  const taskWithFile = getTaskWithFile(taskId);
  
  if (!taskWithFile) {
    const errorResponse: ErrorResponse = {
      success: false,
      message: '任务不存在',
      code: 'TASK_NOT_FOUND'
    };
    return res.status(404).json(errorResponse);
  }

  const subtitles = getSubtitlesByTaskId(taskId);
  
  if (subtitles.length === 0) {
    const errorResponse: ErrorResponse = {
      success: false,
      message: '该任务没有字幕数据',
      code: 'NO_SUBTITLES'
    };
    return res.status(404).json(errorResponse);
  }

  const translatedSegments: TranslatedSegment[] = subtitles.map((sub, index) => ({
    index: sub.segmentIndex,
    startTime: sub.startTime,
    endTime: sub.endTime,
    originalText: sub.text,
    translatedText: translateText(sub.text),
    confidence: sub.confidence
  }));

  const fullOriginalText = translatedSegments.map(s => s.originalText).join('');
  const fullTranslatedText = translatedSegments.map(s => s.translatedText).join(' ');
  const totalDuration = translatedSegments.length > 0 
    ? translatedSegments[translatedSegments.length - 1].endTime 
    : 0;

  const response: TranslationResponse = {
    success: true,
    message: '翻译成功',
    data: {
      taskId: taskId,
      sourceLanguage: 'zh',
      targetLanguage: String(targetLang),
      totalDuration: totalDuration,
      segmentCount: translatedSegments.length,
      fullOriginalText: fullOriginalText,
      fullTranslatedText: fullTranslatedText,
      segments: translatedSegments
    }
  };

  res.status(200).json(response);
});

export default router;
