const jwtSecret = process.env.JWT_SECRET;

if (!jwtSecret) {
  throw new Error(
    'JWT_SECRET is required. Set it in the process environment before starting PM2.',
  );
}

if (Buffer.byteLength(jwtSecret, 'utf8') < 32) {
  throw new Error('JWT_SECRET must be at least 32 bytes long.');
}

module.exports = {
  apps: [
    {
      name: 'canlie-backend',
      cwd: 'C:/Users/yangxinyi/餐饮猎头平台/backend',
      // tsx CLI entry (real .mjs file, not a .cmd wrapper)
      script: './node_modules/tsx/dist/cli.mjs',
      args: 'src/index.ts',
      autorestart: true,
      max_restarts: 20,
      restart_delay: 5000,
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      error_file: 'C:/Users/yangxinyi/餐饮猎头平台/logs/backend-error.log',
      out_file: 'C:/Users/yangxinyi/餐饮猎头平台/logs/backend-out.log',
      merge_logs: true,
      env: {
        NODE_ENV: 'production',
        // Never commit this value. PM2 inherits it from the launch environment.
        JWT_SECRET: jwtSecret,
      },
    },
    {
      name: 'canlie-tunnel',
      // Cloudflare Tunnel — no warning page, direct access
      script: 'C:/Users/yangxinyi/餐饮猎头平台/tunnel.mjs',
      args: '',
      autorestart: true,
      max_restarts: 10,
      restart_delay: 10000,
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      error_file: 'C:/Users/yangxinyi/餐饮猎头平台/logs/tunnel-error.log',
      out_file: 'C:/Users/yangxinyi/餐饮猎头平台/logs/tunnel-out.log',
      merge_logs: true,
    },
  ],
};
