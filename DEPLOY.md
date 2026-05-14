# 餐猎平台部署指南

## 部署到 Railway（推荐）

Railway 是一个全栈部署平台，支持前后端一起部署，稳定性好。

### 步骤 1: 准备 GitHub 仓库

1. 在 GitHub 创建新仓库
2. 将项目推送到仓库：
```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/你的用户名/仓库名.git
git push -u origin main
```

### 步骤 2: 注册 Railway

1. 访问 https://railway.app
2. 使用 GitHub 账号登录

### 步骤 3: 创建项目

1. 点击 "New Project"
2. 选择 "Deploy from GitHub repo"
3. 选择你的仓库
4. Railway 会自动检测配置并开始部署

### 步骤 4: 配置环境变量

在 Railway 项目设置中添加环境变量：

```
DATABASE_URL=file:./data.db
JWT_SECRET=你的密钥（随机字符串）
NODE_ENV=production
```

### 步骤 5: 初始化数据库

部署成功后，在 Railway 的终端中运行：

```bash
cd backend
npx prisma db push
npx tsx src/seed.ts
```

### 步骤 6: 获取访问地址

Railway 会自动分配一个域名，格式如：
`https://你的项目名.up.railway.app`

---

## 本地开发

### 安装依赖
```bash
npm run install:all
```

### 初始化数据库
```bash
cd backend
npx prisma db push
npx tsx src/seed.ts
```

### 启动开发服务器
```bash
npm run dev
```

- 前端: http://localhost:5173
- 后端: http://localhost:3001

---

## 使用 Cloudflare Tunnel（备选方案）

如果不想部署到云平台，可以使用 Cloudflare Tunnel：

### 安装 cloudflared

Windows:
```powershell
winget install Cloudflare.cloudflared
```

### 创建隧道

1. 登录 Cloudflare：
```bash
cloudflared tunnel login
```

2. 创建隧道：
```bash
cloudflared tunnel create canlie
```

3. 配置路由（将 your-domain.com 替换为你的域名）：
```bash
cloudflared tunnel route dns canlie your-domain.com
```

4. 创建配置文件 `~/.cloudflared/config.yml`：
```yaml
tunnel: canlie
ingress:
  - hostname: your-domain.com
    service: http://localhost:5173
  - service: http_status:404
```

5. 启动隧道：
```bash
cloudflared tunnel run canlie
```

---

## 常见问题

### Q: 部署后白屏？
A: 检查浏览器控制台是否有错误，确认 API 路径正确。

### Q: 数据库丢失？
A: Railway 免费版使用临时文件系统，需要配置持久化存储或使用外部数据库（如 PlanetScale）。

### Q: Socket.IO 连接失败？
A: 确认生产环境 WebSocket 配置正确，检查 CORS 设置。

---

## 项目结构

```
餐饮猎头平台/
├── frontend/          # React 前端
│   ├── src/
│   └── dist/          # 构建输出
├── backend/           # Node.js 后端
│   ├── src/
│   ├── prisma/        # 数据库
│   └── dist/          # 构建输出
├── railway.toml       # Railway 配置
└── nixpacks.toml      # 构建配置
```
