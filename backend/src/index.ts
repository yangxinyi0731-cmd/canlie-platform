import express from 'express';
import cors from 'cors';
import http from 'http';
import { Server as SocketIOServer } from 'socket.io';
import path from 'path';
import { fileURLToPath } from 'url';
import { PrismaClient } from '@prisma/client';

import authRoutes from './routes/auth.js';
import enterpriseRoutes from './routes/enterprises.js';
import talentRoutes from './routes/talents.js';
import jobRoutes from './routes/jobs.js';
import chatRoutes from './routes/chat.js';
import matchRoutes from './routes/matches.js';
import adminRoutes from './routes/admin.js';
import cuisineRoutes from './routes/cuisines.js';
import uploadRoutes from './routes/upload.js';
import notificationRoutes from './routes/notifications.js';
import { setupSocketHandlers } from './socket.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export const prisma = new PrismaClient();

const app = express();
const server = http.createServer(app);

// 生产环境配置
const isProduction = process.env.NODE_ENV === 'production';
const frontendDistPath = path.join(__dirname, '../../frontend/dist');

// Socket.IO 配置
const io = new SocketIOServer(server, {
  cors: {
    origin: isProduction ? false : '*',
    methods: ['GET', 'POST'],
  },
  path: '/socket.io',
});

// CORS 配置
app.use(cors({
  origin: isProduction ? false : '*',
  credentials: true,
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/enterprises', enterpriseRoutes);
app.use('/api/talents', talentRoutes);
app.use('/api/jobs', jobRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/matches', matchRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/cuisines', cuisineRoutes);
app.use('/api/uploads', uploadRoutes);
app.use('/api/notifications', notificationRoutes);

// Health check endpoint
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

// 生产环境：服务前端静态文件
if (isProduction) {
  app.use(express.static(frontendDistPath));

  // 所有非 API 路由返回 index.html (SPA 支持)
  app.get('*', (_req, res) => {
    res.sendFile(path.join(frontendDistPath, 'index.html'));
  });
}

// Socket.IO
io.on('connection', (socket) => {
  setupSocketHandlers(io, socket);
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
  if (isProduction) {
    console.log(`📦 Serving frontend from ${frontendDistPath}`);
  }
});

export { app, server, io };
