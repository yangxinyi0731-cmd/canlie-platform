import { Router } from 'express';
import { prisma } from '../index.js';
import { authMiddleware, AuthRequest } from '../middleware/auth.js';
import { createNotification } from './notifications.js';
import { authorizeChatRelationship } from '../security/chatAuthorization.js';
import { shouldMaskTalentIdentity } from '../security/privacy.js';

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
        // 历史参与记录不能充当授权凭证；每次读取都按当前投递/匹配关系重新校验。
        const access = await authorizeChatRelationship(
          prisma,
          req.userId!,
          p.chatWith,
        );
        if (!access.allowed) return null;

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
            select: { realName: true, title: true, avatar: true, privacyMode: true },
          });
          if (shouldMaskTalentIdentity(req.userRole, otherProfile?.privacyMode)) {
            otherUser.name = '匿名人才';
            otherUser.avatar = null;
            if (otherProfile) {
              otherProfile.realName = '匿名人才';
              otherProfile.avatar = null;
            }
          }
        }

        let jobInfo = null;
        // ChatParticipant.jobId 是历史缓存字段，展示时使用本次授权解析出的职位，
        // 避免旧记录或被污染的 jobId 被当成可信上下文。
        const conversationJobId = access.jobId;
        if (conversationJobId) {
          jobInfo = await prisma.job.findUnique({
            where: { id: conversationJobId },
            select: { id: true, title: true },
          });
        }

        return {
          id: p.id,
          chatWith: p.chatWith,
          jobId: conversationJobId,
          unreadCount: p.unreadCount,
          lastMessage: p.lastMessage,
          lastTime: p.lastTime,
          otherUser,
          otherProfile,
          job: jobInfo,
        };
      })
    );

    res.json(conversations.filter((conversation) => conversation !== null));
  } catch (err) {
    res.status(500).json({ error: '获取聊天列表失败' });
  }
});

// Get messages for a conversation
router.get('/messages/:chatWith', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const chatWith = req.params.chatWith as string;
    if (req.query.jobId !== undefined && typeof req.query.jobId !== 'string') {
      return res.status(400).json({ error: 'jobId 格式不正确' });
    }
    const jobId = req.query.jobId as string | undefined;
    const access = await authorizeChatRelationship(prisma, req.userId!, chatWith, jobId);
    if (!access.allowed) {
      return res.status(access.status).json({ error: access.error });
    }

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
          sender: {
            select: {
              id: true, name: true, avatar: true, role: true,
              talent: { select: { privacyMode: true } },
            },
          },
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

    const safeMessages = messages.reverse().map((message) => {
      const { talent: senderTalent, ...publicSender } = message.sender;
      if (!shouldMaskTalentIdentity(req.userRole, senderTalent?.privacyMode)) {
        return { ...message, sender: publicSender };
      }
      return {
        ...message,
        sender: { ...publicSender, name: '匿名人才', avatar: null },
      };
    });
    res.json({ messages: safeMessages, total });
  } catch (err) {
    res.status(500).json({ error: '获取消息失败' });
  }
});

// Send message (via HTTP fallback)
router.post('/send', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { receiverId, content, jobId } = req.body;

    // 验证必填字段
    if (typeof receiverId !== 'string' || typeof content !== 'string' || !content.trim()) {
      return res.status(400).json({ error: '接收者和消息内容不能为空' });
    }
    if (content.length > 2000) {
      return res.status(400).json({ error: '消息内容过长' });
    }
    if (jobId !== undefined && typeof jobId !== 'string') {
      return res.status(400).json({ error: 'jobId 格式不正确' });
    }

    const access = await authorizeChatRelationship(prisma, req.userId!, receiverId, jobId);
    if (!access.allowed) {
      return res.status(access.status).json({ error: access.error });
    }

    const message = await prisma.chatMessage.create({
      data: {
        senderId: req.userId!,
        receiverId,
        content: content.trim(),
        jobId: access.jobId,
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
          data: {
            jobId: access.jobId,
            lastMessage: content.trim(),
            lastTime: new Date(),
            unreadCount: uid === receiverId ? { increment: 1 } : 0,
          },
        });
      } else {
        await prisma.chatParticipant.create({
          data: {
            userId: uid,
            chatWith: uid === req.userId ? receiverId : req.userId!,
            jobId: access.jobId,
            lastMessage: content.trim(),
            lastTime: new Date(),
            unreadCount: uid === receiverId ? 1 : 0,
          },
        });
      }
    }

    // 通知接收方有新消息
    const [sender, receiver] = await Promise.all([
      prisma.user.findUnique({
        where: { id: req.userId! },
        select: { name: true, role: true, talent: { select: { privacyMode: true } } },
      }),
      prisma.user.findUnique({ where: { id: receiverId }, select: { role: true } }),
    ]);
    const senderName = sender?.role === 'TALENT'
      && shouldMaskTalentIdentity(receiver?.role, sender.talent?.privacyMode)
      ? '匿名人才'
      : (sender?.name || '用户');
    await createNotification(
      receiverId,
      'MESSAGE',
      '收到新消息',
      `${senderName}：${content.length > 30 ? content.slice(0, 30) + '...' : content}`,
      JSON.stringify({ chatWith: req.userId!, jobId: access.jobId })
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
    const access = await authorizeChatRelationship(prisma, req.userId!, chatWith);
    if (!access.allowed) {
      return res.status(access.status).json({ error: access.error });
    }

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
