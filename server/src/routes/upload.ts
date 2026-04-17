import { Router, Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { fileURLToPath } from 'url';
import { createTask, createAudioFile, getTaskWithFile } from '../database.js';
import { UploadResponse, ErrorResponse } from '../types.js';

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
    const { programName, episodeNumber } = req.body;
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

    const task = createTask(programName.trim(), episodeNumber.trim());
    
    const audioFile = createAudioFile(
      task.id,
      file.originalname,
      file.filename,
      file.path,
      file.size,
      file.mimetype
    );

    const response: UploadResponse = {
      success: true,
      message: '上传成功',
      data: {
        taskId: task.id,
        status: task.status,
        createdAt: task.createdAt,
        fileName: audioFile.originalName,
        programName: task.programName,
        episodeNumber: task.episodeNumber
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

export default router;
