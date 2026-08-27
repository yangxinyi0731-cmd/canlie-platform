import type { PrismaClient } from '@prisma/client';
import { isChatRolePairAllowed } from './policies.js';

export type ChatAuthorizationResult =
  | {
    allowed: true;
    jobId: string;
    enterpriseUserId: string;
    talentUserId: string;
  }
  | {
    allowed: false;
    status: 400 | 403 | 404;
    error: string;
  };

/**
 * HTTP 与 Socket.IO 共用的聊天对象级授权。
 *
 * 合法关系必须同时满足：
 * 1. 双方不是同一用户，账号均存在且启用；
 * 2. 一方是企业、一方是人才；
 * 3. 企业名下职位与该人才之间存在投递，或存在通过硬筛的匹配记录；
 * 4. 客户端传入 jobId 时，关系必须精确属于该职位。
 */
export async function authorizeChatRelationship(
  prisma: PrismaClient,
  requesterId: string,
  otherUserId: string,
  requestedJobId?: string,
): Promise<ChatAuthorizationResult> {
  if (!requesterId || !otherUserId) {
    return { allowed: false, status: 400, error: '聊天双方不能为空' };
  }
  if (requesterId === otherUserId) {
    return { allowed: false, status: 400, error: '不能给自己发送消息' };
  }
  const normalizedJobId = requestedJobId?.trim();
  if (requestedJobId !== undefined && !normalizedJobId) {
    return { allowed: false, status: 400, error: 'jobId 格式不正确' };
  }

  const users = await prisma.user.findMany({
    where: { id: { in: [requesterId, otherUserId] } },
    select: { id: true, role: true, status: true },
  });
  if (users.length !== 2) {
    return { allowed: false, status: 404, error: '聊天对象不存在' };
  }

  const requester = users.find((user) => user.id === requesterId)!;
  const otherUser = users.find((user) => user.id === otherUserId)!;
  if (requester.status !== 'ACTIVE' || otherUser.status !== 'ACTIVE') {
    return { allowed: false, status: 403, error: '聊天对象当前不可用' };
  }
  if (!isChatRolePairAllowed(requester.role, otherUser.role)) {
    return { allowed: false, status: 403, error: '仅有招聘业务关系的企业与人才可以聊天' };
  }

  const enterpriseUserId = requester.role === 'ENTERPRISE' ? requester.id : otherUser.id;
  const talentUserId = requester.role === 'TALENT' ? requester.id : otherUser.id;

  const relatedJob = await prisma.job.findFirst({
    where: {
      ...(normalizedJobId ? { id: normalizedJobId } : {}),
      enterprise: { userId: enterpriseUserId },
      OR: [
        {
          applications: {
            some: { talent: { userId: talentUserId } },
          },
        },
        {
          matches: {
            some: {
              talent: { userId: talentUserId },
              hardFilterPassed: true,
            },
          },
        },
      ],
    },
    select: { id: true },
    orderBy: normalizedJobId ? undefined : { updatedAt: 'desc' },
  });

  if (!relatedJob) {
    return {
      allowed: false,
      status: 403,
      error: normalizedJobId
        ? '该职位下不存在可聊天的投递或匹配关系'
        : '双方不存在可聊天的投递或匹配关系',
    };
  }

  return {
    allowed: true,
    jobId: relatedJob.id,
    enterpriseUserId,
    talentUserId,
  };
}
