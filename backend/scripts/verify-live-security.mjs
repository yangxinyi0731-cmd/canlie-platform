import fs from 'node:fs';
import path from 'node:path';

const args = process.argv.slice(2);

function readArg(name) {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : undefined;
}

const baseUrl = readArg('--base-url')?.replace(/\/+$/, '');
const credentialsPath = readArg('--credentials');

if (!baseUrl || !credentialsPath) {
  throw new Error('Usage: node scripts/verify-live-security.mjs --base-url <url> --credentials <private-json>');
}

const credentialBundle = JSON.parse(
  fs.readFileSync(path.resolve(credentialsPath), 'utf8'),
);
const accounts = Array.isArray(credentialBundle.accounts)
  ? credentialBundle.accounts.filter((account) => account.status === 'ACTIVE')
  : [];

const byRole = (role) => accounts.filter((account) => account.role === role);

async function request(method, pathname, { token, body } = {}) {
  const response = await fetch(`${baseUrl}${pathname}`, {
    method,
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  let data = null;
  try {
    data = await response.json();
  } catch {
    // Status codes, not response bodies, are the security assertions below.
  }
  return { status: response.status, data };
}

async function login(account) {
  const result = await request('POST', '/api/auth/login', {
    body: { phone: account.phone, password: account.password },
  });
  if (result.status !== 200 || !result.data?.token || !result.data?.user?.id) {
    throw new Error(`Unable to log in an active ${account.role} test account`);
  }
  return { token: result.data.token, user: result.data.user };
}

function assertStatus(label, actual, expected) {
  if (actual !== expected) {
    throw new Error(`${label}: expected HTTP ${expected}, received ${actual}`);
  }
  console.log(`${label}=HTTP_${actual}`);
}

const adminAccount = byRole('ADMIN')[0];
const enterpriseAccounts = byRole('ENTERPRISE');
const talentAccounts = byRole('TALENT');
if (!adminAccount || enterpriseAccounts.length < 2 || talentAccounts.length < 2) {
  throw new Error('Verification requires 1 ADMIN, 2 ENTERPRISE, and 2 TALENT active accounts');
}

const admin = await login(adminAccount);
const enterprises = await Promise.all(enterpriseAccounts.map(login));
const talents = await Promise.all(talentAccounts.slice(0, 2).map(login));
console.log('role-logins=OK');

assertStatus(
  'enterprise-cannot-read-talent-matches',
  (await request('GET', '/api/matches/talent', { token: enterprises[0].token })).status,
  403,
);

assertStatus(
  'talent-cannot-search-other-talents',
  (await request('GET', '/api/talents/search', { token: talents[0].token })).status,
  403,
);

assertStatus(
  'verification-mass-assignment-rejected',
  (await request('POST', '/api/talents/verification', {
    token: talents[0].token,
    body: {
      type: 'REFERENCE',
      refName: '安全回归',
      refTitle: '测试',
      refPhone: '10000',
      status: 'VERIFIED',
      talentId: 'forbidden-client-value',
    },
  })).status,
  400,
);

assertStatus(
  'same-role-chat-rejected',
  (await request('POST', '/api/chat/send', {
    token: talents[0].token,
    body: {
      receiverId: talents[1].user.id,
      content: 'authorization regression probe',
    },
  })).status,
  403,
);

let owner;
let ownerJob;
for (const enterprise of enterprises) {
  const result = await request('GET', '/api/jobs/my/list?pageSize=100', {
    token: enterprise.token,
  });
  if (result.status === 200 && Array.isArray(result.data?.jobs) && result.data.jobs.length > 0) {
    owner = enterprise;
    ownerJob = result.data.jobs[0];
    break;
  }
}

if (owner && ownerJob) {
  const nonOwner = enterprises.find((enterprise) => enterprise.user.id !== owner.user.id);
  assertStatus(
    'job-owner-can-read-matches',
    (await request('GET', `/api/matches/job/${encodeURIComponent(ownerJob.id)}`, {
      token: owner.token,
    })).status,
    200,
  );
  assertStatus(
    'other-enterprise-cannot-read-matches',
    (await request('GET', `/api/matches/job/${encodeURIComponent(ownerJob.id)}`, {
      token: nonOwner.token,
    })).status,
    403,
  );
  assertStatus(
    'other-enterprise-cannot-update-application',
    (await request(
      'PATCH',
      `/api/jobs/${encodeURIComponent(ownerJob.id)}/applications/nonexistent-security-probe`,
      { token: nonOwner.token, body: { status: 'VIEWED' } },
    )).status,
    403,
  );
  assertStatus(
    'unrelated-match-detail-rejected',
    (await request(
      'GET',
      `/api/matches/detail/${encodeURIComponent(ownerJob.id)}/nonexistent-security-probe`,
      { token: owner.token },
    )).status,
    403,
  );
} else {
  console.log('job-object-authorization=SKIPPED_NO_ENTERPRISE_JOB');
}

const verifications = await request('GET', '/api/admin/verifications', {
  token: admin.token,
});
if (verifications.status === 200 && Array.isArray(verifications.data) && verifications.data.length > 0) {
  assertStatus(
    'invalid-verification-review-status-rejected',
    (await request(
      'PUT',
      `/api/admin/verifications/${encodeURIComponent(verifications.data[0].id)}`,
      { token: admin.token, body: { status: 'APPROVED' } },
    )).status,
    400,
  );
} else {
  console.log('verification-review-status=SKIPPED_NO_RECORD');
}

console.log('live-security-verification=PASS');
