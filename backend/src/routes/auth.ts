import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { prisma } from '../index.js';
import { generateToken, authMiddleware, AuthRequest } from '../middleware/auth.js';

const router = Router();

// Register
router.post('/register', async (req, res) => {
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

    const hashed = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: {
        phone,
        password: hashed,
        role: role || 'TALENT',
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
router.post('/login', async (req, res) => {
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

// 发送验证码（模拟，固定验证码123456）
router.post('/send-code', async (req, res) => {
  try {
    const { phone } = req.body;
    if (!phone || !/^1\d{10}$/.test(phone)) {
      return res.status(400).json({ error: '手机号格式不正确' });
    }

    const user = await prisma.user.findUnique({ where: { phone } });
    if (!user) {
      return res.status(400).json({ error: '手机号未注册' });
    }

    // 模拟发送验证码（实际项目中应调用短信服务）
    // 这里返回固定验证码用于测试
    res.json({ success: true, message: '验证码已发送', code: '123456' });
  } catch (err) {
    console.error('Send code error:', err);
    res.status(500).json({ error: '发送验证码失败' });
  }
});

// 重置密码
router.post('/reset-password', async (req, res) => {
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

    // 验证验证码（模拟，固定验证码123456）
    if (code !== '123456') {
      return res.status(400).json({ error: '验证码错误' });
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
  } catch (err) {
    console.error('Reset password error:', err);
    res.status(500).json({ error: '重置密码失败' });
  }
});

export default router;
