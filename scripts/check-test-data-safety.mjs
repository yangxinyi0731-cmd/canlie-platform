import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), 'utf8');
const seed = read('backend/src/seed.ts');
const enterpriseRoutes = read('backend/src/routes/enterprises.ts');
const billingPolicy = read('backend/src/security/billing.ts');
const webSource = read('frontend/src/pages/PostJob.tsx');
const miniSource = read('miniprogram/src/pages/post-job/index.tsx');

const problems = [];
if (!seed.includes("if (process.env.NODE_ENV === 'production')")) {
  problems.push('演示 seed 缺少生产环境硬阻断');
}
if (!seed.includes("const DEMO_DATA_PREFIX = '[TEST]'")) {
  problems.push('演示资料缺少统一测试标记');
}
if (/\b\d{17}[0-9Xx]\b/.test(seed)) {
  problems.push('演示 seed 中出现了拟真身份证号');
}
if (/@example\.com\b/.test(seed)) {
  problems.push('演示 seed 应使用 example.invalid 邮箱域名');
}
if (enterpriseRoutes.includes('enterpriseSubscription.create')) {
  problems.push('购买接口仍可直接创建订阅记录');
}
if (!billingPolicy.includes('BILLING_NOT_AVAILABLE')) {
  problems.push('购买接口没有明确的支付未接入响应');
}
if (/subscriptionApi\.buy|选择发布方案|确认发布.*¥/s.test(`${webSource}\n${miniSource}`)) {
  problems.push('客户端仍包含伪购买或套餐选择流程');
}

if (problems.length > 0) {
  console.error(`测试数据与支付安全检查失败（${problems.length} 项）`);
  for (const problem of problems) console.error(`- ${problem}`);
  process.exit(1);
}

console.log('测试数据与支付安全检查通过：支付硬禁用，演示数据已隔离。');
