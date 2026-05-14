import jwt from 'jsonwebtoken';
import { Request, Response, NextFunction } from 'express';

// JWT Secret - 生产环境必须设置环境变量
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  console.warn('⚠️  WARNING: JWT_SECRET not set! Using insecure default. Set JWT_SECRET environment variable for production.');
}
const SECRET = JWT_SECRET || 'dev-secret-change-in-production';

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
