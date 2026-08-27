import path from 'node:path';

function sqlitePathFromUrl(databaseUrl) {
  if (!databaseUrl?.startsWith('file:')) {
    throw new Error('DATABASE_URL must be an absolute SQLite file: URL.');
  }
  const withoutQuery = databaseUrl.slice('file:'.length).split('?')[0];
  if (!withoutQuery) throw new Error('DATABASE_URL does not contain a database path.');
  return path.normalize(decodeURIComponent(withoutQuery));
}

function isInside(parent, child) {
  const relative = path.relative(parent, child);
  return relative === '' || (!relative.startsWith('..') && !path.isAbsolute(relative));
}

export function resolveStoragePaths(env = process.env, cwd = process.cwd()) {
  const production = env.NODE_ENV === 'production';
  const configuredDataDir = env.DATA_DIR;
  if (production && !configuredDataDir) {
    throw new Error('DATA_DIR is required in production.');
  }
  if (production && !path.isAbsolute(configuredDataDir)) {
    throw new Error('DATA_DIR must be an absolute path in production.');
  }
  const dataDir = path.resolve(configuredDataDir || cwd);

  const rawDatabasePath = sqlitePathFromUrl(env.DATABASE_URL);
  if (production && !path.isAbsolute(rawDatabasePath)) {
    throw new Error('DATABASE_URL must use an absolute SQLite path in production.');
  }
  const databasePath = path.resolve(rawDatabasePath);
  if (production && !isInside(dataDir, databasePath)) {
    throw new Error('The production SQLite database must be stored inside DATA_DIR.');
  }

  const uploadDir = path.join(dataDir, 'uploads');
  if (production && env.BACKUP_DIR && !path.isAbsolute(env.BACKUP_DIR)) {
    throw new Error('BACKUP_DIR must be an absolute path in production.');
  }
  const backupDir = path.resolve(env.BACKUP_DIR || path.join(dataDir, 'backups'));
  if (isInside(uploadDir, backupDir)) {
    throw new Error('BACKUP_DIR must not be stored inside the uploads directory.');
  }
  return { production, dataDir, databasePath, uploadDir, backupDir };
}

export function toSqliteUrl(filePath) {
  return `file:${path.resolve(filePath).replaceAll('\\', '/')}`;
}
