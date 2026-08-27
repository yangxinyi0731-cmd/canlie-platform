import 'dotenv/config';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const confirm = process.argv.includes('--confirm');
const demoPhones = [
  '13800000000',
  '13800000001',
  '13800000002',
  '13800000003',
  '13900000001',
  '13900000002',
  '13900000003',
  '13900000004',
];

async function main() {
  if (process.env.NODE_ENV === 'production' && process.env.ALLOW_PRODUCTION_DEMO_CLEANUP !== 'YES') {
    throw new Error('Production cleanup requires ALLOW_PRODUCTION_DEMO_CLEANUP=YES and --confirm.');
  }

  const users = await prisma.user.findMany({
    where: { phone: { in: demoPhones } },
    select: { id: true },
  });
  const userIds = users.map((user) => user.id);
  if (userIds.length === 0) {
    console.log('No known synthetic demo accounts were found.');
    return;
  }

  const [enterprises, talents, sharePosts, supplyCompanies, referralCodes, uploads] = await Promise.all([
    prisma.enterprise.findMany({ where: { userId: { in: userIds } }, select: { id: true } }),
    prisma.talent.findMany({ where: { userId: { in: userIds } }, select: { id: true } }),
    prisma.sharePost.findMany({ where: { userId: { in: userIds } }, select: { id: true } }),
    prisma.supplyCompany.findMany({ where: { userId: { in: userIds } }, select: { id: true } }),
    prisma.referralCode.findMany({ where: { userId: { in: userIds } }, select: { id: true } }),
    prisma.storedUpload.findMany({ where: { ownerId: { in: userIds } }, select: { storageKey: true } }),
  ]);
  const enterpriseIds = enterprises.map((item) => item.id);
  const talentIds = talents.map((item) => item.id);
  const postIds = sharePosts.map((item) => item.id);
  const supplyCompanyIds = supplyCompanies.map((item) => item.id);
  const referralCodeIds = referralCodes.map((item) => item.id);
  const jobs = await prisma.job.findMany({
    where: { enterpriseId: { in: enterpriseIds } },
    select: { id: true },
  });
  const jobIds = jobs.map((job) => job.id);

  console.log(JSON.stringify({
    dryRun: !confirm,
    syntheticUsers: userIds.length,
    enterprises: enterpriseIds.length,
    talents: talentIds.length,
    jobs: jobIds.length,
    uploads: uploads.length,
  }));
  if (!confirm) {
    console.log('Dry run only. Re-run with --confirm after checking the counts.');
    return;
  }

  await prisma.$transaction(async (tx) => {
    await tx.shareLike.deleteMany({ where: { OR: [{ userId: { in: userIds } }, { postId: { in: postIds } }] } });
    await tx.shareComment.deleteMany({ where: { OR: [{ userId: { in: userIds } }, { postId: { in: postIds } }] } });
    await tx.sharePost.deleteMany({ where: { id: { in: postIds } } });
    await tx.supplyProduct.deleteMany({ where: { companyId: { in: supplyCompanyIds } } });
    await tx.supplyCompany.deleteMany({ where: { id: { in: supplyCompanyIds } } });
    await tx.chatParticipant.deleteMany({ where: { OR: [{ userId: { in: userIds } }, { chatWith: { in: userIds } }, { jobId: { in: jobIds } }] } });
    await tx.chatMessage.deleteMany({ where: { OR: [{ senderId: { in: userIds } }, { receiverId: { in: userIds } }, { jobId: { in: jobIds } }] } });
    await tx.notification.deleteMany({ where: { userId: { in: userIds } } });
    await tx.referralRecord.deleteMany({ where: { OR: [{ referralId: { in: referralCodeIds } }, { referredUserId: { in: userIds } }] } });
    await tx.referralCode.deleteMany({ where: { id: { in: referralCodeIds } } });
    await tx.sensitiveAccessLog.deleteMany({ where: { actorUserId: { in: userIds } } });
    await tx.storedUpload.deleteMany({ where: { ownerId: { in: userIds } } });
    await tx.jobApplication.deleteMany({ where: { OR: [{ jobId: { in: jobIds } }, { talentId: { in: talentIds } }] } });
    await tx.match.deleteMany({ where: { OR: [{ jobId: { in: jobIds } }, { talentId: { in: talentIds } }] } });
    await tx.jobFavorite.deleteMany({ where: { OR: [{ jobId: { in: jobIds } }, { talentId: { in: talentIds } }] } });
    await tx.enterpriseSubscription.deleteMany({ where: { enterpriseId: { in: enterpriseIds } } });
    await tx.job.deleteMany({ where: { id: { in: jobIds } } });
    await tx.workExperience.deleteMany({ where: { talentId: { in: talentIds } } });
    await tx.resume.deleteMany({ where: { talentId: { in: talentIds } } });
    await tx.verification.deleteMany({ where: { talentId: { in: talentIds } } });
    await tx.talent.deleteMany({ where: { id: { in: talentIds } } });
    await tx.enterprise.deleteMany({ where: { id: { in: enterpriseIds } } });
    await tx.user.deleteMany({ where: { id: { in: userIds } } });
  });

  const currentDir = path.dirname(fileURLToPath(import.meta.url));
  const uploadDir = path.resolve(currentDir, '../../uploads');
  for (const upload of uploads) {
    const filePath = path.resolve(uploadDir, path.basename(upload.storageKey));
    if (path.dirname(filePath) !== uploadDir) continue;
    try { await fs.unlink(filePath); } catch {}
  }
  console.log('Synthetic demo data cleanup completed.');
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : 'Demo cleanup failed.');
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
