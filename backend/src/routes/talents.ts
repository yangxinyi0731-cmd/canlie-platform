import { Router } from 'express';
import { prisma } from '../index.js';
import { authMiddleware, requireRole, AuthRequest } from '../middleware/auth.js';
import { verificationSubmissionSchema } from '../security/policies.js';
import {
  canContactTalent,
  canRevealTalentIdentity,
  getStoredUploadId,
  toTalentDetailResponse,
  toTalentSearchSummary,
} from '../security/privacy.js';
import { ownsStoredUploadReferences } from '../security/storedUploadAuthorization.js';

const router = Router();

// Get talent profile (own)
router.get('/profile', authMiddleware, requireRole('TALENT'), async (req: AuthRequest, res) => {
  try {
    const talent = await prisma.talent.findUnique({
      where: { userId: req.userId },
      include: {
        resumes: true,
        verifications: true,
        workExperiences: { orderBy: { startYear: 'desc' } },
        _count: { select: { jobApplications: true } },
      },
    });
    if (!talent) return res.status(404).json({ error: '人才信息不存在' });
    res.json(talent);
  } catch (err) {
    console.error('Get talent profile error:', err);
    res.status(500).json({ error: '获取信息失败' });
  }
});

// 字段是否已填写
function isFilled(v: unknown): boolean {
  if (v === null || v === undefined) return false;
  if (typeof v === 'string') return v.trim().length > 0;
  if (typeof v === 'number') return true;
  if (typeof v === 'boolean') return true;
  return false;
}

// 简历完善度计算（覆盖人物画像 / 经历 / 背调等全部维度，和=100）
function calcTalentCompleteness(t: any) {
  const workExps: any[] = t.workExperiences || [];
  const bgRefCount = workExps.filter(
    (w) => isFilled(w.bgRefName) && isFilled(w.bgRefPhone)
  ).length;

  // 每个模块：字段列表 + 模块满分
  const modules = [
    {
      key: 'basic', name: '基本信息', max: 20,
      fields: [
        { key: 'realName', label: '姓名', filled: isFilled(t.realName) },
        { key: 'gender', label: '性别', filled: isFilled(t.gender) },
        { key: 'birthYear', label: '出生年月', filled: isFilled(t.birthYear) },
        { key: 'city', label: '所在城市', filled: isFilled(t.city) },
        { key: 'province', label: '所在省份', filled: isFilled(t.province) },
        { key: 'hometown', label: '籍贯', filled: isFilled(t.hometown) },
        { key: 'maritalStatus', label: '婚姻状况', filled: isFilled(t.maritalStatus) },
        { key: 'hasChildren', label: '子女情况', filled: isFilled(t.hasChildren) },
      ],
    },
    {
      key: 'career', name: '职业信息', max: 20,
      fields: [
        { key: 'title', label: '当前职位', filled: isFilled(t.title) },
        { key: 'jobCategoryId', label: '岗位分类', filled: isFilled(t.jobCategoryId) },
        { key: 'currentCompany', label: '当前公司', filled: isFilled(t.currentCompany) },
        { key: 'workYears', label: '工作年限', filled: isFilled(t.workYears) },
        { key: 'education', label: '学历', filled: isFilled(t.education) },
        { key: 'minSalary', label: '期望薪资', filled: isFilled(t.minSalary) && isFilled(t.maxSalary) },
      ],
    },
    {
      key: 'specialty', name: '菜系/业态专长', max: 10,
      fields: [
        { key: 'cuisineIds', label: '菜系专长', filled: isFilled(t.cuisineIds) },
        { key: 'businessTypeIds', label: '业态经验', filled: isFilled(t.businessTypeIds) },
      ],
    },
    {
      key: 'experience', name: '工作经历', max: 15,
      fields: [
        { key: 'hasOne', label: '至少1段经历', filled: workExps.length >= 1 },
        { key: 'hasTwo', label: '2段及以上经历', filled: workExps.length >= 2 },
      ],
    },
    {
      key: 'portrait', name: '人物画像', max: 15,
      fields: [
        { key: 'selfIntro', label: '自我介绍', filled: isFilled(t.selfIntro) },
        { key: 'parentInfo', label: '父母情况', filled: isFilled(t.parentInfo) },
        { key: 'learningAbility', label: '学习能力', filled: isFilled(t.learningAbility) },
        { key: 'thinkingStyle', label: '思维方式', filled: isFilled(t.thinkingStyle) },
        { key: 'personalSkills', label: '个人擅长', filled: isFilled(t.personalSkills) },
        { key: 'preferredBusinessModel', label: '适合业态模型', filled: isFilled(t.preferredBusinessModel) },
        { key: 'projectExpDetail', label: '项目经验详情', filled: isFilled(t.projectExpDetail) },
      ],
    },
    {
      key: 'brand', name: '品牌背书', max: 10,
      fields: [
        { key: 'brandEndorsement', label: '品牌背书', filled: isFilled(t.brandEndorsement) },
        { key: 'headBrandExp', label: '头部品牌经历', filled: isFilled(t.headBrandExp) },
        { key: 'projectExp', label: '项目经验', filled: isFilled(t.projectExp) },
        { key: 'brandExperienceDetail', label: '品牌经验详情', filled: isFilled(t.brandExperienceDetail) },
      ],
    },
    {
      key: 'background', name: '背景调查', max: 10,
      fields: [
        { key: 'hasBgRef', label: '已完成背景调查', filled: bgRefCount >= 1 },
      ],
    },
  ];

  // 每个模块得分 = 满分 × (已填字段数 / 字段总数)
  let totalScore = 0;
  const result = modules.map((m) => {
    const filledCount = m.fields.filter((f) => f.filled).length;
    const score = Math.round((m.max * filledCount) / m.fields.length);
    totalScore += score;
    return {
      key: m.key,
      name: m.name,
      score,
      max: m.max,
      percent: Math.round((filledCount / m.fields.length) * 100),
      fields: m.fields,
    };
  });

  const level =
    totalScore >= 95 ? '极佳' :
    totalScore >= 90 ? '优秀' :
    totalScore >= 80 ? '良好' :
    totalScore >= 70 ? '中等' :
    totalScore >= 50 ? '待完善' : '刚起步';

  return { totalScore: Math.min(100, totalScore), level, modules: result };
}

// 简历完善度
router.get('/profile/completeness', authMiddleware, requireRole('TALENT'), async (req: AuthRequest, res) => {
  try {
    const talent = await prisma.talent.findUnique({
      where: { userId: req.userId },
      include: { workExperiences: true },
    });
    if (!talent) return res.status(404).json({ error: '人才信息不存在' });
    res.json(calcTalentCompleteness(talent));
  } catch (err) {
    console.error('Get completeness error:', err);
    res.status(500).json({ error: '获取完善度失败' });
  }
});

// Update talent profile
router.put('/profile', authMiddleware, requireRole('TALENT'), async (req: AuthRequest, res) => {
  try {
    const {
      realName, gender, birthYear, birthMonth, idNumber, city, province,
      email, title, jobCategoryId, currentCompany, minSalary, maxSalary,
      workYears, education, maritalStatus, hasChildren, hometown, hometownProvince,
      cuisineIds, businessTypeIds, selfIntro, brandEndorsement,
      headBrandExp, projectExp, acceptPartner, privacyMode, contactPrivacy, avatar,
      projectExpDetail, preferredBusinessModel,
      parentInfo, learningAbility, thinkingStyle, personalSkills, brandExperienceDetail,
    } = req.body;
    const existingUser = await prisma.user.findUnique({
      where: { id: req.userId! },
      select: { avatar: true },
    });
    if (avatar && avatar !== existingUser?.avatar) {
      const avatarAllowed = await ownsStoredUploadReferences({
        prisma,
        ownerId: req.userId!,
        urls: [avatar],
        purposes: ['AVATAR'],
        accessLevel: 'PUBLIC',
      });
      if (!avatarAllowed) {
        return res.status(400).json({ error: '头像文件不存在、用途不符或不属于当前账号' });
      }
    }
    const talent = await prisma.talent.upsert({
      where: { userId: req.userId! },
      update: {
        realName, gender, birthYear, birthMonth, idNumber, city, province,
        email, title, jobCategoryId, currentCompany, minSalary, maxSalary,
        workYears, education, maritalStatus, hasChildren, hometown, hometownProvince,
        cuisineIds, businessTypeIds, selfIntro, brandEndorsement,
        headBrandExp, projectExp, acceptPartner, privacyMode, contactPrivacy,
        projectExpDetail, preferredBusinessModel,
        parentInfo, learningAbility, thinkingStyle, personalSkills, brandExperienceDetail,
      },
      create: {
        userId: req.userId!,
        realName, gender, birthYear, birthMonth, idNumber, city, province,
        email, title, jobCategoryId, currentCompany, minSalary, maxSalary,
        workYears, education, maritalStatus, hasChildren, hometown, hometownProvince,
        cuisineIds, businessTypeIds, selfIntro, brandEndorsement,
        headBrandExp, projectExp, acceptPartner, privacyMode, contactPrivacy,
        projectExpDetail, preferredBusinessModel,
        parentInfo, learningAbility, thinkingStyle, personalSkills, brandExperienceDetail,
      },
    });

    // Also update user name and avatar
    if (realName || avatar !== undefined) {
      const updateData: Record<string, any> = {};
      if (realName) updateData.name = realName;
      if (avatar !== undefined) updateData.avatar = avatar;
      await prisma.user.update({
        where: { id: req.userId! },
        data: updateData,
      });
    }

    res.json(talent);
  } catch (err) {
    console.error('Update talent error:', err);
    res.status(500).json({ error: '更新信息失败' });
  }
});

// ========== Work Experience CRUD ==========

// Get my work experiences
router.get('/work-experiences', authMiddleware, requireRole('TALENT'), async (req: AuthRequest, res) => {
  try {
    const talent = await prisma.talent.findUnique({ where: { userId: req.userId } });
    if (!talent) return res.status(400).json({ error: '人才信息不存在' });

    const experiences = await prisma.workExperience.findMany({
      where: { talentId: talent.id },
      orderBy: [{ isCurrent: 'desc' }, { startYear: 'desc' }, { startMonth: 'desc' }],
    });
    res.json(experiences);
  } catch (err) {
    res.status(500).json({ error: '获取工作经历失败' });
  }
});

// Add work experience
router.post('/work-experiences', authMiddleware, requireRole('TALENT'), async (req: AuthRequest, res) => {
  try {
    const talent = await prisma.talent.findUnique({ where: { userId: req.userId } });
    if (!talent) return res.status(400).json({ error: '人才信息不存在' });

    const { companyName, position, startYear, startMonth, endYear, endMonth, isCurrent, description, bgRefName, bgRefTitle, bgRefPhone } = req.body;

    if (!companyName || !position || !startYear || !startMonth) {
      return res.status(400).json({ error: '请填写完整的公司名称、职位和起始时间' });
    }

    const exp = await prisma.workExperience.create({
      data: {
        talentId: talent.id,
        companyName,
        position,
        startYear,
        startMonth,
        endYear: isCurrent ? null : (endYear || null),
        endMonth: isCurrent ? null : (endMonth || null),
        isCurrent: isCurrent || false,
        description: description || null,
        bgRefName: bgRefName || null,
        bgRefTitle: bgRefTitle || null,
        bgRefPhone: bgRefPhone || null,
      },
    });
    res.json(exp);
  } catch (err) {
    console.error('Add work experience error:', err);
    res.status(500).json({ error: '添加工作经历失败' });
  }
});

// Update work experience
router.put('/work-experiences/:id', authMiddleware, requireRole('TALENT'), async (req: AuthRequest, res) => {
  try {
    const talent = await prisma.talent.findUnique({ where: { userId: req.userId } });
    if (!talent) return res.status(400).json({ error: '人才信息不存在' });

    const experienceId = req.params.id as string;
    const exp = await prisma.workExperience.findUnique({ where: { id: experienceId } });
    if (!exp || exp.talentId !== talent.id) {
      return res.status(403).json({ error: '无权修改此工作经历' });
    }

    const { companyName, position, startYear, startMonth, endYear, endMonth, isCurrent, description, bgRefName, bgRefTitle, bgRefPhone } = req.body;

    const updated = await prisma.workExperience.update({
      where: { id: experienceId },
      data: {
        companyName, position, startYear, startMonth,
        endYear: isCurrent ? null : (endYear || null),
        endMonth: isCurrent ? null : (endMonth || null),
        isCurrent: isCurrent || false,
        description: description || null,
        bgRefName: bgRefName || null,
        bgRefTitle: bgRefTitle || null,
        bgRefPhone: bgRefPhone || null,
      },
    });
    res.json(updated);
  } catch (err) {
    console.error('Update work experience error:', err);
    res.status(500).json({ error: '更新工作经历失败' });
  }
});

// Delete work experience
router.delete('/work-experiences/:id', authMiddleware, requireRole('TALENT'), async (req: AuthRequest, res) => {
  try {
    const talent = await prisma.talent.findUnique({ where: { userId: req.userId } });
    if (!talent) return res.status(400).json({ error: '人才信息不存在' });

    const experienceId = req.params.id as string;
    const exp = await prisma.workExperience.findUnique({ where: { id: experienceId } });
    if (!exp || exp.talentId !== talent.id) {
      return res.status(403).json({ error: '无权删除此工作经历' });
    }

    await prisma.workExperience.delete({ where: { id: experienceId } });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: '删除工作经历失败' });
  }
});

// ========== Verification ==========

router.post('/verification', authMiddleware, requireRole('TALENT'), async (req: AuthRequest, res) => {
  try {
    const parsed = verificationSubmissionSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        error: '认证材料字段不合法',
        details: parsed.error.issues.map((issue) => ({
          path: issue.path.join('.'),
          message: issue.message,
        })),
      });
    }

    const talent = await prisma.talent.findUnique({ where: { userId: req.userId } });
    if (!talent) return res.status(400).json({ error: '人才信息不存在' });

    const payload = parsed.data;
    if (payload.type === 'CERTIFICATE' || payload.type === 'SALARY_FLOW') {
      const fileUrl = payload.type === 'CERTIFICATE' ? payload.certFileUrl : payload.salaryFileUrl;
      const uploadId = getStoredUploadId(fileUrl, 'private');
      const expectedPurpose = payload.type === 'CERTIFICATE'
        ? 'TALENT_CERTIFICATE'
        : 'TALENT_SALARY_PROOF';
      const storedUpload = uploadId
        ? await prisma.storedUpload.findFirst({
          where: {
            id: uploadId,
            ownerId: req.userId!,
            purpose: expectedPurpose,
            accessLevel: 'PRIVATE',
            deletedAt: null,
          },
          select: { id: true },
        })
        : null;
      if (!storedUpload) {
        return res.status(400).json({ error: '认证文件不存在、用途不符或不属于当前账号' });
      }
    }
    const verification = await prisma.verification.create({
      data: {
        talentId: talent.id,
        status: 'PENDING',
        type: payload.type,
        ...(payload.type === 'REFERENCE'
          ? {
            refName: payload.refName,
            refTitle: payload.refTitle,
            refPhone: payload.refPhone,
          }
          : payload.type === 'CERTIFICATE'
            ? { certFileUrl: payload.certFileUrl }
            : { salaryFileUrl: payload.salaryFileUrl }),
      },
    });
    res.json(verification);
  } catch (err) {
    res.status(500).json({ error: '上传认证材料失败' });
  }
});

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

// ========== Public APIs ==========

// Talent search (for enterprises)
router.get('/search', authMiddleware, requireRole('ENTERPRISE', 'ADMIN'), async (req, res) => {
  try {
    const { keyword, city, province, cuisineId, businessTypeId, jobCategoryId, minSalary, maxSalary, starLevel, page = '1', pageSize = '20' } = req.query;
    const pageNumber = Math.max(1, Number.parseInt(page as string, 10) || 1);
    const take = Math.min(50, Math.max(1, Number.parseInt(pageSize as string, 10) || 20));
    const skip = (pageNumber - 1) * take;

    const where: any = { status: 'ACTIVE', privacyMode: { in: ['PUBLIC', 'REAL_NAME', 'ANONYMOUS'] } };

    if (city) where.city = { contains: city as string };
    if (province) where.province = { contains: province as string };
    if (cuisineId) where.cuisineIds = { contains: cuisineId as string };
    if (businessTypeId) where.businessTypeIds = { contains: businessTypeId as string };
    if (jobCategoryId) where.jobCategoryId = jobCategoryId as string;
    if (minSalary) where.minSalary = { gte: parseInt(minSalary as string) };
    if (maxSalary) where.maxSalary = { lte: parseInt(maxSalary as string) };
    if (starLevel) where.starLevel = { gte: parseInt(starLevel as string) };
    if (keyword) {
      where.OR = [
        { title: { contains: keyword as string } },
        { brandEndorsement: { contains: keyword as string } },
        { headBrandExp: { contains: keyword as string } },
        { personalSkills: { contains: keyword as string } },
      ];
    }

    const [talents, total] = await Promise.all([
      prisma.talent.findMany({
        where,
        skip,
        take,
        orderBy: { starLevel: 'desc' },
        select: {
          id: true, title: true, city: true, province: true,
          minSalary: true, maxSalary: true, workYears: true, education: true,
          starLevel: true, starLevelStr: true, brandEndorsement: true,
          cuisineIds: true, businessTypeIds: true, jobCategoryId: true,
        },
      }),
      prisma.talent.count({ where }),
    ]);

    res.json({ talents: talents.map(toTalentSearchSummary), total, page: pageNumber, pageSize: take });
  } catch (err) {
    console.error('Search talent error:', err);
    res.status(500).json({ error: '搜索人才失败' });
  }
});

// 人才详情只允许企业或管理员查看；企业默认得到去标识化职业资料。
router.get('/:id', authMiddleware, requireRole('ENTERPRISE', 'ADMIN'), async (req: AuthRequest, res) => {
  try {
    const talent = await prisma.talent.findUnique({
      where: { id: req.params.id as string },
      select: {
        id: true, userId: true, realName: true, title: true, currentCompany: true,
        city: true, province: true, minSalary: true, maxSalary: true, workYears: true,
        education: true, starLevel: true, starLevelStr: true, brandEndorsement: true,
        headBrandExp: true, projectExp: true, selfIntro: true, avatar: true,
        cuisineIds: true, businessTypeIds: true,
        acceptPartner: true, privacyMode: true, jobCategoryId: true,
        // 工作经历（不含背景调查隐私信息）
        workExperiences: {
          orderBy: [{ isCurrent: 'desc' }, { startYear: 'desc' }],
          select: {
            id: true, companyName: true, position: true,
            startYear: true, startMonth: true, endYear: true, endMonth: true,
            isCurrent: true, description: true,
            // bgRef 字段不返回到公开接口！
          },
        },
      },
    });
    if (!talent) return res.status(404).json({ error: '人才不存在' });

    let hasApplication = false;
    let hasMatch = false;
    if (req.userRole === 'ENTERPRISE') {
      const enterprise = await prisma.enterprise.findUnique({
        where: { userId: req.userId! },
        select: { id: true },
      });
      if (enterprise) {
        const [application, match] = await Promise.all([
          prisma.jobApplication.findFirst({
            where: { talentId: talent.id, job: { enterpriseId: enterprise.id } },
            select: { id: true },
          }),
          prisma.match.findFirst({
            where: {
              talentId: talent.id,
              hardFilterPassed: true,
              job: { enterpriseId: enterprise.id },
            },
            select: { id: true },
          }),
        ]);
        hasApplication = Boolean(application);
        hasMatch = Boolean(match);
      }
    }

    const revealIdentity = canRevealTalentIdentity({
      requesterRole: req.userRole,
      privacyMode: talent.privacyMode,
      hasApplication,
      hasMatch,
    });
    const canContact = canContactTalent({ requesterRole: req.userRole, hasApplication, hasMatch });
    if (revealIdentity) {
      await prisma.sensitiveAccessLog.create({
        data: {
          actorUserId: req.userId,
          subjectType: 'TALENT',
          subjectId: talent.id,
          action: 'READ_IDENTITY',
          metadata: JSON.stringify({ role: req.userRole, hasApplication, hasMatch }),
        },
      });
    }

    res.json(toTalentDetailResponse(talent, revealIdentity, canContact));
  } catch (err) {
    console.error('Get talent detail error:', err);
    res.status(500).json({ error: '获取人才信息失败' });
  }
});

export default router;
