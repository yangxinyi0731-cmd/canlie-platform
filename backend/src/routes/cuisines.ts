import { Router } from 'express';
import { prisma } from '../index.js';

const router = Router();

// Get all cuisines (with parent info for two-level display)
router.get('/cuisines', async (_req, res) => {
  try {
    const cuisines = await prisma.cuisine.findMany({
      where: { active: true },
      orderBy: [{ level: 'asc' }, { sortOrder: 'asc' }],
    });
    res.json(cuisines);
  } catch (err) {
    res.status(500).json({ error: '获取菜系列表失败' });
  }
});

// Get cuisines grouped by level for two-level selector
router.get('/cuisines/grouped', async (_req, res) => {
  try {
    const level1 = await prisma.cuisine.findMany({
      where: { active: true, level: 1 },
      orderBy: { sortOrder: 'asc' },
    });
    const level2 = await prisma.cuisine.findMany({
      where: { active: true, level: 2 },
      orderBy: { sortOrder: 'asc' },
    });

    // Group level 2 by parentId
    const grouped: Record<string, typeof level2> = {};
    for (const c of level2) {
      if (!c.parentId) continue;
      if (!grouped[c.parentId]) grouped[c.parentId] = [];
      grouped[c.parentId].push(c);
    }

    res.json({ level1, level2Grouped: grouped });
  } catch (err) {
    res.status(500).json({ error: '获取菜系分组失败' });
  }
});

// Get all business types
router.get('/business-types', async (_req, res) => {
  try {
    const types = await prisma.businessType.findMany({
      where: { active: true },
      orderBy: { sortOrder: 'asc' },
    });
    res.json(types);
  } catch (err) {
    res.status(500).json({ error: '获取业态列表失败' });
  }
});

// Get all job categories (with sub-categories)
router.get('/job-categories', async (_req, res) => {
  try {
    const categories = await prisma.jobCategory.findMany({
      where: { active: true },
      orderBy: { sortOrder: 'asc' },
      include: {
        subCategories: {
          where: { active: true },
          orderBy: { sortOrder: 'asc' },
        },
      },
    });
    res.json(categories);
  } catch (err) {
    res.status(500).json({ error: '获取岗位分类失败' });
  }
});

// Get all cities (grouped by province)
router.get('/cities', async (_req, res) => {
  try {
    const cities = await prisma.chinaCity.findMany({
      where: { active: true },
      orderBy: [{ province: 'asc' }, { sortOrder: 'asc' }],
    });

    // Group by province
    const grouped: Record<string, typeof cities> = {};
    for (const c of cities) {
      if (!grouped[c.province]) grouped[c.province] = [];
      grouped[c.province].push(c);
    }

    res.json({ cities, grouped });
  } catch (err) {
    res.status(500).json({ error: '获取城市列表失败' });
  }
});

// Get all reference data (combined)
router.get('/all', async (_req, res) => {
  try {
    const [cuisines, businessTypes, jobCategories, cities] = await Promise.all([
      prisma.cuisine.findMany({ where: { active: true }, orderBy: [{ level: 'asc' }, { sortOrder: 'asc' }] }),
      prisma.businessType.findMany({ where: { active: true }, orderBy: { sortOrder: 'asc' } }),
      prisma.jobCategory.findMany({
        where: { active: true },
        orderBy: { sortOrder: 'asc' },
        include: {
          subCategories: {
            where: { active: true },
            orderBy: { sortOrder: 'asc' },
          },
        },
      }),
      prisma.chinaCity.findMany({
        where: { active: true },
        orderBy: [{ province: 'asc' }, { sortOrder: 'asc' }],
      }),
    ]);

    // Group cities by province
    const cityGrouped: Record<string, typeof cities> = {};
    for (const c of cities) {
      if (!cityGrouped[c.province]) cityGrouped[c.province] = [];
      cityGrouped[c.province].push(c);
    }

    res.json({ cuisines, businessTypes, jobCategories, cities: cityGrouped });
  } catch (err) {
    res.status(500).json({ error: '获取数据失败' });
  }
});

// Get all subscription plans
router.get('/plans', async (_req, res) => {
  try {
    const plans = await prisma.subscriptionPlan.findMany({
      where: { active: true },
      orderBy: { sortOrder: 'asc' },
    });
    res.json(plans);
  } catch (err) {
    res.status(500).json({ error: '获取付费方案失败' });
  }
});

// Get star rating criteria
router.get('/star-criteria', async (_req, res) => {
  try {
    const criteria = await prisma.starCriteria.findMany({
      where: { active: true },
      orderBy: { starLevel: 'asc' },
    });
    res.json(criteria);
  } catch (err) {
    res.status(500).json({ error: '获取星级标准失败' });
  }
});

export default router;
