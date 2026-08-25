import jwt from 'jsonwebtoken';
import { Request, Response, NextFunction } from 'express';

// JWT Secret：生产环境必须设置环境变量，否则拒绝启动（防止用硬编码默认值上线）
const isProduction = process.env.NODE_ENV === 'production';
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  if (isProduction) {
    console.error('❌ FATAL: JWT_SECRET 未设置。生产环境必须通过环境变量配置 JWT_SECRET。');
    process.exit(1);
  }
  console.warn('⚠️  WARNING: JWT_SECRET not set! Using insecure default (DEV ONLY). Set JWT_SECRET env var for production.');
}
const SECRET = JWT_SECRET || 'canlie-dev-secret-v2-20240804';

export interface AuthRequest extends Request {
  userId?: string;
  userRole?: string;
}

export function generateToken(userId: string, role: string): string {
  return jwt.sign({ userId, role }, SECRET, { expiresIn: '7d' });
}

export function authMiddleware(req: AuthRequest, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return res.status(401).json({ error: '未登录，请先登录' });
  }
  try {
    const token = header.slice(7);
    const decoded = jwt.verify(token, SECRET) as { userId: string; role: string };
    req.userId = decoded.userId;
    req.userRole = decoded.role;
    next();
  } catch {
    return res.status(401).json({ error: '登录已过期，请重新登录' });
  }
}

export function requireRole(...roles: string[]) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.userRole || !roles.includes(req.userRole)) {
      return res.status(403).json({ error: '权限不足' });
    }
    next();
  };
}

// 验证 WebSocket token
export function verifySocketToken(token: string): { userId: string; role: string } | null {
  try {
    return jwt.verify(token, SECRET) as { userId: string; role: string };
  } catch {
    return null;
  }
}
