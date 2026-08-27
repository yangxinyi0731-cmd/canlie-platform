import { Router } from 'express';
import { prisma } from '../index.js';
import { authMiddleware, AuthRequest } from '../middleware/auth.js';

const router = Router();

// 获取我的通知列表
router.get('/', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const notifications = await prisma.notification.findMany({
      where: { userId: req.userId! },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    res.json(notifications);
  } catch (err) {
    res.status(500).json({ error: '获取通知失败' });
  }
});

// 获取未读数量
router.get('/unread-count', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const count = await prisma.notification.count({
      where: { userId: req.userId!, read: false },
    });
    res.json({ count });
  } catch (err) {
    res.status(500).json({ error: '获取未读数量失败' });
  }
});

// 标记单条通知已读
router.patch('/:id/read', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    if (typeof id !== 'string') {
      return res.status(400).json({ error: '通知 ID 格式不正确' });
    }

    const notification = await prisma.notification.update({
      where: { id },
      data: { read: true },
    });
    res.json(notification);
  } catch (err) {
    res.status(500).json({ error: '操作失败' });
  }
});

// 标记全部已读
router.post('/read-all', authMiddleware, async (req: AuthRequest, res) => {
  try {
    await prisma.notification.updateMany({
      where: { userId: req.userId!, read: false },
      data: { read: true },
    });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: '操作失败' });
  }
});

// 创建通知（内部使用）
export async function createNotification(
  userId: string,
  type: string,
  title: string,
  content: string,
  data?: string
) {
  try {
    await prisma.notification.create({
      data: { userId, type, title, content, data },
    });
  } catch (err) {
    console.error('Create notification error:', err);
  }
}

export default router;
