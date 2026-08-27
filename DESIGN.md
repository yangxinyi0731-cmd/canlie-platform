---
version: alpha
name: "餐猎微信小程序 V2"
description: "在同一个餐猎小程序中，以微信原生可信骨架承载招聘、沟通、资料、管理、供应与分享流程。"
colors:
  primary: "#C2410C"
  primary-pressed: "#9A3412"
  primary-soft: "#FFF3E8"
  page: "#F7F8FA"
  surface: "#FFFFFF"
  text-primary: "#1F2329"
  text-secondary: "#4E5969"
  text-muted: "#5F6B7A"
  border: "#E5E6EB"
  success: "#047857"
  warning: "#F59E0B"
  danger: "#B91C1C"
typography:
  sans:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'PingFang SC', 'Helvetica Neue', 'Microsoft YaHei', sans-serif"
  title:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'PingFang SC', 'Helvetica Neue', 'Microsoft YaHei', sans-serif"
    fontSize: "16px"
    lineHeight: "1.4"
  body:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'PingFang SC', 'Helvetica Neue', 'Microsoft YaHei', sans-serif"
    fontSize: "14px"
    lineHeight: "1.6"
  meta:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'PingFang SC', 'Helvetica Neue', 'Microsoft YaHei', sans-serif"
    fontSize: "12px"
    lineHeight: "1.5"
rounded:
  control: "8px"
  card: "12px"
  sheet: "16px"
  pill: "999px"
spacing:
  page-inline: "16px"
  card-padding: "12px"
  card-gap: "8px"
  section-gap: "8px"
components:
  navbar:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text-primary}"
  tabbar:
    backgroundColor: "{colors.page}"
    textColor: "{colors.text-muted}"
  search-bar:
    backgroundColor: "{colors.primary-soft}"
    textColor: "{colors.text-secondary}"
  filter-current:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.surface}"
  bottom-sheet:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text-primary}"
  job-card:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text-secondary}"
  status-badge-success:
    backgroundColor: "{colors.success}"
    textColor: "{colors.surface}"
  status-badge-warning:
    backgroundColor: "{colors.warning}"
    textColor: "{colors.text-primary}"
  status-badge-danger:
    backgroundColor: "{colors.danger}"
    textColor: "{colors.surface}"
  pressed-action:
    backgroundColor: "{colors.primary-pressed}"
    textColor: "{colors.surface}"
  disabled-control:
    backgroundColor: "{colors.border}"
    textColor: "{colors.text-secondary}"
  match-evidence:
    backgroundColor: "{colors.page}"
    textColor: "{colors.text-primary}"
---

# 餐猎微信小程序 V2 Design System

## Overview

### Creative North Star

界面应像一位熟悉本地餐饮酒店招聘的微信联系人发来的“可核对职位清单”：信息紧、来源清楚、操作直接。记忆点不是海报或餐饮图片，而是职位详情中的“匹配依据条”——只展示系统已经拥有且可解释的非敏感规则维度。

### Product context and register

- **Audience and primary job:** 人才浏览、比较、收藏、投递和沟通；企业发布职位、筛选人才和处理投递；管理员执行审核；原有供应与分享入口继续保留。
- **Target market and evidence:** 中国大陆餐饮酒店招聘市场，依据根级 `README.md`、小程序现有中文路由与当前任务约束。
- **Locale and language policy:** 首期为简体中文；按钮使用用户可预期的动作词，错误说明发生了什么以及如何恢复。
- **Usage scene:** 微信小程序、单手竖屏、短时高频浏览；职位首屏以至少三张紧凑卡片为密度目标。
- **Register:** 产品界面。可信、熟悉和任务效率优先于品牌展示。
- **Memorable signature:** 真实匹配记录的轻量证据条；无记录时显示诚实空态，不合成分数。
- **Restraint:** 搜索、筛选、表单、卡片、固定操作栏采用微信原生心智；品牌橙只用于主动作、薪资和当前状态，所有页面禁止渐变海报式装饰。
- **Anti-references:** 不使用桌面表格、Kanban、渐变大头图、玻璃效果、海报式留白、巨大标题或薪资、装饰性餐饮照片，也不把供应链/内容社区大卡放在职位首屏。
- **Token ownership/runtime mapping:** 采用 Model B。`miniprogram/src/styles/variables.scss` 是运行时令牌源，本文件镜像已接受的语义值；`app.scss` 建立全局页面基线，共享组件消费语义 Sass 变量。每次改令牌同时更新本文件和运行时源，并通过 DESIGN lint、typecheck、构建与截图检查漂移。

## Colors

品牌橙 `primary` 只承担主动作、薪资重点、当前筛选和轻量品牌识别；大面积页面使用 `page`，卡片使用 `surface`。正文依次使用 `text-primary`、`text-secondary`、`text-muted`，边界统一使用 `border`。成功、警告和危险颜色仅表达真实语义，并配合文本或图标，不能只依赖颜色。

## Typography

使用微信和系统优先的中文无衬线字体栈，避免小程序字体下载造成布局跳动。职位标题为 32rpx，薪资为 30–32rpx，正文为 28rpx，辅助信息为 24rpx，角标为 22rpx。正文默认常规字重，标题和关键动作最多使用 600；数字不额外放大成视觉海报。

## Layout

750rpx 设计基准下，页面左右边距 32rpx、卡片内边距 24rpx、卡片间距 16rpx。顶部只保留品牌/城市单行入口、搜索和一行紧凑筛选；职位流使用页面上拉追加，当前内容不被下一批加载替换。固定底栏必须为 `safe-area-inset-bottom` 留位，页面正文底部同时预留等量空间。

## Elevation & Depth

层级主要依靠页面灰、白色表面和 `1PX` 边框。静态职位卡默认无阴影；只有粘性导航、底部操作栏和底部选择层可使用极弱阴影。禁止渐变、模糊和玻璃效果制造层级。

## Shapes

职位卡为 20–24rpx 圆角，输入和普通按钮为 16rpx，底部选择层顶部为 32rpx。标签可以使用胶囊，但静态标签不得伪装成按钮。图标容器只在需要扩大触控热区或表达状态时出现。

## Components

### Foundational visual states

所有共享控件提供默认、按压、选中、禁用、忙碌和错误状态。加载采用稳定占位区域内的应用自有旋转指示器；骨架只保留给已有且几何匹配的场景。禁用控件不可触发处理函数，忙碌期间保持原尺寸。

### Buttons and actions

每个决策区只有一个高强调品牌动作；次要动作使用描边或文字形式。收藏、投递和沟通保留明确标签或可理解图标，并提供足够触控区域。危险操作与普通动作分离，第一阶段不新增任何删除或高权限动作。

### Navigation and data display

保留自定义微信导航和按角色变化的底部导航。28 个原有路由全部保留并消费同一组运行时令牌；人才、企业与管理员都使用移动卡片和任务流，不引入桌面表格或 Kanban。状态角标由共享 `StatusBadge` 控制语义色和文案。

### Forms and overlays

搜索框必须有显式清空按钮、300ms 防抖和迟到响应保护。城市及职位筛选使用共享底部选择层；选项由真实接口或维护的城市清单提供。短选项使用底部层，长表单仍使用独立页面。遮罩、选择层、粘性栏的层级统一由运行时令牌管理。

### Iconography

沿用项目 `Icon` 的 Lucide 风格线性 SVG（base64 data URI，兼容微信真机）。常规图标为 32–40rpx，底部导航为 44rpx；不熟悉的图标必须伴随文字或无障碍名称。

### Motion

按压反馈 100–150ms，底部层进入不超过 240ms，只用于说明空间关系。系统开启减少动态效果时取消位移动画并保留即时状态变化。

### Content and data visualization

用“匹配建议”“匹配依据”“仅供参考”代替“AI 精准决定”。薪资统一从数据库元值换算为 `k`，未知值显示“面议”。不得展示数据库没有的距离、福利、面试时间或顾问承诺；匹配证据不得使用婚育、性别等敏感维度。

## Do's and Don'ts

- **Do:** 让职位标题、真实薪资、企业、城市和经验要求在一次扫视中完成比较。
- **Do:** 用共享令牌、搜索、筛选、底部选择和状态组件保持人才、企业、管理员、供应与分享页面一致。
- **Don't:** 为提高“丰富度”伪造福利、距离、顾问、预约或匹配结果。
- **Don't:** 把网页端大卡、桌面表格、复杂看板或营销海报结构直接搬进手机端。
