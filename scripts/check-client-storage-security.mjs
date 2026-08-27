import { readFileSync, readdirSync, statSync } from 'node:fs';
import { extname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = resolve(fileURLToPath(new URL('..', import.meta.url)));
const sourceRoots = [join(repoRoot, 'frontend', 'src'), join(repoRoot, 'miniprogram', 'src')];
const sourceExtensions = new Set(['.js', '.jsx', '.ts', '.tsx']);

const forbiddenPatterns = [
  {
    label: '读取历史明文密码',
    pattern: /(?:localStorage\.)?getItem\(\s*['"]remembered_password['"]\s*\)|getStorageSync\(\s*['"]remembered_password['"]\s*\)/g,
  },
  {
    label: '写入历史明文密码',
    pattern: /(?:localStorage\.)?setItem\(\s*['"]remembered_password['"]|setStorageSync\(\s*['"]remembered_password['"]/g,
  },
  {
    label: '把密码值写入持久化存储',
    pattern: /(?:setItem|setStorageSync)\([^\n,]+,\s*password\s*\)/g,
  },
];

function walk(directory) {
  const files = [];
  for (const entry of readdirSync(directory)) {
    const fullPath = join(directory, entry);
    const stat = statSync(fullPath);
    if (stat.isDirectory()) files.push(...walk(fullPath));
    else if (sourceExtensions.has(extname(entry))) files.push(fullPath);
  }
  return files;
}

const findings = [];
for (const root of sourceRoots) {
  for (const file of walk(root)) {
    const source = readFileSync(file, 'utf8');
    for (const { label, pattern } of forbiddenPatterns) {
      pattern.lastIndex = 0;
      for (const match of source.matchAll(pattern)) {
        const line = source.slice(0, match.index).split(/\r?\n/).length;
        findings.push(`${relative(repoRoot, file)}:${line} ${label}`);
      }
    }
  }
}

if (findings.length > 0) {
  console.error('客户端密码存储安全检查失败：');
  for (const finding of findings) console.error(`- ${finding}`);
  process.exit(1);
}

console.log('客户端密码存储安全检查通过：未发现明文密码读取或持久化写入。');
