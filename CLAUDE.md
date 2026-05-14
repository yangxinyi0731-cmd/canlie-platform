# 餐猎 - 餐饮行业猎头招聘平台

## 项目概述

餐猎是一个面向餐饮行业的招聘平台，连接求职者（人才）和企业。

### 技术栈
- **前端**: React + Vite + TypeScript + TailwindCSS
- **后端**: Node.js + Express + Prisma
- **数据库**: SQLite
- **实时通信**: Socket.IO

### 用户角色
- `TALENT` - 求职者/人才
- `ENTERPRISE` - 企业/招聘方
- `ADMIN` - 管理员

## 项目结构

```
餐饮猎头平台/
├── frontend/                # React + Vite 前端
│   ├── src/
│   │   ├── pages/          # 页面组件
│   │   ├── components/     # 公共组件
│   │   ├── stores/         # Zustand 状态管理
│   │   ├── api/            # API 请求封装
│   │   └── types/          # TypeScript 类型定义
│   └── vite.config.ts      # Vite 配置（含代理）
├── backend/                 # Node.js + Express 后端
│   ├── src/
│   │   ├── routes/         # API 路由
│   │   ├── middleware/      # 中间件（认证等）
│   │   └── index.ts        # 入口文件
│   └── prisma/             # 数据库 schema
└── uploads/                 # 上传文件存储
```

## 启动命令

```bash
# 后端 (端口 3001)
cd backend
npm run dev

# 前端 (端口 5173)
cd frontend
npm run dev
```

## 核心功能模块

### 1. 认证系统
- 手机号 + 密码登录
- 角色选择（人才/企业）
- JWT Token 认证
- 密码重置（验证码流程）

### 2. 人才端功能
- 简历编辑与管理
- 职位搜索与筛选
- 投递简历
- 收藏职位
- 实时聊天

### 3. 企业端功能
- 企业信息管理
- 认证审核状态
- 发布职位
- 人才搜索
- 查看投递/匹配

### 4. 管理员功能
- 企业认证审核
- 人才星级评定
- 数据管理

### 5. 实时聊天
- Socket.IO 实现
- 支持人才与企业双向沟通
- 消息已读状态

## 已修复的 Bug 记录

### Bug 1: 聊天企业端发不出消息
**问题**: Socket.IO 在 ngrok 环境下连接失败
**原因**: socket 连接使用 `http://${host}:3001`，ngrok 域名下会失败
**修复**:
- `backend/src/index.ts`: 添加 `path: '/socket.io'`
- `frontend/src/stores/chatStore.ts`: 改用相对路径 `io('/socket.io', {...})`

### Bug 2: 网页白屏
**问题**: `getImageUrl` 函数生成无效 URL
**原因**: 函数拼接 `http://${host}:3001/uploads/...`，ngrok 下无效
**修复**: `frontend/src/api/index.ts` 和 `AdminDashboard.tsx` 中直接返回相对路径

### Bug 3: 忘记密码功能
**状态**: 已有重置密码页面 `ResetPassword.tsx`
**流程**: 输入手机号 → 发送验证码 → 验证 → 设置新密码
**测试验证码**: `123456`

### Bug 4: 投递失败
**状态**: 投递功能正常，需检查具体错误信息

### Bug 5: 企业认证无法发布职位
**问题**: 未认证企业没有 UI 提示
**修复**: `EnterpriseDashboard.tsx` 添加认证状态检查和警告提示
- `APPROVED`: 可发布职位
- `PENDING`: 显示审核中提示
- `REJECTED`: 显示未通过提示

## 部署说明

### 本地开发
前端通过 Vite 代理连接后端 API，配置在 `vite.config.ts`

### 公网访问方案
1. **ngrok** (临时测试)
   ```bash
   ngrok http 5173
   ```
   注意: 免费版有警告页面，需点击 "Visit Site"

2. **生产部署** (推荐)
   - 前端: GitHub Pages / Vercel / Netlify
   - 后端: Railway / Render / Fly.io
   - 需要修改前端 API 基础 URL 指向后端服务

### GitHub Pages 限制
GitHub Pages 仅支持静态网站，后端需要单独部署到支持 Node.js 的平台。

## API 路由概览

### 认证 `/api/auth`
- `POST /register` - 注册
- `POST /login` - 登录
- `POST /send-code` - 发送验证码
- `POST /reset-password` - 重置密码

### 人才 `/api/talents`
- `GET /profile` - 获取个人信息
- `PUT /profile` - 更新个人信息

### 企业 `/api/enterprises`
- `GET /profile` - 获取企业信息
- `PUT /profile` - 更新企业信息
- `PUT /:id/verify` - 审核企业 (管理员)

### 职位 `/api/jobs`
- `GET /` - 职位列表
- `GET /:id` - 职位详情
- `POST /` - 发布职位 (企业)
- `POST /:id/apply` - 投递简历 (人才)
- `POST /:id/favorite` - 收藏职位

### 聊天 `/api/chat`
- `GET /conversations` - 会话列表
- `GET /conversations/:id/messages` - 消息记录
- `POST /send` - 发送消息

## 数据库模型 (Prisma)

主要表:
- `User` - 用户账号
- `Talent` - 人才信息
- `Enterprise` - 企业信息
- `Job` - 职位
- `Application` - 投递记录
- `Conversation` / `Message` - 聊天
- `Cuisine` / `BusinessType` - 菜系/业态参考数据

## 开发注意事项

1. **Socket.IO**: 使用相对路径 `/socket.io`，通过 Vite 代理
2. **图片 URL**: 使用相对路径，让 Vite 代理处理
3. **企业认证**: 发布职位前需检查 `enterprise.status === 'APPROVED'`
4. **TypeScript**: 组件 props 需正确定义类型
5. **状态管理**: 使用 Zustand，store 文件在 `stores/` 目录

## 测试账号

(待补充)

## 相关链接

- 本地前端: http://localhost:5173
- 本地后端: http://localhost:3001
- API 文档: (待补充)
