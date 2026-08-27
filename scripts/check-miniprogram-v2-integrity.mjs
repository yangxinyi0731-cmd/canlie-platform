import { readFile, access, readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const sourceRoot = path.join(repoRoot, 'miniprogram', 'src');
const appConfig = await readFile(path.join(sourceRoot, 'app.config.ts'), 'utf8');
const pageRoutes = [...appConfig.matchAll(/'(?<route>pages\/[^']+\/index)'/g)]
  .map((match) => match.groups?.route)
  .filter(Boolean);

const requiredRoutes = [
  'pages/login/index',
  'pages/jobs/index',
  'pages/notifications/index',
  'pages/talent-search/index',
  'pages/profile/index',
  'pages/job-detail/index',
  'pages/chat-conversation/index',
  'pages/applications/index',
  'pages/enterprise-jobs/index',
  'pages/post-job/index',
  'pages/my-favorites/index',
  'pages/my-matches/index',
  'pages/match-results/index',
  'pages/talent-detail/index',
  'pages/enterprise-detail/index',
  'pages/edit-talent-profile/index',
  'pages/edit-enterprise-profile/index',
  'pages/reset-password/index',
  'pages/supply/index',
  'pages/supply/category/index',
  'pages/supply/company-detail/index',
  'pages/supply/apply/index',
  'pages/supply/my/index',
  'pages/share/index',
  'pages/share/detail/index',
  'pages/share/create/index',
  'pages/share/my/index',
  'pages/admin/index',
];

const failures = [];
for (const route of requiredRoutes) {
  if (!pageRoutes.includes(route)) failures.push(`${route}: missing from app.config.ts`);
  for (const extension of ['.tsx', '.scss', '.config.ts']) {
    try {
      await access(path.join(sourceRoot, `${route}${extension}`));
    } catch {
      failures.push(`${route}${extension}: file missing`);
    }
  }
}

if (new Set(pageRoutes).size !== pageRoutes.length) failures.push('app.config.ts contains duplicate page routes');
if (pageRoutes.length !== requiredRoutes.length) {
  failures.push(`route count changed: expected ${requiredRoutes.length}, found ${pageRoutes.length}`);
}

async function collectUiSourceFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await collectUiSourceFiles(absolute));
    else if (/\.(?:scss|tsx|ts)$/.test(entry.name)) files.push(absolute);
  }
  return files;
}

for (const sourceFile of await collectUiSourceFiles(sourceRoot)) {
  const source = await readFile(sourceFile, 'utf8');
  if (/linear-gradient\s*\(/i.test(source)) {
    failures.push(`${path.relative(repoRoot, sourceFile)}: legacy gradient remains`);
  }
}

if (failures.length > 0) {
  console.error(`Miniprogram V2 integrity check failed:\n- ${failures.join('\n- ')}`);
  process.exit(1);
}

console.log(`Miniprogram V2 integrity check passed: ${requiredRoutes.length} original routes preserved.`);
