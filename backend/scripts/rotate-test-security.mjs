import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const args = process.argv.slice(2);
const apply = args.includes('--apply');
const outputIndex = args.indexOf('--output');
const outputPath = outputIndex >= 0 ? args[outputIndex + 1] : null;
const hashesIndex = args.indexOf('--target-hashes');
const hashesPath = hashesIndex >= 0 ? args[hashesIndex + 1] : null;
const expectedRoles = ['ADMIN', 'ENTERPRISE', 'TALENT'];

function securePassword() {
  return crypto.randomBytes(18).toString('base64url');
}

function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function replaceEnvValue(source, key, value) {
  const line = `${key}=${value}`;
  const matcher = new RegExp(`^${key}=.*$`, 'm');
  if (matcher.test(source)) return source.replace(matcher, line);
  return `${source.replace(/\s*$/, '')}\n${line}\n`;
}

async function main() {
  const users = await prisma.user.findMany({
    where: { role: { in: expectedRoles } },
    select: { id: true, phone: true, role: true, status: true, createdAt: true },
    orderBy: [{ createdAt: 'asc' }, { role: 'asc' }],
  });

  const counts = Object.fromEntries(
    expectedRoles.map((role) => [role, users.filter((user) => user.role === role).length]),
  );
  console.log(JSON.stringify({ mode: apply ? 'apply' : 'dry-run', counts }));

  let targets;
  let selection;
  if (hashesPath) {
    const hashes = JSON.parse(fs.readFileSync(path.resolve(hashesPath), 'utf8'));
    if (!Array.isArray(hashes) || hashes.some((item) => !/^[a-f0-9]{64}$/.test(item))) {
      throw new Error('Target hash file must be an array of SHA-256 hex strings');
    }
    const hashSet = new Set(hashes);
    targets = users.filter((user) => hashSet.has(sha256(user.phone)));
    selection = 'publicly-documented-account-hashes';
  } else {
    targets = expectedRoles.map((role) => users.find((user) => user.role === role)).filter(Boolean);
    selection = 'oldest-account-per-role';
  }

  const missing = expectedRoles.filter((role) => !targets.some((user) => user.role === role));
  if (missing.length > 0) throw new Error(`Missing account roles: ${missing.join(',')}`);

  console.log(JSON.stringify({
    selection,
    targetCounts: Object.fromEntries(
      expectedRoles.map((role) => [role, targets.filter((user) => user.role === role).length]),
    ),
    targets: targets.map((user) => ({ role: user.role, createdAt: user.createdAt.toISOString() })),
  }));

  if (!apply) return;
  if (!outputPath) throw new Error('--output is required with --apply');

  const absoluteOutput = path.resolve(outputPath);
  const generatedAt = new Date().toISOString();
  const credentials = [];

  for (const user of targets) {
    const password = securePassword();
    const passwordHash = await bcrypt.hash(password, 12);
    await prisma.user.update({ where: { id: user.id }, data: { password: passwordHash } });
    credentials.push({ role: user.role, phone: user.phone, password, status: user.status });
  }

  const jwtSecret = crypto.randomBytes(64).toString('base64url');
  const envPath = path.resolve(process.cwd(), '.env');
  const envBefore = fs.existsSync(envPath) ? fs.readFileSync(envPath, 'utf8') : '';
  const backupPath = `${envPath}.before-security-rotation-${Date.now()}`;
  if (fs.existsSync(envPath)) {
    fs.copyFileSync(envPath, backupPath, fs.constants.COPYFILE_EXCL);
    fs.chmodSync(backupPath, 0o600);
  }
  fs.writeFileSync(envPath, replaceEnvValue(envBefore, 'JWT_SECRET', jwtSecret), { mode: 0o600 });
  fs.chmodSync(envPath, 0o600);

  fs.writeFileSync(
    absoluteOutput,
    `${JSON.stringify({ generatedAt, accounts: credentials }, null, 2)}\n`,
    { mode: 0o600, flag: 'wx' },
  );
  fs.chmodSync(absoluteOutput, 0o600);

  execFileSync('pm2', ['restart', 'canlie-backend', '--update-env'], {
    stdio: 'inherit',
    env: { ...process.env, NODE_ENV: 'production', JWT_SECRET: jwtSecret },
  });
  execFileSync('pm2', ['save'], { stdio: 'inherit' });

  console.log(JSON.stringify({
    rotated: true,
    accountCount: credentials.length,
    jwtBytes: 64,
    outputPath: absoluteOutput,
    backupCreated: fs.existsSync(backupPath),
  }));
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
