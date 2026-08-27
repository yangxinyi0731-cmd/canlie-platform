import { Server, Socket } from 'socket.io';
import { prisma } from './index.js';
import { createNotification } from './routes/notifications.js';
import { verifySocketToken } from './middleware/auth.js';
import { authorizeChatRelationship } from './security/chatAuthorization.js';
import { shouldMaskTalentIdentity } from './security/privacy.js';

const userSockets = new Map<string, string[]>();

export function setupSocketHandlers(io: Server, socket: Socket) {
  let currentUserId: string | null = null;

  // 加入房间 - 必须验证 token（旧版"无 token 兼容"分支已移除：任何人可冒充任意用户收发消息）
  socket.on('join', (data: { userId: string; token?: string } | undefined) => {
    if (!data || typeof data.userId !== 'string' || typeof data.token !== 'string') {
      socket.emit('authError', { error: '缺少认证令牌' });
      return;
    }
    const decoded = verifySocketToken(data.token);
    if (!decoded || decoded.userId !== data.userId) {
      socket.emit('authError', { error: '身份验证失败' });
      return;
    }
    currentUserId = data.userId;

    const existing = userSockets.get(currentUserId) || [];
    if (!existing.includes(socket.id)) {
      userSockets.set(currentUserId, [...existing, socket.id]);
    }
    socket.join(`user:${currentUserId}`);
  });

  // 发送消息
  socket.on('sendMessage', async (data: {
    senderId: string;
    receiverId: string;
    content: string;
    jobId?: string;
  }) => {
    // 验证发送者身份
    if (!data || !currentUserId || currentUserId !== data.senderId) {
      socket.emit('messageError', { error: '身份验证失败' });
      return;
    }

    // 验证消息内容
    if (typeof data.content !== 'string' || typeof data.receiverId !== 'string' || !data.content.trim()) {
      socket.emit('messageError', { error: '消息内容不能为空' });
      return;
    }

    if (data.content.length > 2000) {
      socket.emit('messageError', { error: '消息内容过长' });
      return;
    }
    if (data.jobId !== undefined && typeof data.jobId !== 'string') {
      socket.emit('messageError', { error: 'jobId 格式不正确' });
      return;
    }

    try {
      const access = await authorizeChatRelationship(
        prisma,
        data.senderId,
        data.receiverId,
        data.jobId,
      );
      if (!access.allowed) {
        socket.emit('messageError', { error: access.error });
        return;
      }

      // 创建消息记录
      const message = await prisma.chatMessage.create({
        data: {
          senderId: data.senderId,
          receiverId: data.receiverId,
          content: data.content.trim(),
          jobId: access.jobId,
        },
        include: {
          sender: {
            select: {
              id: true, name: true, role: true,
              talent: { select: { privacyMode: true } },
            },
          },
        },
      });

      // 发送给接收者
      const receiver = await prisma.user.findUnique({
        where: { id: data.receiverId },
        select: { role: true },
      });
      const maskSender = message.sender.role === 'TALENT'
        && shouldMaskTalentIdentity(receiver?.role, message.sender.talent?.privacyMode);
      const { talent: _senderTalent, ...publicSender } = message.sender;
      const publicMessage = { ...message, sender: publicSender };
      const receiverMessage = maskSender
        ? { ...publicMessage, sender: { ...publicSender, name: '匿名人才' } }
        : publicMessage;
      io.to(`user:${data.receiverId}`).emit('newMessage', receiverMessage);

      // 更新会话记录
      for (const uid of [data.senderId, data.receiverId]) {
        const chatWith = uid === data.senderId ? data.receiverId : data.senderId;
        const existing = await prisma.chatParticipant.findFirst({
          where: { userId: uid, chatWith },
        });
        if (existing) {
          await prisma.chatParticipant.update({
            where: { id: existing.id },
            data: {
              jobId: access.jobId,
              lastMessage: data.content,
              lastTime: new Date(),
              unreadCount: uid === data.receiverId ? { increment: 1 } : 0,
            },
          });
        } else {
          await prisma.chatParticipant.create({
            data: {
              userId: uid,
              chatWith,
              jobId: access.jobId,
              lastMessage: data.content,
              lastTime: new Date(),
              unreadCount: uid === data.receiverId ? 1 : 0,
            },
          });
        }
      }

      // 通知接收方
      const senderName = maskSender ? '匿名人才' : (message.sender.name || '用户');
      await createNotification(
        data.receiverId,
        'MESSAGE',
        '收到新消息',
        `${senderName}：${data.content.length > 30 ? data.content.slice(0, 30) + '...' : data.content}`,
        JSON.stringify({ chatWith: data.senderId, jobId: access.jobId })
      );

      // 确认发送成功
      socket.emit('messageSent', publicMessage);
    } catch (err) {
      console.error('Socket message error:', err);
      socket.emit('messageError', { error: '消息发送失败' });
    }
  });

  // 断开连接
  socket.on('disconnect', () => {
    if (currentUserId) {
      const sockets = userSockets.get(currentUserId) || [];
      const updated = sockets.filter(id => id !== socket.id);
      if (updated.length > 0) {
        userSockets.set(currentUserId, updated);
      } else {
        userSockets.delete(currentUserId);
      }
    }
  });
}
