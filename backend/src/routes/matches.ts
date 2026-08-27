import { Router } from 'express';
import type { Prisma } from '@prisma/client';
import { prisma } from '../index.js';
import { authMiddleware, AuthRequest } from '../middleware/auth.js';
import {
  buildStaleMatchCleanupWhere,
  canManageJob,
  hasMatchDetailBusinessRelation,
} from '../security/policies.js';
import { canRevealTalentIdentity, toTalentDetailResponse } from '../security/privacy.js';

const router = Router();

// ========== 通用辅助函数 ==========

// 学历等级映射（兼容中英文及历史数字字符串）
function eduLevel(v: string | null | undefined): number {
  if (!v) return 0;
  const map: Record<string, number> = {
    '不限': 0, '学历不限': 0, '1': 0,
    '初中及以下': 1, '2': 1,
    '中专': 1, '中专/中技': 1, '3': 1, HIGH_SCHOOL: 1,
    '高中': 1, '4': 1,
    '大专': 2, ASSOCIATE: 2, '5': 2,
    '本科': 3, BACHELOR: 3, '6': 3,
    '硕士': 4, MASTER: 4, '7': 4,
    '博士': 5, DOCTOR: 5, '8': 5,
  };
  return map[v] || 0;
}

// 企业资料丰富度评分（AI 画像软评分依据）
function enterpriseProfileScore(ent: any): number {
  if (!ent) return 40;
  let s = 0;
  if (ent.companySize) s += 15;
  if (ent.description && ent.description.length > 50) s += 15;
  if (ent.licenseVerified) s += 15;
  if (ent.developmentPlan) s += 10;
  if (ent.mainMarkets) s += 10;
  if (ent.welfareBenefits) s += 10;
  if (ent.currentStatus) s += 10;
  if (ent.bossInfo) s += 10;
  if (ent.equityOpportunity) s += 5;
  return Math.min(100, s);
}

// ========== 企业星级自动评估 ==========

function evaluateEnterpriseStar(enterprise: any, activeJobCount: number, hasActiveSub: boolean): { starLevel: number; starLevelStr: string; score: number; breakdown: Record<string, number> } {
  // 规模与实力 (35%)
  const sizeScores: Record<string, number> = { '2000+': 100, '500-2000': 80, '200-500': 60, '50-200': 40, '1-50': 25 };
  const sizeScore = sizeScores[enterprise.companySize || ''] || 15;

  const revenueScore = enterprise.revenue ? 60 : 20;

  const jobScore = activeJobCount >= 10 ? 100 : activeJobCount >= 5 ? 80 : activeJobCount >= 3 ? 60 : activeJobCount >= 1 ? 40 : 10;

  const scaleScore = sizeScore * 0.4 + revenueScore * 0.2 + jobScore * 0.4;

  // 信誉 (25%)
  const licenseScore = enterprise.licenseVerified ? 90 : 30;
  const statusScore = enterprise.status === 'APPROVED' ? 90 : enterprise.status === 'PENDING' ? 35 : 0;
  const subScore = hasActiveSub ? 80 : 35;
  const bossScore = enterprise.bossInfo ? 80 : 25;
  const credibilityScore = licenseScore * 0.3 + statusScore * 0.3 + subScore * 0.2 + bossScore * 0.2;

  // 发展潜力 (25%)
  const planScore = enterprise.developmentPlan ? 80 : 20;
  const marketScore = enterprise.mainMarkets ? 80 : 20;
  const bmScore = enterprise.businessModelDescription ? 80 : 20;
  const shareholderScore = enterprise.shareholderInfo ? 70 : 20;
  const currentStatusScore = enterprise.currentStatus ? 80 : 20;
  const equityScore = enterprise.equityOpportunity ? 80 : 20;
  const growthScore = planScore * 0.25 + marketScore * 0.2 + bmScore * 0.2 + shareholderScore * 0.15 + currentStatusScore * 0.1 + equityScore * 0.1;

  // 薪酬福利 (15%)
  const welfareScore = enterprise.welfareBenefits ? 80 : 20;
  const descScore = (enterprise.description?.length || 0) > 200 ? 80 : (enterprise.description?.length || 0) > 50 ? 50 : 20;
  const compensationScore = welfareScore * 0.6 + descScore * 0.4;

  const totalScore = Math.round(scaleScore * 0.35 + credibilityScore * 0.25 + growthScore * 0.25 + compensationScore * 0.15);

  const starLevel = totalScore >= 85 ? 6 : totalScore >= 70 ? 5 : totalScore >= 55 ? 4 : totalScore >= 40 ? 3 : 0;
  const starLevelStr = starLevel === 6 ? '金牌' : starLevel === 5 ? '五星' : starLevel === 4 ? '四星' : starLevel === 3 ? '三星' : '普通';

  return {
    starLevel,
    starLevelStr,
    score: totalScore,
    breakdown: {
      scaleScore: Math.round(scaleScore),
      credibilityScore: Math.round(credibilityScore),
      growthScore: Math.round(growthScore),
      compensationScore: Math.round(compensationScore),
    },
  };
}

// ========== 人才星级自动评估 ==========

function evaluateTalentStar(talent: any, workExperiences: any[]): { starLevel: number; starLevelStr: string; score: number; breakdown: Record<string, number> } {
  // 经验与技能 (40%)
  const wy = talent.workYears || 0;
  const workYearsScore = wy >= 15 ? 100 : wy >= 10 ? 80 : wy >= 5 ? 60 : wy >= 3 ? 40 : wy >= 1 ? 20 : 10;

  const eduScores: Record<number, number> = { 5: 90, 4: 75, 3: 60, 2: 40, 1: 25 };
  const educationScore = eduScores[eduLevel(talent.education)] || 15;

  const titleScore = talent.title ? 50 : 15;

  const expScore = workYearsScore * 0.5 + educationScore * 0.25 + titleScore * 0.25;

  // 品牌与项目 (25%)
  const brandScore = talent.brandEndorsement ? 85 : 25;
  const headBrandScore = talent.headBrandExp ? 80 : 25;
  const projectScore = talent.projectExp ? 75 : 25;
  const brandDetailScore = talent.brandExperienceDetail ? 75 : 25;
  const brandTotalScore = brandScore * 0.3 + headBrandScore * 0.3 + projectScore * 0.2 + brandDetailScore * 0.2;

  // 稳定性 (20%)
  let stabilityBase = 20;
  if (talent.maritalStatus === 'MARRIED') stabilityBase += 25;
  if (talent.hasChildren) stabilityBase += 15;
  if (talent.parentInfo) stabilityBase += 10;

  // 检查是否有3年以上工作经历
  const hasLongTenure = workExperiences.some((exp: any) => {
    const startYear = exp.startYear;
    const endYear = exp.isCurrent ? new Date().getFullYear() : (exp.endYear || startYear);
    return (endYear - startYear) >= 3;
  });
  if (hasLongTenure) stabilityBase += 20;
  const hasLongTenure5 = workExperiences.some((exp: any) => {
    const endYear = exp.isCurrent ? new Date().getFullYear() : (exp.endYear || exp.startYear);
    return (endYear - exp.startYear) >= 5;
  });
  if (hasLongTenure5) stabilityBase += 10;
  if (wy >= 5) stabilityBase += 10;

  const stabilityScore = Math.min(100, stabilityBase);

  // 成长与合伙意愿 (15%)
  const learningScore = talent.learningAbility ? 80 : 30;
  const thinkingScore = talent.thinkingStyle ? 80 : 25;
  const skillsScore = talent.personalSkills ? 80 : 30;
  const partnerScore = talent.acceptPartner ? 80 : 30;
  const projectDetailScore = talent.projectExpDetail ? 85 : 25;
  const growthScore = learningScore * 0.25 + thinkingScore * 0.2 + skillsScore * 0.2 + partnerScore * 0.2 + projectDetailScore * 0.15;

  const totalScore = Math.round(expScore * 0.40 + brandTotalScore * 0.25 + stabilityScore * 0.20 + growthScore * 0.15);

  const starLevel = totalScore >= 85 ? 6 : totalScore >= 70 ? 5 : totalScore >= 55 ? 4 : totalScore >= 40 ? 3 : 0;
  const starLevelStr = starLevel === 6 ? '金牌' : starLevel === 5 ? '五星' : starLevel === 4 ? '四星' : starLevel === 3 ? '三星' : '普通';

  return {
    starLevel,
    starLevelStr,
    score: totalScore,
    breakdown: {
      expScore: Math.round(expScore),
      brandTotalScore: Math.round(brandTotalScore),
      stabilityScore,
      growthScore: Math.round(growthScore),
    },
  };
}

// ========== 综合匹配算法 ==========

function getAgeFromBirth(talent: any): number | null {
  if (!talent.birthYear) return null;
  const now = new Date().getFullYear();
  return now - talent.birthYear;
}

function calculateComprehensiveMatch(job: any, talent: any, talentWorkExps: any[], enterprise?: any): {
  hardFilterPassed: boolean;
  hardFilterReasons: string[];
  scores: Record<string, number>;
  totalScore: number;
} {
  const hardFilterReasons: string[] = [];
  let hardFilterPassed = true;

  // ===== 硬性过滤 =====
  // 1. 薪资范围重叠
  const salaryOverlap = (talent.minSalary || 0) <= (job.maxSalary || 999999) && (talent.maxSalary || 0) >= (job.minSalary || 0);
  if (!salaryOverlap) { hardFilterPassed = false; hardFilterReasons.push('薪资不匹配'); }

  // 2. 城市/省份匹配
  const cityMatch = !job.city || !talent.city || job.city === talent.city;
  const provinceMatch = !job.province || !talent.province || job.province === talent.province;
  if (!cityMatch && !provinceMatch) { hardFilterPassed = false; hardFilterReasons.push('地域不匹配'); }

  // 3. 年龄要求
  const talentAge = getAgeFromBirth(talent);
  if (job.ageMin && talentAge && talentAge < job.ageMin) { hardFilterPassed = false; hardFilterReasons.push('年龄不符(偏小)'); }
  if (job.ageMax && talentAge && talentAge > job.ageMax) { hardFilterPassed = false; hardFilterReasons.push('年龄不符(偏大)'); }

  // 4. 婚姻要求
  if (job.maritalReq && talent.maritalStatus && job.maritalReq !== talent.maritalStatus) {
    hardFilterPassed = false; hardFilterReasons.push('婚姻状况不符');
  }

  // 5. 子女要求
  if (job.childrenReq === 'YES' && !talent.hasChildren) { hardFilterPassed = false; hardFilterReasons.push('需要已有子女'); }
  if (job.childrenReq === 'NO' && talent.hasChildren) { hardFilterPassed = false; hardFilterReasons.push('要求无子女'); }

  // 6. 学历要求（兼容中英文枚举）
  if (job.educationReq && talent.education) {
    const reqLevel = eduLevel(job.educationReq);
    const talentLevel = eduLevel(talent.education);
    if (talentLevel < reqLevel) { hardFilterPassed = false; hardFilterReasons.push('学历不符'); }
  }

  // 7. 经验年限要求
  if (job.experienceReq && (talent.workYears || 0) < job.experienceReq) {
    hardFilterPassed = false; hardFilterReasons.push('经验年限不足');
  }

  // 8. 性别要求
  if (job.genderReq && talent.gender && job.genderReq !== talent.gender) {
    hardFilterPassed = false; hardFilterReasons.push('性别不符');
  }

  // 9. 单单位任职时长要求（3年/5年）
  let longestTenure = 0;
  for (const exp of talentWorkExps) {
    const endY = exp.isCurrent ? new Date().getFullYear() : (exp.endYear || exp.startYear);
    longestTenure = Math.max(longestTenure, endY - exp.startYear);
  }
  if (job.minTenureReq && job.minTenureReq > 0 && longestTenure < job.minTenureReq) {
    hardFilterPassed = false; hardFilterReasons.push('任职时长不足');
  }

  // ===== 软性评分 =====
  const scores: Record<string, number> = {};

  // 1. 薪资匹配 (0-100)
  const tMin = talent.minSalary || 0;
  const tMax = talent.maxSalary || 999999;
  const jMin = job.minSalary || 0;
  const jMax = job.maxSalary || 999999;
  const overlap = Math.min(jMax, tMax) - Math.max(jMin, tMin);
  if (overlap >= 0) {
    const range = Math.max(jMax - jMin, tMax - tMin, 1);
    scores.salaryMatch = Math.min(100, Math.round((overlap / range) * 100));
  } else {
    scores.salaryMatch = Math.max(0, 100 - Math.round((Math.abs(overlap) / Math.max(jMin, tMin, 1)) * 50));
  }

  // 2. 菜系匹配 (0-100)
  const jobCuisines = (job.cuisineIds || '').split(',').map((s: string) => s.trim()).filter(Boolean);
  const talentCuisines = (talent.cuisineIds || '').split(',').map((s: string) => s.trim()).filter(Boolean);
  if (jobCuisines.length === 0 || talentCuisines.length === 0) {
    scores.cuisineMatch = 50;
  } else {
    const overlapC = jobCuisines.filter((c: string) => talentCuisines.includes(c));
    scores.cuisineMatch = Math.round((overlapC.length / jobCuisines.length) * 100);
  }

  // 3. 业态匹配 (0-100)
  const jobBizTypes = (job.businessTypeIds || '').split(',').map((s: string) => s.trim()).filter(Boolean);
  const talentBizTypes = (talent.businessTypeIds || '').split(',').map((s: string) => s.trim()).filter(Boolean);
  if (jobBizTypes.length === 0 || talentBizTypes.length === 0) {
    scores.businessMatch = 50;
  } else {
    const overlapB = jobBizTypes.filter((b: string) => talentBizTypes.includes(b));
    scores.businessMatch = Math.round((overlapB.length / jobBizTypes.length) * 100);
  }

  // 4. 地域匹配 (0-100)
  if (cityMatch) scores.cityMatch = 100;
  else if (provinceMatch) scores.cityMatch = 70;
  else scores.cityMatch = 20;

  // 5. 经验匹配 (0-100)
  if (!job.experienceReq) {
    scores.experienceMatch = 80;
  } else if (!talent.workYears) {
    scores.experienceMatch = 40;
  } else if (talent.workYears >= job.experienceReq) {
    scores.experienceMatch = Math.min(100, 80 + (talent.workYears - job.experienceReq) * 5);
  } else {
    scores.experienceMatch = Math.round((talent.workYears / job.experienceReq) * 80);
  }

  // 6. 学历匹配 (0-100)
  if (!job.educationReq || !talent.education) {
    scores.educationMatch = 60;
  } else {
    const reqLvl = eduLevel(job.educationReq);
    const talLvl = eduLevel(talent.education);
    if (talLvl >= reqLvl) scores.educationMatch = Math.min(100, 70 + (talLvl - reqLvl) * 15);
    else scores.educationMatch = Math.round((talLvl / reqLvl) * 60);
  }

  // 7. 品牌价值 (0-100)
  let brandVal = 25;
  if (talent.brandEndorsement) brandVal += 25;
  if (talent.headBrandExp) brandVal += 20;
  if (talent.brandExperienceDetail) brandVal += 15;
  if (talent.projectExp) brandVal += 15;
  scores.brandMatch = Math.min(100, brandVal);

  // 8. 稳定性 (0-100)
  let stability = 25;
  if (talent.maritalStatus === 'MARRIED') stability += 20;
  if (talent.hasChildren) stability += 12;
  if (talent.parentInfo) stability += 8;
  const hasLongTenure = talentWorkExps.some((exp: any) => {
    const endY = exp.isCurrent ? new Date().getFullYear() : (exp.endYear || exp.startYear);
    return (endY - exp.startYear) >= 3;
  });
  if (hasLongTenure) stability += 20;
  if ((talent.workYears || 0) >= 5) stability += 15;
  scores.stabilityMatch = Math.min(100, stability);

  // 9. 成长潜力 (0-100)
  let growth = 25;
  if (talent.learningAbility) growth += 25;
  if (talent.thinkingStyle && talent.thinkingStyle.includes('灵活')) growth += 20;
  if (talent.personalSkills) growth += 20;
  if (talent.selfIntro && talent.selfIntro.length > 50) growth += 10;
  scores.growthMatch = Math.min(100, growth);

  // 10. 合伙意愿 (0-100)
  if (job.openPartner && talent.acceptPartner) {
    scores.partnerMatch = 95;
  } else if (job.openPartner && !talent.acceptPartner) {
    scores.partnerMatch = 20;
  } else if (!job.openPartner && talent.acceptPartner) {
    scores.partnerMatch = 50;
  } else {
    scores.partnerMatch = 60;
  }

  // 11. 年龄适配 (0-100)
  if (!job.ageMin && !job.ageMax) {
    scores.ageMatch = 70;
  } else if (!talentAge) {
    scores.ageMatch = 50;
  } else {
    const ageMin = job.ageMin || 18;
    const ageMax = job.ageMax || 65;
    if (talentAge >= ageMin && talentAge <= ageMax) {
      const center = (ageMin + ageMax) / 2;
      const dist = Math.abs(talentAge - center);
      const halfRange = (ageMax - ageMin) / 2;
      scores.ageMatch = halfRange > 0 ? Math.round(Math.max(50, 100 - (dist / halfRange) * 50)) : 100;
    } else {
      scores.ageMatch = Math.max(0, Math.round(30 - Math.min(Math.abs(talentAge - ageMin), Math.abs(talentAge - ageMax))));
    }
  }

  // 12. 技能匹配 (0-100)
  let skillVal = 30;
  if (talent.personalSkills) {
    const skills = talent.personalSkills.toLowerCase();
    const jobDesc = ((job.description || '') + (job.requirements || '')).toLowerCase();
    if (jobDesc.length > 0 && skills.length > 0) {
      // 简单的关键词重叠
      const skillWords = skills.split(/[,，、\s]+/).filter((w: string) => w.length > 1);
      const matchCount = skillWords.filter((w: string) => jobDesc.includes(w)).length;
      if (skillWords.length > 0) {
        skillVal = Math.round(30 + (matchCount / skillWords.length) * 70);
      }
    } else {
      skillVal = 50;
    }
  }
  scores.skillMatch = Math.min(100, skillVal);

  // 13. 性别适配 (0-100)
  if (!job.genderReq) {
    scores.genderMatch = 70;
  } else if (!talent.gender) {
    scores.genderMatch = 50;
  } else if (job.genderReq === talent.gender) {
    scores.genderMatch = 100;
  } else {
    scores.genderMatch = 0;
  }

  // 14. 任职时长匹配 (0-100)
  if (!job.minTenureReq || job.minTenureReq <= 0) {
    scores.tenureMatch = 70;
  } else if (longestTenure >= job.minTenureReq) {
    scores.tenureMatch = Math.min(100, 70 + (longestTenure - job.minTenureReq) * 10);
  } else {
    scores.tenureMatch = Math.round((longestTenure / job.minTenureReq) * 60);
  }

  // 15. 企业画像匹配 (0-100) — 依据职位所属企业资料丰富度
  scores.enterpriseMatch = enterpriseProfileScore(enterprise);

  // ===== 综合加权得分 =====
  const weights = {
    salaryMatch: 0.13,
    cuisineMatch: 0.09,
    businessMatch: 0.07,
    cityMatch: 0.07,
    experienceMatch: 0.10,
    educationMatch: 0.04,
    brandMatch: 0.08,
    stabilityMatch: 0.08,
    growthMatch: 0.06,
    partnerMatch: 0.05,
    ageMatch: 0.04,
    skillMatch: 0.04,
    genderMatch: 0.03,
    tenureMatch: 0.05,
    enterpriseMatch: 0.07,
  };

  let totalScore = 0;
  let totalWeight = 0;
  for (const [key, weight] of Object.entries(weights)) {
    totalScore += (scores[key] || 0) * weight;
    totalWeight += weight;
  }

  totalScore = Math.round(totalScore / totalWeight);

  return { hardFilterPassed, hardFilterReasons, scores, totalScore };
}

// ========== API Routes ==========

// 获取职位的匹配结果
router.get('/job/:jobId', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const jobId = req.params.jobId as string;
    const job = await prisma.job.findUnique({
      where: { id: jobId },
      include: { enterprise: { select: { userId: true } } },
    });
    if (!job) return res.status(404).json({ error: '职位不存在' });

    if (!canManageJob(req.userId, req.userRole, job.enterprise.userId)) {
      return res.status(403).json({ error: '无权查看该职位的匹配结果' });
    }

    const matches = await prisma.match.findMany({
      where: { jobId },
      orderBy: { totalScore: 'desc' },
      include: {
        talent: {
          select: {
            id: true, userId: true, realName: true, title: true, currentCompany: true, city: true, province: true,
            minSalary: true, maxSalary: true, workYears: true, education: true,
            starLevel: true, starLevelStr: true, brandEndorsement: true, headBrandExp: true,
            projectExp: true, avatar: true, cuisineIds: true, businessTypeIds: true,
            maritalStatus: true, hasChildren: true, acceptPartner: true,
            learningAbility: true, thinkingStyle: true, personalSkills: true,
            brandExperienceDetail: true, parentInfo: true, gender: true,
            projectExpDetail: true, preferredBusinessModel: true,
            privacyMode: true, jobCategoryId: true,
          },
        },
      },
    });
    res.json(matches.map((match) => ({
      ...match,
      talent: toTalentDetailResponse(
        match.talent,
        canRevealTalentIdentity({
          requesterRole: req.userRole,
          privacyMode: match.talent.privacyMode,
          hasApplication: false,
          hasMatch: true,
        }),
        true,
      ),
    })));
  } catch (err) {
    console.error('Get job matches error:', err);
    res.status(500).json({ error: '获取匹配结果失败' });
  }
});

// 获取人才的匹配职位
router.get('/talent', authMiddleware, async (req: AuthRequest, res) => {
  try {
    if (req.userRole !== 'TALENT') {
      return res.status(403).json({ error: '仅人才账号可查看个人匹配职位' });
    }
    const talent = await prisma.talent.findUnique({ where: { userId: req.userId } });
    if (!talent) return res.status(400).json({ error: '人才信息不存在' });

    const matches = await prisma.match.findMany({
      where: { talentId: talent.id },
      orderBy: { totalScore: 'desc' },
      include: {
        job: {
          include: {
            enterprise: {
              select: {
                id: true, companyName: true, companyLogo: true, city: true, province: true,
                starLevel: true, starLevelStr: true, companySize: true, status: true,
                welfareBenefits: true, developmentPlan: true, mainMarkets: true,
                currentStatus: true, equityOpportunity: true,
                businessModelDescription: true, description: true,
              },
            },
          },
        },
      },
    });
    res.json(matches);
  } catch (err) {
    console.error('Get talent matches error:', err);
    res.status(500).json({ error: '获取匹配职位失败' });
  }
});

// 手动触发匹配
router.post('/run/:jobId', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const jobId = req.params.jobId as string;
    const job = await prisma.job.findUnique({
      where: { id: jobId },
      include: { enterprise: true },
    });
    if (!job) return res.status(404).json({ error: '职位不存在' });

    if (!canManageJob(req.userId, req.userRole, job.enterprise.userId)) {
      return res.status(403).json({ error: '仅职位所属企业或管理员可运行匹配' });
    }

    const enterprise = job.enterprise;

    // 获取所有活跃人才及其工作经历
    const talents = await prisma.talent.findMany({
      where: { status: 'ACTIVE' },
      include: { workExperiences: true },
    });

    const matchResults: Prisma.MatchUncheckedCreateInput[] = [];

    for (const talent of talents) {
      const result = calculateComprehensiveMatch(job, talent, talent.workExperiences, enterprise);

      if (result.hardFilterPassed) {
        matchResults.push({
          jobId: job.id,
          talentId: talent.id,
          score: result.totalScore,
          hardFilterPassed: true,
          cuisineMatch: result.scores.cuisineMatch || 0,
          salaryMatch: result.scores.salaryMatch || 0,
          cityMatch: result.scores.cityMatch || 0,
          experienceMatch: result.scores.experienceMatch || 0,
          educationMatch: result.scores.educationMatch || 0,
          skillMatch: result.scores.skillMatch || 0,
          brandMatch: result.scores.brandMatch || 0,
          stabilityMatch: result.scores.stabilityMatch || 0,
          genderMatch: result.scores.genderMatch || 0,
          tenureMatch: result.scores.tenureMatch || 0,
          enterpriseMatch: result.scores.enterpriseMatch || 0,
          scoresJson: JSON.stringify(result.scores),
          totalScore: result.totalScore,
        });
      }
    }

    // 按总分排序
    matchResults.sort((a, b) => Number(b.totalScore ?? 0) - Number(a.totalScore ?? 0));

    const retainedTalentIds = matchResults.map((match) => match.talentId);

    // 清理和写入必须处于同一事务：没有通过本轮硬筛（包括已停用）的人才，
    // 其旧 Match 不再保留，也不能继续作为聊天授权凭证。
    const staleMatchCount = await prisma.$transaction(async (tx) => {
      const cleanup = await tx.match.deleteMany({
        where: buildStaleMatchCleanupWhere(jobId, retainedTalentIds),
      });

      for (const match of matchResults) {
        await tx.match.upsert({
          where: {
            jobId_talentId: {
              jobId: match.jobId,
              talentId: match.talentId,
            },
          },
          update: match,
          create: match,
        });
      }

      return cleanup.count;
    });

    const matchedCount = matchResults.length;

    res.json({
      matched: matchedCount,
      total: talents.length,
      removedStale: staleMatchCount,
      message: `匹配完成：${talents.length} 位人才中，${matchedCount} 位通过硬性筛选`,
    });
  } catch (err) {
    console.error('Match error:', err);
    res.status(500).json({ error: '匹配失败' });
  }
});

// ========== 自动星级评估 ==========

// 评估企业星级
router.post('/evaluate-enterprise/:enterpriseId', authMiddleware, async (req: AuthRequest, res) => {
  try {
    if (req.userRole !== 'ADMIN') return res.status(403).json({ error: '仅管理员可操作' });

    const enterpriseId = req.params.enterpriseId as string;
    const enterprise = await prisma.enterprise.findUnique({
      where: { id: enterpriseId },
      include: { jobs: { where: { status: 'ACTIVE' } }, subscriptions: { where: { status: 'ACTIVE' } } },
    });
    if (!enterprise) return res.status(404).json({ error: '企业不存在' });

    const result = evaluateEnterpriseStar(enterprise, enterprise.jobs.length, enterprise.subscriptions.length > 0);

    await prisma.enterprise.update({
      where: { id: enterprise.id },
      data: { starLevel: result.starLevel, starLevelStr: result.starLevelStr },
    });

    res.json(result);
  } catch (err) {
    console.error('Evaluate enterprise error:', err);
    res.status(500).json({ error: '企业评估失败' });
  }
});

// 评估所有企业星级
router.post('/evaluate-all-enterprises', authMiddleware, async (req: AuthRequest, res) => {
  try {
    if (req.userRole !== 'ADMIN') return res.status(403).json({ error: '仅管理员可操作' });

    const enterprises = await prisma.enterprise.findMany({
      include: { jobs: { where: { status: 'ACTIVE' } }, subscriptions: { where: { status: 'ACTIVE' } } },
    });

    const results = [];
    for (const ent of enterprises) {
      const result = evaluateEnterpriseStar(ent, ent.jobs.length, ent.subscriptions.length > 0);
      await prisma.enterprise.update({
        where: { id: ent.id },
        data: { starLevel: result.starLevel, starLevelStr: result.starLevelStr },
      });
      results.push({ id: ent.id, companyName: ent.companyName, ...result });
    }

    res.json({ count: results.length, results });
  } catch (err) {
    console.error('Evaluate all enterprises error:', err);
    res.status(500).json({ error: '批量评估失败' });
  }
});

// 评估人才星级
router.post('/evaluate-talent/:talentId', authMiddleware, async (req: AuthRequest, res) => {
  try {
    if (req.userRole !== 'ADMIN') return res.status(403).json({ error: '仅管理员可操作' });

    const talentId = req.params.talentId as string;
    const talent = await prisma.talent.findUnique({
      where: { id: talentId },
      include: { workExperiences: true },
    });
    if (!talent) return res.status(404).json({ error: '人才不存在' });

    const result = evaluateTalentStar(talent, talent.workExperiences);

    await prisma.talent.update({
      where: { id: talent.id },
      data: { starLevel: result.starLevel, starLevelStr: result.starLevelStr },
    });

    res.json(result);
  } catch (err) {
    console.error('Evaluate talent error:', err);
    res.status(500).json({ error: '人才评估失败' });
  }
});

// 评估所有人才星级
router.post('/evaluate-all-talents', authMiddleware, async (req: AuthRequest, res) => {
  try {
    if (req.userRole !== 'ADMIN') return res.status(403).json({ error: '仅管理员可操作' });

    const talents = await prisma.talent.findMany({ include: { workExperiences: true } });

    const results = [];
    for (const t of talents) {
      const result = evaluateTalentStar(t, t.workExperiences);
      await prisma.talent.update({
        where: { id: t.id },
        data: { starLevel: result.starLevel, starLevelStr: result.starLevelStr },
      });
      results.push({ id: t.id, realName: t.realName, ...result });
    }

    res.json({ count: results.length, results });
  } catch (err) {
    console.error('Evaluate all talents error:', err);
    res.status(500).json({ error: '批量评估失败' });
  }
});

// 获取匹配详情（包含所有维度的分解）
router.get('/detail/:jobId/:talentId', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const jobId = req.params.jobId as string;
    const talentId = req.params.talentId as string;
    const job = await prisma.job.findUnique({
      where: { id: jobId },
      include: { enterprise: true },
    });
    if (!job) return res.status(404).json({ error: '数据不存在' });
    if (!canManageJob(req.userId, req.userRole, job.enterprise.userId)) {
      return res.status(403).json({ error: '无权查看该职位的匹配详情' });
    }

    if (req.userRole !== 'ADMIN') {
      const [hardFilterMatch, application] = await Promise.all([
        prisma.match.findFirst({
          where: { jobId, talentId, hardFilterPassed: true },
          select: { id: true },
        }),
        prisma.jobApplication.findUnique({
          where: { jobId_talentId: { jobId, talentId } },
          select: { id: true },
        }),
      ]);

      if (!hasMatchDetailBusinessRelation(Boolean(hardFilterMatch), Boolean(application))) {
        return res.status(403).json({ error: '该人才与此职位不存在可查看的匹配或投递关系' });
      }
    }

    const talent = await prisma.talent.findUnique({
      where: { id: talentId },
      include: { workExperiences: true },
    });
    if (!talent) return res.status(404).json({ error: '数据不存在' });

    const result = calculateComprehensiveMatch(job, talent, talent.workExperiences, job.enterprise);
    const revealIdentity = canRevealTalentIdentity({
      requesterRole: req.userRole,
      privacyMode: talent.privacyMode,
      hasApplication: false,
      hasMatch: true,
    });

    res.json({
      jobId: job.id,
      jobTitle: job.title,
      talentId: talent.id,
      talentName: revealIdentity ? talent.realName : '匿名人才',
      ...result,
    });
  } catch (err) {
    console.error('Match detail error:', err);
    res.status(500).json({ error: '获取匹配详情失败' });
  }
});

export default router;
