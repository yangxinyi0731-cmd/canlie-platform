import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import test from 'node:test';

import {
  createEnvironmentResetCodeSender,
  PasswordResetCodeService,
  type ResetCodeSender,
} from '../src/security/passwordReset.js';

const testPhone = `1${'0'.repeat(10)}`;

function testDigestSecret(): string {
  return randomBytes(32).toString('hex');
}

test('验证码仅保存摘要，验证成功后立即消费', async () => {
  let deliveredCode = '';
  const sender: ResetCodeSender = {
    async send(_phone, code) {
      deliveredCode = code;
    },
  };
  const service = new PasswordResetCodeService({
    digestSecret: testDigestSecret(),
    sender,
  });

  const result = await service.issue(testPhone);
  assert.equal(result.status, 'sent');
  assert.match(deliveredCode, /^\d{6}$/);
  assert.equal('code' in result, false);

  const internalEntry = (
    service as unknown as {
      pendingCodes: Map<string, { digest: Buffer; salt: Buffer; code?: string }>;
    }
  ).pendingCodes.get(testPhone);
  assert.ok(internalEntry);
  assert.equal(internalEntry.code, undefined);
  assert.ok(Buffer.isBuffer(internalEntry.digest));
  assert.ok(Buffer.isBuffer(internalEntry.salt));

  assert.equal(service.verifyAndConsume(testPhone, deliveredCode), true);
  assert.equal(service.verifyAndConsume(testPhone, deliveredCode), false);
});

test('验证码过期或连续失败达到上限后不可再使用', async () => {
  let now = Date.now();
  let deliveredCode = '';
  const sender: ResetCodeSender = {
    async send(_phone, code) {
      deliveredCode = code;
    },
  };
  const service = new PasswordResetCodeService({
    digestSecret: testDigestSecret(),
    sender,
    now: () => now,
    ttlMs: 60_000,
    maxVerifyAttempts: 2,
  });

  await service.issue(testPhone);
  now += 60_001;
  assert.equal(service.verifyAndConsume(testPhone, deliveredCode), false);

  now += 60_000;
  await service.issue(testPhone);
  const wrongCode = deliveredCode
    .split('')
    .map((digit, index) => index === 0 ? String((Number(digit) + 1) % 10) : digit)
    .join('');
  assert.notEqual(wrongCode, deliveredCode);
  assert.equal(service.verifyAndConsume(testPhone, wrongCode), false);
  assert.equal(service.verifyAndConsume(testPhone, wrongCode), false);
  assert.equal(service.verifyAndConsume(testPhone, deliveredCode), false);
});

test('发送失败不会留下可用验证码，短时间重复发送会被限制', async () => {
  let deliveredCode = '';
  let now = Date.now();
  let shouldFail = true;
  const sender: ResetCodeSender = {
    async send(_phone, code) {
      deliveredCode = code;
      if (shouldFail) throw new Error('synthetic provider failure');
    },
  };
  const service = new PasswordResetCodeService({
    digestSecret: testDigestSecret(),
    sender,
    now: () => now,
  });

  const failed = await service.issue(testPhone);
  assert.equal(failed.status, 'delivery_failed');
  assert.equal(service.verifyAndConsume(testPhone, deliveredCode), false);

  const limited = await service.issue(testPhone);
  assert.equal(limited.status, 'rate_limited');

  now += 60_000;
  shouldFail = false;
  const sent = await service.issue(testPhone);
  assert.equal(sent.status, 'sent');
  assert.equal(service.verifyAndConsume(testPhone, deliveredCode), true);
});

test('生产环境未配置安全短信通道时不创建发送器', async () => {
  const syntheticToken = randomBytes(16).toString('hex');
  assert.equal(createEnvironmentResetCodeSender({ NODE_ENV: 'production' }), null);
  assert.equal(createEnvironmentResetCodeSender({
    NODE_ENV: 'production',
    RESET_SMS_WEBHOOK_URL: 'http://localhost/reset-code',
    RESET_SMS_WEBHOOK_TOKEN: syntheticToken,
  }), null);
  assert.equal(createEnvironmentResetCodeSender({
    NODE_ENV: 'production',
    RESET_SMS_WEBHOOK_URL: 'https://sms.example.test/reset-code',
  }), null);

  let requestCount = 0;
  const sender = createEnvironmentResetCodeSender({
    NODE_ENV: 'production',
    RESET_SMS_WEBHOOK_URL: 'https://sms.example.test/reset-code',
    RESET_SMS_WEBHOOK_TOKEN: syntheticToken,
  }, async () => {
    requestCount += 1;
    return { ok: true };
  });
  assert.ok(sender);

  const service = new PasswordResetCodeService({
    digestSecret: testDigestSecret(),
    sender,
  });
  const result = await service.issue(testPhone);
  assert.equal(result.status, 'sent');
  assert.equal(requestCount, 1);
});

test('开发环境只允许 HTTPS 或本机 HTTP mock 通道', () => {
  assert.equal(createEnvironmentResetCodeSender({
    NODE_ENV: 'development',
    RESET_SMS_WEBHOOK_URL: 'http://example.test/reset-code',
  }), null);

  const localSender = createEnvironmentResetCodeSender({
    NODE_ENV: 'development',
    RESET_SMS_WEBHOOK_URL: 'http://127.0.0.1:9876/reset-code',
  }, async () => ({ ok: true }));
  assert.ok(localSender);
});
