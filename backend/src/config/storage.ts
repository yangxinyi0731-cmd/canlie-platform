import 'dotenv/config';
import path from 'node:path';

function isInside(parent: string, child: string): boolean {
  const relative = path.relative(parent, child);
  return relative === '' || (!relative.startsWith('..') && !path.isAbsolute(relative));
}

export function resolveRuntimeStorage(env = process.env, cwd = process.cwd()) {
  const production = env.NODE_ENV === 'production';
  if (production && !env.DATA_DIR) throw new Error('DATA_DIR is required in production.');
  if (production && !path.isAbsolute(env.DATA_DIR!)) {
    throw new Error('DATA_DIR must be an absolute path in production.');
  }
  const dataDir = path.resolve(env.DATA_DIR || cwd);
  const databaseUrl = env.DATABASE_URL || '';
  if (production) {
    if (!databaseUrl.startsWith('file:')) {
      throw new Error('DATABASE_URL must be an absolute SQLite file: URL in production.');
    }
    const databasePath = path.normalize(decodeURIComponent(databaseUrl.slice(5).split('?')[0]));
    if (!path.isAbsolute(databasePath) || !isInside(dataDir, path.resolve(databasePath))) {
      throw new Error('The production SQLite database must be stored inside DATA_DIR.');
    }
  }
  if (production && env.BACKUP_DIR && !path.isAbsolute(env.BACKUP_DIR)) {
    throw new Error('BACKUP_DIR must be an absolute path in production.');
  }
  const uploadDir = path.join(dataDir, 'uploads');
  const backupDir = path.resolve(env.BACKUP_DIR || path.join(dataDir, 'backups'));
  if (isInside(uploadDir, backupDir)) {
    throw new Error('BACKUP_DIR must not be stored inside the uploads directory.');
  }
  return {
    dataDir,
    uploadDir,
    backupDir,
  };
}

export const runtimeStorage = resolveRuntimeStorage();
