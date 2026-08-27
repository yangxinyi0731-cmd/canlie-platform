import type { PrismaClient } from '@prisma/client';
import { getStoredUploadId, type UploadAccessLevel, type UploadPurpose } from './privacy.js';

export async function ownsStoredUploadReferences(input: {
  prisma: PrismaClient;
  ownerId: string;
  urls: Array<string | null | undefined>;
  purposes: readonly UploadPurpose[];
  accessLevel: UploadAccessLevel;
}): Promise<boolean> {
  const urls = input.urls.filter((url): url is string => Boolean(url));
  if (urls.length === 0) return true;
  const visibility = input.accessLevel === 'PUBLIC' ? 'public' : 'private';
  const ids = urls.map((url) => getStoredUploadId(url, visibility));
  if (ids.some((id) => !id)) return false;
  const uniqueIds = [...new Set(ids as string[])];
  const count = await input.prisma.storedUpload.count({
    where: {
      id: { in: uniqueIds },
      ownerId: input.ownerId,
      purpose: { in: [...input.purposes] },
      accessLevel: input.accessLevel,
      deletedAt: null,
    },
  });
  return count === uniqueIds.length;
}
