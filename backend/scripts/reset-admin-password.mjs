import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';

const MIN_PASSWORD_BYTES = 16;
const prisma = new PrismaClient();

function printHelp() {
  console.log([
    '安全重置一个已有管理员账号的密码。',
    '',
    '用法：npm run admin:reset-password -- --apply',
    '',
    '账号和新密码只从交互式终端读取，不会写入命令历史或日志。',
  ].join('\n'));
}

function readHiddenLine(prompt) {
  if (!process.stdin.isTTY || !process.stdout.isTTY || typeof process.stdin.setRawMode !== 'function') {
    throw new Error('必须在交互式终端中运行，禁止通过管道或自动化参数传入凭据。');
  }

  return new Promise((resolve, reject) => {
    const stdin = process.stdin;
    const wasRaw = Boolean(stdin.isRaw);
    let value = '';

    const cleanup = () => {
      stdin.off('data', onData);
      stdin.setRawMode(wasRaw);
      stdin.pause();
    };

    const finish = () => {
      cleanup();
      process.stdout.write('\n');
      resolve(value);
    };

    const cancel = () => {
      cleanup();
      process.stdout.write('\n');
      reject(new Error('操作已取消。'));
    };

    const onData = (chunk) => {
      for (const character of String(chunk)) {
        if (character === '\u0003') {
          cancel();
          return;
        }
        if (character === '\r' || character === '\n') {
          finish();
          return;
        }
        if (character === '\u0008' || character === '\u007f') {
          value = value.slice(0, -1);
          continue;
        }
        if (character >= ' ') value += character;
      }
    };

    process.stdout.write(prompt);
    stdin.setEncoding('utf8');
    stdin.setRawMode(true);
    stdin.resume();
    stdin.on('data', onData);
  });
}

async function main() {
  const args = process.argv.slice(2);
  if (args.includes('--help') || args.includes('-h')) {
    printHelp();
    return;
  }
  if (!args.includes('--apply')) {
    throw new Error('为防止误操作，必须显式添加 --apply。可先使用 --help 查看说明。');
  }

  console.log('即将更新一个已有管理员账号的密码；输入内容不会回显。');
  const phone = (await readHiddenLine('管理员手机号：')).trim();
  const newPassword = await readHiddenLine('新密码（至少 16 字节）：');
  const confirmation = await readHiddenLine('再次输入新密码：');

  if (!/^1\d{10}$/.test(phone)) throw new Error('管理员账号格式不正确。');
  if (Buffer.byteLength(newPassword, 'utf8') < MIN_PASSWORD_BYTES) {
    throw new Error(`新密码至少需要 ${MIN_PASSWORD_BYTES} 字节。`);
  }
  if (newPassword !== confirmation) throw new Error('两次输入的新密码不一致。');

  const user = await prisma.user.findUnique({
    where: { phone },
    select: { id: true, role: true, status: true },
  });
  if (!user || user.role !== 'ADMIN') throw new Error('没有找到可重置的管理员账号。');
  if (user.status !== 'ACTIVE') throw new Error('该管理员账号已被禁用，请先核查账号状态。');

  const password = await bcrypt.hash(newPassword, 12);
  await prisma.user.update({
    where: { id: user.id },
    data: { password },
  });

  console.log('管理员密码已安全更新，请立即在管理端验证登录。');
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
