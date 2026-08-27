import { Router } from 'express';
import { prisma } from '../index.js';
import { authMiddleware, requireRole, AuthRequest } from '../middleware/auth.js';
import { createNotification } from './notifications.js';
import {
  canTransitionApplicationStatus,
  isApplicationStatus,
  isApplicationStatusNoop,
} from '../security/policies.js';

const router = Router();

// Create job
router.post('/', authMiddleware, requireRole('ENTERPRISE'), async (req: AuthRequest, res) => {
  try {
    const enterprise = await prisma.enterprise.findUnique({ where: { userId: req.userId } });
    if (!enterprise) return res.status(400).json({ error: '请先完善企业信息' });
    if (enterprise.status === 'REJECTED') return res.status(400).json({ error: '企业认证被拒绝，无法发布职位' });

    const { title, minSalary, maxSalary, city, province, businessTypeIds, cuisineIds, description, requirements, department, district, address, ageMin, ageMax, maritalReq, childrenReq, qualifications, educationReq, experienceReq, headcount, openPartner, jobCategoryId, genderReq, minTenureReq } = req.body;

    if (!title || !minSalary || !maxSalary || !city || !description) {
      return res.status(400).json({ error: '请填写完整职位信息' });
    }
    if (minSalary < 8000) {
      return res.status(400).json({ error: '平台职位月薪不低于8000元' });
    }
    if (minSalary > maxSalary) {
      return res.status(400).json({ error: '最低薪资不能大于最高薪资' });
    }

    const job = await prisma.job.create({
      data: {
        enterpriseId: enterprise.id,
        title,
        minSalary,
        maxSalary,
        city,
        province,
        district,
        address,
        businessTypeIds: businessTypeIds || '',
        cuisineIds: cuisineIds || '',
        description,
        requirements: requirements || '',
        department,
        ageMin,
        ageMax,
        maritalReq,
        childrenReq,
        qualifications,
        educationReq,
        experienceReq,
        headcount: headcount || 1,
        openPartner: openPartner || false,
        jobCategoryId: jobCategoryId || null,
        genderReq: genderReq || null,
        minTenureReq: minTenureReq || null,
        serviceType: maxSalary >= 400000 ? 'AGENT' : 'PLATFORM',
      },
    });
    res.json(job);
  } catch (err) {
    console.error('Create job error:', err);
    res.status(500).json({ error: '发布职位失败' });
  }
});

// Update job
router.put('/:id', authMiddleware, requireRole('ENTERPRISE'), async (req: AuthRequest, res) => {
  try {
    const id = req.params.id as string;
    const job = await prisma.job.findUnique({ where: { id } });
    if (!job) return res.status(404).json({ error: '职位不存在' });

    const enterprise = await prisma.enterprise.findUnique({ where: { userId: req.userId } });
    if (job.enterpriseId !== enterprise?.id) return res.status(403).json({ error: '无权修改' });

    // 只允许修改特定字段，防止批量赋值攻击
    const { title, minSalary, maxSalary, city, province, district, address, businessTypeIds, cuisineIds, description, requirements, department, ageMin, ageMax, maritalReq, childrenReq, qualifications, educationReq, experienceReq, headcount, openPartner, jobCategoryId, genderReq, minTenureReq } = req.body;

    // 验证薪资
    if (minSalary !== undefined && minSalary < 8000) {
      return res.status(400).json({ error: '平台职位月薪不低于8000元' });
    }
    if (minSalary !== undefined && maxSalary !== undefined && minSalary > maxSalary) {
      return res.status(400).json({ error: '最低薪资不能大于最高薪资' });
    }

    const updated = await prisma.job.update({
      where: { id },
      data: {
        title,
        minSalary,
        maxSalary,
        city,
        province,
        district,
        address,
        businessTypeIds,
        cuisineIds,
        description,
        requirements,
        department,
        ageMin,
        ageMax,
        maritalReq,
        childrenReq,
        qualifications,
        educationReq,
        experienceReq,
        headcount,
        openPartner,
        jobCategoryId,
        genderReq,
        minTenureReq,
      },
    });
    res.json(updated);
  } catch (err) {
    console.error('Update job error:', err);
    res.status(500).json({ error: '更新失败' });
  }
});

// List jobs (public, with filters)
router.get('/', async (req, res) => {
  try {
    const { city, province, cuisineId, businessTypeId, jobCategoryId, keyword, minSalary, maxSalary, page = '1', pageSize = '20' } = req.query;
    const skip = (parseInt(page as string) - 1) * parseInt(pageSize as string);
    const take = parseInt(pageSize as string);

    const where: any = { status: 'ACTIVE' };

    if (city) where.city = { contains: city as string };
    if (province) where.province = { contains: province as string };
    if (jobCategoryId) where.jobCategoryId = jobCategoryId as string;
    if (minSalary) where.minSalary = { gte: parseInt(minSalary as string) };
    if (maxSalary) where.maxSalary = { lte: parseInt(maxSalary as string) };
    if (keyword) {
      // 搜索框承诺「职位、公司、地点」：title/description 之外补公司名与城市/省份
      where.OR = [
        { title: { contains: keyword as string } },
        { description: { contains: keyword as string } },
        { city: { contains: keyword as string } },
        { province: { contains: keyword as string } },
        { enterprise: { companyName: { contains: keyword as string } } },
      ];
    }
    if (cuisineId) where.cuisineIds = { contains: cuisineId as string };
    if (businessTypeId) where.businessTypeIds = { contains: businessTypeId as string };

    const [jobs, total] = await Promise.all([
      prisma.job.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: {
          enterprise: {
            select: { id: true, companyName: true, companyLogo: true, city: true, companySize: true },
          },
          _count: { select: { applications: true } },
        },
      }),
      prisma.job.count({ where }),
    ]);

    res.json({ jobs, total, page: parseInt(page as string), pageSize: take });
  } catch (err) {
    console.error('List jobs error:', err);
    res.status(500).json({ error: '获取职位列表失败' });
  }
});

// 热门城市：按在招职位数聚合取前 N（注意必须注册在 GET /:id 之前，否则 "hot-cities" 会被当作 id）
router.get('/hot-cities', async (_req, res) => {
  try {
    const grouped = await prisma.job.groupBy({
      by: ['city'],
      where: { status: 'ACTIVE' },
      _count: { _all: true },
      orderBy: { _count: { city: 'desc' } },
      take: 15, // 稍多取几个，null 城市组在下面过滤掉
    });
    const cities = grouped
      .filter((g: any) => g.city)
      .map((g: any) => ({ name: g.city, count: g._count._all }));
    res.json({ cities });
  } catch (err) {
    console.error('Hot cities error:', err);
    res.status(500).json({ error: '获取热门城市失败' });
  }
});

// Get job detail
router.get('/:id', async (req, res) => {
  try {
    const job = await prisma.job.findUnique({
      where: { id: req.params.id },
      include: {
        enterprise: {
          select: { id: true, userId: true, companyName: true, companyLogo: true, description: true, city: true, companySize: true, address: true },
        },
      },
    });
    if (!job) return res.status(404).json({ error: '职位不存在' });
    res.json(job);
  } catch (err) {
    res.status(500).json({ error: '获取职位详情失败' });
  }
});

// Get enterprise's own jobs
router.get('/my/list', authMiddleware, requireRole('ENTERPRISE'), async (req: AuthRequest, res) => {
  try {
    const enterprise = await prisma.enterprise.findUnique({ where: { userId: req.userId } });
    if (!enterprise) return res.status(400).json({ error: '企业信息不存在' });

    const { page = '1', pageSize = '20' } = req.query;
    const skip = (parseInt(page as string) - 1) * parseInt(pageSize as string);
    const take = parseInt(pageSize as string);

    const where = { enterpriseId: enterprise.id };

    const [jobs, total] = await Promise.all([
      prisma.job.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: { _count: { select: { applications: true } } },
      }),
      prisma.job.count({ where }),
    ]);

    res.json({ jobs, total, page: parseInt(page as string), pageSize: take });
  } catch (err) {
    res.status(500).json({ error: '获取职位列表失败' });
  }
});

// Close job
router.patch('/:id/close', authMiddleware, requireRole('ENTERPRISE'), async (req: AuthRequest, res) => {
  try {
    const id = req.params.id as string;
    const job = await prisma.job.findUnique({ where: { id } });
    if (!job) return res.status(404).json({ error: '职位不存在' });

    const enterprise = await prisma.enterprise.findUnique({ where: { userId: req.userId } });
    if (job.enterpriseId !== enterprise?.id) return res.status(403).json({ error: '无权操作' });

    const updated = await prisma.job.update({
      where: { id },
      data: { status: 'CLOSED' },
    });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: '关闭失败' });
  }
});

// ========== Job Application (投递简历) ==========

// Apply to job (talent)
router.post('/:id/apply', authMiddleware, requireRole('TALENT'), async (req: AuthRequest, res) => {
  try {
    const jobId = req.params.id as string;
    const talent = await prisma.talent.findUnique({ where: { userId: req.userId } });
    if (!talent) return res.status(400).json({ error: '请先完善人才信息' });

    // Check if already applied
    const existing = await prisma.jobApplication.findUnique({
      where: { jobId_talentId: { jobId, talentId: talent.id } },
    });
    if (existing) return res.status(400).json({ error: '已投递过该职位', alreadyApplied: true });

    // Check job exists and is active
    const job = await prisma.job.findUnique({ where: { id: jobId } });
    if (!job) return res.status(404).json({ error: '职位不存在' });
    if (job.status !== 'ACTIVE') return res.status(400).json({ error: '职位已关闭' });

    const application = await prisma.jobApplication.create({
      data: { jobId, talentId: talent.id, status: 'PENDING' },
    });

    // 通知企业有新的投递
    const jobWithEnterprise = await prisma.job.findUnique({
      where: { id: jobId },
      include: { enterprise: true },
    });
    if (jobWithEnterprise?.enterprise) {
      await createNotification(
        jobWithEnterprise.enterprise.userId,
        'APPLICATION',
        '收到新的简历投递',
        `${talent.realName || '人才'}投递了您的职位「${jobWithEnterprise.title}」`,
        JSON.stringify({ jobId, talentId: talent.id })
      );
    }

    res.json({ success: true, application });
  } catch (err) {
    console.error('Apply job error:', err);
    res.status(500).json({ error: '投递失败' });
  }
});

// Check if already applied
router.get('/:id/applied', authMiddleware, requireRole('TALENT'), async (req: AuthRequest, res) => {
  try {
    const jobId = req.params.id as string;
    const talent = await prisma.talent.findUnique({ where: { userId: req.userId } });
    if (!talent) return res.json({ applied: false });

    const application = await prisma.jobApplication.findUnique({
      where: { jobId_talentId: { jobId, talentId: talent.id } },
    });
    res.json({ applied: !!application, status: application?.status || null });
  } catch (err) {
    res.json({ applied: false });
  }
});

// Get my applications (talent)
router.get('/my/applications', authMiddleware, requireRole('TALENT'), async (req: AuthRequest, res) => {
  try {
    const talent = await prisma.talent.findUnique({ where: { userId: req.userId } });
    if (!talent) return res.status(400).json({ error: '人才信息不存在' });

    const applications = await prisma.jobApplication.findMany({
      where: { talentId: talent.id },
      orderBy: { createdAt: 'desc' },
      include: {
        job: {
          include: {
            enterprise: { select: { id: true, companyName: true, companyLogo: true, city: true } },
          },
        },
      },
    });
    res.json(applications);
  } catch (err) {
    res.status(500).json({ error: '获取投递记录失败' });
  }
});

// Get job's applications (enterprise)
router.get('/:id/applications', authMiddleware, requireRole('ENTERPRISE'), async (req: AuthRequest, res) => {
  try {
    const jobId = req.params.id as string;
    const enterprise = await prisma.enterprise.findUnique({ where: { userId: req.userId } });
    const job = await prisma.job.findUnique({ where: { id: jobId } });
    if (!job) return res.status(404).json({ error: '职位不存在' });
    if (job.enterpriseId !== enterprise?.id) return res.status(403).json({ error: '无权查看' });

    const applications = await prisma.jobApplication.findMany({
      where: { jobId },
      orderBy: { createdAt: 'desc' },
      include: {
        talent: {
          // 数据最小化：仅返回简历展示字段，不返回 idNumber / phone / email /
          // maritalStatus / hasChildren / hometown / parentInfo 等敏感信息
          select: {
            id: true, userId: true, realName: true, title: true, currentCompany: true,
            city: true, province: true, minSalary: true, maxSalary: true,
            workYears: true, education: true, starLevel: true, starLevelStr: true,
            brandEndorsement: true, avatar: true, selfIntro: true,
            cuisineIds: true, businessTypeIds: true, jobCategoryId: true,
          },
        },
      },
    });
    res.json(applications);
  } catch (err) {
    res.status(500).json({ error: '获取投递列表失败' });
  }
});

// Update application status (enterprise)
router.patch('/:id/applications/:appId', authMiddleware, requireRole('ENTERPRISE'), async (req: AuthRequest, res) => {
  try {
    const jobId = req.params.id as string;
    const appId = req.params.appId as string;
    const status = req.body?.status;

    if (!isApplicationStatus(status)) {
      return res.status(400).json({ error: '投递状态无效' });
    }

    const enterprise = await prisma.enterprise.findUnique({ where: { userId: req.userId } });
    const job = await prisma.job.findUnique({ where: { id: jobId } });
    if (!job) return res.status(404).json({ error: '职位不存在' });
    if (job.enterpriseId !== enterprise?.id) return res.status(403).json({ error: '无权操作' });

    // appId 必须确实属于 URL 指定的 jobId，不能借用自己职位的 URL 更新其他职位投递。
    const application = await prisma.jobApplication.findFirst({
      where: { id: appId, jobId },
      include: { talent: { select: { userId: true } } },
    });
    if (!application) return res.status(404).json({ error: '投递记录不存在' });

    // 相同状态是安全重试，不写库、不重复发通知。
    if (isApplicationStatusNoop(application.status, status)) {
      const { talent: _talent, ...currentApplication } = application;
      return res.json(currentApplication);
    }

    // PENDING 仅能由投递创建流程设置，不能从其他状态回退。
    if (status === 'PENDING') {
      return res.status(400).json({ error: '投递状态不能回退为 PENDING' });
    }

    if (!canTransitionApplicationStatus(application.status, status)) {
      return res.status(409).json({
        error: `投递状态不能从 ${application.status} 变更为 ${status}`,
      });
    }

    // 带旧状态条件的原子更新，避免两个管理员页面并发造成非法回退。
    const updateResult = await prisma.jobApplication.updateMany({
      where: { id: appId, jobId, status: application.status },
      data: { status },
    });
    if (updateResult.count !== 1) {
      return res.status(409).json({ error: '投递状态已变化，请刷新后重试' });
    }

    const updated = await prisma.jobApplication.findUnique({ where: { id: appId } });

    // 通知人才状态变更
    const statusText: Record<string, string> = {
      VIEWED: '您的简历已被查看',
      CONTACTED: '企业正在与您沟通',
      INTERVIEWED: '企业邀请您面试',
      REJECTED: '您的申请未被通过',
      ACCEPTED: '恭喜！您的申请已通过',
    };
    if (statusText[status]) {
      await createNotification(
        application.talent.userId,
        'APPLICATION',
        statusText[status],
        `职位「${job.title}」状态更新：${statusText[status]}`,
        JSON.stringify({ jobId })
      );
    }

    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: '更新失败' });
  }
});

// ========== Job Favorite (收藏职位) ==========

// Favorite a job
router.post('/:id/favorite', authMiddleware, requireRole('TALENT'), async (req: AuthRequest, res) => {
  try {
    const jobId = req.params.id as string;
    const talent = await prisma.talent.findUnique({ where: { userId: req.userId } });
    if (!talent) return res.status(400).json({ error: '请先完善人才信息' });

    // Check if already favorited
    const existing = await prisma.jobFavorite.findUnique({
      where: { jobId_talentId: { jobId, talentId: talent.id } },
    });
    if (existing) return res.status(400).json({ error: '已收藏该职位' });

    const favorite = await prisma.jobFavorite.create({
      data: { jobId, talentId: talent.id },
    });
    res.json(favorite);
  } catch (err) {
    console.error('Favorite job error:', err);
    res.status(500).json({ error: '收藏失败' });
  }
});

// Unfavorite a job
router.delete('/:id/favorite', authMiddleware, requireRole('TALENT'), async (req: AuthRequest, res) => {
  try {
    const jobId = req.params.id as string;
    const talent = await prisma.talent.findUnique({ where: { userId: req.userId } });
    if (!talent) return res.status(400).json({ error: '人才信息不存在' });

    await prisma.jobFavorite.delete({
      where: { jobId_talentId: { jobId, talentId: talent.id } },
    });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: '取消收藏失败' });
  }
});

// Check if favorited
router.get('/:id/favorited', authMiddleware, requireRole('TALENT'), async (req: AuthRequest, res) => {
  try {
    const jobId = req.params.id as string;
    const talent = await prisma.talent.findUnique({ where: { userId: req.userId } });
    if (!talent) return res.json({ favorited: false });

    const favorite = await prisma.jobFavorite.findUnique({
      where: { jobId_talentId: { jobId, talentId: talent.id } },
    });
    res.json({ favorited: !!favorite });
  } catch (err) {
    res.json({ favorited: false });
  }
});

// Get my favorites
router.get('/my/favorites', authMiddleware, requireRole('TALENT'), async (req: AuthRequest, res) => {
  try {
    const talent = await prisma.talent.findUnique({ where: { userId: req.userId } });
    if (!talent) return res.status(400).json({ error: '人才信息不存在' });

    const favorites = await prisma.jobFavorite.findMany({
      where: { talentId: talent.id },
      orderBy: { createdAt: 'desc' },
      include: {
        job: {
          include: {
            enterprise: { select: { id: true, companyName: true, companyLogo: true, city: true } },
          },
        },
      },
    });
    res.json(favorites);
  } catch (err) {
    res.status(500).json({ error: '获取收藏列表失败' });
  }
});

export default router;
