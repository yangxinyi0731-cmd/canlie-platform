import { Router } from 'express';
import { prisma } from '../index.js';
import { authMiddleware, requireRole, AuthRequest } from '../middleware/auth.js';

const router = Router();

// ========== 公开接口 ==========

// 分享信息流（分页、分类筛选）
router.get('/', async (req, res) => {
  try {
    const { category, page = '1', pageSize = '10' } = req.query;
    const skip = (parseInt(page as string) - 1) * parseInt(pageSize as string);
    const where: any = { status: 'VISIBLE' };
    if (category) where.category = category;

    const [posts, total] = await Promise.all([
      prisma.sharePost.findMany({
        where,
        skip,
        take: parseInt(pageSize as string),
        orderBy: { createdAt: 'desc' },
        include: {
          user: { select: { id: true, name: true, avatar: true } },
          _count: { select: { comments: true } },
        },
      }),
      prisma.sharePost.count({ where }),
    ]);
    res.json({ posts, total, page: parseInt(page as string), pageSize: parseInt(pageSize as string) });
  } catch (err) {
    res.status(500).json({ error: '获取分享列表失败' });
  }
});

// 我的分享
router.get('/my/list', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const posts = await prisma.sharePost.findMany({
      where: { userId: req.userId },
      orderBy: { createdAt: 'desc' },
    });
    res.json(posts);
  } catch (err) {
    res.status(500).json({ error: '获取我的分享失败' });
  }
});

// 管理员列表（含隐藏）
router.get('/admin/list', authMiddleware, requireRole('ADMIN'), async (req, res) => {
  try {
    const { status } = req.query;
    const where: any = {};
    if (status) where.status = String(status);
    const posts = await prisma.sharePost.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { id: true, phone: true, name: true } },
      },
    });
    res.json(posts);
  } catch (err) {
    res.status(500).json({ error: '获取分享列表失败' });
  }
});

// 分享详情（含评论）
router.get('/:id', async (req, res) => {
  try {
    const post = await prisma.sharePost.findUnique({
      where: { id: req.params.id },
      include: {
        user: { select: { id: true, name: true, avatar: true } },
        comments: {
          orderBy: { createdAt: 'asc' },
          include: { user: { select: { id: true, name: true, avatar: true } } },
        },
      },
    });
    if (!post) return res.status(404).json({ error: '分享不存在' });
    if (post.status !== 'VISIBLE') return res.status(404).json({ error: '分享已删除' });
    res.json(post);
  } catch (err) {
    res.status(500).json({ error: '获取分享详情失败' });
  }
});

// ========== 登录用户 ==========

// 发布分享
router.post('/', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { category, title, content, images, videoUrl } = req.body;
    if (!category || !title) {
      return res.status(400).json({ error: '请填写分类和标题' });
    }
    if (!['STARTUP', 'LEARNING'].includes(category)) {
      return res.status(400).json({ error: '分类无效' });
    }
    const post = await prisma.sharePost.create({
      data: {
        userId: req.userId!,
        category,
        title,
        content: content || null,
        images: images && Array.isArray(images) ? JSON.stringify(images) : '[]',
        videoUrl: videoUrl || null,
      },
    });
    res.json(post);
  } catch (err) {
    console.error('Create share post error:', err);
    res.status(500).json({ error: '发布分享失败' });
  }
});

// 更新分享（仅作者）
router.put('/:id', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const id = String(req.params.id);
    const post = await prisma.sharePost.findUnique({ where: { id } });
    if (!post) return res.status(404).json({ error: '分享不存在' });
    if (post.userId !== req.userId) return res.status(403).json({ error: '无权修改' });

    const { category, title, content, images, videoUrl } = req.body;
    const updated = await prisma.sharePost.update({
      where: { id: post.id },
      data: {
        category: category || post.category,
        title: title || post.title,
        content: content !== undefined ? content : post.content,
        images: images && Array.isArray(images) ? JSON.stringify(images) : post.images,
        videoUrl: videoUrl !== undefined ? videoUrl : post.videoUrl,
      },
    });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: '更新分享失败' });
  }
});

// 删除分享（仅作者）
router.delete('/:id', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const id = String(req.params.id);
    const post = await prisma.sharePost.findUnique({ where: { id } });
    if (!post) return res.status(404).json({ error: '分享不存在' });
    if (post.userId !== req.userId) return res.status(403).json({ error: '无权删除' });

    await prisma.$transaction([
      prisma.shareComment.deleteMany({ where: { postId: post.id } }),
      prisma.shareLike.deleteMany({ where: { postId: post.id } }),
      prisma.sharePost.delete({ where: { id: post.id } }),
    ]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: '删除分享失败' });
  }
});

// 点赞/取消点赞（切换）
router.post('/:id/like', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const postId = String(req.params.id);
    const userId = req.userId!;

    const existing = await prisma.shareLike.findUnique({
      where: { postId_userId: { postId, userId } },
    });

    if (existing) {
      await prisma.$transaction([
        prisma.shareLike.delete({ where: { postId_userId: { postId, userId } } }),
        prisma.sharePost.update({
          where: { id: postId },
          data: { likeCount: { decrement: 1 } },
        }),
      ]);
      return res.json({ liked: false });
    }

    await prisma.$transaction([
      prisma.shareLike.create({ data: { postId, userId } }),
      prisma.sharePost.update({
        where: { id: postId },
        data: { likeCount: { increment: 1 } },
      }),
    ]);
    res.json({ liked: true });
  } catch (err) {
    res.status(500).json({ error: '点赞失败' });
  }
});

// 评论
router.post('/:id/comment', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { content } = req.body;
    if (!content || !content.trim()) {
      return res.status(400).json({ error: '请输入评论内容' });
    }
    const postId = String(req.params.id);
    const post = await prisma.sharePost.findUnique({ where: { id: postId } });
    if (!post) return res.status(404).json({ error: '分享不存在' });

    const comment = await prisma.shareComment.create({
      data: {
        postId: post.id,
        userId: req.userId!,
        content: content.trim(),
      },
    });
    await prisma.sharePost.update({
      where: { id: post.id },
      data: { commentCount: { increment: 1 } },
    });
    res.json(comment);
  } catch (err) {
    res.status(500).json({ error: '评论失败' });
  }
});

// ========== 管理员 ==========

// 管理员隐藏/恢复
router.patch('/admin/:id/status', authMiddleware, requireRole('ADMIN'), async (req, res) => {
  try {
    const { status } = req.body;
    if (!['VISIBLE', 'HIDDEN'].includes(status)) {
      return res.status(400).json({ error: '状态无效' });
    }
    const post = await prisma.sharePost.update({
      where: { id: String(req.params.id) },
      data: { status },
    });
    res.json(post);
  } catch (err) {
    res.status(500).json({ error: '操作失败' });
  }
});

export default router;
