import { Router } from 'express';
import { prisma } from '../index.js';
import { authMiddleware, requireRole, AuthRequest } from '../middleware/auth.js';

const router = Router();

// All routes require admin
router.use(authMiddleware, requireRole('ADMIN'));

// Dashboard stats
router.get('/stats', async (_req, res) => {
  try {
    const [userCount, enterpriseCount, talentCount, jobCount, matchCount] = await Promise.all([
      prisma.user.count(),
      prisma.enterprise.count(),
      prisma.talent.count(),
      prisma.job.count(),
      prisma.match.count(),
    ]);
    res.json({ userCount, enterpriseCount, talentCount, jobCount, matchCount });
  } catch (err) {
    res.status(500).json({ error: '获取统计数据失败' });
  }
});

// List users
router.get('/users', async (req, res) => {
  try {
    const { page = '1', pageSize = '20', role } = req.query;
    const skip = (parseInt(page as string) - 1) * parseInt(pageSize as string);
    const where: any = {};
    if (role) where.role = role;

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip,
        take: parseInt(pageSize as string),
        orderBy: { createdAt: 'desc' },
        select: {
          id: true, phone: true, name: true, role: true, status: true, createdAt: true,
          enterprise: { select: { id: true, companyName: true, status: true, licenseVerified: true, businessLicense: true, contactName: true, contactPhone: true } },
          talent: { select: { id: true, realName: true, title: true, currentCompany: true, starLevel: true, starLevelStr: true } },
        },
      }),
      prisma.user.count({ where }),
    ]);
    res.json({ users, total, page: parseInt(page as string) });
  } catch (err) {
    res.status(500).json({ error: '获取用户列表失败' });
  }
});

// Toggle user status
router.patch('/users/:id/toggle', async (req, res) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.params.id } });
    if (!user) return res.status(404).json({ error: '用户不存在' });

    const updated = await prisma.user.update({
      where: { id: req.params.id },
      data: { status: user.status === 'ACTIVE' ? 'DISABLED' : 'ACTIVE' },
    });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: '操作失败' });
  }
});

// Verify talent star rating
router.put('/talents/:id/star', async (req, res) => {
  try {
    const { starLevel } = req.body;
    const starNames: Record<number, string> = { 0: '普通', 3: '三星', 4: '四星', 5: '五星', 6: '金牌' };
    const talent = await prisma.talent.update({
      where: { id: req.params.id },
      data: { starLevel, starLevelStr: starNames[starLevel as number] || '普通' },
    });
    res.json(talent);
  } catch (err) {
    res.status(500).json({ error: '更新星级失败' });
  }
});

// Verify enterprise
router.put('/enterprises/:id/verify', async (req, res) => {
  try {
    const { status } = req.body;
    const enterprise = await prisma.enterprise.update({
      where: { id: req.params.id },
      data: { status, licenseVerified: status === 'APPROVED' },
    });
    res.json(enterprise);
  } catch (err) {
    res.status(500).json({ error: '审核失败' });
  }
});

// List all pending verifications
router.get('/verifications', async (req, res) => {
  try {
    const verifications = await prisma.verification.findMany({
      where: { status: 'PENDING' },
      include: { talent: { select: { id: true, realName: true, userId: true } } },
      orderBy: { createdAt: 'desc' },
    });
    res.json(verifications);
  } catch (err) {
    res.status(500).json({ error: '获取认证列表失败' });
  }
});

// Get talent detail with work experiences (including background check data - admin only)
router.get('/talents/:id/detail', async (req, res) => {
  try {
    const talent = await prisma.talent.findUnique({
      where: { id: req.params.id },
      include: {
        user: { select: { phone: true, name: true, status: true } },
        workExperiences: { orderBy: [{ isCurrent: 'desc' }, { startYear: 'desc' }] },
        verifications: { orderBy: { createdAt: 'desc' } },
        _count: { select: { jobApplications: true } },
      },
    });
    if (!talent) return res.status(404).json({ error: '人才不存在' });
    res.json(talent);
  } catch (err) {
    res.status(500).json({ error: '获取人才详情失败' });
  }
});

// Approve/reject verification
router.put('/verifications/:id', async (req, res) => {
  try {
    const { status } = req.body;
    const verification = await prisma.verification.update({
      where: { id: req.params.id },
      data: { status },
    });
    res.json(verification);
  } catch (err) {
    res.status(500).json({ error: '操作失败' });
  }
});

export default router;
