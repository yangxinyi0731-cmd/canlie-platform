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
        // 生产环境必须设置 JWT_SECRET（强随机值），否则后端拒绝启动
        JWT_SECRET: '0c889769d0cbe64e6a8f1b5f7362d0113a590bb8b36b308b8efe67daec2d066c71c7a58f2a45d5cddb06c02452779feb',
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
