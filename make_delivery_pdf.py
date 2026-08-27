# -*- coding: utf-8 -*-
"""生成《餐猎平台—交付说明.pdf》到桌面"""
import os
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.lib.colors import HexColor
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.enums import TA_CENTER, TA_LEFT
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable,
)

FONT = "Msyh"
try:
    pdfmetrics.registerFont(TTFont(FONT, "C:/Windows/Fonts/msyh.ttc"))
except Exception:
    pdfmetrics.registerFont(TTFont(FONT, "C:/Windows/Fonts/simhei.ttf"))

ORANGE = HexColor("#FF6B00")
DARK = HexColor("#1f2937")
GRAY = HexColor("#6b7280")
LIGHT = HexColor("#fff7ed")

styles = {
    "title": ParagraphStyle("title", fontName="Msyh", fontSize=22, leading=30,
                            alignment=TA_CENTER, textColor=ORANGE, spaceAfter=6),
    "subtitle": ParagraphStyle("subtitle", fontName="Msyh", fontSize=11, leading=16,
                               alignment=TA_CENTER, textColor=GRAY, spaceAfter=12),
    "h2": ParagraphStyle("h2", fontName="Msyh", fontSize=14, leading=20,
                         textColor=ORANGE, spaceBefore=14, spaceAfter=6),
    "body": ParagraphStyle("body", fontName="Msyh", fontSize=10.5, leading=17,
                           textColor=DARK),
    "bodyIndent": ParagraphStyle("bodyIndent", fontName="Msyh", fontSize=10.5,
                                 leading=17, textColor=DARK, leftIndent=14),
    "small": ParagraphStyle("small", fontName="Msyh", fontSize=9, leading=14,
                            textColor=GRAY),
    "cell": ParagraphStyle("cell", fontName="Msyh", fontSize=9.5, leading=14,
                           textColor=DARK),
    "cellH": ParagraphStyle("cellH", fontName="Msyh", fontSize=9.5, leading=14,
                            textColor=HexColor("#ffffff")),
}

def table(data, col_w, header=True):
    rows = []
    for i, row in enumerate(data):
        cells = []
        for v in row:
            st = "cellH" if (header and i == 0) else "cell"
            cells.append(Paragraph(str(v), styles[st]))
        rows.append(cells)
    t = Table(rows, colWidths=col_w, hAlign="LEFT")
    style = [
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("TOPPADDING", (0, 0), (-1, -1), 4),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
        ("LEFTPADDING", (0, 0), (-1, -1), 6),
        ("RIGHTPADDING", (0, 0), (-1, -1), 6),
        ("GRID", (0, 0), (-1, -1), 0.5, HexColor("#e5e7eb")),
    ]
    if header:
        style.append(("BACKGROUND", (0, 0), (-1, 0), ORANGE))
    t.setStyle(TableStyle(style))
    return t

doc = SimpleDocTemplate(
    os.path.join(os.path.expanduser("~"), "Desktop", "餐猎平台—交付说明.pdf"),
    pagesize=A4,
    leftMargin=18 * mm, rightMargin=18 * mm,
    topMargin=16 * mm, bottomMargin=16 * mm,
    title="餐猎平台—交付说明", author="餐猎",
)

story = []

# ============ 封面头 ============
story.append(Paragraph("餐猎平台 — 交付说明", styles["title"]))
story.append(Paragraph("餐饮酒店行业高端人才招聘平台 · 交付时间 2026-08-13", styles["subtitle"]))
story.append(HRFlowable(width="100%", thickness=1.2, color=ORANGE, spaceAfter=10))

# ============ 一、项目概述 ============
story.append(Paragraph("一、项目概述", styles["h2"]))
story.append(Paragraph(
    "餐猎是面向餐饮酒店行业的高端人才招聘平台，连接求职者（人才）与企业（招聘方），"
    "并提供供应链平台、创业分享、AI智能匹配等增值服务。", styles["body"]))
story.append(Spacer(1, 4))
story.append(table([
    ["项目", "说明"],
    ["技术栈", "React + Vite + TypeScript + TailwindCSS（前端）；Node.js + Express + Prisma + SQLite + Socket.IO（后端）"],
    ["部署方式", "PM2 进程管理 + Cloudflare Tunnel 公网访问"],
    ["用户角色", "TALENT 人才 · ENTERPRISE 企业 · ADMIN 管理员"],
], [30 * mm, 125 * mm]))

# ============ 二、访问地址 ============
story.append(Paragraph("二、访问网址（已重启验证可用）", styles["h2"]))
story.append(table([
    ["环境", "地址"],
    ["短链接（推荐）", "https://kzu.cc/5gNqgg"],
    ["公网访问", "https://mission-glossary-universal-psi.trycloudflare.com"],
    ["本地前端", "http://localhost:5173"],
    ["本地后端", "http://localhost:3001"],
    ["健康检查", "https://mission-glossary-universal-psi.trycloudflare.com/api/health"],
], [32 * mm, 123 * mm]))
story.append(Spacer(1, 3))
story.append(Paragraph("⚠ 说明：Cloudflare 免费隧道每次重启 URL 会变化，短链接也会随之失效，需重新生成。获取最新地址：tail -20 logs/tunnel-out.log | grep trycloudflare",
                       styles["small"]))

# ============ 三、测试账号 ============
story.append(Paragraph("三、测试账号（密码通过安全渠道逐人分发）", styles["h2"]))
story.append(table([
    ["角色", "手机号", "姓名/说明"],
    ["管理员", "13800000000", "平台管理员（管理后台审核、星级评定）"],
    ["企业", "13800000001", "张经理（已认证）"],
    ["企业", "13800000002", "李总监（已认证）"],
    ["企业", "13800000003", "王总（筹备阶段）"],
    ["人才", "13900000001", "王大厨 · 行政总厨"],
    ["人才", "13900000002", "刘厨师长"],
    ["人才", "13900000003", "陈总监 · 餐饮总监"],
    ["人才", "13900000004", "赵主厨"],
], [24 * mm, 32 * mm, 99 * mm]))

# ============ 四、功能清单 ============
story.append(Paragraph("四、功能清单", styles["h2"]))
story.append(Paragraph(
    "<b>1. 核心功能：</b>手机号注册登录、JWT鉴权、忘记密码、职位搜索与筛选、简历投递与收藏、"
    "企业认证审核、职位发布与管理、人才搜索、实时聊天（Socket.IO）、管理后台审核。", styles["body"]))
story.append(Spacer(1, 3))
story.append(Paragraph(
    "<b>2. 供应平台：</b>10大分类（食材 / 餐具 / 厨具 / 家具 / 品牌策划 / 设计 / 培训 / 出租转让 / 二手市场 / 投资公司），"
    "商家入驻与营业执照审核、带图带价产品发布、分类浏览与公司详情。", styles["body"]))
story.append(Spacer(1, 3))
story.append(Paragraph(
    "<b>3. 创业分享 / 学习分享：</b>视频号风格信息流，支持图片+文字+视频发帖、点赞、评论、"
    "创业与学习双分类、我的分享管理。", styles["body"]))
story.append(Spacer(1, 3))
story.append(Paragraph(
    "<b>4. AI 匹配增强：</b>15维度综合评分（薪资/菜系/业态/地域/经验/学历/品牌/稳定性/成长/合伙/年龄/技能/性别/任职/企业画像），"
    "新增性别、任职时长、企业画像等维度，权重和=1.00，并修复学历匹配枚举不匹配的既有 bug。", styles["body"]))

# ============ 五、安全加固 ============
story.append(Paragraph("五、安全加固（本期已完成并验证）", styles["h2"]))
story.append(table([
    ["#", "类别", "措施"],
    ["1", "网络安全", "移除客户端固定码与日志回显；验证码仅存带密钥摘要，5分钟有效并一次消费"],
    ["2", "网络安全", "JWT 密钥生产环境强制配置，缺失则拒绝启动"],
    ["3", "网络安全", "加装安全响应头（helmet：CSP / HSTS / X-Frame-Options / nosniff）"],
    ["4", "网络安全", "全局限流 120 次/分 + 登录接口限流 + 验证码限流（防暴力破解）"],
    ["5", "网络安全", "升级高危依赖：express 4.22 / socket.io 4.8 / multer，清零高危漏洞"],
    ["6", "隐私", "企业/供应/分享/投递接口字段脱敏，不再泄漏营业执照、身份证、手机号"],
    ["7", "隐私", "seed 脚本移除明文凭证日志"],
    ["8", "授权", "Socket.IO 强制 token 鉴权，移除可冒充任意用户的旧版兼容分支"],
    ["9", "授权", "注册接口禁止自选 ADMIN 管理员角色"],
    ["10", "维护", "健康检查含数据库探活；SIGTERM/SIGINT 优雅关闭；异常兜底捕获"],
], [8 * mm, 24 * mm, 123 * mm]))

# ============ 六、运维 ============
story.append(Paragraph("六、运维操作", styles["h2"]))
story.append(table([
    ["操作", "命令"],
    ["查看状态", "pm2 status"],
    ["查看日志", "pm2 logs canlie-backend"],
    ["重启后端", "pm2 restart canlie-backend"],
    ["数据库可视化", "cd backend && npx prisma studio"],
    ["前端构建", "cd frontend && npm run build"],
    ["获取最新公网地址", "tail -20 logs/tunnel-out.log | grep trycloudflare"],
], [40 * mm, 115 * mm]))

# ============ 七、上线建议 ============
story.append(Paragraph("七、上线生产前建议", styles["h2"]))
story.append(Paragraph(
    "1. 生产环境必须接入合规短信通道；未配置时接口统一返回服务不可用，测试凭据仅通过安全渠道分发。",
    styles["bodyIndent"]))
story.append(Paragraph(
    "2. 营业执照 / 身份证等敏感证件隔离存储，由鉴权接口提供访问，做纵深防御。",
    styles["bodyIndent"]))
story.append(Paragraph(
    "3. 每日自动备份 SQLite 数据库到异地，防止单文件损坏。",
    styles["bodyIndent"]))
story.append(Paragraph(
    "4. 配置 PM2 日志轮转（pm2-logrotate），防止日志写满磁盘。",
    styles["bodyIndent"]))
story.append(Paragraph(
    "5. 绑定自有域名 + Cloudflare，避免免费隧道 URL 变动影响访问。",
    styles["bodyIndent"]))

story.append(Spacer(1, 12))
story.append(HRFlowable(width="100%", thickness=0.8, color=HexColor("#d1d5db"), spaceAfter=6))
story.append(Paragraph("交付完成 · 服务运行正常（健康检查 status=ok）", styles["small"]))

doc.build(story)
print("PDF 已生成:", os.path.join(os.path.expanduser("~"), "Desktop", "餐猎平台—交付说明.pdf"))
