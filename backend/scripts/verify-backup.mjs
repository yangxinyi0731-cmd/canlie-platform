import 'dotenv/config';
import { createHash } from 'node:crypto';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { PrismaClient } from '@prisma/client';
import { toSqliteUrl } from './storage-paths.mjs';

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

export async function verifyBackup(backupDirectory) {
  const backupDir = path.resolve(backupDirectory);
  const manifestPath = path.join(backupDir, 'manifest.json');
  const manifest = JSON.parse(await fs.readFile(manifestPath, 'utf8'));
  if (manifest.formatVersion !== 1 || !Array.isArray(manifest.files)) {
    throw new Error('Backup manifest format is not supported.');
  }
  for (const entry of manifest.files) {
    const filePath = path.resolve(backupDir, entry.path);
    const relative = path.relative(backupDir, filePath);
    if (relative.startsWith('..') || path.isAbsolute(relative)) {
      throw new Error('Backup manifest contains an unsafe path.');
    }
    const stats = await fs.stat(filePath);
    if (stats.size !== entry.size || await sha256(filePath) !== entry.sha256) {
      throw new Error(`Backup checksum failed for ${entry.path}.`);
    }
  }

  const databasePath = path.join(backupDir, 'database.sqlite');
  const client = new PrismaClient({ datasources: { db: { url: toSqliteUrl(databasePath) } } });
  try {
    const integrity = await client.$queryRawUnsafe('PRAGMA integrity_check');
    if (!integrity.some((row) => Object.values(row).includes('ok'))) {
      throw new Error('Backup database integrity_check failed.');
    }
  } finally {
    await client.$disconnect();
  }
  return manifest;
}

const invokedDirectly = process.argv[1]
  && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;
if (invokedDirectly) {
  const target = process.argv[2];
  if (!target) throw new Error('Usage: npm run data:verify-backup -- <backup-directory>');
  verifyBackup(target)
    .then((manifest) => console.log(`Backup verified: ${manifest.files.length} files.`))
    .catch((error) => {
      console.error(error instanceof Error ? error.message : 'Backup verification failed.');
      process.exitCode = 1;
    });
}
