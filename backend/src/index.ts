import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
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
import supplyRoutes from './routes/supply.js';
import shareRoutes from './routes/shares.js';
import { setupSocketHandlers } from './socket.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export const prisma = new PrismaClient();

const app = express();
const server = http.createServer(app);

// 生产环境配置
const isProduction = process.env.NODE_ENV === 'production';
const frontendDistPath = path.join(__dirname, '../../frontend/dist');

// 信任反向代理（Cloudflare Tunnel / ngrok），以便 req.ip 取到真实客户端 IP 用于限流
// 设置为 1（只信任第一层代理），生产用 CF 隧道
app.set('trust proxy', 1);

// 是否对外提供 HTTPS。当前部署为 http-only（无证书、阿里云安全组未开 443），
// 故 HSTS / upgrade-insecure-requests 必须关闭——否则浏览器会把 http 资源升级为 https 请求
// 而 443 不通，导致 JS/CSS 全部加载失败 → 白屏。上 HTTPS 后设 SERVE_HTTPS=true 即可自动启用。
const serveHttps = process.env.SERVE_HTTPS === 'true';

// 安全响应头：隐藏 X-Powered-By、设置 CSP/HSTS/X-Frame-Options 等
app.use(helmet({
  contentSecurityPolicy: isProduction ? {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:', 'blob:', 'https://ui-avatars.com'],
      mediaSrc: ["'self'", 'blob:'],
      connectSrc: ["'self'"],
      fontSrc: ["'self'", 'data:'],
      objectSrc: ["'none'"],
      frameAncestors: ["'none'"],
      // 仅在 HTTPS 下升级不安全请求；http 部署开启会致资源加载失败
      // Helmet/CSP 以空数组表示无参数指令；null 表示不发送该指令。
      upgradeInsecureRequests: serveHttps ? [] : null,
    },
  } : false,
  crossOriginEmbedderPolicy: false,
  hsts: serveHttps ? { maxAge: 31536000, includeSubDomains: true, preload: true } : false,
}));

// Socket.IO 配置
const io = new SocketIOServer(server, {
  cors: {
    origin: isProduction ? false : '*',
    methods: ['GET', 'POST'],
  },
  path: '/socket.io',
  // 限制单连接负载，缓解零附件内存耗尽（CVE 已修，额外加固）
  maxHttpBufferSize: 1e6,
});

// CORS 配置
app.use(cors({
  origin: isProduction ? false : '*',
  credentials: true,
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(path.join(__dirname, '../uploads'), {
  setHeaders: (res) => {
    // 上传内容一律按附件下载，禁止当 HTML/脚本执行（防 XSS via 上传）
    res.setHeader('Content-Disposition', 'attachment');
    res.setHeader('X-Content-Type-Options', 'nosniff');
  },
}));

// 全局 API 限流：每个客户端 IP 每分钟最多 120 次请求（常规使用够用，防扫描/暴力）
// trust proxy=1 已设置，默认 keyGenerator 自动用 req.ip 取真实客户端 IP，且原生支持 IPv6
const globalLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: '请求过于频繁，请稍后再试' },
});
app.use('/api/', globalLimiter);

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
app.use('/api/supply', supplyRoutes);
app.use('/api/shares', shareRoutes);

// Health check endpoint（含数据库探活，便于监控/CF 健康检查）
app.get('/api/health', async (_req, res) => {
  try {
    // 轻量探活：能查到 1 条用户即认为数据库连通
    await prisma.user.findFirst({ select: { id: true }, take: 1 });
    res.json({ status: 'ok', time: new Date().toISOString(), db: 'ok' });
  } catch (e) {
    res.status(503).json({ status: 'degraded', time: new Date().toISOString(), db: 'error' });
  }
});

// 生产环境：服务前端静态文件
if (isProduction) {
  // 带 hash 的静态资源（JS/CSS/图片）可以长期缓存
  app.use('/assets', express.static(path.join(frontendDistPath, 'assets'), {
    maxAge: '30d',
    immutable: true,
  }));

  // 其他静态文件（不含 hash 的入口文件）
  app.use(express.static(frontendDistPath, {
    setHeaders: (res, filePath) => {
      // 入口文件禁止缓存，确保每次都加载最新版本
      if (filePath.endsWith('index.html') || filePath.endsWith('.webmanifest') || filePath.endsWith('sw.js')) {
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');
      }
    },
  }));

  // 所有非 API 路由返回 index.html (SPA 支持)，禁止缓存
  app.get('*', (_req, res) => {
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.sendFile(path.join(frontendDistPath, 'index.html'));
  });
}

// Socket.IO
io.on('connection', (socket) => {
  setupSocketHandlers(io, socket);
});

const PORT = process.env.PORT || 3001;
const serverInstance = server.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
  if (isProduction) {
    console.log(`📦 Serving frontend from ${frontendDistPath}`);
  }
});

// 优雅关闭：PM2 重启 / 系统关机时先停止接收新连接，处理完存量再退出
let shuttingDown = false;
async function gracefulShutdown(signal: string) {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log(`\n${signal} received, shutting down gracefully...`);
  // 1) 关闭 Socket.IO（断开所有客户端连接）
  io.close();
  // 2) HTTP 停止接收新请求
  serverInstance.close(() => {
    console.log('HTTP server closed.');
  });
  // 3) 关闭数据库连接
  try {
    await prisma.$disconnect();
    console.log('Prisma disconnected.');
  } catch (e) {
    console.error('Prisma disconnect error:', e);
  }
  // 给存量请求最多 8 秒处理完，然后强制退出
  setTimeout(() => {
    console.log('Forcing exit.');
    process.exit(0);
  }, 8000).unref();
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
// 未捕获异常不直接崩，记日志后退出（PM2 会拉起）
process.on('uncaughtException', (err) => {
  console.error('UncaughtException:', err);
});
process.on('unhandledRejection', (reason) => {
  console.error('UnhandledRejection:', reason);
});

export { app, server, io };
