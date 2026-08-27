import 'dotenv/config';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { resolveStoragePaths } from './storage-paths.mjs';
import { verifyBackup } from './verify-backup.mjs';

const sourceArg = process.argv.find((arg) => !arg.startsWith('--') && arg !== process.argv[0] && arg !== process.argv[1]);
const confirmed = process.argv.includes('--confirm');

async function moveIfPresent(source, destination) {
  try { await fs.rename(source, destination); } catch (error) {
    if (error?.code !== 'ENOENT') throw error;
  }
}

async function main() {
  if (!sourceArg || !confirmed || process.env.SERVICE_STOPPED !== 'YES') {
    throw new Error('Restore requires <backup-directory> --confirm and SERVICE_STOPPED=YES.');
  }
  const paths = resolveStoragePaths();
  const sourceDir = path.resolve(sourceArg);
  await verifyBackup(sourceDir);

  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const recoveryDir = path.join(paths.dataDir, `pre-restore-${stamp}`);
  await fs.mkdir(recoveryDir, { recursive: false, mode: 0o700 });

  await moveIfPresent(paths.databasePath, path.join(recoveryDir, 'database.sqlite'));
  await moveIfPresent(`${paths.databasePath}-wal`, path.join(recoveryDir, 'database.sqlite-wal'));
  await moveIfPresent(`${paths.databasePath}-shm`, path.join(recoveryDir, 'database.sqlite-shm'));
  await moveIfPresent(paths.uploadDir, path.join(recoveryDir, 'uploads'));

  await fs.copyFile(path.join(sourceDir, 'database.sqlite'), paths.databasePath);
  await fs.cp(path.join(sourceDir, 'uploads'), paths.uploadDir, { recursive: true });
  console.log(`Restore completed. Previous data was preserved in ${path.basename(recoveryDir)}.`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : 'Restore failed.');
  process.exitCode = 1;
});
