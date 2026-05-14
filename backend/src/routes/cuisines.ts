import { Router } from 'express';
import { prisma } from '../index.js';

const router = Router();

// Get all cuisines
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

// Get all reference data
router.get('/all', async (_req, res) => {
  try {
    const [cuisines, businessTypes] = await Promise.all([
      prisma.cuisine.findMany({ where: { active: true }, orderBy: [{ level: 'asc' }, { sortOrder: 'asc' }] }),
      prisma.businessType.findMany({ where: { active: true }, orderBy: { sortOrder: 'asc' } }),
    ]);
    res.json({ cuisines, businessTypes });
  } catch (err) {
    res.status(500).json({ error: '获取数据失败' });
  }
});

export default router;
