import Database from 'better-sqlite3';
import { v4 as uuidv4 } from 'uuid';
import { Task, AudioFile, TaskStatus, TaskWithFile, SliceInfo } from './types.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DB_PATH = path.join(__dirname, '../../data/app.db');

let db: Database.Database;

function migrateDatabase(): void {
  try {
    db.exec(`
      ALTER TABLE tasks ADD COLUMN slice_duration_seconds REAL DEFAULT 60 NOT NULL;
    `);
    console.log('Migrating database: adding slice_duration_seconds column to tasks table...');
    console.log('Database migration completed successfully.');
  } catch (error) {
    if (error instanceof Error && error.message.includes('duplicate column name')) {
      // Column already exists, no action needed
    } else {
      console.error('Database migration failed:', error);
      throw error;
    }
  }
}

export function initDatabase(): void {
  db = new Database(DB_PATH);
  
  db.exec(`
    CREATE TABLE IF NOT EXISTS tasks (
      id TEXT PRIMARY KEY,
      program_name TEXT NOT NULL,
      episode_number TEXT NOT NULL,
      status TEXT DEFAULT 'pending' NOT NULL,
      slice_duration_seconds REAL DEFAULT 60 NOT NULL,
      created_at TEXT DEFAULT (datetime('now', 'localtime')) NOT NULL,
      updated_at TEXT DEFAULT (datetime('now', 'localtime')) NOT NULL
    );

    CREATE TABLE IF NOT EXISTS audio_files (
      id TEXT PRIMARY KEY,
      task_id TEXT NOT NULL,
      original_name TEXT NOT NULL,
      file_name TEXT NOT NULL,
      file_path TEXT NOT NULL,
      file_size INTEGER NOT NULL,
      mime_type TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now', 'localtime')) NOT NULL,
      FOREIGN KEY (task_id) REFERENCES tasks(id)
    );

    CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
    CREATE INDEX IF NOT EXISTS idx_audio_files_task_id ON audio_files(task_id);

    CREATE TABLE IF NOT EXISTS slices (
      id TEXT PRIMARY KEY,
      task_id TEXT NOT NULL,
      slice_index INTEGER NOT NULL,
      start_time REAL NOT NULL,
      end_time REAL NOT NULL,
      duration REAL NOT NULL,
      file_path TEXT,
      created_at TEXT DEFAULT (datetime('now', 'localtime')) NOT NULL,
      FOREIGN KEY (task_id) REFERENCES tasks(id)
    );

    CREATE INDEX IF NOT EXISTS idx_slices_task_id ON slices(task_id);
    CREATE INDEX IF NOT EXISTS idx_slices_task_index ON slices(task_id, slice_index);
  `);

  migrateDatabase();

  console.log(`Database initialized at: ${DB_PATH}`);
}

export function closeDatabase(): void {
  if (db) {
    db.close();
    console.log('Database closed');
  }
}

export function createTask(programName: string, episodeNumber: string, sliceDurationSeconds: number = 60): Task {
  const id = uuidv4();
  const now = new Date().toISOString();
  
  const stmt = db.prepare(`
    INSERT INTO tasks (id, program_name, episode_number, status, slice_duration_seconds, created_at, updated_at)
    VALUES (?, ?, ?, 'pending', ?, ?, ?)
  `);
  
  stmt.run(id, programName, episodeNumber, sliceDurationSeconds, now, now);
  
  return {
    id,
    programName,
    episodeNumber,
    status: 'pending',
    sliceDurationSeconds,
    createdAt: now,
    updatedAt: now
  };
}

export function getTaskById(taskId: string): Task | undefined {
  const stmt = db.prepare(`
    SELECT 
      id,
      program_name as programName,
      episode_number as episodeNumber,
      status,
      slice_duration_seconds as sliceDurationSeconds,
      created_at as createdAt,
      updated_at as updatedAt
    FROM tasks 
    WHERE id = ?
  `);
  
  return stmt.get(taskId) as Task | undefined;
}

export function updateTaskStatus(taskId: string, status: TaskStatus): void {
  const now = new Date().toISOString();
  const stmt = db.prepare(`
    UPDATE tasks 
    SET status = ?, updated_at = ? 
    WHERE id = ?
  `);
  stmt.run(status, now, taskId);
}

export function createAudioFile(
  taskId: string,
  originalName: string,
  fileName: string,
  filePath: string,
  fileSize: number,
  mimeType: string
): AudioFile {
  const id = uuidv4();
  const now = new Date().toISOString();
  
  const stmt = db.prepare(`
    INSERT INTO audio_files (id, task_id, original_name, file_name, file_path, file_size, mime_type, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);
  
  stmt.run(id, taskId, originalName, fileName, filePath, fileSize, mimeType, now);
  
  return {
    id,
    taskId,
    originalName,
    fileName,
    filePath,
    fileSize,
    mimeType,
    createdAt: now
  };
}

export function getAudioFileByTaskId(taskId: string): AudioFile | undefined {
  const stmt = db.prepare(`
    SELECT 
      id,
      task_id as taskId,
      original_name as originalName,
      file_name as fileName,
      file_path as filePath,
      file_size as fileSize,
      mime_type as mimeType,
      created_at as createdAt
    FROM audio_files 
    WHERE task_id = ?
  `);
  
  return stmt.get(taskId) as AudioFile | undefined;
}

export function getTaskWithFile(taskId: string): TaskWithFile | undefined {
  const task = getTaskById(taskId);
  if (!task) return undefined;
  
  const audioFile = getAudioFileByTaskId(taskId);
  
  return {
    ...task,
    audioFile
  };
}

export function createSlice(
  taskId: string,
  sliceIndex: number,
  startTime: number,
  endTime: number,
  duration: number,
  filePath?: string
): SliceInfo {
  const id = uuidv4();
  const now = new Date().toISOString();
  
  const stmt = db.prepare(`
    INSERT INTO slices (id, task_id, slice_index, start_time, end_time, duration, file_path, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);
  
  stmt.run(id, taskId, sliceIndex, startTime, endTime, duration, filePath || null, now);
  
  return {
    id,
    taskId,
    sliceIndex,
    startTime,
    endTime,
    duration,
    filePath: filePath || undefined,
    createdAt: now
  };
}

export function createSlicesBulk(taskId: string, slices: Array<{
  sliceIndex: number;
  startTime: number;
  endTime: number;
  duration: number;
  filePath?: string;
}>): void {
  const insert = db.prepare(`
    INSERT INTO slices (id, task_id, slice_index, start_time, end_time, duration, file_path, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);
  
  const now = new Date().toISOString();
  
  const insertMany = db.transaction((sliceList) => {
    for (const slice of sliceList) {
      const id = uuidv4();
      insert.run(
        id, 
        taskId, 
        slice.sliceIndex, 
        slice.startTime, 
        slice.endTime, 
        slice.duration, 
        slice.filePath || null, 
        now
      );
    }
  });
  
  insertMany(slices);
}

export function getSlicesByTaskId(taskId: string): SliceInfo[] {
  const stmt = db.prepare(`
    SELECT 
      id,
      task_id as taskId,
      slice_index as sliceIndex,
      start_time as startTime,
      end_time as endTime,
      duration,
      file_path as filePath,
      created_at as createdAt
    FROM slices 
    WHERE task_id = ?
    ORDER BY slice_index ASC
  `);
  
  return stmt.all(taskId) as SliceInfo[];
}

export function deleteSlicesByTaskId(taskId: string): void {
  const stmt = db.prepare(`
    DELETE FROM slices 
    WHERE task_id = ?
  `);
  
  stmt.run(taskId);
}
