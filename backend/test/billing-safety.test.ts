import assert from 'node:assert/strict';
import test from 'node:test';
import {
  BILLING_ENABLED,
  buildPurchaseUnavailableResponse,
  buildTestPhaseBillingStatus,
} from '../src/security/billing.js';

test('测试期计费状态明确禁用支付且不伪造订阅', () => {
  const status = buildTestPhaseBillingStatus({ enterpriseStatus: 'APPROVED', activeJobCount: 3 });
  assert.equal(BILLING_ENABLED, false);
  assert.equal(status.billingEnabled, false);
  assert.equal(status.testMode, true);
  assert.equal(status.hasSubscription, false);
  assert.deepEqual(status.activeSubscriptions, []);
  assert.equal(status.totalQuota, -1);
  assert.equal(status.activeJobCount, 3);
  assert.equal(status.canPost, true);
});

test('被拒绝企业即使在测试期也不能发布职位', () => {
  const status = buildTestPhaseBillingStatus({ enterpriseStatus: 'REJECTED', activeJobCount: 0 });
  assert.equal(status.canPost, false);
});

test('购买接口固定返回不可用且不能表示支付成功', () => {
  const response = buildPurchaseUnavailableResponse();
  assert.equal(response.statusCode, 503);
  assert.equal(response.body.code, 'BILLING_NOT_AVAILABLE');
  assert.equal(response.body.billingEnabled, false);
  assert.equal('subscription' in response.body, false);
  assert.equal('status' in response.body, false);
});
