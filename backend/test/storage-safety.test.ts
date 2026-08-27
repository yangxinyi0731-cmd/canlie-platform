import assert from 'node:assert/strict';
import path from 'node:path';
import test from 'node:test';
import { resolveRuntimeStorage } from '../src/config/storage.js';

test('生产环境拒绝缺少持久目录或相对 SQLite 路径', () => {
  assert.throws(() => resolveRuntimeStorage({
    NODE_ENV: 'production',
    DATABASE_URL: 'file:./temporary.sqlite',
  } as NodeJS.ProcessEnv));

  const dataDir = path.resolve('safe-data');
  assert.throws(() => resolveRuntimeStorage({
    NODE_ENV: 'production',
    DATA_DIR: dataDir,
    DATABASE_URL: 'file:./temporary.sqlite',
  } as NodeJS.ProcessEnv));
});

test('生产 SQLite 必须位于 DATA_DIR 内', () => {
  const dataDir = path.resolve('safe-data');
  const outside = path.resolve('outside.sqlite').replaceAll('\\', '/');
  assert.throws(() => resolveRuntimeStorage({
    NODE_ENV: 'production',
    DATA_DIR: dataDir,
    DATABASE_URL: `file:${outside}`,
  } as NodeJS.ProcessEnv));
});

test('生产备份目录必须使用绝对路径且不能嵌套在上传目录中', () => {
  const dataDir = path.resolve('safe-data');
  const databasePath = path.join(dataDir, 'canlie.sqlite').replaceAll('\\', '/');
  assert.throws(() => resolveRuntimeStorage({
    NODE_ENV: 'production',
    DATA_DIR: dataDir,
    DATABASE_URL: `file:${databasePath}`,
    BACKUP_DIR: './relative-backups',
  } as NodeJS.ProcessEnv));
  assert.throws(() => resolveRuntimeStorage({
    NODE_ENV: 'production',
    DATA_DIR: dataDir,
    DATABASE_URL: `file:${databasePath}`,
    BACKUP_DIR: path.join(dataDir, 'uploads', 'backups'),
  } as NodeJS.ProcessEnv));
});

test('生产持久目录同时承载数据库、上传和备份', () => {
  const dataDir = path.resolve('safe-data');
  const databasePath = path.join(dataDir, 'canlie.sqlite').replaceAll('\\', '/');
  const storage = resolveRuntimeStorage({
    NODE_ENV: 'production',
    DATA_DIR: dataDir,
    DATABASE_URL: `file:${databasePath}`,
  } as NodeJS.ProcessEnv);
  assert.equal(storage.uploadDir, path.join(dataDir, 'uploads'));
  assert.equal(storage.backupDir, path.join(dataDir, 'backups'));
});
