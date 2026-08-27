import assert from 'node:assert/strict';
import test from 'node:test';
import type { PrismaClient } from '@prisma/client';
import { authorizeChatRelationship } from '../src/security/chatAuthorization.js';
import {
  buildStaleMatchCleanupWhere,
  canManageJob,
  canTransitionApplicationStatus,
  hasMatchDetailBusinessRelation,
  verificationSubmissionSchema,
  isApplicationStatusNoop,
  isVerificationReviewStatus,
} from '../src/security/policies.js';

test('认证材料拒绝 talentId/status 和其他批量赋值字段', () => {
  const result = verificationSubmissionSchema.safeParse({
    type: 'CERTIFICATE',
    certFileUrl: '/api/uploads/private/ck1234567890',
    talentId: 'another-talent',
    status: 'VERIFIED',
  });
  assert.equal(result.success, false);
});

test('认证材料按类型只接受对应字段和平台上传路径', () => {
  assert.equal(verificationSubmissionSchema.safeParse({
    type: 'REFERENCE',
    refName: '王经理',
    refTitle: '前任直属上级',
    refPhone: '138 0000 0000',
  }).success, true);

  assert.equal(verificationSubmissionSchema.safeParse({
    type: 'SALARY_FLOW',
    salaryFileUrl: 'https://attacker.example/forged.pdf',
  }).success, false);

  assert.equal(verificationSubmissionSchema.safeParse({
    type: 'CERTIFICATE',
    salaryFileUrl: '/api/uploads/private/ck0987654321',
  }).success, false);
});

test('投递状态机禁止终态回退并允许客户端幂等重试', () => {
  assert.equal(canTransitionApplicationStatus('PENDING', 'VIEWED'), true);
  assert.equal(canTransitionApplicationStatus('VIEWED', 'INTERVIEWED'), true);
  assert.equal(canTransitionApplicationStatus('INTERVIEWED', 'CONTACTED'), false);
  assert.equal(canTransitionApplicationStatus('ACCEPTED', 'VIEWED'), false);
  assert.equal(canTransitionApplicationStatus('REJECTED', 'ACCEPTED'), false);
  assert.equal(canTransitionApplicationStatus('ACCEPTED', 'ACCEPTED'), true);
  assert.equal(isApplicationStatusNoop('PENDING', 'PENDING'), true);
  assert.equal(isApplicationStatusNoop('VIEWED', 'VIEWED'), true);
  assert.equal(isApplicationStatusNoop('VIEWED', 'INTERVIEWED'), false);
});

test('认证审核只接受通过或驳回两个状态', () => {
  assert.equal(isVerificationReviewStatus('VERIFIED'), true);
  assert.equal(isVerificationReviewStatus('REJECTED'), true);
  assert.equal(isVerificationReviewStatus('PENDING'), false);
  assert.equal(isVerificationReviewStatus('APPROVED'), false);
  assert.equal(isVerificationReviewStatus({ status: 'VERIFIED' }), false);
});

test('运行/查看匹配只允许职位所属企业或管理员', () => {
  assert.equal(canManageJob('enterprise-owner', 'ENTERPRISE', 'enterprise-owner'), true);
  assert.equal(canManageJob('enterprise-other', 'ENTERPRISE', 'enterprise-owner'), false);
  assert.equal(canManageJob('admin', 'ADMIN', 'enterprise-owner'), true);
  assert.equal(canManageJob('talent', 'TALENT', 'enterprise-owner'), false);
});

test('非管理员匹配详情必须存在通过硬筛的匹配或同职位投递', () => {
  assert.equal(hasMatchDetailBusinessRelation(true, false), true);
  assert.equal(hasMatchDetailBusinessRelation(false, true), true);
  assert.equal(hasMatchDetailBusinessRelation(true, true), true);
  assert.equal(hasMatchDetailBusinessRelation(false, false), false);
});

test('本轮无匹配时清理职位全部旧结果，否则仅删除未保留人才', () => {
  assert.deepEqual(buildStaleMatchCleanupWhere('job-1', []), { jobId: 'job-1' });
  assert.deepEqual(buildStaleMatchCleanupWhere('job-1', ['talent-a', 'talent-b']), {
    jobId: 'job-1',
    talentId: { notIn: ['talent-a', 'talent-b'] },
  });
});

function prismaMock(
  users: Array<{ id: string; role: string; status: string }>,
  relatedJobId: string | null,
  onJobQuery?: (query: unknown) => void,
): PrismaClient {
  return {
    user: {
      findMany: async () => users,
    },
    job: {
      findFirst: async (query: unknown) => {
        onJobQuery?.(query);
        return relatedJobId ? { id: relatedJobId } : null;
      },
    },
  } as unknown as PrismaClient;
}

test('聊天禁止自聊且不依赖客户端 senderId 作为授权依据', async () => {
  const result = await authorizeChatRelationship(
    prismaMock([], null),
    'same-user',
    'same-user',
  );
  assert.equal(result.allowed, false);
  if (!result.allowed) assert.equal(result.status, 400);
});

test('聊天只允许企业与人才角色组合', async () => {
  const result = await authorizeChatRelationship(
    prismaMock([
      { id: 'enterprise-a', role: 'ENTERPRISE', status: 'ACTIVE' },
      { id: 'enterprise-b', role: 'ENTERPRISE', status: 'ACTIVE' },
    ], 'job-1'),
    'enterprise-a',
    'enterprise-b',
  );
  assert.equal(result.allowed, false);
  if (!result.allowed) assert.equal(result.status, 403);
});

test('聊天要求指定职位下存在投递或通过硬筛的匹配关系', async () => {
  let capturedQuery: any;
  const result = await authorizeChatRelationship(
    prismaMock([
      { id: 'enterprise-user', role: 'ENTERPRISE', status: 'ACTIVE' },
      { id: 'talent-user', role: 'TALENT', status: 'ACTIVE' },
    ], 'job-allowed', (query) => { capturedQuery = query; }),
    'enterprise-user',
    'talent-user',
    'job-allowed',
  );

  assert.equal(result.allowed, true);
  if (result.allowed) assert.equal(result.jobId, 'job-allowed');
  assert.equal(capturedQuery.where.id, 'job-allowed');
  assert.equal(capturedQuery.where.enterprise.userId, 'enterprise-user');
  assert.equal(capturedQuery.where.OR.length, 2);
  assert.equal(
    capturedQuery.where.OR[1].matches.some.hardFilterPassed,
    true,
  );
});

test('没有投递或匹配关系时聊天被拒绝', async () => {
  const result = await authorizeChatRelationship(
    prismaMock([
      { id: 'enterprise-user', role: 'ENTERPRISE', status: 'ACTIVE' },
      { id: 'talent-user', role: 'TALENT', status: 'ACTIVE' },
    ], null),
    'enterprise-user',
    'talent-user',
  );
  assert.equal(result.allowed, false);
  if (!result.allowed) assert.equal(result.status, 403);
});
