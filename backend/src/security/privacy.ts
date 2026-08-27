export const UPLOAD_PURPOSES = [
  'AVATAR',
  'ENTERPRISE_LOGO',
  'SHARE_IMAGE',
  'SHARE_VIDEO',
  'SUPPLY_PRODUCT_IMAGE',
  'TALENT_CERTIFICATE',
  'TALENT_SALARY_PROOF',
  'RESUME',
  'ENTERPRISE_LICENSE',
  'PERSONAL_ID',
  'SUPPLY_LICENSE',
] as const;

export type UploadPurpose = typeof UPLOAD_PURPOSES[number];
export type UploadAccessLevel = 'PUBLIC' | 'PRIVATE';
export type UploadKind = 'JPEG' | 'PNG' | 'GIF' | 'PDF' | 'DOC' | 'DOCX' | 'MP4' | 'WEBM' | 'AVI';

const PUBLIC_UPLOAD_PURPOSES = new Set<UploadPurpose>([
  'AVATAR',
  'ENTERPRISE_LOGO',
  'SHARE_IMAGE',
  'SHARE_VIDEO',
  'SUPPLY_PRODUCT_IMAGE',
]);

export function isUploadPurpose(value: unknown): value is UploadPurpose {
  return typeof value === 'string'
    && (UPLOAD_PURPOSES as readonly string[]).includes(value);
}

export function getUploadAccessLevel(purpose: UploadPurpose): UploadAccessLevel {
  return PUBLIC_UPLOAD_PURPOSES.has(purpose) ? 'PUBLIC' : 'PRIVATE';
}

export function getAllowedUploadKinds(purpose: UploadPurpose): readonly UploadKind[] {
  if (purpose === 'SHARE_VIDEO') return ['MP4', 'WEBM', 'AVI'];
  if (['AVATAR', 'ENTERPRISE_LOGO', 'SHARE_IMAGE', 'SUPPLY_PRODUCT_IMAGE'].includes(purpose)) {
    return ['JPEG', 'PNG', 'GIF'];
  }
  // Office containers are deliberately excluded: a ZIP header alone cannot
  // prove a file is a safe DOCX document. Sensitive materials use image/PDF.
  return ['JPEG', 'PNG', 'PDF'];
}

export function getUploadKindExtension(kind: UploadKind): string {
  const extensions: Record<UploadKind, string> = {
    JPEG: '.jpg',
    PNG: '.png',
    GIF: '.gif',
    PDF: '.pdf',
    DOC: '.doc',
    DOCX: '.docx',
    MP4: '.mp4',
    WEBM: '.webm',
    AVI: '.avi',
  };
  return extensions[kind];
}

export function getUploadKindMimeType(kind: UploadKind): string {
  const mimeTypes: Record<UploadKind, string> = {
    JPEG: 'image/jpeg',
    PNG: 'image/png',
    GIF: 'image/gif',
    PDF: 'application/pdf',
    DOC: 'application/msword',
    DOCX: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    MP4: 'video/mp4',
    WEBM: 'video/webm',
    AVI: 'video/x-msvideo',
  };
  return mimeTypes[kind];
}

export function detectUploadKind(buffer: Buffer): UploadKind | null {
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return 'JPEG';
  if (buffer.length >= 8 && buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return 'PNG';
  if (buffer.length >= 6 && ['GIF87a', 'GIF89a'].includes(buffer.subarray(0, 6).toString('ascii'))) return 'GIF';
  if (buffer.length >= 5 && buffer.subarray(0, 5).toString('ascii') === '%PDF-') return 'PDF';
  if (buffer.length >= 4 && buffer.subarray(0, 4).equals(Buffer.from([0xd0, 0xcf, 0x11, 0xe0]))) return 'DOC';
  if (buffer.length >= 4 && buffer.subarray(0, 4).toString('binary') === 'PK\u0003\u0004') return 'DOCX';
  if (buffer.length >= 12 && buffer.subarray(4, 8).toString('ascii') === 'ftyp') return 'MP4';
  if (buffer.length >= 4 && buffer.subarray(0, 4).equals(Buffer.from([0x1a, 0x45, 0xdf, 0xa3]))) return 'WEBM';
  if (buffer.length >= 12 && buffer.subarray(0, 4).toString('ascii') === 'RIFF' && buffer.subarray(8, 12).toString('ascii') === 'AVI ') return 'AVI';
  return null;
}

export function canReadStoredUpload(input: {
  accessLevel: string;
  ownerId?: string;
  viewerId?: string;
  viewerRole?: string;
}): boolean {
  if (input.accessLevel === 'PUBLIC') return true;
  if (!input.viewerId) return false;
  return input.viewerId === input.ownerId || input.viewerRole === 'ADMIN';
}

export function getStoredUploadId(url: unknown, visibility: 'public' | 'private'): string | null {
  if (typeof url !== 'string') return null;
  const match = url.trim().match(new RegExp(`^/api/uploads/${visibility}/([A-Za-z0-9_-]{10,64})$`));
  return match?.[1] || null;
}

export function canRevealTalentIdentity(input: {
  requesterRole?: string;
  privacyMode?: string;
  hasApplication: boolean;
  hasMatch: boolean;
}): boolean {
  if (input.requesterRole === 'ADMIN') return true;
  if (input.requesterRole !== 'ENTERPRISE') return false;
  if (!['PUBLIC', 'REAL_NAME'].includes(input.privacyMode || '')) return false;
  return input.hasApplication || input.hasMatch;
}

export function canContactTalent(input: {
  requesterRole?: string;
  hasApplication: boolean;
  hasMatch: boolean;
}): boolean {
  if (input.requesterRole === 'ADMIN') return true;
  return input.requesterRole === 'ENTERPRISE' && (input.hasApplication || input.hasMatch);
}

export function shouldMaskTalentIdentity(viewerRole: string | undefined, privacyMode: string | undefined): boolean {
  return viewerRole === 'ENTERPRISE' && !['PUBLIC', 'REAL_NAME'].includes(privacyMode || '');
}

export function toTalentSearchSummary(talent: Record<string, any>) {
  return {
    id: talent.id,
    realName: '匿名人才',
    title: talent.title,
    city: talent.city,
    province: talent.province,
    minSalary: talent.minSalary,
    maxSalary: talent.maxSalary,
    workYears: talent.workYears,
    education: talent.education,
    starLevel: talent.starLevel,
    starLevelStr: talent.starLevelStr,
    brandEndorsement: talent.brandEndorsement,
    cuisineIds: talent.cuisineIds,
    businessTypeIds: talent.businessTypeIds,
    jobCategoryId: talent.jobCategoryId,
  };
}

export function toTalentDetailResponse(
  talent: Record<string, any>,
  revealIdentity: boolean,
  canContact = revealIdentity,
) {
  const workExperiences = Array.isArray(talent.workExperiences)
    ? talent.workExperiences.map((experience: Record<string, any>) => ({
      id: experience.id,
      position: experience.position,
      startYear: experience.startYear,
      startMonth: experience.startMonth,
      endYear: experience.endYear,
      endMonth: experience.endMonth,
      isCurrent: experience.isCurrent,
      ...(revealIdentity
        ? { companyName: experience.companyName, description: experience.description }
        : {}),
    }))
    : [];

  return {
    ...toTalentSearchSummary(talent),
    acceptPartner: Boolean(talent.acceptPartner),
    workExperiences,
    ...(canContact ? { userId: talent.userId } : {}),
    ...(revealIdentity
      ? {
        realName: talent.realName || '人才用户',
        avatar: talent.avatar,
        currentCompany: talent.currentCompany,
        headBrandExp: talent.headBrandExp,
        projectExp: talent.projectExp,
        selfIntro: talent.selfIntro,
      }
      : {}),
  };
}
