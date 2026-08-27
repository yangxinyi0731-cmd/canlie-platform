import { spawnSync } from 'node:child_process';
import path from 'node:path';

process.env.NODE_ENV = 'production';

function run(script, args = []) {
  const result = spawnSync(process.execPath, [path.resolve(script), ...args], {
    cwd: process.cwd(),
    env: process.env,
    stdio: 'inherit',
  });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}

run('scripts/prepare-production-storage.mjs');
run('dist/index.js');
