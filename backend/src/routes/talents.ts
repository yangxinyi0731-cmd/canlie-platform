import { Router } from 'express';
import { prisma } from '../index.js';
import { authMiddleware, requireRole, AuthRequest } from '../middleware/auth.js';

const router = Router();

// Get talent profile
router.get('/profile', authMiddleware, requireRole('TALENT'), async (req: AuthRequest, res) => {
  try {
    const talent = await prisma.talent.findUnique({
      where: { userId: req.userId },
      include: {
        resumes: true,
        verifications: true,
        _count: { select: { jobApplications: true } },
      },
    });
    if (!talent) return res.status(404).json({ error: '人才信息不存在' });
    res.json(talent);
  } catch (err) {
    res.status(500).json({ error: '获取信息失败' });
  }
});

// Update talent profile
router.put('/profile', authMiddleware, requireRole('TALENT'), async (req: AuthRequest, res) => {
  try {
    const { realName, gender, birthYear, city, email, title, currentCompany, minSalary, maxSalary, workYears, education, maritalStatus, hasChildren, hometown, cuisineIds, businessTypeIds, selfIntro, brandEndorsement, headBrandExp, projectExp, acceptPartner, privacyMode, contactPrivacy, avatar } = req.body;

    const talent = await prisma.talent.update({
      where: { userId: req.userId },
      data: { realName, gender, birthYear, city, email, title, currentCompany, minSalary, maxSalary, workYears, education, maritalStatus, hasChildren, hometown, cuisineIds, businessTypeIds, selfIntro, brandEndorsement, headBrandExp, projectExp, acceptPartner, privacyMode, contactPrivacy, avatar },
    });

    // Also update user name
    if (realName) {
      await prisma.user.update({
        where: { id: req.userId },
        data: { name: realName, avatar },
      });
    }

    res.json(talent);
  } catch (err) {
    console.error('Update talent error:', err);
    res.status(500).json({ error: '更新信息失败' });
  }
});

// Upload verification material
router.post('/verification', authMiddleware, requireRole('TALENT'), async (req: AuthRequest, res) => {
  try {
    const { type, ...data } = req.body;
    const talent = await prisma.talent.findUnique({ where: { userId: req.userId } });
    if (!talent) return res.status(400).json({ error: '人才信息不存在' });

    const verification = await prisma.verification.create({
      data: { talentId: talent.id, type, ...data },
    });
    res.json(verification);
  } catch (err) {
    res.status(500).json({ error: '上传认证材料失败' });
  }
});

// Get verifications
router.get('/verifications', authMiddleware, requireRole('TALENT'), async (req: AuthRequest, res) => {
  try {
    const talent = await prisma.talent.findUnique({ where: { userId: req.userId } });
    if (!talent) return res.json([]);

    const verifications = await prisma.verification.findMany({
      where: { talentId: talent.id },
      orderBy: { createdAt: 'desc' },
    });
    res.json(verifications);
  } catch (err) {
    res.status(500).json({ error: '获取认证材料失败' });
  }
});

// Public talent search (for enterprises)
router.get('/search', authMiddleware, async (req, res) => {
  try {
    const { keyword, city, cuisineId, businessTypeId, minSalary, maxSalary, starLevel, page = '1', pageSize = '20' } = req.query;
    const skip = (parseInt(page as string) - 1) * parseInt(pageSize as string);
    const take = parseInt(pageSize as string);

    const where: any = { status: 'ACTIVE' };

    if (city) where.city = { contains: city as string };
    if (cuisineId) where.cuisineIds = { contains: cuisineId as string };
    if (businessTypeId) where.businessTypeIds = { contains: businessTypeId as string };
    if (minSalary) where.minSalary = { gte: parseInt(minSalary as string) };
    if (maxSalary) where.maxSalary = { lte: parseInt(maxSalary as string) };
    if (starLevel) where.starLevel = { gte: parseInt(starLevel as string) };
    if (keyword) {
      where.OR = [
        { title: { contains: keyword as string } },
        { realName: { contains: keyword as string } },
        { selfIntro: { contains: keyword as string } },
        { currentCompany: { contains: keyword as string } },
      ];
    }

    const [talents, total] = await Promise.all([
      prisma.talent.findMany({
        where,
        skip,
        take,
        orderBy: { starLevel: 'desc' },
        select: {
          id: true, realName: true, title: true, currentCompany: true, city: true,
          minSalary: true, maxSalary: true, workYears: true, education: true,
          starLevel: true, starLevelStr: true, brandEndorsement: true, avatar: true,
          cuisineIds: true, businessTypeIds: true,
        },
      }),
      prisma.talent.count({ where }),
    ]);

    res.json({ talents, total, page: parseInt(page as string), pageSize: take });
  } catch (err) {
    res.status(500).json({ error: '搜索人才失败' });
  }
});

// Get public talent detail (with privacy protection)
router.get('/:id', async (req, res) => {
  try {
    const talent = await prisma.talent.findUnique({
      where: { id: req.params.id },
      select: {
        id: true, userId: true, realName: true, title: true, currentCompany: true, city: true,
        minSalary: true, maxSalary: true, workYears: true, education: true,
        starLevel: true, starLevelStr: true, brandEndorsement: true, headBrandExp: true,
        projectExp: true, selfIntro: true, avatar: true, gender: true, birthYear: true,
        hometown: true, cuisineIds: true, businessTypeIds: true, acceptPartner: true,
        privacyMode: true,
      },
    });
    if (!talent) return res.status(404).json({ error: '人才不存在' });

    // Apply privacy: ANONYMOUS mode hides real name
    if (talent.privacyMode === 'ANONYMOUS') {
      talent.realName = '匿名人才';
    }
    delete (talent as any).privacyMode;

    res.json(talent);
  } catch (err) {
    res.status(500).json({ error: '获取人才信息失败' });
  }
});

export default router;
