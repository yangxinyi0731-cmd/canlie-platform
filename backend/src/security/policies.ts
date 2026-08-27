import { z } from 'zod';

const uploadPathSchema = z
  .string()
  .trim()
  .regex(
    /^\/uploads\/[A-Za-z0-9][A-Za-z0-9._-]{0,254}$/,
    '认证文件必须来自平台上传接口',
  );

const referenceVerificationSchema = z.object({
  type: z.literal('REFERENCE'),
  refName: z.string().trim().min(1, '请填写推荐人姓名').max(50),
  refTitle: z.string().trim().min(1, '请填写推荐人职位').max(100),
  refPhone: z
    .string()
    .trim()
    .regex(/^[0-9+()\-\s]{5,30}$/, '推荐人联系电话格式不正确'),
}).strict();

const certificateVerificationSchema = z.object({
  type: z.literal('CERTIFICATE'),
  certFileUrl: uploadPathSchema,
}).strict();

const salaryFlowVerificationSchema = z.object({
  type: z.literal('SALARY_FLOW'),
  salaryFileUrl: uploadPathSchema,
}).strict();

/**
 * 人才提交认证材料时唯一允许的载荷。
 *
 * 每个分支都使用 strict()，因此 talentId、status 以及任何未声明字段都会被拒绝，
 * 审核状态始终由服务端在创建记录时固定为 PENDING。
 */
export const verificationSubmissionSchema = z.discriminatedUnion('type', [
  referenceVerificationSchema,
  certificateVerificationSchema,
  salaryFlowVerificationSchema,
]);

export type VerificationSubmission = z.infer<typeof verificationSubmissionSchema>;

export const APPLICATION_STATUSES = [
  'PENDING',
  'VIEWED',
  'CONTACTED',
  'INTERVIEWED',
  'REJECTED',
  'ACCEPTED',
] as const;

export type ApplicationStatus = typeof APPLICATION_STATUSES[number];

const applicationTransitions: Record<ApplicationStatus, readonly ApplicationStatus[]> = {
  PENDING: ['VIEWED', 'CONTACTED', 'INTERVIEWED', 'REJECTED', 'ACCEPTED'],
  VIEWED: ['CONTACTED', 'INTERVIEWED', 'REJECTED', 'ACCEPTED'],
  CONTACTED: ['REJECTED', 'ACCEPTED'],
  INTERVIEWED: ['REJECTED', 'ACCEPTED'],
  REJECTED: [],
  ACCEPTED: [],
};

export function isApplicationStatus(value: unknown): value is ApplicationStatus {
  return typeof value === 'string'
    && (APPLICATION_STATUSES as readonly string[]).includes(value);
}

/** 已录用/已拒绝为终态；允许相同状态重放，方便客户端安全重试。 */
export function canTransitionApplicationStatus(
  current: string,
  next: ApplicationStatus,
): boolean {
  if (!isApplicationStatus(current)) return false;
  if (current === next) return true;
  return applicationTransitions[current].includes(next);
}

export function isApplicationStatusNoop(current: string, next: ApplicationStatus): boolean {
  return isApplicationStatus(current) && current === next;
}

export function isVerificationReviewStatus(value: unknown): value is 'VERIFIED' | 'REJECTED' {
  return value === 'VERIFIED' || value === 'REJECTED';
}

/** 非管理员读取匹配详情时，必须已有该职位下的匹配或投递业务关系。 */
export function hasMatchDetailBusinessRelation(
  hasHardFilterMatch: boolean,
  hasApplication: boolean,
): boolean {
  return hasHardFilterMatch || hasApplication;
}

/**
 * 本轮匹配结束后保留通过硬筛的人才，删除该职位其余陈旧结果。
 * 空数组时不能生成 `notIn: []`，而是直接清理该职位的全部匹配。
 */
export function buildStaleMatchCleanupWhere(jobId: string, retainedTalentIds: string[]) {
  return retainedTalentIds.length > 0
    ? { jobId, talentId: { notIn: retainedTalentIds } }
    : { jobId };
}

export function canManageJob(
  userId: string | undefined,
  userRole: string | undefined,
  ownerUserId: string,
): boolean {
  return userRole === 'ADMIN'
    || (userRole === 'ENTERPRISE' && Boolean(userId) && userId === ownerUserId);
}

export function isChatRolePairAllowed(firstRole: string, secondRole: string): boolean {
  return (firstRole === 'ENTERPRISE' && secondRole === 'TALENT')
    || (firstRole === 'TALENT' && secondRole === 'ENTERPRISE');
}
