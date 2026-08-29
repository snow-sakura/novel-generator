# 🍅 番茄小说生成器 — AI 驱动的智能小说创作系统

> **一句话输入，AI 自动生成完整小说**
>
> 更新日期：2026-08-29 ｜ 版本：v3.1.1

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Python 3.10+](https://img.shields.io/badge/Python-3.10+-blue.svg)](https://www.python.org/)
[![React 18](https://img.shields.io/badge/React-18-61DAFB.svg)](https://reactjs.org/)

---

## 📖 项目简介

**番茄小说生成器** 是一个 AI 驱动的智能小说创作系统，用户只需输入一句话（种子句），系统即可自动生成完整的网络小说。项目包含 **V1（骨架版）** 和 **V3（灵魂版）** 两个主要版本，采用前后端分离架构，支持多模型切换、实时流式生成、对话式创作等高级功能。

### ✨ 核心亮点

- 🤖 **四智能体协作** — 要素解析 → 大纲规划 → 逐章生成 → 标题生成，全自动流水线
- 🎯 **15+ 创作辅助功能** — 金句管理、美学风格、设定档案、TTS 语音、AI 配图、统计分析
- 💬 **对话式创作** — 像聊天一样引导 AI 创作，实时调整方向
- 🔄 **断点续写** — 生成中断可从断点继续，不丢失任何进度
- 🌐 **多模型支持** — OpenAI / DeepSeek / Qwen / MiMo V2.5 等国产模型一键切换

---

## 🖼️ 界面预览

### 创作页面 — 一句话开启创作之旅

![创作页面](docs/screenshots/v3-create.png)

> V3 创作页面：左侧表单配置频道/题材/风格，右侧实时显示生成进度

### 对话式创作 — 像聊天一样写小说

![对话式创作](docs/screenshots/v3-chat.png)

> 对话页面：输入种子句后，AI 通过对话引导你完成创作参数配置

### 历史记录 — 管理你的所有作品

![历史记录](docs/screenshots/v3-history.png)

> 历史页面：查看所有生成记录，支持继续生成、导出、删除等操作

### 模板库 — 预设提示词参考

![模板库](docs/screenshots/v3-prompts.png)

> 模板页面：浏览和参考各类创作提示词模板

### V1 创作页面 — 经典骨架版

![V1 创作页面](docs/screenshots/v1-create.png)

> V1 创作页面：简洁的表单布局，专注核心生成功能

### V1 历史记录

![V1 历史记录](docs/screenshots/v1-history.png)

> V1 历史页面：卡片式展示已生成的小说

---

## 🏗️ 系统架构

```
┌─────────────────────────────────────────────────────────────┐
│                      前端 (React + Vite)                     │
├─────────────────────────────────────────────────────────────┤
│  CreatePage  │  ChatPage  │  NovelPage  │  HistoryPage      │
│  创作表单    │  对话创作   │  小说详情   │  历史记录          │
└───────────────────────┬─────────────────────────────────────┘
                        │ SSE / REST API
┌───────────────────────┴─────────────────────────────────────┐
│                    后端 (FastAPI + Python)                    │
├─────────────────────────────────────────────────────────────┤
│  GeneratorService  │  ChatService  │  ExportService         │
│  四智能体管线       │  对话式生成    │  多格式导出            │
├─────────────────────────────────────────────────────────────┤
│  LLM Provider Factory (OpenAI / DeepSeek / Qwen / MiMo)    │
└───────────────────────┬─────────────────────────────────────┘
                        │
┌───────────────────────┴─────────────────────────────────────┐
│                    数据层 (SQLite + 文件系统)                  │
├─────────────────────────────────────────────────────────────┤
│  generation_records  │  novels  │  chapter_contents          │
│  paragraph_versions  │  model_configs  │  docs/novel/        │
└─────────────────────────────────────────────────────────────┘
```

### 四智能体协作流程

```
种子句输入
    │
    ▼
┌─────────────────┐
│  ParserAgent    │  故事要素分析师
│  要素解析       │  提取六维要素：人物/时间/地点/起因/发展/结局
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  OutlinerAgent  │  小说大纲架构师
│  大纲规划       │  构建六层大纲：战略/人物/设定/结构/节奏/风格
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  WriterAgent    │  小说章节作家
│  逐章生成       │  流式生成每章正文（token 级流式输出）
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  TitlerAgent    │  小说标题专家
│  标题生成       │  根据全文生成吸引人的标题
└────────┬────────┘
         │
         ▼
    完整小说输出
```

---

## 🚀 快速开始

### 环境要求

- Python 3.10+
- Node.js 18+
- npm 或 yarn

### 1. 克隆项目

```bash
git clone git@github.com:snow-sakura/novel-generator.git
cd novel-generator
```

### 2. 启动 V3 后端

```bash
cd novel-build-system/v3/backend
bash run.sh                        # 自动创建 .venv + 安装依赖 + 复制 .env
```

### 3. 启动 V3 前端

```bash
cd novel-build-system/v3/frontend
npm install
npm run dev                        # http://localhost:5173
```

### 4. 配置模型

编辑 `backend/.env` 文件：

```env
# 使用 OpenCode Zen（免费模型）
LLM_PROVIDER=opencode
OPENCODE_API_KEY=sk-xxx
OPENCODE_BASE_URL=https://opencode.ai/zen/v1
OPENCODE_MODEL=mimo-v2.5-free

# 或使用 DeepSeek
# LLM_PROVIDER=openai
# OPENAI_API_KEY=sk-xxx
# OPENAI_BASE_URL=https://api.deepseek.com/v1
# OPENAI_MODEL=deepseek-chat
```

### 5. 开始创作

打开 http://localhost:5173，输入一句话即可开始！

---

## 📁 项目结构

```
novel-generator/
├── novel-build-system/              # 番茄小说生成器
│   ├── v1/                          # V1 骨架版
│   │   ├── backend/                 # FastAPI 后端
│   │   │   ├── app/
│   │   │   │   ├── main.py          # 应用入口
│   │   │   │   ├── routers/         # API 路由
│   │   │   │   ├── services/        # 业务逻辑
│   │   │   │   ├── models/          # 数据模型
│   │   │   │   └── llm/             # LLM Provider
│   │   │   └── run.sh               # 启动脚本
│   │   └── frontend/                # React 前端
│   │       ├── src/
│   │       │   ├── pages/           # 页面组件
│   │       │   ├── components/      # 通用组件
│   │       │   ├── stores/          # Zustand 状态管理
│   │       │   └── services/        # API 服务
│   │       └── package.json
│   │
│   ├── v3/                          # V3 灵魂版（推荐）
│   │   ├── backend/                 # FastAPI 后端
│   │   │   ├── app/
│   │   │   │   ├── main.py          # 应用入口 + 中间件
│   │   │   │   ├── routers/         # API 路由（15+ 模块）
│   │   │   │   ├── services/        # 业务逻辑
│   │   │   │   ├── models/          # 数据模型
│   │   │   │   └── llm/             # LLM Provider
│   │   │   └── requirements.txt     # Python 依赖
│   │   └── frontend/                # React + TypeScript 前端
│   │       ├── src/
│   │       │   ├── pages/           # 页面组件
│   │       │   ├── components/      # 通用组件（20+）
│   │       │   ├── stores/          # Zustand 状态管理
│   │       │   ├── services/        # API 服务
│   │       │   └── lib/             # 共享常量和工具
│   │       └── package.json
│   │
│   └── docs/                        # 文档和生成产物
│       ├── screenshots/             # 界面截图
│       ├── prd/                     # 产品需求文档
│       └── novel/                   # 生成的小说存储
│
├── novel-build-test/                # AISQA 智能测试平台
│   ├── backend/                     # FastAPI 后端
│   ├── frontend/                    # React 前端
│   └── docs/                        # 项目文档
│
└── README.md                        # 本文件
```

---

## 🛠️ 技术栈

### 前端

| 技术 | 版本 | 用途 |
|------|------|------|
| React | 18.x | UI 框架 |
| TypeScript | 5.x | 类型安全 |
| Vite | 6.x | 构建工具 |
| TailwindCSS | 3.x | 样式框架 |
| Zustand | 4.x | 状态管理 |
| React Router | 6.x | 路由管理 |
| Lucide React | - | 图标库 |

### 后端

| 技术 | 版本 | 用途 |
|------|------|------|
| Python | 3.10+ | 运行时 |
| FastAPI | 0.115+ | Web 框架 |
| LangChain | 0.3+ | LLM 编排 |
| CrewAI | - | 多智能体协作 |
| SQLAlchemy | 2.0+ | ORM |
| SQLite | - | 数据库 |
| Pydantic | 2.x | 数据验证 |

### 支持的 LLM 模型

| 提供商 | 模型 | 免费 |
|--------|------|------|
| OpenCode Zen | MiMo V2.5 | ✅ |
| OpenCode Zen | DeepSeek V4 Flash | ✅ |
| OpenCode Zen | 混元 3 | ✅ |
| OpenCode Zen | Nemotron 3 Ultra | ✅ |
| DeepSeek | DeepSeek Chat | ❌ |
| 通义千问 | Qwen Plus | ❌ |
| 智谱 AI | GLM-4 | ❌ |
| 月之暗面 | Kimi | ❌ |

---

## 📚 功能详解

### V3 灵魂版功能（F1-F13）

| 编号 | 功能 | 说明 |
|------|------|------|
| F1 | 频道/题材/风格多选 | 男频 19 类 + 女频 18 类 + 15 种风格 |
| F2 | 叙事技巧 | 视角控制、节奏调节、悬念/反转开关 |
| F3 | 金句管理 | 自动提取、收藏、复制 |
| F4 | 美学风格 | 关闭/轻度/中度/重度 |
| F5 | 文末解读 | 意义提炼与主题升华 |
| F6 | 设定档案 | 跨章节人物/地点一致性 |
| F7 | 多版本开头 | 好结局/坏结局/开放式 + 多版本对比 |
| F8 | 对话插入确认 | 角色对话生成与段落插入 |
| F9 | AI 推荐主题 | 智能推荐核心主题 |
| F10 | 生成记录管理 | 分页/轮询/继续/取消 |
| F11 | AI 配图 | 生成/展示/删除封面配图 |
| F12 | TTS 语音合成 | edge-tts 多声优 |
| F13 | 统计分析 | 词频/角色出现/情感曲线 SVG |

### 核心功能

#### 1. 智能生成管线

- **要素解析**：从种子句提取六维故事要素（人物、时间、地点、起因、发展、结局）
- **大纲规划**：构建六层完整大纲（战略层、人物层、设定层、结构层、节奏层、风格层）
- **逐章生成**：流式生成每章正文，支持 token 级流式输出
- **标题生成**：根据全文自动生成吸引人的标题

#### 2. 对话式创作

- 左侧对话流 + 右侧状态看板布局
- 实时显示生成进度、章节列表、字数统计
- 支持中断后继续生成

#### 3. 多格式导出

- Markdown / TXT / PDF / EPUB
- 逐章 ZIP 打包
- 大纲导出（Markdown / XMind）

#### 4. 断点续写

- 生成中断自动保存进度
- 支持从失败/取消点继续生成
- 精确定位断点章节

---

## 🔧 开发命令

```bash
# V3 后端
cd novel-build-system/v3/backend
bash run.sh                        # 自动创建 .venv + 安装依赖 + 复制 .env

# V3 前端
cd novel-build-system/v3/frontend
npm install
npm run dev                        # http://localhost:5173

# 构建前端
cd novel-build-system/v3/frontend
npm run build

# 运行测试
cd novel-build-system/v3/backend
.venv/bin/pytest tests/ -v
```

---

## 📊 API 路由

### 生成相关

| 端点 | 方法 | 说明 |
|------|------|------|
| `/api/v3/generate` | POST | SSE 流式生成小说 |
| `/api/v3/generate/continue` | POST | 从失败/取消点继续 |
| `/api/v3/generate/openings` | POST | 多版本开头对比 |
| `/api/v3/chat/generate` | POST | AI 对话式生成 |

### 记录管理

| 端点 | 方法 | 说明 |
|------|------|------|
| `/api/v3/records` | GET | 生成记录列表 |
| `/api/v3/records/{id}` | GET | 记录详情 |
| `/api/v3/records/{id}/status` | GET | 轻量状态轮询 |
| `/api/v3/records/{id}/cancel` | POST | 取消生成 |
| `/api/v3/records/{id}/reset` | POST | 重置为失败 |
| `/api/v3/records/{id}` | DELETE | 删除记录 |

### 小说管理

| 端点 | 方法 | 说明 |
|------|------|------|
| `/api/v3/novels` | GET | 小说列表 |
| `/api/v3/novels/{id}` | GET | 小说详情 |
| `/api/v3/novels/{id}` | DELETE | 删除小说 |
| `/api/v3/novels/{id}/bible` | PATCH | 更新设定档案 |
| `/api/v3/novels/{id}/emotion-curve` | PATCH | 更新情感曲线 |

### 导出功能

| 端点 | 方法 | 说明 |
|------|------|------|
| `/api/v3/novels/{id}/export` | GET | 全文导出 |
| `/api/v3/novels/{id}/export/chapters` | GET | 逐章 ZIP |
| `/api/v3/novels/{id}/export/outline` | GET | 大纲导出 |

### 辅助功能

| 端点 | 方法 | 说明 |
|------|------|------|
| `/api/v3/dialogue/generate` | POST | 角色对话生成 |
| `/api/v3/assist/continue` | POST | AI 续写 |
| `/api/v3/assist/rewrite` | POST | AI 改写 |
| `/api/v3/theme/suggest` | POST | AI 推荐主题 |
| `/api/v3/illustrations/generate` | POST | AI 配图 |
| `/api/v3/tts/generate` | POST | TTS 语音合成 |
| `/api/v3/analysis/{id}` | POST | 统计分析 |
| `/api/v3/quotes/{id}` | GET | 金句提取 |
| `/api/v3/refine` | POST | 段落润色 |

---

## 📝 版本历史

### v3.1.1 (2026-08-29)

**代码质量优化:**
- 前端代码去重 — LABEL_MAP/flattenDict/addItemRows 提取到共享模块
- STEP_CONFIG 提取到 zustand store（StepProgress 与 store 共享）
- DEMO_GENRES/DEMO_STYLES 提取到共享常量
- 后端 extract_chapters 去重（消除精确重复）
- 后端死代码清理 — 移除未使用的模型、常量、函数
- generate.py 验证错误改用 HTTPException
- 清理调试 console.log 语句

**安全/性能增强:**
- CORS 限制为 localhost（移除通配符）
- API Key 在 GET 响应中脱敏显示
- 请求体大小限制 10MB
- DB 性能索引（4 个关键查询路径）
- 全局异常处理器（统一 JSON 错误格式）
- chat.py 独立 SessionLocal 防止 SSE 请求中 session 关闭

**Bug 修复:**
- LENGTH_RANGES 中 medium 和 long 范围相同
- .env.example 引用 v2 数据库名
- tts.py 返回类型标注错误
- index.html 引用 main.jsx
- package.json 版本号无效
- novel.py 删除小说时缺少级联删除
- novel.py 长篇小说搜索 N+1 查询优化
- chat.py session 在 SSE generator 中失效

### v3.1.0 (2026-07-15)

**新增功能:**
- TTS 语音合成集成 — 支持 edge-tts 多声优
- AI 配图功能 — 生成/展示/删除封面配图
- 统计分析 — 词频/角色出现/情感曲线 SVG
- 段落润色 — 重写/扩写/精简功能
- 段落版本历史 — 获取段落修改历史

**优化改进:**
- 生成记录管理增强 — 支持分页/轮询/继续/取消
- 前端 UI 优化 — 多版本开头对比、对话插入确认
- 后端性能优化 — SSE 事件流优化、超时保护增强

### v3.0.0 (2026-07-08)

**核心功能:**
- 频道/题材/风格多选配置 — 男频 19 类 + 女频 18 类 + 15 种风格
- 叙事技巧 — 视角控制、节奏调节、悬念/反转开关
- 金句管理 — 自动提取、收藏、复制
- 美学风格 — 关闭/轻度/中度/重度
- 文末解读 — 意义提炼与主题升华
- 设定档案 — 跨章节人物/地点一致性
- 多版本开头 — 好结局/坏结局/开放式 + 多版本对比

### v1.5.0 (2026-07-27)

**全面优化:**
- 前端 UI/UX — 懒加载、动画过渡、响应式设计
- 后端安全/性能 — CORS 限制、API Key 脱敏、DB 索引
- 代码质量 — 重构生成器、提取辅助函数
- Bug 修复 — React key 重复、路由守卫

### v1.0.0 (2026-07-08)

**初始版本:**
- 基础生成功能 — 种子句 → 完整小说
- 四智能体管线 — Parser/Outliner/Writer/Titler
- SSE 流式输出 — 实时显示生成进度
- 多格式导出 — Markdown/TXT/PDF

---

## 🤝 贡献指南

1. Fork 项目
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 创建 Pull Request

---

## 📄 许可证

本项目采用 MIT 许可证 — 详见 [LICENSE](LICENSE) 文件

---

## 📞 联系方式

- GitHub: [@snow-sakura](https://github.com/snow-sakura)
- Issues: [GitHub Issues](https://github.com/snow-sakura/novel-generator/issues)

---

<p align="center">Made with ❤️ by AI + Human</p>
