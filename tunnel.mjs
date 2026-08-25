// Cloudflare Tunnel launcher for PM2
import { spawn } from 'child_process';
import { writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const URL_FILE = join(__dirname, 'tunnel-url.txt');

const child = spawn('cloudflared', ['tunnel', '--url', 'http://localhost:3001', '--no-autoupdate'], {
  stdio: ['ignore', 'pipe', 'pipe'],
  shell: true,
});

let currentUrl = '';

function parseUrl(text) {
  const match = text.match(/https:\/\/[a-z0-9-]+\.trycloudflare\.com/);
  if (match && match[0] !== currentUrl) {
    currentUrl = match[0];
    console.log('🌐 ' + currentUrl);
    writeFileSync(URL_FILE, currentUrl);
  }
}

// cloudflared may output URL on stdout or stderr
child.stdout.on('data', (data) => {
  const text = data.toString();
  process.stdout.write(text);
  parseUrl(text);
});

child.stderr.on('data', (data) => {
  const text = data.toString();
  process.stderr.write(text);
  parseUrl(text);
});

child.on('exit', (code) => {
  console.log('Tunnel exited with code', code);
  process.exit(code || 0);
});
