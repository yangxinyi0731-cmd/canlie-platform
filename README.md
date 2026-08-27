# 餐猎 Canlie — 餐饮酒店高端人才猎头平台

餐饮/酒店行业的高端人才招聘平台，覆盖 **人才端 / 企业端 / 管理员端** 三种角色，包含职位 matching（15 维度 AI 匹配）、即时沟通、供应链平台、创业分享社区四大板块。

> 本仓库是项目的完整代码存档（"游戏存档"）：网页端、后端、微信小程序端全部在这里。

## 目录结构

```
├── backend/          # Node.js + Express + Prisma(SQLite) 后端
│   └── src/routes/   # auth / jobs / talents / enterprises / matches / chat / supply / shares / admin ...
├── frontend/         # 网页端（Vite + React + Tailwind，BOSS直聘风格）
│   └── src/pages/    # 22 个页面 + supply / share 子模块
├── miniprogram/      # 微信小程序端（Taro 4 + React，1:1 还原网页端）
│   └── src/pages/    # 28 个页面，自定义导航 + 角色化底部 TabBar
├── shared/           # 共享类型定义
├── canlie.conf       # Nginx 配置
├── ecosystem.config.cjs  # PM2 部署配置
├── DEPLOY.md         # 部署文档
└── CLAUDE.md         # 项目背景与架构说明
```

## 三端功能总览

| 模块 | 说明 |
|---|---|
| 职位/人才 | 双端发布与浏览职位、15 维度 AI 匹配报告、简历/职位管理 |
| 沟通 | 会话式即时聊天（HTTP 轮询）、消息通知中心、投递状态流转 |
| 供应平台 | 商家入驻、分类宫格（食材/设备/品牌/培训/转让/投资） |
| 创业分享 | 帖子流（创业故事/学习分享）、点赞、评论、发帖 |
| 管理后台 | 数据统计、用户/职位管理、企业认证、供应与分享审核、AI 评估 |

## 技术要点（小程序端）

- Taro 4 + React，`navigationStyle: custom` 全局自定义导航，标题行与胶囊按钮精确对齐
- 自定义底部导航替代原生 tabBar（按角色动态出 3/4 个 Tab）
- SVG 图标走 **base64 data URI**（真机兼容；URL 编码格式在真机不渲染）
- 薪资口径：数据库存"元"，展示端统一换算为 "18k-28k" 格式
- px→rpx 换算 ×2，细边框用大写 `1PX` 绕过 pxtransform

## 快速开始

```bash
# 后端（端口 3001）
cd backend && npm install && npx prisma db push && npm run dev

# 网页端（端口 5173）
cd frontend && npm install && npm run dev

# 小程序端（用微信开发者工具打开 miniprogram/ 目录）
cd miniprogram && npm install && npm run build:weapp
```

环境变量参考 `backend/.env.example`（JWT_SECRET 生产环境必须设置为强随机值）。

## 部署

见 `DEPLOY.md`。服务器为单机 PM2 + Nginx + SQLite。

## 小程序上线待办

1. 准备已备案、证书有效且公网可达的 HTTPS 域名；当前 `gongchuangweilai.top` 会被阿里云未备案页拦截，不能用于正式构建
2. 将该域名配置为微信小程序的 request/uploadFile/downloadFile 合法域名
3. 构建前设置 `TARO_APP_API_BASE_URL=https://你的合法域名/canlie`；生产构建会拒绝 HTTP、裸 IP、localhost 和缺失配置
4. 保持 `miniprogram/project.config.json` 的 `urlCheck: true`，并在真机关闭开发调试后验收
5. 开发者工具上传代码 → 提交审核（招聘类目可能需要人力资源服务许可证）

> 敏感信息（服务器凭据、测试账号）保存在本地 `HANDOFF.md`，已通过 .gitignore 排除在仓库之外。
