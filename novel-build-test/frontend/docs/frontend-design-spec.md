# AISQA · AI 测试平台 — 前端页面设计说明

> 文档版本：v1.0  
> 项目名称：novel-build-test  
> 框架：React 19 + TypeScript + Vite + Tailwind CSS v4  
> 组件库：shadcn/ui + Radix UI Primitives  
> 动画：framer-motion  
> 构建日期：2026-07-15

---

## 目录

1. [整体设计风格](#一整体设计风格)
2. [色彩系统](#二色彩系统)
3. [布局系统](#三布局系统)
4. [登录注册页](#四登录注册页)
5. [首页 / 仪表盘](#五首页--仪表盘)
6. [功能详情页](#六功能详情页)
7. [UI 组件详细规格](#七ui-组件详细规格)
8. [模块导航结构](#八模块导航结构)
9. [动画与交互系统](#九动画与交互系统)
10. [AI 助手悬浮窗](#十ai-助手悬浮窗)
11. [响应式适配](#十一响应式适配)

---

## 一、整体设计风格

### 「暖白拍立得」Polaroid 主题

项目采用完全自定义的 **Polaroid 暖白相纸风格**，设计语言核心关键词：

| 关键词 | 说明 |
|--------|------|
| 温暖 | 全暖色调色板，奶油/琥珀/褐色系 |
| 手作感 | 卡片随机旋转、暖阴影、相纸底部签名区 |
| 亲和 | 大圆角（12px）、柔和阴影、舒适留白 |
| 专业 | 清晰的层级结构、一致的状态配色 |

设计文件入口：
- `src/index.css` — Tailwind 主题变量定义
- `src/styles/polaroid-theme.css` — 完整 Polaroid 色板与阴影定义

---

## 二、色彩系统

### 2.1 Polaroid 基础色板

| CSS 变量 | 色值 | 用途 |
|----------|------|------|
| `--polaroid-white` | `#FEFDFB` | 卡片/内容区背景（奶白） |
| `--polaroid-cream` | `#FFF8F0` | 页面主背景（暖奶油） |
| `--polaroid-warm` | `#FAF5F0` | 悬浮态/表头/容器背景（微暖） |
| `--polaroid-border` | `#E8DDD0` | 边框色（暖灰褐） |
| `--polaroid-shadow` | `rgba(180,120,60,0.12)` | 卡片暖阴影（常规） |
| `--polaroid-shadow-hover` | `rgba(180,120,60,0.20)` | 卡片暖阴影（悬浮） |
| `--polaroid-text` | `#3D3229` | 主文字色（深褐） |
| `--polaroid-text-muted` | `#8B7D72` | 辅助文字色（灰褐） |

### 2.2 强调色板

| CSS 变量 | 色值 | 用途 |
|----------|------|------|
| `--amber-primary` | `#F59E0B` | **主品牌色** — 按钮/激活态/强调/Logo |
| `--amber-hover` | `#D97706` | 按钮悬浮态 |
| `--amber-light` | `#FEF3C7` | 浅琥珀背景 |
| `--orange-secondary` | `#F97316` | 第二品牌色（橙色） |
| `--rose-accent` | `#E11D48` | 强调色/危险色（玫红） |

### 2.3 shadcn/ui 语义色（暖白覆盖）

| CSS 变量 | HSL 值 | 说明 |
|----------|--------|------|
| `--background` | `48 100% 97%` | 页面背景 |
| `--foreground` | `24 10% 20%` | 前景文字 |
| `--primary` | `38 92% 50%` | 主要（琥珀金） |
| `--primary-foreground` | `48 100% 97%` | 主要前景 |
| `--secondary` | `24 95% 53%` | 次要（橙） |
| `--accent` | `340 82% 52%` | 强调（玫红） |
| `--destructive` | `0 84% 60%` | 危险（红） |
| `--border` | `38 30% 80%` | 边框 |
| `--input` | `38 30% 80%` | 输入框边框 |
| `--ring` | `38 92% 50%` | 聚焦环（琥珀金） |
| `--radius` | `0.5rem` (8px) | 基础圆角，卡片使用 12px |

### 2.4 侧边栏配色（深色暖调）

| CSS 变量 | 说明 |
|----------|------|
| `--sidebar-background: 30 20% 15%` | 深褐底色 |
| `--sidebar-foreground: 30 10% 85%` | 浅褐文字 |
| `--sidebar-primary: 38 92% 50%` | 金色激活高亮 |
| `--sidebar-accent: 30 15% 22%` | 悬浮态 |

### 2.5 阴影系统

```css
.shadow-polaroid {
  box-shadow:
    0 2px 4px var(--polaroid-shadow),
    0 8px 24px var(--polaroid-shadow),
    0 0 0 1px var(--polaroid-border);
}

.shadow-polaroid-hover {
  box-shadow:
    0 4px 8px var(--polaroid-shadow-hover),
    0 16px 48px var(--polaroid-shadow-hover),
    0 0 0 1px var(--polaroid-border);
}
```

---

## 三、布局系统

项目采用 **三级导航结构**，通过 React Router 的路由嵌套实现。

### 3.1 路由架构总览

```
src/App.tsx
├── 公开路由（无布局）
│   ├── /login          → LoginPage
│   └── /register       → RegisterPage
│
├── 第一层：HomeLayout（无侧边栏）
│   ├── /               → DashboardPage（首页卡片矩阵）
│   └── /modules/:moduleKey → ModuleDetailPage（模块详情）
│
└── 第二层：MainLayout（有侧边栏）
    └── /executions     → WorkflowExecutionListPage
    └── /projects, /requirements, /environments, /assets, ...
```

### 3.2 第一层：HomeLayout — 首页布局

```
┌─────────────────────────────────────────────┐
│  Header (h-14)                              │
│  ┌───────────────────────────────────────┐  │
│  │ [AISQA] · AI 测试平台          [👤 U] │  │
│  └───────────────────────────────────────┘  │
├─────────────────────────────────────────────┤
│              Outlet 内容区                    │
│          （DashboardPage / ...）             │
├─────────────────────────────────────────────┤
│              [AI 助手悬浮按钮]                │
└─────────────────────────────────────────────┘
```

### 3.3 第二层：MainLayout — 详情布局

```
┌──────────────────┬──────────────────────────────────┐
│ Sidebar (w-56)   │  Header (h-14)                   │
│ 深色背景          │  ┌────────────────────────────┐  │
│                  │  │ AISQA                [👤 U] │  │
│ [🏠 首页]        │  └────────────────────────────┘  │
│ ─────────        ├──────────────────────────────────┤
│ 公共模块          │         Outlet 内容区             │
│  ⚙️ 系统设置     │                                  │
│  📋 审计日志      │                                  │
│  🛡️ 认证与安全   │                                  │
│  ...             │                                  │
│ ─────────        │                                  │
│ [◀] (折叠按钮)    │                                  │
└──────────────────┴──────────────────────────────────┘
```

### 3.4 第三层：ModuleDetailPage — 功能详情页

```
┌──────────────────┬──────────────────────────────────┐
│ 左侧菜单 (w-56)  │  右侧内嵌内容区                    │
│ 白色背景          │  暖奶油背景                        │
│                  │                                  │
│ [← 返回首页]     │   Suspense 懒加载 + framer-motion  │
│ [🎨] 功能测试    │   切换子功能组件                    │
│  · 2 项功能      │                                  │
│ ─────────        │                                  │
│ ● 用例管理       │                                  │
│ ● 用例执行       │                                  │
└──────────────────┴──────────────────────────────────┘
```

---

## 四、登录注册页

### 4.1 登录页（LoginPage）

**文件**：`src/pages/auth/LoginPage.tsx`

```
        ┌─────────────────────────────────────┐
        │              ┌─────┐                │
        │              │  A  │  ← h-12 w-12   │
        │              └─────┘    圆形 金色背景 │
        │            AISQA                    │
        │     AI 测试平台 · 登录               │
        ├─────────────────────────────────────┤
        │  用户名                              │
        │  ┌─────────────────────────────────┐│
        │  │ 请输入用户名                      ││
        │  └─────────────────────────────────┘│
        │  密码                               │
        │  ┌─────────────────────────────────┐│
        │  │ 请输入密码                        ││
        │  └─────────────────────────────────┘│
        │  ┌─────────────────────────────────┐│
        │  │            登录                  ││
        │  └─────────────────────────────────┘│
        │  还没有账号？ 立即注册                │
        └─────────────────────────────────────┘
```

**设计细节**：
- 全屏居中布局，`Card w-full max-w-md shadow-lg`
- Logo 圆形金色背景，白色 `A` 字
- 表单 `space-y-4`，字段内 `space-y-2`
- 提交按钮禁用态：`disabled={loading}`，文字变为"登录中..."
- 错误提示：`rounded-md bg-destructive/10 px-3 py-2 text-sm`

### 4.2 注册页（RegisterPage）

**文件**：`src/pages/auth/RegisterPage.tsx`

5 个表单字段：

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| 用户名 | Input text | ✅ | `placeholder="请输入用户名"` |
| 邮箱 | Input email | ✅ | `placeholder="请输入邮箱"` |
| 显示名称 | Input text | ❌ | `placeholder="请输入显示名称"` |
| 密码 | Input password | ✅ | `placeholder="请设置密码"` |
| 确认密码 | Input password | ✅ | `placeholder="请再次输入密码"` |

- 前端校验两次密码一致性
- 注册成功 → `navigate('/login')`，失败 → "注册失败，请稍后重试"

---

## 五、首页 / 仪表盘

**文件**：`src/pages/dashboard/DashboardPage.tsx`

### 5.1 页面结构

```
┌────────────────────────────────────────────────────────────┐
│              AISQA · AI 测试平台                            │
│              全局概览与模块导航                              │
├────────────────────────────────────────────────────────────┤
│ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐      │
│ │ 📁 项目总 │ │ 📖 需求总 │ │ 📊 测试执 │ │ 🧪 通过率 │      │
│ │    数     │ │    数    │ │    行    │ │          │      │
│ │    12    │ │    48    │ │   156   │ │  87.5%  │      │
│ └──────────┘ └──────────┘ └──────────┘ └──────────┘      │
│                                                            │
│ [⏳待审核 3] [🐛近期失败 2] [📦过期环境 1] [📊近7日: 45次]   │
│                                                            │
│ ┌────────────────────────────────────────────────────┐    │
│ │ 公共模块 │ 项目模块 │ AI智能体 │ AI测试 │ AI应用 │...│    │
│ └────────────────────────────────────────────────────┘    │
│                                                            │
│ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐                      │
│ │ ⚙️   │ │ 📋   │ │ 🧠   │ │ 🛡️   │  ...                │
│ │系统设│ │审计日│ │调度总│ │认证与│                      │
│ │置    │ │志    │ │控    │ │安全  │                      │
│ └──────┘ └──────┘ └──────┘ └──────┘                      │
└────────────────────────────────────────────────────────────┘
```

### 5.2 统计卡片（StatsCard）

- `grid-cols-2 sm:grid-cols-4 gap-4`
- 图标(左) + 标签+数值(右)，4 组独立配色
- 加载态：`animate-pulse` 骨架占位

| 卡片 | 背景色 | 文字色 | 图标色 |
|------|--------|--------|--------|
| 项目总数 | `#fef3c7` | `#92400e` | `#d97706` |
| 需求总数 | `#dbeafe` | `#1e40af` | `#2563eb` |
| 测试执行 | `#d1fae5` | `#065f46` | `#059669` |
| 通过率 | `#fce7f3` | `#9d174d` | `#db2777` |

### 5.3 待办标签（TodoBadge）

- `rounded-full px-3 py-1.5 text-xs`，状态圆点 + 图标 + 文字 + 数字
- 三种变体：`default`(灰) / `danger`(红) / `warning`(黄)

### 5.4 Tab 分组切换

- 自定义按钮式 Tab，激活态金色 `var(--amber-primary)` + 白色文字
- 右侧数字徽章显示模块数，`overflow-x-auto` 横向滚动

### 5.5 PolaroidCard 拍立得卡片

**文件**：`src/components/polaroid/PolaroidCard.tsx`

**视觉规格**：
- 尺寸 `h-[220px]`，纯白 `bg-white`，`rounded-xl` (12px)
- 阴影 `shadow-polaroid` 三层暖阴影
- 随机旋转 -2°~+2°（`Math.random() * 4 - 2`）

**内部结构**：
```
┌──────────────────────┐
│       ┌────────┐     │
│       │  🤖    │     │  ← 图标圆形区 (h-14 w-14) + 半透明背景
│       └────────┘     │
│     调度总控          │  ← title (text-base font-semibold)
│  任务分发·流程编排    │  ← subtitle (text-xs)
│   ┌──────────────┐   │
│   │ 1 项功能      │   │  ← badge (rounded-full px-2.5 py-0.5)
│   └──────────────┘   │
│  ● 已就绪  07-14 10:30│  ← status + lastRunTime
│ ─────────────────── │  ← border-t
│   DispatchController  │  ← signature (text-[11px] italic)
└──────────────────────┘
```

**动画**：悬浮 `y: -8, rotate: 0, scale: 1.02`（spring），点击 `scale: 0.97`

---

## 六、功能详情页

以项目列表页为典型代表。

### 6.1 项目列表页（ProjectListPage）

**文件**：`src/pages/projects/ProjectListPage.tsx`

```
┌────────────────────────────────────────────────────────────┐
│  [🔍 搜索项目...________]  [➕ 新建项目]                     │
│                                                            │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ 项目名称    │ 描述      │ 状态    │ 创建时间  │ 操作  │  │
│  ├──────────────────────────────────────────────────────┤  │
│  │ 📁 项目A    │ ...      │ 进行中  │ 2026-07  │ 👁✏️🗑│  │
│  │ 📁 项目B    │ ...      │ 草稿    │ 2026-07  │ 👁✏️🗑│  │
│  └──────────────────────────────────────────────────────┘  │
│  共 12 个项目         第 1 / 3 页  [上一页] [下一页]        │
└────────────────────────────────────────────────────────────┘
```

**搜索框**：`w-72`，`rounded-lg border bg-white pl-10 pr-4 py-2.5`，聚焦金色边框

**新建按钮**：金色背景 `var(--amber-primary)` + 白色文字，`hover:opacity-90`

**表格**：`rounded-xl border overflow-hidden`，表头 `var(--polaroid-warm)`，行 `hover:bg-gray-50/50`

**状态徽章**：
- 进行中：`bg-emerald-50 text-emerald-600`
- 草稿：`bg-gray-100 text-gray-500`
- 已归档：`bg-blue-50 text-blue-600`

**操作按钮**：图标按钮 `p-1.5 rounded-lg`，删除 `hover:bg-red-50 text-red-400`

**分页**：左侧总数，右侧 "第 X/Y 页 [上一页] [下一页]"，边界 `disabled:opacity-50`

**弹窗**：
- 遮罩 `fixed inset-0 z-50 bg-black/40`，点击遮罩关闭
- 面板 `max-w-md rounded-2xl bg-white p-6 shadow-xl`
- framer-motion 入场 `scale: 0.95->1` + `opacity: 0->1`
- 标签 + Input/Textarea/原生 select，保存按钮金色背景

### 6.2 集成配置页（IntegrationPage）

- Tab 切换：CI/CD 集成 / 通知渠道 / 外部工具
- 卡片式列表 `grid gap-4 md:grid-cols-2`
- 状态指示器 `h-2 w-2 rounded-full`，绿=active / 灰=inactive

### 6.3 执行记录页（ExecutionListPage）

- 顶部 4 个统计小卡片
- 表格含进度条 `h-2 bg-gray-200 rounded-full`
- 状态列：图标 + 文字徽章，running 状态 `animate-spin`

| 状态 | 颜色 | 背景 | 标签 |
|------|------|------|------|
| running | `text-blue-500` | `bg-blue-50` | 执行中 |
| completed | `text-green-500` | `bg-green-50` | 已完成 |
| failed | `text-red-500` | `bg-red-50` | 失败 |
| pending | `text-gray-400` | `bg-gray-100` | 待执行 |

### 6.4 知识库页（KnowledgeListPage）

- 多条件过滤：搜索 + 来源下拉 + 项目下拉
- 来源标签：手动录入(`bg-blue-50`)、文件导入(`bg-green-50`)、API接入(`bg-purple-50`)
- 同步按钮 `RefreshCw` 图标

---

## 七、UI 组件详细规格

### 7.1 Button

| Variant | 样式 |
|---------|------|
| `default` | `bg-primary text-primary-foreground shadow hover:bg-primary/90` |
| `destructive` | `bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90` |
| `outline` | `border border-input bg-background shadow-sm hover:bg-accent` |
| `secondary` | `bg-secondary text-secondary-foreground shadow-sm hover:bg-secondary/80` |
| `ghost` | `hover:bg-accent hover:text-accent-foreground` |
| `link` | `text-primary underline-offset-4 hover:underline` |

| Size | 样式 |
|------|------|
| `default` | `h-9 px-4 py-2` |
| `sm` | `h-8 rounded-md px-3 text-xs` |
| `lg` | `h-10 rounded-md px-8` |
| `icon` | `h-9 w-9` |

通用：`disabled:opacity-50`，`focus-visible:ring-1 ring-ring`

### 7.2 Input

```
flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm
focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring
disabled:cursor-not-allowed disabled:opacity-50
```

### 7.3 Select

**Radix 版**（`src/components/ui/select.tsx`）：
- Trigger：`h-9 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm` + `ChevronDown`
- Content：`rounded-md border bg-popover shadow-md`，入场/出场动画
- Item：`rounded-sm py-1.5 pl-2 pr-8 text-sm`

**实际项目大量使用原生 `<select>`**：
- `w-full rounded-lg border bg-white px-3 py-2 text-sm outline-none`
- 聚焦 `focus:border-[var(--amber-primary)]`

### 7.4 Textarea

```
flex min-h-[60px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm
focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring
```

### 7.5 Card

| 部件 | 样式 |
|------|------|
| `Card` | `rounded-xl border bg-card text-card-foreground shadow` |
| `CardHeader` | `flex flex-col space-y-1.5 p-6` |
| `CardTitle` | `font-semibold leading-none tracking-tight` |
| `CardDescription` | `text-sm text-muted-foreground` |
| `CardContent` | `p-6 pt-0` |

### 7.6 Badge

`inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold`

| Variant | 样式 |
|---------|------|
| `default` | `bg-primary text-primary-foreground shadow` |
| `secondary` | `bg-secondary text-secondary-foreground` |
| `destructive` | `bg-destructive text-destructive-foreground shadow` |
| `outline` | `text-foreground` |

### 7.7 Tabs

基于 Radix UI：`TabsList`(`rounded-lg bg-muted p-1`) + `TabsTrigger`(激活 `data-[state=active]:bg-background shadow`) + `TabsContent`

### 7.8 Dialog

基于 Radix UI：Overlay(`bg-black/80` + fade) + Content(居中 `max-w-lg` + 缩放动画) + Close(右上角 `X`)

### 7.9 Label

`text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70`

### 7.10 Avatar / DropdownMenu

用户头像首字母，金色背景。DropdownMenu 含用户名 + 退出登录(红色)

### 7.11 Skeleton

`animate-pulse rounded-md bg-primary/10`

---

## 八、模块导航结构

7 大分组，30+ 模块。定义文件：`src/lib/modules.tsx`

| 分组 | 模块数 | 包含模块 |
|------|--------|----------|
| 公共模块 | 4 | 系统设置、审计日志、认证与安全、集成与通知 |
| 项目模块 | 5 | 项目管理、需求管理、测试环境、测试资产库、AI知识库 |
| AI 智能体 | 9 | 调度总控、需求分析、测试架构、测试设计、用例编写、执行分析、质量审计、成本优化、辩论引擎 |
| AI 测试 | 10 | 功能/接口/Web自动化/App自动化/性能/安全/UI/冒烟测试 + 执行与报告 |
| AI 应用 | 3 | AI聊天室、AI数据库调优、AI助手 |
| AI 配置 | 8 | 模型配置、提示词工程、去AI味配置、技能/工作流/测试数据/MCP/Hermes配置 |
| 个人设置 | 3 | 个人设置、用户管理、角色管理 |

---

## 九、动画与交互系统

| 场景 | 实现 | 参数 |
|------|------|------|
| 页面入场 | framer-motion | `opacity: 0→1, y: 12→0`, duration 0.2s |
| 卡片网格 | stagger | `staggerChildren: 0.08`, `delay: i * 0.04` |
| 卡片悬浮 | whileHover | `y: -8, rotate: 0, scale: 1.02`, spring |
| 卡片点击 | whileTap | `scale: 0.97` |
| 子功能切换 | AnimatePresence | `opacity + y` 方向交叉过渡 |
| 侧边栏折叠 | CSS transition | `transition-all duration-300`, `w-56 ↔ w-16` |
| 弹窗 | framer-motion | `scale: 0.95→1 + opacity: 0→1` |
| AI 助手 | spring | `stiffness: 400, damping: 30` |
| 加载态 | CSS animate | `animate-spin` / `animate-pulse` |

---

## 十、AI 助手悬浮窗

**文件**：`src/components/ai-chat/AiAssistantFloating.tsx`

- 触发按钮：右下角 `fixed bottom-6 right-6`，`h-14 w-14 rounded-full` 金色
- 面板：`w-80`，高度 480px，`rounded-2xl shadow-2xl`
- 金色头部：`Sparkles` 图标 + "AI 助手"
- 消息气泡：AI=暖灰 / 用户=金色(右对齐)
- 快捷操作网格 2x2：总览/执行/Agent/快速检测
- 底部输入区 + 金色发送按钮

---

## 十一、响应式适配

| 断点 | 布局变化 |
|------|----------|
| base | 统计 2 列，网格 auto-fill |
| sm (640px) | 统计 4 列 |
| lg (1024px) | 3 列网格 |
| xl (1280px) | 4 列网格 |
| 2xl (1536px) | 5 列网格 |

---

> 本文档基于 `novel-build-test/frontend/src/` 源代码提取，覆盖了所有页面、组件、样式和交互设计。如有更新，请同步修改本文档。
