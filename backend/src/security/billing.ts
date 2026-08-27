export const BILLING_ENABLED = false;

export function buildTestPhaseBillingStatus(input: {
  enterpriseStatus: string;
  activeJobCount: number;
}) {
  return {
    billingEnabled: BILLING_ENABLED,
    testMode: true,
    testPhaseMessage: '平台测试期免费开放职位发布，尚未接入支付。',
    hasSubscription: false,
    activeSubscriptions: [],
    totalQuota: -1,
    totalUsed: 0,
    remainingQuota: -1,
    activeJobCount: input.activeJobCount,
    canPost: input.enterpriseStatus !== 'REJECTED',
  };
}

export function buildPurchaseUnavailableResponse() {
  return {
    statusCode: 503,
    body: {
      error: '支付功能尚未接入，测试期无需购买套餐',
      code: 'BILLING_NOT_AVAILABLE',
      billingEnabled: BILLING_ENABLED,
      testMode: true,
    },
  };
}
