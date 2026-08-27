# UX Contract

## Product context

- Audience: 人才、企业、管理员三类现有角色；本阶段主要迁移人才职位流。
- Primary jobs: 搜索和筛选职位、查看真实职位详情、收藏、投递、沟通，并在有真实记录时理解匹配依据。
- Target market(s): 中国大陆餐饮酒店招聘市场。
- Active locales: 简体中文。
- Language/content register and native-review policy: 产品化、直接、可核对；业务与合规文案需由产品/法务后续复核。
- Timezone/calendar policy: 沿用服务端时间值，展示本地自然日期；本阶段不新增预约或时区业务。
- Accessibility target: 微信小程序能力范围内对齐 WCAG 2.2 AA 的名称、对比度、触控目标和状态文本基线。

## Business-context sources

| Domain / scope | Authoritative source | Source type | Reviewed date |
|---|---|---|---|
| 角色与现有功能 | `README.md`, `miniprogram/src/app.config.ts` | 产品说明 / 路由事实 | 2026-08-27 |
| 登录与角色分流 | `miniprogram/src/stores/authStore.ts`, `miniprogram/src/hooks/useAuth.ts`, `backend/src/middleware/auth.ts` | 实现 / 服务端授权 | 2026-08-27 |
| 职位列表、投递、收藏 | `backend/src/routes/jobs.ts`, `backend/prisma/schema.prisma` | API / 数据模型 | 2026-08-27 |
| 匹配记录与维度 | `backend/src/routes/matches.ts`, `backend/prisma/schema.prisma` | API / 规则实现 | 2026-08-27 |
| 安全与上线边界 | `PROJECT_STATUS_AND_ROADMAP.md` | 维护中的风险与路线图 | 2026-08-27 |
| 视觉与移动端范围 | 当前 V2 任务约束 | 当前任务决策 | 2026-08-27 |

匹配、人才隐私和管理员权限仍存在维护文档列出的后端风险。本阶段不改变这些服务端规则，不把前端隐藏当作授权，也不把 V2 构建通过解释为可公开上线。

## Visual contract

- Project `DESIGN.md`: 根级 `DESIGN.md`。
- Token ownership model: 现有运行时 Sass 令牌为 canonical，`DESIGN.md` 镜像语义值并记录意图。
- Runtime design-system/token source: `miniprogram/src/styles/variables.scss` 与 `miniprogram/src/app.scss`。
- Mapping/export/adapters: 语义 Sass 变量 → 全局基线 / 共享组件 → 页面；旧 `$gray-*`、`$primary` 等变量继续兼容。
- Token drift gate: DESIGN lint、共享变量搜索、typecheck、`build:weapp`、窄屏截图。
- Supported themes: 首期仅浅色微信小程序主题。
- Design-context owner/review policy: durable token 或共享行为变化必须在文档与运行时代码同一提交更新。

## Canonical UI Map

| Capability | Canonical owner | Source of truth | Allowed variants | Verification |
|---|---|---|---|---|
| Select/Listbox | `BottomSheet` + 业务选项按钮；已有表单 `Picker` 暂为 legacy | 本文件 / 微信平台行为 | authored sheet / native Picker legacy | 真机或开发者工具打开态 + 触控 |
| Form | 既有页面表单，第一阶段不迁移 | 现有页面和 API | create / edit | 后续分阶段验证 |
| Scrollbar | 微信页面滚动与 `ScrollView` | 微信平台行为 | 页面 / 底部层内部滚动 | 窄屏与长列表 |
| Toast | `Taro.showToast`（现有业务反馈） | 现有小程序约定 | success / none(error) | 收藏、投递失败与成功 |
| CRUD | `jobsApi` + 角色守卫 + 对应页面 | API / 本文件 | browse / apply / favorite / close legacy | 角色矩阵 + 完整流程 |

## Component behavior

| Component | Default | Hover/press | Focus/current | Active | Disabled | Busy | Error |
|---|---|---|---|---|---|---|---|
| Button | 真实动词和稳定尺寸 | 轻背景或透明度 | 当前项有文字和颜色 | 不重复触发 | 不执行处理函数 | 原尺寸内指示 | 邻近持久文案或 toast |
| Icon button | 必须有无障碍名称 | 轻背景 | 当前状态可见 | 图标+颜色+状态文本 | 不执行 | 不抖动 | 由所属操作区说明 |
| Input | 可见提示、28rpx 正文 | 边界不跳动 | 品牌色状态 | n/a | 灰色且不可输入 | 预留右侧槽 | 搜索区内说明 |
| Search | 显式清空 + 300ms 防抖 | 清空按钮有按压态 | 输入值即时更新 | Enter/确认不绕过中文输入 | n/a | 结果区稳定加载 | 保留条件并提供重试 |
| Table/list | 移动卡片任务流 | 卡片轻按压 | 当前筛选有文本标记 | 上拉追加 | 到底后不再请求 | 保留已有项 | 首次失败与追加失败分开恢复 |

## Dataset navigation

- Admin tables: 第二阶段改为移动任务中心和详情流；禁止桌面表格与 Kanban。
- Exploratory lists: 人才职位使用服务端分页 + 页面上拉追加，并保留可点击“加载更多”恢复路径。
- URL state: 小程序当前自定义底部导航使用 `reLaunch`，筛选属于当前页面瞬时状态；第一阶段不伪造 Web URL 持久化能力。返回职位详情后由微信页面栈保留列表状态。
- Page size: 人才职位每次 10 条，以首屏密度和追加反馈为目标；服务端仍返回 total/page/pageSize。
- Empty/no-results/error/loading treatment: 空数据、无筛选结果、首次错误、追加错误、正在加载和没有更多分别显示， footprint 保持稳定。
- Back/scroll restoration: `navigateTo` 进入详情、`navigateBack` 回到职位列表；底部角色 Tab 的 legacy `reLaunch` 行为保留并记录为后续导航迁移项。
- Selection scope: 本阶段列表不提供多选或批量动作。

## Flow ledger

| Operation | Trigger | Pending | Success destination | Success feedback | Failure recovery | Focus outcome | Source ref |
|---|---|---|---|---|---|---|---|
| 搜索职位 | 输入关键词 / 清空 | 首次稳定 loading；已有项不被旧响应覆盖 | 原列表 | 结果数/列表状态 | 保留关键词和筛选，显示重试 | 留在搜索或结果区 | `jobsApi.list` |
| 筛选职位 | 城市/岗位/菜系/业态 | 失效旧请求，第一页重载 | 原列表 | 当前筛选文案 | 保留选择，显示重试/清空 | 返回触发按钮 | `jobsApi.list`, `refApi` |
| 加载更多 | 上拉或“加载更多” | 已有卡片保留，底部忙碌 | 原列表追加 | 项目数增长 | 底部错误 + 重试 | 保留滚动位置 | `jobsApi.list` |
| 收藏/取消收藏 | 详情收藏按钮 | 单按钮忙碌且防重复 | 当前详情 | 图标状态即时按服务端结果更新 | toast，保留原状态 | 留在按钮 | `favorite/unfavorite` |
| 投递 | “投递简历” | 稳定按钮显示“投递中”且防重复 | 当前详情 | “投递成功” + 投递状态 | toast；已投递响应收敛为真实状态 | 留在状态按钮 | `jobsApi.apply` |
| 沟通 | “沟通” | 由聊天页负责 | 聊天会话 | 聊天页状态 | 缺少真实企业 userId 时不触发 | 新页面 | 现有 chat route |
| 查看匹配依据 | 进入人才职位详情 | 非阻塞读取已有记录 | 当前详情 | 显示非敏感规则证据 | 诚实空态/读取失败，不影响投递 | 不抢焦点 | `matchesApi.getMyMatches` |
| 返回 | 自定义导航返回 | 无 | 原页面栈；无历史时职位首页 | 无 | fallback `reLaunch` | 原上下文 | `NavBar` |

## Navigation and responsive behavior

- Route document title policy: 小程序 page config 维护页面标题；自定义 `NavBar` 显示同一可见标题。
- Route error / 403 page behavior: 401 由现有请求层清理登录并回登录页；服务端 403 必须保留为权限错误，不伪装空数据。专用 403 页面属于权限阶段后续工作。
- Breadcrumb/tab/route-state policy: 手机端不用面包屑；角色底部导航只显示该角色相关入口，管理员从 jobs 分流至管理页。
- Sidebar/drawer/bottom-sheet transformation: 城市和短筛选用共享底部层；长表单使用独立页面。
- Responsive table strategy: 所有角色移动列表使用卡片/任务流，企业与管理员的大型页面在第二阶段迁移。
- Truncation/full-value access: 职位标题最多两行，详情展示完整标题和内容；企业名一行省略但可进入企业详情。
- Focus restoration and sticky-obstruction policy: 固定底栏预留正文空间和安全区；底部层关闭返回原筛选上下文。

## Overlays and feedback

- Dialog primitive: 本阶段只有非破坏性的共享 `BottomSheet`；破坏性对话框不在本阶段新增。
- Destructive confirmation levels: 沿用服务端与现有业务，未来必须使用应用自有确认层，不使用浏览器原生确认。
- Toast placement/duration/deduplication: 沿用微信 `Taro.showToast`；关键错误同时保留可恢复页面状态。
- Alert/banner scope and persistence: 列表加载错误在列表区域持久显示；不会用 toast 代替重试路径。
- Tooltip delay/dismissal: 小程序触控端不依赖 hover tooltip；禁用原因使用邻近文字。
- Unsaved-changes behavior: 本阶段无表单修改。
- Layer/z-index contract: sticky header 100、角色底栏 400、底部层 backdrop 500 / sheet 700、toast 由微信系统层管理；禁止任意 `9999`。

## Async and resilience

- Mutation default: 收藏和投递为服务端确认后更新；不提前宣称成功。
- Idempotency and duplicate-submit policy: 每个动作独立 busy 状态；busy 时处理函数立即返回。
- Auto-save/draft recovery: 本阶段不新增。
- Offline/read-stale/write behavior: 网络失败保留筛选和已有列表；不排队写入。
- Retry/backoff/timeout behavior: 请求层 15 秒超时；页面提供显式重试，不做无限自动重试。
- Version conflict and multi-tab behavior: 小程序单页状态；服务端为最终事实。
- Session expiry/re-authentication: 沿用请求层 401 → 清登录态 → 登录页。
- Long-running progress and return path: 本阶段不主动运行匹配或长任务。
- Stale-request cancellation/invalidation and pending-state ownership: jobs 使用单调请求序号；清空/筛选/搜索使旧请求失效，旧响应不能清除新请求 loading 或覆盖新列表。
- Dialog/form preservation and retry after mutation failure: 底部筛选值只有明确选择时提交，关闭不改变；收藏/投递失败保留原状态。

## Validation

- Schema/validation layer: 本阶段不改变服务端输入契约。
- Trigger timing: 搜索 300ms 防抖，清空和筛选立即执行。
- Error summary/inline policy: 列表错误持久显示，动作错误使用微信 toast；不得暴露原始堆栈。
- Server error mapping: 使用请求层已提取的服务端 message/error。
- Sensitive-value handling: 匹配证据禁止婚育、性别、家庭、联系方式等敏感维度；不新增本地敏感存储。
- `noValidate`, first-invalid focus, duplicate-submit prevention, unsaved changes, and submit recovery: 表单不在本阶段范围；动作防重复规则适用于投递和收藏。

## Permission and clipboard

- Permission UI strategy: 角色无关入口隐藏；直接路由仍由服务端授权和现有守卫决定。前端隐藏不作为安全边界。
- Clipboard copy policy: 本阶段无复制敏感值功能。
- Disabled-state explanation: 企业认证未通过的发布按钮继续显示邻近认证说明；本阶段不改变权限含义。

## Migration status

- Migration ledger location: 本文件 Dataset navigation、Flow ledger 与以下阶段边界。
- Canonical primitives and owners: `Layout`, `NavBar`, `SearchBar`, `FilterBar`, `BottomSheet`, `StatusBadge`, `StickyActionBar`, `MatchEvidence`, `JobCard`。
- Current risk-prioritized slices: 第一阶段为人才 jobs → job-detail；第二阶段为消息/匹配、企业任务流、管理员任务中心。
- Legacy import/token enforcement: 旧 Sass 变量保留；触达页面改用语义变量，新页面不得新增另一套 UI 库或局部等价组件。
- Rollout/rollback and removal gates: V2 只在 `ui-v2-mobile`；原版标签可复原；用户验收前禁止合并主分支。

## Verification

- Required static commands: DESIGN lint、premium strict audit、`cd miniprogram && npm run typecheck`、`npm run build:weapp`、变更文件 anti-pattern 搜索。
- Browser/device/locale/theme matrix: 微信竖屏 320/375/430 CSS px 等效宽度、简体中文、浅色；真实微信开发者工具/真机若需登录则明确标记外部验证。
- Accessibility checks: 可见状态文案、24px 最小/约 44px 关键触控区、非颜色单一表达、固定底栏不遮挡。
- Native-language/domain review and target-user evidence: 中文产品文案按餐饮酒店求职场景审阅；顾问/距离/预约/福利承诺需后端和业务确认后再上线。
- Component-state/visual regression coverage: jobs 的加载/空/无结果/错误/追加/到底，详情的加载/错误/匹配有记录/无记录/读取失败，以及投递各状态。
- Canonical sibling flow used for comparison: 现有 `pages/my-favorites`、`pages/my-matches`、`pages/applications` 与企业 jobs 分流。
- Project audit command/result: 在交付前记录真实结果。
- CRUD full-flow evidence: 在交付前记录收藏、投递、沟通路由和返回行为的可执行验证范围。
- Failure-path evidence: 在交付前记录静态检查、构建及可运行预览结果。
