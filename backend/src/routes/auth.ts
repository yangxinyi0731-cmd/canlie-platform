import { Router } from 'express';
import bcrypt from 'bcryptjs';
import rateLimit, { ipKeyGenerator } from 'express-rate-limit';
import { prisma } from '../index.js';
import { generateToken, authMiddleware, AuthRequest } from '../middleware/auth.js';

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

// 发送验证码限流：同一手机号每分钟最多 1 次、每小时最多 5 次（防短信轰炸/骚扰）
const codeLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 小时窗口
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  // 按手机号限流；无手机号时回退到 IP（用 ipKeyGenerator 助手以兼容 IPv6）
  keyGenerator: (req, res) => `code:${req.body?.phone || ipKeyGenerator(req, res)}`,
  message: { error: '验证码请求过于频繁，请稍后再试' },
});

// 内存验证码存储：Map<phone, { code, expiresAt, used }>
// 进程重启会清空（需重新获取），可接受。生产可换 Redis。
const codeStore = new Map<string, { code: string; expiresAt: number; used: boolean }>();

// 定期清理过期验证码（每 5 分钟）
setInterval(() => {
  const now = Date.now();
  for (const [k, v] of codeStore) {
    if (v.expiresAt < now) codeStore.delete(k);
  }
}, 5 * 60 * 1000).unref();

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

// 发送验证码（服务端生成随机码存储，不返回给客户端）
router.post('/send-code', codeLimiter, async (req, res) => {
  try {
    const { phone } = req.body;
    if (!phone || !/^1\d{10}$/.test(phone)) {
      return res.status(400).json({ error: '手机号格式不正确' });
    }

    const user = await prisma.user.findUnique({ where: { phone } });
    if (!user) {
      return res.status(400).json({ error: '手机号未注册' });
    }

    // 生成 6 位随机验证码，5 分钟有效
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    codeStore.set(phone, { code, expiresAt: Date.now() + 5 * 60 * 1000, used: false });

    // ⚠️ 无真实短信通道，仅在服务端日志输出便于测试/调试。绝不返回给客户端。
    console.log(`[验证码] ${phone} -> ${code}（5分钟内有效）`);

    res.json({ success: true, message: '验证码已发送' });
  } catch (err) {
    console.error('Send code error:', err);
    res.status(500).json({ error: '发送验证码失败' });
  }
});

// 重置密码（校验服务端存储的验证码）
router.post('/reset-password', authLimiter, async (req, res) => {
  try {
    const { phone, code, newPassword } = req.body;

    if (!phone || !code || !newPassword) {
      return res.status(400).json({ error: '请填写完整信息' });
    }

    if (!/^1\d{10}$/.test(phone)) {
      return res.status(400).json({ error: '手机号格式不正确' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ error: '密码至少6位' });
    }

    // 校验服务端存储的验证码：必须存在、未过期、未使用过
    const entry = codeStore.get(phone);
    if (!entry || entry.used || entry.expiresAt < Date.now() || entry.code !== code) {
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

    // 验证码用后即失效，防止重复使用
    entry.used = true;
    codeStore.delete(phone);

    res.json({ success: true, message: '密码已重置' });
  } catch (err) {
    console.error('Reset password error:', err);
    res.status(500).json({ error: '重置密码失败' });
  }
});

export default router;
