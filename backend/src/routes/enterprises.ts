import { Router } from 'express';
import { prisma } from '../index.js';
import { authMiddleware, requireRole, AuthRequest } from '../middleware/auth.js';
import { ownsStoredUploadReferences } from '../security/storedUploadAuthorization.js';
import { buildPurchaseUnavailableResponse, buildTestPhaseBillingStatus } from '../security/billing.js';

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
    const {
      companyName, companyLogo, businessLicense, isPreparation,
      personalIdFront, personalIdBack,
      companySize, revenue, description, address, city, province,
      website, contactName, contactPhone, notes,
      businessModelDescription, developmentPlan, shareholderInfo,
      mainMarkets, welfareBenefits, currentStatus, bossInfo, equityOpportunity,
    } = req.body;

    // If businessLicense is being updated, reset verification status to PENDING
    const existing = await prisma.enterprise.findUnique({ where: { userId: req.userId } });
    const [logoAllowed, licenseAllowed, personalIdAllowed] = await Promise.all([
      companyLogo && companyLogo !== existing?.companyLogo
        ? ownsStoredUploadReferences({
          prisma,
          ownerId: req.userId!,
          urls: [companyLogo],
          purposes: ['ENTERPRISE_LOGO'],
          accessLevel: 'PUBLIC',
        })
        : true,
      businessLicense && businessLicense !== existing?.businessLicense
        ? ownsStoredUploadReferences({
          prisma,
          ownerId: req.userId!,
          urls: [businessLicense],
          purposes: ['ENTERPRISE_LICENSE'],
          accessLevel: 'PRIVATE',
        })
        : true,
      (personalIdFront && personalIdFront !== existing?.personalIdFront)
        || (personalIdBack && personalIdBack !== existing?.personalIdBack)
        ? ownsStoredUploadReferences({
          prisma,
          ownerId: req.userId!,
          urls: [
            personalIdFront !== existing?.personalIdFront ? personalIdFront : null,
            personalIdBack !== existing?.personalIdBack ? personalIdBack : null,
          ],
          purposes: ['PERSONAL_ID'],
          accessLevel: 'PRIVATE',
        })
        : true,
    ]);
    if (!logoAllowed || !licenseAllowed || !personalIdAllowed) {
      return res.status(400).json({ error: '上传文件不存在、用途不符或不属于当前账号' });
    }
    const shouldResetVerification = businessLicense && existing?.businessLicense !== businessLicense;

    const enterprise = await prisma.enterprise.upsert({
      where: { userId: req.userId! },
      update: {
        companyName,
        companyLogo,
        businessLicense,
        isPreparation: isPreparation || false,
        personalIdFront,
        personalIdBack,
        companySize,
        revenue,
        description,
        address,
        city,
        province,
        website,
        contactName,
        contactPhone,
        notes,
        businessModelDescription,
        developmentPlan,
        shareholderInfo,
        mainMarkets,
        welfareBenefits,
        currentStatus,
        bossInfo,
        equityOpportunity: equityOpportunity || false,
        ...(shouldResetVerification ? { licenseVerified: false, status: 'PENDING' } : {}),
      },
      create: {
        userId: req.userId!,
        companyName: companyName || '',
        companyLogo,
        businessLicense,
        isPreparation: isPreparation || false,
        personalIdFront,
        personalIdBack,
        companySize,
        revenue,
        description,
        address,
        city,
        province,
        website,
        contactName,
        contactPhone,
        notes,
        businessModelDescription,
        developmentPlan,
        shareholderInfo,
        mainMarkets,
        welfareBenefits,
        currentStatus,
        bossInfo,
        equityOpportunity: equityOpportunity || false,
      },
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
// ⚠️ 仅返回公开字段：公司名/简介/规模/城市/星级等。
// 严禁返回 businessLicense / personalIdFront/Back / contactPhone / revenue /
// shareholderInfo / bossInfo / notes / userId 等敏感字段（PIPL 合规）。
router.get('/:id', async (req, res) => {
  try {
    const enterprise = await prisma.enterprise.findUnique({
      where: { id: req.params.id },
      select: {
        id: true,
        companyName: true,
        companyLogo: true,
        licenseVerified: true,
        isPreparation: true,
        companySize: true,
        description: true,
        address: true,
        city: true,
        province: true,
        website: true,
        status: true,
        starLevel: true,
        starLevelStr: true,
        createdAt: true,
        jobs: {
          where: { status: 'ACTIVE' },
          select: { id: true, title: true, minSalary: true, maxSalary: true, city: true, province: true, createdAt: true },
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

// ========== Subscription / Payment Routes ==========

// Get enterprise subscription status (can they post?)
router.get('/subscription/status', authMiddleware, requireRole('ENTERPRISE'), async (req: AuthRequest, res) => {
  try {
    const enterprise = await prisma.enterprise.findUnique({ where: { userId: req.userId } });
    if (!enterprise) return res.status(404).json({ error: '企业信息不存在' });

    const activeJobCount = await prisma.job.count({
      where: { enterpriseId: enterprise.id, status: 'ACTIVE' },
    });
    res.json(buildTestPhaseBillingStatus({ enterpriseStatus: enterprise.status, activeJobCount }));
  } catch (err) {
    res.status(500).json({ error: '获取订阅状态失败' });
  }
});

// Purchase a subscription plan
router.post('/subscription/buy', authMiddleware, requireRole('ENTERPRISE'), async (req: AuthRequest, res) => {
  const unavailable = buildPurchaseUnavailableResponse();
  return res.status(unavailable.statusCode).json(unavailable.body);
});

export default router;
