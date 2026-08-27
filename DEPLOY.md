# 餐猎平台部署与数据恢复指南

本项目当前采用单实例 Node.js + Prisma + SQLite。适合封闭的小规模测试，但前提是 SQLite 数据库和上传资料都写入持久化磁盘，并且每天生成经过校验的应用级备份。

> 生产环境禁止使用 `prisma db push`，禁止运行演示 `seed`，禁止把 SQLite 放在仓库目录或云平台临时文件系统中。

## 1. 上线前必须满足

- 已备案并可用于微信小程序的正式域名。
- 域名已启用有效 HTTPS 证书，后端环境设置 `SERVE_HTTPS=true`。
- `JWT_SECRET` 使用运行环境注入的强随机值，不写入仓库。
- 生产数据目录是绝对路径，且确实位于持久磁盘。
- SQLite、上传目录和备份目录的所属用户仅限应用服务账号。
- 至少完成一次“备份 → 校验 → 临时目录恢复”的恢复演练。

## 2. 必需环境变量

以下示例只展示路径，不包含任何真实密钥：

```dotenv
NODE_ENV=production
PORT=3001
SERVE_HTTPS=true

DATA_DIR=/srv/canlie/data
DATABASE_URL=file:/srv/canlie/data/canlie.sqlite
BACKUP_DIR=/srv/canlie/backups

ENABLE_AUTOMATIC_BACKUPS=true
AUTO_BACKUP_INTERVAL_HOURS=24
BACKUP_RETENTION_COUNT=14

JWT_SECRET=<由运行环境安全注入>
```

生产启动会硬校验：

- `DATA_DIR` 必须存在且为绝对路径；
- `DATABASE_URL` 必须是绝对 SQLite `file:` URL；
- SQLite 文件必须位于 `DATA_DIR` 内；
- 数据目录、上传目录和备份目录必须可写；
- 数据迁移后必须通过 SQLite `integrity_check`。

任何一项不满足，服务都会拒绝启动，避免带着临时数据库误上线。

## 3. 构建与启动

```bash
cd frontend
npm ci
npm run build

cd ../backend
npm ci
npx prisma generate
npm run build
npm run start:prod
```

`start:prod` 会在启动服务器前自动执行：

1. 验证持久目录；
2. 为旧数据库安全建立迁移基线；
3. 执行 `prisma migrate deploy`；
4. 执行 SQLite 完整性检查；
5. 再启动应用。

不要在生产构建步骤运行 `prisma db push`。构建环境通常访问不到运行时持久磁盘，而且 `db push` 不提供可审计的迁移历史。

## 4. Render 部署

仓库根目录的 `render.yaml` 已改为安全配置：

- 使用付费 `starter` Web Service；
- 将 1GB 持久磁盘挂载到 `/var/data`；
- SQLite 位于 `/var/data/canlie.sqlite`；
- 上传和备份也位于 `/var/data`；
- 数据迁移在运行时启动阶段执行，而不是构建阶段。

Render 免费 Web Service 的文件系统是临时的，不能保存 SQLite 或用户上传文件，因此不得把 `plan` 改回 `free`。Render 官方也说明只有付费 Web Service 才能挂载持久磁盘：

- https://render.com/docs/disks
- https://render.com/docs/free
- https://render.com/docs/blueprint-spec

Render 持久盘快照不能替代应用级 SQLite 备份。应用会每天通过 SQLite `VACUUM INTO` 生成一致性备份，但仍应定期把备份目录复制到另一台机器或对象存储。

## 5. 单机 Linux / PM2 部署

推荐目录：

```text
/opt/canlie/app/       应用代码，只读部署
/srv/canlie/data/      SQLite 与上传文件
/srv/canlie/backups/   本机校验备份
```

目录初始化示例：

```bash
sudo install -d -m 750 -o canlie -g canlie /srv/canlie/data
sudo install -d -m 750 -o canlie -g canlie /srv/canlie/backups
```

由 PM2/systemd 注入环境变量并运行 `npm run start:prod`。Nginx 只反向代理到本机端口，并在正式域名上终止 HTTPS。

## 6. 备份、校验与恢复

手动创建一次数据库 + 上传资料备份：

```bash
cd backend
npm run data:backup
```

每个备份是独立目录，包含：

- `database.sqlite`：通过 SQLite `VACUUM INTO` 创建的一致快照；
- `uploads/`：上传资料快照；
- `manifest.json`：每个文件的大小和 SHA-256 校验值。

验证某个备份：

```bash
npm run data:verify-backup -- /srv/canlie/backups/canlie-<时间>
```

恢复必须先停止应用服务。恢复命令会保留现有数据到 `pre-restore-<时间>`，不会直接抹掉旧文件：

```bash
export SERVICE_STOPPED=YES
npm run data:restore -- /srv/canlie/backups/canlie-<时间> --confirm
```

恢复后重新启动服务并检查：

```bash
curl --fail https://<正式域名>/api/health
```

自动备份默认每 24 小时执行，保留最近 14 份。删除的是已经成功生成且位于专用备份目录中的过期备份。异地副本应另行保留，避免服务器或整块磁盘故障时本机备份一起丢失。

## 7. 演示数据清理

演示 seed 在 `NODE_ENV=production` 下会直接拒绝运行。清理历史演示账号时，先做只读统计：

```bash
cd backend
npm run data:cleanup-demo
```

核对只显示的数量后，再显式确认：

```bash
ALLOW_PRODUCTION_DEMO_CLEANUP=YES npm run data:cleanup-demo -- --confirm
```

执行生产清理前必须先运行 `npm run data:backup`。清理脚本只识别代码中固定的合成测试账号，不按模糊姓名删除。

## 8. 本地开发

```bash
npm run install:all
cd backend
npx prisma db push
npm run db:seed
npm run dev
```

本地开发可以使用 `db push` 和合成 seed；生产环境只能使用迁移和真实、经授权的数据。

## 9. 当前外部阻塞

代码已强制使用合法 HTTPS 配置，但微信小程序正式上线仍需要：

1. 已备案域名；
2. 域名 DNS 指向实际服务；
3. 有效 HTTPS 证书；
4. 在微信公众平台把该域名加入 request/uploadFile/downloadFile/socket 合法域名；
5. 使用微信开发者工具和真机完成最终预览与提交审核。

不得通过关闭合法域名校验、裸 IP、临时隧道或伪造域名绕过这些要求。
