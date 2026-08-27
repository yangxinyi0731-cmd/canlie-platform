import 'dotenv/config';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { PrismaClient } from '@prisma/client';
import { resolveStoragePaths } from './storage-paths.mjs';

const BASELINE_MIGRATION = '20260827000100_baseline';
const paths = resolveStoragePaths();
const prismaCli = path.resolve('node_modules/prisma/build/index.js');

async function ensureWritableDirectory(directory) {
  await fs.mkdir(directory, { recursive: true });
  const probe = path.join(directory, `.write-probe-${process.pid}`);
  const handle = await fs.open(probe, 'wx', 0o600);
  await handle.close();
  await fs.unlink(probe);
}

function runPrisma(...args) {
  execFileSync(process.execPath, [prismaCli, ...args], {
    cwd: process.cwd(),
    env: process.env,
    stdio: 'inherit',
  });
}

async function tableNames(client) {
  const rows = await client.$queryRawUnsafe("SELECT name FROM sqlite_master WHERE type = 'table'");
  return new Set(rows.map((row) => String(row.name)));
}

async function bridgeLegacySchema(client) {
  const statements = [
    `CREATE TABLE IF NOT EXISTS "StoredUpload" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "ownerId" TEXT NOT NULL,
      "purpose" TEXT NOT NULL,
      "accessLevel" TEXT NOT NULL DEFAULT 'PRIVATE',
      "storageKey" TEXT NOT NULL,
      "mimeType" TEXT NOT NULL,
      "size" INTEGER NOT NULL,
      "sha256" TEXT NOT NULL,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "deletedAt" DATETIME,
      CONSTRAINT "StoredUpload_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
    )`,
    `CREATE TABLE IF NOT EXISTS "SensitiveAccessLog" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "actorUserId" TEXT,
      "subjectType" TEXT NOT NULL,
      "subjectId" TEXT NOT NULL,
      "action" TEXT NOT NULL,
      "metadata" TEXT,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`,
    'CREATE UNIQUE INDEX IF NOT EXISTS "StoredUpload_storageKey_key" ON "StoredUpload"("storageKey")',
    'CREATE INDEX IF NOT EXISTS "StoredUpload_ownerId_purpose_idx" ON "StoredUpload"("ownerId", "purpose")',
    'CREATE INDEX IF NOT EXISTS "StoredUpload_accessLevel_deletedAt_idx" ON "StoredUpload"("accessLevel", "deletedAt")',
    'CREATE INDEX IF NOT EXISTS "SensitiveAccessLog_actorUserId_createdAt_idx" ON "SensitiveAccessLog"("actorUserId", "createdAt")',
    'CREATE INDEX IF NOT EXISTS "SensitiveAccessLog_subjectType_subjectId_createdAt_idx" ON "SensitiveAccessLog"("subjectType", "subjectId", "createdAt")',
  ];
  for (const statement of statements) await client.$executeRawUnsafe(statement);
}

async function main() {
  await ensureWritableDirectory(paths.dataDir);
  await ensureWritableDirectory(paths.uploadDir);
  await ensureWritableDirectory(paths.backupDir);

  let client = new PrismaClient();
  await client.$connect();
  const tables = await tableNames(client);
  if (tables.has('User')) {
    await bridgeLegacySchema(client);
    const migrationRows = tables.has('_prisma_migrations')
      ? await client.$queryRawUnsafe(
        'SELECT migration_name FROM _prisma_migrations WHERE migration_name = ? AND finished_at IS NOT NULL',
        BASELINE_MIGRATION,
      )
      : [];
    if (migrationRows.length === 0) {
      await client.$disconnect();
      runPrisma('migrate', 'resolve', '--applied', BASELINE_MIGRATION);
      client = new PrismaClient();
      await client.$connect();
    }
  }
  await client.$disconnect();

  runPrisma('migrate', 'deploy');

  const verificationClient = new PrismaClient();
  await verificationClient.$connect();
  await verificationClient.$queryRawUnsafe('PRAGMA journal_mode=WAL');
  const integrity = await verificationClient.$queryRawUnsafe('PRAGMA integrity_check');
  await verificationClient.$disconnect();
  if (!integrity.some((row) => Object.values(row).includes('ok'))) {
    throw new Error('SQLite integrity_check failed after migration.');
  }
  console.log('Persistent storage, migrations, and SQLite integrity checks are ready.');
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : 'Storage preparation failed.');
  process.exitCode = 1;
});
