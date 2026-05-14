import { Router } from 'express';
import { prisma } from '../index.js';
import { authMiddleware, AuthRequest } from '../middleware/auth.js';

const router = Router();

// Get matches for a job
router.get('/job/:jobId', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const jobId = req.params.jobId as string;
    const job = await prisma.job.findUnique({ where: { id: jobId } });
    if (!job) return res.status(404).json({ error: '职位不存在' });

    // Check permission
    const enterprise = await prisma.enterprise.findUnique({ where: { userId: req.userId } });
    if (!enterprise || job.enterpriseId !== enterprise.id) {
      if (req.userRole !== 'ADMIN') return res.status(403).json({ error: '权限不足' });
    }

    const matches = await prisma.match.findMany({
      where: { jobId },
      orderBy: { totalScore: 'desc' },
      include: {
        talent: {
          select: {
            id: true, realName: true, title: true, currentCompany: true, city: true,
            minSalary: true, maxSalary: true, workYears: true, education: true,
            starLevel: true, starLevelStr: true, brandEndorsement: true, avatar: true,
            cuisineIds: true, businessTypeIds: true,
          },
        },
      },
    });
    res.json(matches);
  } catch (err) {
    res.status(500).json({ error: '获取匹配结果失败' });
  }
});

// Get matches for a talent
router.get('/talent', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const talent = await prisma.talent.findUnique({ where: { userId: req.userId } });
    if (!talent) return res.status(400).json({ error: '人才信息不存在' });

    const matches = await prisma.match.findMany({
      where: { talentId: talent.id },
      orderBy: { totalScore: 'desc' },
      include: {
        job: {
          include: {
            enterprise: { select: { id: true, companyName: true, companyLogo: true, city: true } },
          },
        },
      },
    });
    res.json(matches);
  } catch (err) {
    res.status(500).json({ error: '获取匹配职位失败' });
  }
});

// Manual matching trigger
router.post('/run/:jobId', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const jobId = req.params.jobId as string;
    const job = await prisma.job.findUnique({ where: { id: jobId } });
    if (!job) return res.status(404).json({ error: '职位不存在' });

    // Find matching talents
    const talents = await prisma.talent.findMany({
      where: {
        status: 'ACTIVE',
        AND: [
          { minSalary: { lte: job.maxSalary } },
          { maxSalary: { gte: job.minSalary } },
        ],
      },
    });

    const matchResults = talents.map((talent) => {
      // Hard filters (simplified)
      const salaryOk = (!talent.minSalary || talent.minSalary <= job.maxSalary) &&
                       (!talent.maxSalary || talent.maxSalary >= job.minSalary);
      const cityOk = !talent.city || !job.city || talent.city === job.city;

      // Scoring dimensions (0-100)
      const salaryMatch = calculateSalaryMatch(job.minSalary, job.maxSalary, talent.minSalary || 0, talent.maxSalary || 0);
      const cuisineMatch = calculateCuisineMatch(job.cuisineIds || '', talent.cuisineIds || '');
      const experienceMatch = calculateExperienceMatch(job.experienceReq, talent.workYears);
      const brandMatch = talent.starLevel >= 3 ? 80 : 30;
      const stabilityMatch = calculateStability(talent);

      const totalScore = Math.round(
        (salaryMatch * 0.2 + cuisineMatch * 0.25 + (cityOk ? 15 : 0) + experienceMatch * 0.15 +
         brandMatch * 0.15 + stabilityMatch * 0.1) / 0.85 // normalize to 100
      );

      return {
        jobId: job.id,
        talentId: talent.id,
        score: totalScore,
        hardFilterPassed: salaryOk && cityOk,
        cuisineMatch,
        salaryMatch,
        cityMatch: cityOk ? 100 : 0,
        experienceMatch,
        educationMatch: 60,
        skillMatch: 60,
        brandMatch,
        stabilityMatch,
        totalScore: Math.min(totalScore, 100),
      };
    });

    // Upsert matches
    for (const m of matchResults) {
      await prisma.match.upsert({
        where: { jobId_talentId: { jobId: m.jobId, talentId: m.talentId } },
        update: m,
        create: m,
      });
    }

    res.json({ matched: matchResults.length, message: `匹配完成，找到 ${matchResults.length} 个候选人` });
  } catch (err) {
    console.error('Match error:', err);
    res.status(500).json({ error: '匹配失败' });
  }
});

function calculateSalaryMatch(jobMin: number, jobMax: number, talentMin: number, talentMax: number): number {
  const overlap = Math.min(jobMax, talentMax) - Math.max(jobMin, talentMin);
  if (overlap >= 0) {
    const range = Math.max(jobMax - jobMin, talentMax - talentMin, 1);
    return Math.min(100, (overlap / range) * 100);
  }
  return Math.max(0, 100 - (Math.abs(overlap) / Math.max(jobMin, talentMin)) * 50);
}

function calculateCuisineMatch(jobCuisines: string, talentCuisines: string): number {
  if (!jobCuisines || !talentCuisines) return 50;
  const jc = jobCuisines.split(',').map(s => s.trim());
  const tc = talentCuisines.split(',').map(s => s.trim());
  const overlap = jc.filter(c => tc.includes(c));
  if (jc.length === 0) return 50;
  return (overlap.length / jc.length) * 100;
}

function calculateExperienceMatch(required: number | null, actual: number | null): number {
  if (!required) return 80;
  if (!actual) return 40;
  if (actual >= required) return 100;
  return (actual / required) * 80;
}

function calculateStability(talent: any): number {
  let score = 50;
  if (talent.maritalStatus === 'MARRIED') score += 20;
  if (talent.hasChildren === true) score += 10;
  if (talent.workYears && talent.workYears >= 3) score += 20;
  return Math.min(100, score);
}

export default router;
