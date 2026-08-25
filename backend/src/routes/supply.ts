import { Router } from 'express';
import { prisma } from '../index.js';
import { authMiddleware, requireRole, AuthRequest } from '../middleware/auth.js';

const router = Router();

// ========== 公开接口 ==========

// 获取全部供应分类
router.get('/categories', async (_req, res) => {
  try {
    const categories = await prisma.supplyCategory.findMany({
      where: { active: true },
      orderBy: { sortOrder: 'asc' },
    });
    res.json(categories);
  } catch (err) {
    res.status(500).json({ error: '获取分类失败' });
  }
});

// 获取已审核商家列表（可按分类筛选）
// ⚠️ 公开接口仅返回展示字段，不返回 businessLicense / contactName /
// contactPhone / userId / reason（PIPL 合规，防联系方式与证件外泄）
router.get('/companies', async (req, res) => {
  try {
    const { categoryId, keyword, page = '1', pageSize = '20' } = req.query;
    const skip = (parseInt(page as string) - 1) * parseInt(pageSize as string);
    const where: any = { status: 'APPROVED' };
    if (categoryId) where.categoryId = categoryId;
    if (keyword) where.companyName = { contains: keyword as string };

    const [companies, total] = await Promise.all([
      prisma.supplyCompany.findMany({
        where,
        skip,
        take: parseInt(pageSize as string),
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          companyName: true,
          productDesc: true,
          services: true,
          introduction: true,
          cuisineIds: true,
          createdAt: true,
          category: { select: { id: true, name: true } },
          _count: { select: { products: true } },
        },
      }),
      prisma.supplyCompany.count({ where }),
    ]);
    res.json({ companies, total, page: parseInt(page as string), pageSize: parseInt(pageSize as string) });
  } catch (err) {
    res.status(500).json({ error: '获取商家列表失败' });
  }
});

// 获取商家详情（含产品）
// 同样仅返回展示字段 + 产品列表，不返回营业执照/联系方式
router.get('/companies/:id', async (req, res) => {
  try {
    const company = await prisma.supplyCompany.findUnique({
      where: { id: req.params.id },
      select: {
        id: true,
        companyName: true,
        productDesc: true,
        services: true,
        introduction: true,
        cuisineIds: true,
        status: true,
        createdAt: true,
        category: { select: { id: true, name: true } },
        products: {
          orderBy: { createdAt: 'desc' },
          select: { id: true, name: true, price: true, images: true, description: true, cuisineIds: true, createdAt: true },
        },
      },
    });
    if (!company) return res.status(404).json({ error: '商家不存在' });
    if (company.status !== 'APPROVED') return res.status(404).json({ error: '商家未通过审核' });
    res.json(company);
  } catch (err) {
    res.status(500).json({ error: '获取商家详情失败' });
  }
});

// ========== 商家自有店铺（任何登录用户） ==========

// 获取我的供应店铺
router.get('/my/company', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const company = await prisma.supplyCompany.findUnique({
      where: { userId: req.userId },
      include: {
        category: { select: { id: true, name: true } },
        products: { orderBy: { createdAt: 'desc' } },
      },
    });
    res.json(company);
  } catch (err) {
    res.status(500).json({ error: '获取店铺失败' });
  }
});

// 创建/申请入驻店铺
router.post('/my/company', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { categoryId, companyName, businessLicense, productDesc, services, introduction, contactName, contactPhone, cuisineIds } = req.body;

    if (!categoryId || !companyName) {
      return res.status(400).json({ error: '请填写分类和公司名称' });
    }

    const existing = await prisma.supplyCompany.findUnique({ where: { userId: req.userId } });
    if (existing) {
      return res.status(400).json({ error: '您已开设店铺，请前往店铺管理修改' });
    }

    const company = await prisma.supplyCompany.create({
      data: {
        userId: req.userId!,
        categoryId,
        companyName,
        businessLicense,
        productDesc,
        services,
        introduction,
        contactName,
        contactPhone,
        cuisineIds,
        status: 'PENDING',
      },
      include: { category: true },
    });
    res.json(company);
  } catch (err) {
    console.error('Create supply company error:', err);
    res.status(500).json({ error: '入驻申请失败' });
  }
});

// 更新我的店铺（改营业执照时重置为待审核）
router.put('/my/company', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { categoryId, companyName, businessLicense, productDesc, services, introduction, contactName, contactPhone, cuisineIds } = req.body;
    const company = await prisma.supplyCompany.findUnique({ where: { userId: req.userId } });
    if (!company) return res.status(404).json({ error: '店铺不存在' });

    const shouldReset = businessLicense && company.businessLicense !== businessLicense;

    const updated = await prisma.supplyCompany.update({
      where: { id: company.id },
      data: {
        categoryId: categoryId || company.categoryId,
        companyName: companyName || company.companyName,
        businessLicense,
        productDesc,
        services,
        introduction,
        contactName,
        contactPhone,
        cuisineIds,
        ...(shouldReset ? { status: 'PENDING', reason: null } : {}),
      },
      include: { category: true },
    });
    res.json(updated);
  } catch (err) {
    console.error('Update supply company error:', err);
    res.status(500).json({ error: '更新店铺失败' });
  }
});

// 添加产品
router.post('/my/company/products', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const company = await prisma.supplyCompany.findUnique({ where: { userId: req.userId } });
    if (!company) return res.status(404).json({ error: '店铺不存在' });

    const { name, price, images, description, cuisineIds } = req.body;
    if (!name) return res.status(400).json({ error: '请填写产品名称' });

    const product = await prisma.supplyProduct.create({
      data: {
        companyId: company.id,
        name,
        price: price || null,
        images: images && Array.isArray(images) ? JSON.stringify(images) : '[]',
        description,
        cuisineIds,
      },
    });
    res.json(product);
  } catch (err) {
    console.error('Add product error:', err);
    res.status(500).json({ error: '添加产品失败' });
  }
});

// 更新产品
router.put('/my/company/products/:id', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const company = await prisma.supplyCompany.findUnique({ where: { userId: req.userId } });
    if (!company) return res.status(404).json({ error: '店铺不存在' });

    const id = String(req.params.id);
    const product = await prisma.supplyProduct.findFirst({ where: { id, companyId: company.id } });
    if (!product) return res.status(404).json({ error: '产品不存在' });

    const { name, price, images, description, cuisineIds } = req.body;
    const updated = await prisma.supplyProduct.update({
      where: { id: product.id },
      data: {
        name: name || product.name,
        price: price !== undefined ? price : product.price,
        images: images && Array.isArray(images) ? JSON.stringify(images) : product.images,
        description: description !== undefined ? description : product.description,
        cuisineIds: cuisineIds !== undefined ? cuisineIds : product.cuisineIds,
      },
    });
    res.json(updated);
  } catch (err) {
    console.error('Update product error:', err);
    res.status(500).json({ error: '更新产品失败' });
  }
});

// 删除产品
router.delete('/my/company/products/:id', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const company = await prisma.supplyCompany.findUnique({ where: { userId: req.userId } });
    if (!company) return res.status(404).json({ error: '店铺不存在' });

    const id = String(req.params.id);
    const product = await prisma.supplyProduct.findFirst({ where: { id, companyId: company.id } });
    if (!product) return res.status(404).json({ error: '产品不存在' });

    await prisma.supplyProduct.delete({ where: { id: product.id } });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: '删除产品失败' });
  }
});

// ========== 管理员审核 ==========

router.get('/admin/companies', authMiddleware, requireRole('ADMIN'), async (req, res) => {
  try {
    const { status } = req.query;
    const where: any = {};
    if (status) where.status = String(status);

    const companies = await prisma.supplyCompany.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        category: { select: { id: true, name: true } },
        user: { select: { id: true, phone: true, name: true } },
        _count: { select: { products: true } },
      },
    });
    res.json(companies);
  } catch (err) {
    res.status(500).json({ error: '获取商家列表失败' });
  }
});

// 审核通过/驳回
router.put('/admin/companies/:id/verify', authMiddleware, requireRole('ADMIN'), async (req, res) => {
  try {
    const { status, reason } = req.body;
    if (!['APPROVED', 'REJECTED'].includes(status)) {
      return res.status(400).json({ error: '状态无效' });
    }
    const company = await prisma.supplyCompany.update({
      where: { id: String(req.params.id) },
      data: { status, reason: reason || null },
    });
    res.json(company);
  } catch (err) {
    res.status(500).json({ error: '审核失败' });
  }
});

export default router;
