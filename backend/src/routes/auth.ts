import { Router } from 'express';
import bcrypt from 'bcryptjs';
import rateLimit, { ipKeyGenerator } from 'express-rate-limit';
import { prisma } from '../index.js';
import { generateToken, authMiddleware, AuthRequest } from '../middleware/auth.js';
import {
  createEnvironmentResetCodeSender,
  PasswordResetCodeService,
} from '../security/passwordReset.js';
import { ownsStoredUploadReferences } from '../security/storedUploadAuthorization.js';

const router = Router();

// 认证接口专用限流：登录/注册每分钟最多 10 次/IP（防暴力破解与撞库）
// trust proxy=1 已设置，默认 keyGenerator 用 req.ip 取真实 IP 且原生支持 IPv6
const authLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: '尝试过于频繁，请稍后再试' },
});

function requestPhone(req: { body?: unknown }): string {
  if (!req.body || typeof req.body !== 'object' || !('phone' in req.body)) return '';
  const phone = (req.body as { phone?: unknown }).phone;
  return typeof phone === 'string' ? phone.trim() : '';
}

function requestIpKey(req: { ip?: string; socket: { remoteAddress?: string } }): string {
  return ipKeyGenerator(req.ip ?? req.socket.remoteAddress ?? 'unknown');
}

// 短时限流：同一手机号或来源每分钟最多请求 1 次。
const codeBurstLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 1,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => `code-minute:${requestPhone(req) || requestIpKey(req)}`,
  message: { error: '验证码请求过于频繁，请稍后再试' },
});

// 长时限流：同一手机号或来源每小时最多请求 5 次，防短信轰炸。
const codeHourlyLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 小时窗口
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => `code-hour:${requestPhone(req) || requestIpKey(req)}`,
  message: { error: '验证码请求过于频繁，请稍后再试' },
});

// 密码重置尝试同时按手机号与来源限制；单个验证码内部另有 5 次失败上限。
const resetPasswordLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => `reset:${requestPhone(req) || 'missing'}:${requestIpKey(req)}`,
  message: { error: '重置尝试过于频繁，请稍后再试' },
});

const resetDigestSecret = process.env.PASSWORD_RESET_HASH_SECRET || process.env.JWT_SECRET;
if (!resetDigestSecret) {
  throw new Error('JWT_SECRET or PASSWORD_RESET_HASH_SECRET is required for password reset.');
}
const passwordResetCodes = new PasswordResetCodeService({
  digestSecret: resetDigestSecret,
  sender: createEnvironmentResetCodeSender(),
});

// Register
router.post('/register', authLimiter, async (req, res) => {
  try {
    const { phone, password, role, name } = req.body;

    if (!phone || !password) {
      return res.status(400).json({ error: '手机号和密码不能为空' });
    }

    if (!/^1\d{10}$/.test(phone)) {
      return res.status(400).json({ error: '手机号格式不正确' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: '密码至少6位' });
    }

    const existing = await prisma.user.findUnique({ where: { phone } });
    if (existing) {
      return res.status(400).json({ error: '该手机号已注册' });
    }
    // 仅允许注册 TALENT / ENTERPRISE，禁止自注册为 ADMIN（防越权）
    const safeRole = role === 'ENTERPRISE' ? 'ENTERPRISE' : 'TALENT';
    const hashed = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: {
        phone,
        password: hashed,
        role: safeRole,
        name,
      },
      select: { id: true, phone: true, role: true, name: true, createdAt: true },
    });

    // Create role-specific profile
    let profile = null;
    if (user.role === 'ENTERPRISE') {
      await prisma.enterprise.create({
        data: { userId: user.id, companyName: name || '' },
      });
      profile = await prisma.enterprise.findUnique({ where: { userId: user.id } });
    } else if (user.role === 'TALENT') {
      await prisma.talent.create({
        data: { userId: user.id },
      });
      profile = await prisma.talent.findUnique({ where: { userId: user.id } });
    }

    const token = generateToken(user.id, user.role);
    res.json({ token, user: { ...user, profile } });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ error: '注册失败，请稍后重试' });
  }
});

// Login
router.post('/login', authLimiter, async (req, res) => {
  try {
    const { phone, password } = req.body;
    if (!phone || !password) {
      return res.status(400).json({ error: '手机号和密码不能为空' });
    }

    const user = await prisma.user.findUnique({
      where: { phone },
      select: { id: true, phone: true, password: true, role: true, name: true, status: true, avatar: true },
    });

    if (!user) {
      return res.status(400).json({ error: '手机号未注册' });
    }
    if (user.status === 'DISABLED') {
      return res.status(403).json({ error: '账号已被禁用' });
    }

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      return res.status(400).json({ error: '密码错误' });
    }

    const token = generateToken(user.id, user.role);
    const { password: _, ...userInfo } = user;

    // Include profile data in login response
    let profile = null;
    if (user.role === 'ENTERPRISE') {
      profile = await prisma.enterprise.findUnique({ where: { userId: user.id } });
    } else if (user.role === 'TALENT') {
      profile = await prisma.talent.findUnique({ where: { userId: user.id } });
    }

    res.json({ token, user: { ...userInfo, profile } });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: '登录失败' });
  }
});

// Get current user
router.get('/me', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      select: { id: true, phone: true, role: true, name: true, avatar: true, status: true, createdAt: true },
    });
    if (!user) return res.status(404).json({ error: '用户不存在' });

    let profile = null;
    if (user.role === 'ENTERPRISE') {
      profile = await prisma.enterprise.findUnique({ where: { userId: user.id } });
    } else if (user.role === 'TALENT') {
      profile = await prisma.talent.findUnique({ where: { userId: user.id } });
    }

    res.json({ ...user, profile });
  } catch (err) {
    res.status(500).json({ error: '获取用户信息失败' });
  }
});

// Update profile
router.put('/profile', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { name, avatar } = req.body;
    const currentUser = await prisma.user.findUnique({
      where: { id: req.userId },
      select: { avatar: true },
    });
    if (avatar && avatar !== currentUser?.avatar && !await ownsStoredUploadReferences({
      prisma,
      ownerId: req.userId!,
      urls: [avatar],
      purposes: ['AVATAR'],
      accessLevel: 'PUBLIC',
    })) {
      return res.status(400).json({ error: '头像文件不存在、用途不符或不属于当前账号' });
    }
    const user = await prisma.user.update({
      where: { id: req.userId },
      data: { name, avatar },
      select: { id: true, phone: true, role: true, name: true, avatar: true },
    });
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: '更新失败' });
  }
});

// 发送一次性验证码。响应、页面和日志均不得包含验证码明文。
router.post('/send-code', codeBurstLimiter, codeHourlyLimiter, async (req, res) => {
  try {
    res.set('Cache-Control', 'no-store');
    const phone = requestPhone(req);
    if (!/^1\d{10}$/.test(phone)) {
      return res.status(400).json({ error: '手机号格式不正确' });
    }

    // 未配置短信通道时对所有手机号统一返回 503，避免产生无法送达的验证码。
    if (!passwordResetCodes.isDeliveryConfigured()) {
      return res.status(503).json({ error: '短信服务未配置，暂时无法重置密码' });
    }

    const genericResponse = {
      success: true,
      message: '如果该手机号已注册，验证码将通过短信发送',
    };
    const user = await prisma.user.findUnique({
      where: { phone },
      select: { id: true },
    });
    if (!user) {
      // 与已注册账号使用一致的成功状态和文案，避免手机号枚举。
      return res.status(202).json(genericResponse);
    }

    const issueResult = await passwordResetCodes.issue(phone);
    if (issueResult.status === 'rate_limited') {
      res.set('Retry-After', String(issueResult.retryAfterSeconds));
      return res.status(429).json({ error: '验证码请求过于频繁，请稍后再试' });
    }
    if (issueResult.status === 'unavailable') {
      return res.status(503).json({ error: '短信服务未配置，暂时无法重置密码' });
    }
    if (issueResult.status === 'delivery_failed') {
      // 不记录手机号、验证码、供应商响应或请求体。
      console.warn('Password reset delivery failed.');
      return res.status(202).json(genericResponse);
    }

    return res.status(202).json(genericResponse);
  } catch {
    console.error('Password reset request failed.');
    res.status(500).json({ error: '发送验证码失败' });
  }
});

// 重置密码：验证码验证成功即同步消费，不能重复使用。
router.post('/reset-password', resetPasswordLimiter, async (req, res) => {
  try {
    res.set('Cache-Control', 'no-store');
    const phone = requestPhone(req);
    const code = typeof req.body?.code === 'string' ? req.body.code.trim() : '';
    const newPassword = typeof req.body?.newPassword === 'string' ? req.body.newPassword : '';

    if (!phone || !code || !newPassword) {
      return res.status(400).json({ error: '请填写完整信息' });
    }

    if (!/^1\d{10}$/.test(phone)) {
      return res.status(400).json({ error: '手机号格式不正确' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ error: '密码至少6位' });
    }

    if (!/^\d{6}$/.test(code) || !passwordResetCodes.verifyAndConsume(phone, code)) {
      return res.status(400).json({ error: '验证码错误或已过期' });
    }

    const user = await prisma.user.findUnique({ where: { phone } });
    if (!user) {
      return res.status(400).json({ error: '手机号未注册' });
    }

    const hashed = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({
      where: { id: user.id },
      data: { password: hashed },
    });

    res.json({ success: true, message: '密码已重置' });
  } catch {
    console.error('Password reset failed.');
    res.status(500).json({ error: '重置密码失败' });
  }
});

export default router;
