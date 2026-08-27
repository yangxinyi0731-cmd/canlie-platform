import assert from 'node:assert/strict';
import test from 'node:test';
import {
  canReadStoredUpload,
  canContactTalent,
  canRevealTalentIdentity,
  detectUploadKind,
  getUploadAccessLevel,
  getAllowedUploadKinds,
  getStoredUploadId,
  shouldMaskTalentIdentity,
  toTalentDetailResponse,
  toTalentSearchSummary,
} from '../src/security/privacy.js';

const talentFixture = {
  id: 'talent-safe-id',
  userId: 'user-private-id',
  realName: '真实姓名',
  avatar: '/api/uploads/private/content',
  title: '行政总厨',
  currentCompany: '真实任职企业',
  city: '杭州',
  province: '浙江',
  minSalary: 20000,
  maxSalary: 30000,
  workYears: 10,
  education: '本科',
  starLevel: 4,
  starLevelStr: '四星',
  brandEndorsement: '公开职业背书',
  headBrandExp: '品牌经历',
  projectExp: '项目经历',
  selfIntro: '包含可识别描述',
  gender: 'MALE',
  birthYear: 1990,
  birthMonth: 1,
  hometown: '某地',
  hometownProvince: '某省',
  cuisineIds: 'c1',
  businessTypeIds: 'b1',
  acceptPartner: false,
  privacyMode: 'PUBLIC',
  jobCategoryId: 'j1',
  phone: 'not-for-response',
  email: 'not-for-response',
  idNumber: 'not-for-response',
  maritalStatus: 'not-for-response',
  hasChildren: true,
  workExperiences: [
    {
      id: 'exp-1',
      companyName: '真实企业名称',
      position: '厨师长',
      startYear: 2020,
      startMonth: 1,
      endYear: null,
      endMonth: null,
      isCurrent: true,
      description: '可能包含可识别项目细节',
      bgRefName: '背景调查联系人',
      bgRefPhone: 'not-for-response',
    },
  ],
};

test('人才搜索结果只包含去标识化职业摘要', () => {
  const summary = toTalentSearchSummary(talentFixture);
  assert.equal(summary.id, talentFixture.id);
  assert.equal(summary.realName, '匿名人才');
  assert.equal(summary.title, talentFixture.title);
  for (const key of ['userId', 'avatar', 'currentCompany', 'gender', 'birthYear', 'phone', 'email', 'idNumber']) {
    assert.equal(key in summary, false, `${key} must not be exposed`);
  }
});

test('无身份披露权限的人才详情删除可识别字段和企业名称', () => {
  const detail = toTalentDetailResponse(talentFixture, false);
  assert.equal(detail.realName, '匿名人才');
  assert.equal('userId' in detail, false);
  assert.equal('currentCompany' in detail, false);
  assert.equal('gender' in detail, false);
  assert.equal('birthYear' in detail, false);
  assert.equal(detail.workExperiences[0].position, '厨师长');
  assert.equal('companyName' in detail.workExperiences[0], false);
  assert.equal('description' in detail.workExperiences[0], false);
  assert.equal('bgRefName' in detail.workExperiences[0], false);
});

test('企业只有在公开模式且存在有效业务关系时才能看到身份', () => {
  assert.equal(canRevealTalentIdentity({ requesterRole: 'ENTERPRISE', privacyMode: 'PUBLIC', hasApplication: true, hasMatch: false }), true);
  assert.equal(canRevealTalentIdentity({ requesterRole: 'ENTERPRISE', privacyMode: 'PUBLIC', hasApplication: false, hasMatch: true }), true);
  assert.equal(canRevealTalentIdentity({ requesterRole: 'ENTERPRISE', privacyMode: 'PUBLIC', hasApplication: false, hasMatch: false }), false);
  assert.equal(canRevealTalentIdentity({ requesterRole: 'ENTERPRISE', privacyMode: 'PRIVATE', hasApplication: true, hasMatch: true }), false);
  assert.equal(canRevealTalentIdentity({ requesterRole: 'ENTERPRISE', privacyMode: 'REAL_NAME', hasApplication: true, hasMatch: false }), true);
  assert.equal(canRevealTalentIdentity({ requesterRole: 'ENTERPRISE', privacyMode: 'ANONYMOUS', hasApplication: true, hasMatch: true }), false);
  assert.equal(canRevealTalentIdentity({ requesterRole: 'ADMIN', privacyMode: 'PRIVATE', hasApplication: false, hasMatch: false }), true);
});

test('匿名人才建立业务关系后可以沟通但仍不披露真实身份', () => {
  assert.equal(canContactTalent({ requesterRole: 'ENTERPRISE', hasApplication: true, hasMatch: false }), true);
  const detail = toTalentDetailResponse(talentFixture, false, true);
  assert.equal(detail.userId, talentFixture.userId);
  assert.equal(detail.realName, '匿名人才');
  assert.equal('currentCompany' in detail, false);
  assert.equal(shouldMaskTalentIdentity('ENTERPRISE', 'ANONYMOUS'), true);
  assert.equal(shouldMaskTalentIdentity('ENTERPRISE', 'REAL_NAME'), false);
  assert.equal(shouldMaskTalentIdentity('TALENT', 'ANONYMOUS'), false);
});

test('上传用途决定公开级别且私有文件只允许所有者或管理员读取', () => {
  assert.equal(getUploadAccessLevel('SHARE_IMAGE'), 'PUBLIC');
  assert.equal(getUploadAccessLevel('ENTERPRISE_LOGO'), 'PUBLIC');
  assert.equal(getUploadAccessLevel('TALENT_CERTIFICATE'), 'PRIVATE');
  assert.equal(getUploadAccessLevel('PERSONAL_ID'), 'PRIVATE');

  assert.equal(canReadStoredUpload({ accessLevel: 'PUBLIC' }), true);
  assert.equal(canReadStoredUpload({ accessLevel: 'PRIVATE', ownerId: 'u1', viewerId: 'u1', viewerRole: 'TALENT' }), true);
  assert.equal(canReadStoredUpload({ accessLevel: 'PRIVATE', ownerId: 'u1', viewerId: 'u2', viewerRole: 'ADMIN' }), true);
  assert.equal(canReadStoredUpload({ accessLevel: 'PRIVATE', ownerId: 'u1', viewerId: 'u2', viewerRole: 'ENTERPRISE' }), false);
  assert.equal(canReadStoredUpload({ accessLevel: 'PRIVATE', ownerId: 'u1' }), false);
});

test('敏感业务字段只接受平台私有文件引用', () => {
  assert.equal(getStoredUploadId('/api/uploads/private/ck1234567890', 'private'), 'ck1234567890');
  assert.equal(getStoredUploadId('/api/uploads/public/ck1234567890', 'private'), null);
  assert.equal(getStoredUploadId('/uploads/legacy.jpg', 'private'), null);
  assert.equal(getStoredUploadId('https://example.com/file.jpg', 'private'), null);
});

test('文件头检测拒绝仅伪装扩展名的未知内容', () => {
  assert.equal(detectUploadKind(Buffer.from([0xff, 0xd8, 0xff, 0x00])), 'JPEG');
  assert.equal(detectUploadKind(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])), 'PNG');
  assert.equal(detectUploadKind(Buffer.from('%PDF-1.7')), 'PDF');
  assert.equal(detectUploadKind(Buffer.from('plain text wearing a .jpg name')), null);
  assert.deepEqual(getAllowedUploadKinds('RESUME'), ['JPEG', 'PNG', 'PDF']);
  assert.equal(getAllowedUploadKinds('RESUME').includes('DOCX'), false);
});
