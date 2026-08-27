import 'dotenv/config';
import { createHash } from 'node:crypto';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { PrismaClient } from '@prisma/client';
import { resolveStoragePaths } from './storage-paths.mjs';
import { verifyBackup } from './verify-backup.mjs';

const paths = resolveStoragePaths();

async function sha256(filePath) {
  const hash = createHash('sha256');
  const handle = await fs.open(filePath, 'r');
  try {
    for await (const chunk of handle.createReadStream()) hash.update(chunk);
  } finally {
    await handle.close();
  }
  return hash.digest('hex');
}

async function listFiles(directory, root = directory) {
  const entries = await fs.readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await listFiles(absolute, root));
    else if (entry.isFile()) files.push(path.relative(root, absolute).replaceAll('\\', '/'));
  }
  return files;
}

async function pruneOldBackups() {
  const requested = Number(process.env.BACKUP_RETENTION_COUNT || 14);
  const keep = Number.isFinite(requested) ? Math.min(90, Math.max(2, Math.floor(requested))) : 14;
  const entries = await fs.readdir(paths.backupDir, { withFileTypes: true });
  const backups = entries
    .filter((entry) => entry.isDirectory() && /^canlie-\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}-\d{3}Z$/.test(entry.name))
    .map((entry) => entry.name)
    .sort()
    .reverse();
  const expired = backups.slice(keep);
  for (const name of expired) {
    const target = path.resolve(paths.backupDir, name);
    if (path.dirname(target) !== path.resolve(paths.backupDir)) {
      throw new Error('Refused to prune an unsafe backup path.');
    }
    await verifyBackup(target);
    await fs.rm(target, { recursive: true, force: false });
  }
  if (expired.length > 0) console.log(`Pruned ${expired.length} expired verified backups.`);
}

async function main() {
  await fs.mkdir(paths.backupDir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const finalDir = path.join(paths.backupDir, `canlie-${stamp}`);
  const partialDir = `${finalDir}.partial-${process.pid}`;
  await fs.mkdir(partialDir, { recursive: false });

  const databaseBackup = path.join(partialDir, 'database.sqlite');
  const escapedDatabaseBackup = databaseBackup.replaceAll("'", "''");
  const client = new PrismaClient();
  try {
    await client.$executeRawUnsafe(`VACUUM INTO '${escapedDatabaseBackup}'`);
  } finally {
    await client.$disconnect();
  }

  try {
    await fs.access(paths.uploadDir);
    await fs.cp(paths.uploadDir, path.join(partialDir, 'uploads'), {
      recursive: true,
      filter: (source) => !source.endsWith('.pending'),
    });
  } catch {
    await fs.mkdir(path.join(partialDir, 'uploads'), { recursive: true });
  }

  const relativeFiles = await listFiles(partialDir);
  const files = [];
  for (const relativePath of relativeFiles) {
    const filePath = path.join(partialDir, relativePath);
    const stats = await fs.stat(filePath);
    files.push({ path: relativePath, size: stats.size, sha256: await sha256(filePath) });
  }
  const manifest = {
    formatVersion: 1,
    createdAt: new Date().toISOString(),
    files,
  };
  await fs.writeFile(path.join(partialDir, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`, { mode: 0o600 });
  await fs.rename(partialDir, finalDir);
  await verifyBackup(finalDir);
  await pruneOldBackups();
  console.log(`Verified backup created: ${path.basename(finalDir)} (${files.length} data files).`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : 'Backup failed.');
  process.exitCode = 1;
});
