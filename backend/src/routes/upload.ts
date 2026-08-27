import { createHash, randomUUID } from 'node:crypto';
import fs from 'node:fs';
import { promises as fsPromises } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Router } from 'express';
import multer from 'multer';
import { prisma } from '../index.js';
import { authMiddleware, AuthRequest, optionalAuthMiddleware } from '../middleware/auth.js';
import {
  canReadStoredUpload,
  detectUploadKind,
  getAllowedUploadKinds,
  getUploadAccessLevel,
  getUploadKindExtension,
  getUploadKindMimeType,
  isUploadPurpose,
} from '../security/privacy.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const uploadDir = path.join(__dirname, '../../uploads');
const MAX_STANDARD_FILE_SIZE = 10 * 1024 * 1024;
const MAX_VIDEO_FILE_SIZE = 100 * 1024 * 1024;

fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, _file, cb) => cb(null, `${randomUUID()}.pending`),
});

const upload = multer({
  storage,
  limits: { fileSize: MAX_VIDEO_FILE_SIZE },
});

const router = Router();

async function removeIfPresent(filePath: string | undefined) {
  if (!filePath) return;
  try { await fsPromises.unlink(filePath); } catch {}
}

async function readHeader(filePath: string): Promise<Buffer> {
  const handle = await fsPromises.open(filePath, 'r');
  try {
    const buffer = Buffer.alloc(512);
    const { bytesRead } = await handle.read(buffer, 0, buffer.length, 0);
    return buffer.subarray(0, bytesRead);
  } finally {
    await handle.close();
  }
}

async function sha256File(filePath: string): Promise<string> {
  return await new Promise((resolve, reject) => {
    const hash = createHash('sha256');
    const stream = fs.createReadStream(filePath);
    stream.on('data', (chunk) => hash.update(chunk));
    stream.on('error', reject);
    stream.on('end', () => resolve(hash.digest('hex')));
  });
}

const legacyMimeTypes: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.gif': 'image/gif',
  '.pdf': 'application/pdf',
  '.doc': 'application/msword',
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.avi': 'video/x-msvideo',
};

async function isLegacyUploadPublic(filename: string): Promise<boolean> {
  const [avatar, logo, product, share] = await Promise.all([
    prisma.user.findFirst({ where: { avatar: { contains: filename } }, select: { id: true } }),
    prisma.enterprise.findFirst({ where: { companyLogo: { contains: filename } }, select: { id: true } }),
    prisma.supplyProduct.findFirst({
      where: { images: { contains: filename }, company: { status: 'APPROVED' } },
      select: { id: true },
    }),
    prisma.sharePost.findFirst({
      where: {
        status: 'VISIBLE',
        OR: [{ images: { contains: filename } }, { videoUrl: { contains: filename } }],
      },
      select: { id: true },
    }),
  ]);
  return Boolean(avatar || logo || product || share);
}

async function canReadLegacyPrivate(filename: string, req: AuthRequest): Promise<boolean> {
  if (!req.userId) return false;
  if (req.userRole === 'ADMIN') {
    const [enterprise, verification, resume, supply] = await Promise.all([
      prisma.enterprise.findFirst({
        where: {
          OR: [
            { businessLicense: { contains: filename } },
            { personalIdFront: { contains: filename } },
            { personalIdBack: { contains: filename } },
          ],
        },
        select: { id: true },
      }),
      prisma.verification.findFirst({
        where: { OR: [{ certFileUrl: { contains: filename } }, { salaryFileUrl: { contains: filename } }] },
        select: { id: true },
      }),
      prisma.resume.findFirst({ where: { fileUrl: { contains: filename } }, select: { id: true } }),
      prisma.supplyCompany.findFirst({ where: { businessLicense: { contains: filename } }, select: { id: true } }),
    ]);
    return Boolean(enterprise || verification || resume || supply);
  }

  const [enterprise, verification, resume, supply, ownedProduct, ownedShare] = await Promise.all([
    prisma.enterprise.findFirst({
      where: {
        userId: req.userId,
        OR: [
          { businessLicense: { contains: filename } },
          { personalIdFront: { contains: filename } },
          { personalIdBack: { contains: filename } },
        ],
      },
      select: { id: true },
    }),
    prisma.verification.findFirst({
      where: {
        talent: { userId: req.userId },
        OR: [{ certFileUrl: { contains: filename } }, { salaryFileUrl: { contains: filename } }],
      },
      select: { id: true },
    }),
    prisma.resume.findFirst({
      where: { talent: { userId: req.userId }, fileUrl: { contains: filename } },
      select: { id: true },
    }),
    prisma.supplyCompany.findFirst({
      where: { userId: req.userId, businessLicense: { contains: filename } },
      select: { id: true },
    }),
    prisma.supplyProduct.findFirst({
      where: { company: { userId: req.userId }, images: { contains: filename } },
      select: { id: true },
    }),
    prisma.sharePost.findFirst({
      where: {
        userId: req.userId,
        OR: [{ images: { contains: filename } }, { videoUrl: { contains: filename } }],
      },
      select: { id: true },
    }),
  ]);
  return Boolean(enterprise || verification || resume || supply || ownedProduct || ownedShare);
}

async function persistUpload(req: AuthRequest, res: any) {
  const pendingPath = req.file?.path;
  let finalPath: string | undefined;
  try {
    if (!req.file) return res.status(400).json({ error: '请选择文件' });
    if (!isUploadPurpose(req.body?.purpose)) {
      await removeIfPresent(pendingPath);
      return res.status(400).json({ error: '请选择有效的文件用途' });
    }

    const purpose = req.body.purpose;
    const maxSize = purpose === 'SHARE_VIDEO' ? MAX_VIDEO_FILE_SIZE : MAX_STANDARD_FILE_SIZE;
    if (req.file.size <= 0 || req.file.size > maxSize) {
      await removeIfPresent(pendingPath);
      return res.status(413).json({ error: `文件大小必须在 1 字节到 ${maxSize / 1024 / 1024}MB 之间` });
    }

    const kind = detectUploadKind(await readHeader(req.file.path));
    if (!kind || !getAllowedUploadKinds(purpose).includes(kind)) {
      await removeIfPresent(pendingPath);
      return res.status(415).json({ error: '文件真实类型与所选用途不匹配' });
    }

    const storageKey = `${randomUUID()}${getUploadKindExtension(kind)}`;
    finalPath = path.join(uploadDir, storageKey);
    await fsPromises.rename(req.file.path, finalPath);

    const accessLevel = getUploadAccessLevel(purpose);
    const stored = await prisma.storedUpload.create({
      data: {
        ownerId: req.userId!,
        purpose,
        accessLevel,
        storageKey,
        mimeType: getUploadKindMimeType(kind),
        size: req.file.size,
        sha256: await sha256File(finalPath),
      },
      select: { id: true, purpose: true, accessLevel: true, size: true, mimeType: true },
    });

    const pathPrefix = stored.accessLevel === 'PUBLIC' ? 'public' : 'private';
    return res.status(201).json({
      ...stored,
      url: `/api/uploads/${pathPrefix}/${stored.id}`,
    });
  } catch (error) {
    await removeIfPresent(pendingPath);
    await removeIfPresent(finalPath);
    console.error('Store upload error:', error);
    return res.status(500).json({ error: '上传失败' });
  }
}

router.post('/', authMiddleware, upload.single('file'), persistUpload);
router.post('/video', authMiddleware, upload.single('file'), persistUpload);

router.get('/public/:id', async (req, res) => {
  try {
    const stored = await prisma.storedUpload.findFirst({
      where: { id: req.params.id as string, accessLevel: 'PUBLIC', deletedAt: null },
    });
    if (!stored) return res.status(404).json({ error: '文件不存在' });
    const filePath = path.join(uploadDir, path.basename(stored.storageKey));
    await fsPromises.access(filePath, fs.constants.R_OK);
    res.setHeader('Content-Type', stored.mimeType);
    res.setHeader('Content-Disposition', 'inline');
    res.setHeader('Cache-Control', 'public, max-age=86400, immutable');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    return res.sendFile(filePath);
  } catch {
    return res.status(404).json({ error: '文件不存在' });
  }
});

router.get('/private/:id', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const stored = await prisma.storedUpload.findFirst({
      where: { id: req.params.id as string, accessLevel: 'PRIVATE', deletedAt: null },
    });
    if (!stored) return res.status(404).json({ error: '文件不存在' });

    const allowed = canReadStoredUpload({
      accessLevel: stored.accessLevel,
      ownerId: stored.ownerId,
      viewerId: req.userId,
      viewerRole: req.userRole,
    });
    await prisma.sensitiveAccessLog.create({
      data: {
        actorUserId: req.userId,
        subjectType: 'STORED_UPLOAD',
        subjectId: stored.id,
        action: allowed ? 'READ_ALLOWED' : 'READ_DENIED',
        metadata: JSON.stringify({ purpose: stored.purpose }),
      },
    });
    if (!allowed) return res.status(403).json({ error: '无权访问此文件' });

    const filePath = path.join(uploadDir, path.basename(stored.storageKey));
    await fsPromises.access(filePath, fs.constants.R_OK);
    res.setHeader('Content-Type', stored.mimeType);
    res.setHeader('Content-Disposition', 'inline');
    res.setHeader('Cache-Control', 'private, no-store');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    return res.sendFile(filePath);
  } catch (error) {
    console.error('Read private upload error:', error);
    return res.status(404).json({ error: '文件不存在' });
  }
});

// Compatibility path for records created before upload metadata existed. It
// never exposes an arbitrary file: a database reference and the corresponding
// public/owner/admin policy are both required.
router.get('/:legacyFilename', optionalAuthMiddleware, async (req: AuthRequest, res) => {
  const filename = path.basename(req.params.legacyFilename as string);
  if (!filename || filename !== req.params.legacyFilename || filename.endsWith('.pending')) {
    return res.status(404).json({ error: '文件不存在' });
  }
  const filePath = path.join(uploadDir, filename);
  try {
    await fsPromises.access(filePath, fs.constants.R_OK);
    const isPublic = await isLegacyUploadPublic(filename);
    const isPrivateAllowed = isPublic ? false : await canReadLegacyPrivate(filename, req);
    if (!isPublic && !isPrivateAllowed) {
      if (req.userId) {
        await prisma.sensitiveAccessLog.create({
          data: {
            actorUserId: req.userId,
            subjectType: 'LEGACY_UPLOAD',
            subjectId: filename,
            action: 'READ_DENIED',
          },
        });
      }
      return res.status(req.userId ? 403 : 401).json({ error: '无权访问此文件' });
    }
    if (!isPublic) {
      await prisma.sensitiveAccessLog.create({
        data: {
          actorUserId: req.userId,
          subjectType: 'LEGACY_UPLOAD',
          subjectId: filename,
          action: 'READ_ALLOWED',
        },
      });
    }
    const mimeType = legacyMimeTypes[path.extname(filename).toLowerCase()];
    if (!mimeType) return res.status(415).json({ error: '不支持的文件类型' });
    res.setHeader('Content-Type', mimeType);
    res.setHeader('Content-Disposition', 'inline');
    res.setHeader('Cache-Control', isPublic ? 'public, max-age=3600' : 'private, no-store');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    return res.sendFile(filePath);
  } catch (error) {
    console.error('Read legacy upload error:', error);
    return res.status(404).json({ error: '文件不存在' });
  }
});

router.delete('/:id', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const stored = await prisma.storedUpload.findFirst({
      where: { id: req.params.id as string, deletedAt: null },
    });
    if (!stored) return res.status(404).json({ error: '文件不存在' });
    if (stored.ownerId !== req.userId && req.userRole !== 'ADMIN') {
      return res.status(403).json({ error: '无权删除此文件' });
    }
    await prisma.storedUpload.update({ where: { id: stored.id }, data: { deletedAt: new Date() } });
    await removeIfPresent(path.join(uploadDir, path.basename(stored.storageKey)));
    return res.json({ success: true });
  } catch (error) {
    console.error('Delete upload error:', error);
    return res.status(500).json({ error: '删除文件失败' });
  }
});

router.use((error: unknown, _req: AuthRequest, res: any, next: any) => {
  if (error instanceof multer.MulterError && error.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({ error: '文件过大' });
  }
  if (error) return res.status(400).json({ error: '上传请求无效' });
  return next();
});

export default router;
