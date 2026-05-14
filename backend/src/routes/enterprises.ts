import { Router } from 'express';
import { prisma } from '../index.js';
import { authMiddleware, requireRole, AuthRequest } from '../middleware/auth.js';

const router = Router();

// Get enterprise profile
router.get('/profile', authMiddleware, requireRole('ENTERPRISE'), async (req: AuthRequest, res) => {
  try {
    const enterprise = await prisma.enterprise.findUnique({
      where: { userId: req.userId },
      include: { _count: { select: { jobs: true } } },
    });
    if (!enterprise) return res.status(404).json({ error: '企业信息不存在' });
    res.json(enterprise);
  } catch (err) {
    res.status(500).json({ error: '获取企业信息失败' });
  }
});

// Update enterprise profile
router.put('/profile', authMiddleware, requireRole('ENTERPRISE'), async (req: AuthRequest, res) => {
  try {
    const { companyName, companyLogo, businessLicense, companySize, revenue, description, address, city, website, contactName, contactPhone } = req.body;

    // If businessLicense is being updated, reset verification status to PENDING
    const existing = await prisma.enterprise.findUnique({ where: { userId: req.userId } });
    const shouldResetVerification = businessLicense && existing?.businessLicense !== businessLicense;

    const enterprise = await prisma.enterprise.upsert({
      where: { userId: req.userId },
      update: {
        companyName,
        companyLogo,
        businessLicense,
        companySize,
        revenue,
        description,
        address,
        city,
        website,
        contactName,
        contactPhone,
        ...(shouldResetVerification ? { licenseVerified: false, status: 'PENDING' } : {}),
      },
      create: { userId: req.userId!, companyName: companyName || '', businessLicense },
    });
    res.json(enterprise);
  } catch (err) {
    console.error('Update enterprise error:', err);
    res.status(500).json({ error: '更新企业信息失败' });
  }
});

// Get all enterprises (for admin)
router.get('/', authMiddleware, requireRole('ADMIN'), async (_req, res) => {
  try {
    const enterprises = await prisma.enterprise.findMany({
      include: { user: { select: { phone: true, name: true, status: true } }, _count: { select: { jobs: true } } },
      orderBy: { createdAt: 'desc' },
    });
    res.json(enterprises);
  } catch (err) {
    res.status(500).json({ error: '获取企业列表失败' });
  }
});

// Approve/reject enterprise
router.put('/:id/verify', authMiddleware, requireRole('ADMIN'), async (req, res) => {
  try {
    const id = req.params.id as string;
    const { status } = req.body; // APPROVED, REJECTED
    const enterprise = await prisma.enterprise.update({
      where: { id },
      data: { status, licenseVerified: status === 'APPROVED' },
    });
    res.json(enterprise);
  } catch (err) {
    res.status(500).json({ error: '审核失败' });
  }
});

// Get public enterprise info
router.get('/:id', async (req, res) => {
  try {
    const enterprise = await prisma.enterprise.findUnique({
      where: { id: req.params.id },
      include: {
        jobs: {
          where: { status: 'ACTIVE' },
          select: { id: true, title: true, minSalary: true, maxSalary: true, city: true, createdAt: true },
          orderBy: { createdAt: 'desc' },
          take: 20,
        },
      },
    });
    if (!enterprise) return res.status(404).json({ error: '企业不存在' });
    res.json(enterprise);
  } catch (err) {
    res.status(500).json({ error: '获取企业信息失败' });
  }
});

export default router;
