import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { initDatabase, closeDatabase } from './database.js';
import uploadRouter from './routes/upload.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/api', uploadRouter);

app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'Server is running',
    timestamp: new Date().toISOString()
  });
});

app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    success: false,
    message: '服务器内部错误',
    code: 'INTERNAL_ERROR'
  });
});

function ensureDirectories(): void {
  const uploadsDir = path.join(__dirname, '../../uploads');
  const dataDir = path.join(__dirname, '../../data');
  
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
    console.log('Created uploads directory');
  }
  
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
    console.log('Created data directory');
  }
}

process.on('SIGINT', () => {
  console.log('\nShutting down server...');
  closeDatabase();
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\nShutting down server...');
  closeDatabase();
  process.exit(0);
});

function startServer(): void {
  ensureDirectories();
  initDatabase();
  
  app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
    console.log(`API endpoints:`);
    console.log(`  POST http://localhost:${PORT}/api/upload`);
    console.log(`  GET  http://localhost:${PORT}/api/task/:taskId`);
    console.log(`  GET  http://localhost:${PORT}/api/health`);
  });
}

startServer();
