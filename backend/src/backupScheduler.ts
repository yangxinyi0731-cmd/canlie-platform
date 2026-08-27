import { spawn } from 'node:child_process';
import path from 'node:path';

export function startBackupScheduler() {
  if (process.env.NODE_ENV !== 'production' || process.env.ENABLE_AUTOMATIC_BACKUPS !== 'true') {
    return () => {};
  }
  const requestedHours = Number(process.env.AUTO_BACKUP_INTERVAL_HOURS || 24);
  const intervalHours = Number.isFinite(requestedHours)
    ? Math.min(168, Math.max(6, requestedHours))
    : 24;
  let running = false;

  const runBackup = () => {
    if (running) return;
    running = true;
    const child = spawn(process.execPath, [path.resolve('scripts/backup-data.mjs')], {
      cwd: process.cwd(),
      env: process.env,
      stdio: 'inherit',
    });
    child.on('error', (error) => {
      running = false;
      console.error('Automatic backup failed to start:', error.message);
    });
    child.on('exit', (code) => {
      running = false;
      if (code !== 0) console.error(`Automatic backup failed with exit code ${code}.`);
    });
  };

  const firstRun = setTimeout(runBackup, 5 * 60 * 1000);
  firstRun.unref();
  const interval = setInterval(runBackup, intervalHours * 60 * 60 * 1000);
  interval.unref();
  console.log(`Automatic verified backups enabled every ${intervalHours} hours.`);
  return () => {
    clearTimeout(firstRun);
    clearInterval(interval);
  };
}
