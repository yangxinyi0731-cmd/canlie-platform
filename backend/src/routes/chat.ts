import { Router } from 'express';
import { prisma } from '../index.js';
import { authMiddleware, AuthRequest } from '../middleware/auth.js';
import { createNotification } from './notifications.js';

const router = Router();

// Get chat list (conversations)
router.get('/conversations', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const participants = await prisma.chatParticipant.findMany({
      where: { userId: req.userId },
      orderBy: { lastTime: 'desc' },
    });

    // Get other user info for each conversation
    const conversations = await Promise.all(
      participants.map(async (p) => {
        const otherUser = await prisma.user.findUnique({
          where: { id: p.chatWith },
          select: { id: true, name: true, avatar: true, role: true },
        });

        let otherProfile = null;
        if (otherUser?.role === 'ENTERPRISE') {
          otherProfile = await prisma.enterprise.findUnique({
            where: { userId: otherUser.id },
            select: { companyName: true, companyLogo: true },
          });
        } else if (otherUser?.role === 'TALENT') {
          otherProfile = await prisma.talent.findUnique({
            where: { userId: otherUser.id },
            select: { realName: true, title: true, avatar: true },
          });
        }

        let jobInfo = null;
        if (p.jobId) {
          jobInfo = await prisma.job.findUnique({
            where: { id: p.jobId },
            select: { id: true, title: true },
          });
        }

        return {
          id: p.id,
          chatWith: p.chatWith,
          jobId: p.jobId,
          unreadCount: p.unreadCount,
          lastMessage: p.lastMessage,
          lastTime: p.lastTime,
          otherUser,
          otherProfile,
          job: jobInfo,
        };
      })
    );

    res.json(conversations);
  } catch (err) {
    res.status(500).json({ error: '获取聊天列表失败' });
  }
});

// Get messages for a conversation
router.get('/messages/:chatWith', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const chatWith = req.params.chatWith as string;
    const jobId = req.query.jobId as string | undefined;
    const page = req.query.page as string || '1';
    const pageSize = req.query.pageSize as string || '50';
    const skip = (parseInt(page) - 1) * parseInt(pageSize);
    const take = parseInt(pageSize);

    const where: any = {
      OR: [
        { senderId: req.userId, receiverId: chatWith },
        { senderId: chatWith, receiverId: req.userId },
      ],
    };
    if (jobId) where.jobId = jobId;

    const [messages, total] = await Promise.all([
      prisma.chatMessage.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take,
        include: {
          sender: { select: { id: true, name: true, avatar: true, role: true } },
        },
      }),
      prisma.chatMessage.count({ where }),
    ]);

    // Mark messages as read
    await prisma.chatMessage.updateMany({
      where: { senderId: chatWith, receiverId: req.userId, read: false },
      data: { read: true },
    });

    // Reset unread count
    await prisma.chatParticipant.updateMany({
      where: { userId: req.userId, chatWith },
      data: { unreadCount: 0 },
    });

    res.json({ messages: messages.reverse(), total });
  } catch (err) {
    res.status(500).json({ error: '获取消息失败' });
  }
});

// Send message (via HTTP fallback)
router.post('/send', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { receiverId, content, jobId } = req.body;

    // 验证必填字段
    if (!receiverId || !content?.trim()) {
      return res.status(400).json({ error: '接收者和消息内容不能为空' });
    }
    if (content.length > 2000) {
      return res.status(400).json({ error: '消息内容过长' });
    }

    // 验证接收者是否存在
    const receiver = await prisma.user.findUnique({ where: { id: receiverId } });
    if (!receiver) {
      return res.status(400).json({ error: '接收者不存在' });
    }

    const message = await prisma.chatMessage.create({
      data: {
        senderId: req.userId!,
        receiverId,
        content: content.trim(),
        jobId: jobId || null,
      },
      include: {
        sender: { select: { id: true, name: true, avatar: true, role: true } },
      },
    });

    // Update or create participant records
    for (const uid of [req.userId!, receiverId]) {
      const existing = await prisma.chatParticipant.findFirst({
        where: { userId: uid, chatWith: uid === req.userId ? receiverId : req.userId! },
      });
      if (existing) {
        await prisma.chatParticipant.update({
          where: { id: existing.id },
          data: { lastMessage: content.trim(), lastTime: new Date(), unreadCount: uid === receiverId ? { increment: 1 } : 0 },
        });
      } else {
        await prisma.chatParticipant.create({
          data: {
            userId: uid,
            chatWith: uid === req.userId ? receiverId : req.userId!,
            jobId: jobId || null,
            lastMessage: content.trim(),
            lastTime: new Date(),
            unreadCount: uid === receiverId ? 1 : 0,
          },
        });
      }
    }

    // 通知接收方有新消息
    const sender = await prisma.user.findUnique({ where: { id: req.userId! }, select: { name: true } });
    await createNotification(
      receiverId,
      'MESSAGE',
      '收到新消息',
      `${sender?.name || '用户'}：${content.length > 30 ? content.slice(0, 30) + '...' : content}`,
      JSON.stringify({ chatWith: req.userId! })
    );

    res.json(message);
  } catch (err) {
    console.error('Send message error:', err);
    res.status(500).json({ error: '发送失败' });
  }
});

// Mark conversation as read
router.post('/read/:chatWith', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const chatWith = req.params.chatWith as string;
    await prisma.chatMessage.updateMany({
      where: { senderId: chatWith, receiverId: req.userId, read: false },
      data: { read: true },
    });
    await prisma.chatParticipant.updateMany({
      where: { userId: req.userId, chatWith },
      data: { unreadCount: 0 },
    });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: '操作失败' });
  }
});

export default router;
