# 🍅 番茄小说生成器 — AI 驱动的智能小说创作系统

**中文** | [English](README.en.md)

> **一句话输入，AI 自动生成完整小说** —— 全流程开箱即用，在线 Demo 免安装直接体验
>
> 更新日期：2026-10-18 ｜ 最新版本：v3.1.1（灵魂版）

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Python 3.10+](https://img.shields.io/badge/Python-3.10+-blue.svg)](https://www.python.org/)
[![React 18](https://img.shields.io/badge/React-18-61DAFB.svg)](https://reactjs.org/)
[![Demo](https://img.shields.io/badge/🚀_在线_Demo-GitHub_Pages-brightgreen)](https://snow-sakura.github.io/novel-generator/)
[![Deployed with GitHub Pages](https://github.com/snow-sakura/novel-generator/actions/workflows/deploy-pages.yml/badge.svg)](https://github.com/snow-sakura/novel-generator/actions/workflows/deploy-pages.yml)
[![Security Scan](https://github.com/snow-sakura/novel-generator/actions/workflows/security-scan.yml/badge.svg)](https://github.com/snow-sakura/novel-generator/actions/workflows/security-scan.yml)
[![E2E V3](https://github.com/snow-sakura/novel-generator/actions/workflows/e2e.yml/badge.svg)](https://github.com/snow-sakura/novel-generator/actions/workflows/e2e.yml)
[![E2E V1](https://github.com/snow-sakura/novel-generator/actions/workflows/e2e-v1.yml/badge.svg)](https://github.com/snow-sakura/novel-generator/actions/workflows/e2e-v1.yml)

---

## 🚀 在线 Demo — 免安装，点链接直接用

> **👉 [https://snow-sakura.github.io/novel-generator/](https://snow-sakura.github.io/novel-generator/)**

本 Demo 是**完全基于 GitHub 实现的在线示例**，零后端、零部署成本：

| 能力 | 实现方式 |
|------|----------|
| 站点托管 | GitHub Pages（`snow-sakura.github.io` 域名） |
| 自动部署 | GitHub Actions（[`deploy-pages.yml`](.github/workflows/deploy-pages.yml)，push `demo/**` 自动发布） |
| Demo 源码 | 本仓库 [`demo/`](demo/) 目录（纯 HTML/CSS/JS，无构建） |
| 数据记录 | 浏览器 **localStorage**（生成记录、模型配置全部本地保存，刷新不丢失，绝不上传） |
| 生成引擎 | 前端模拟 V3 四智能体流水线（ParserAgent → OutlinerAgent → WriterAgent → TitlerAgent 流式输出） |

> ⚠️ Demo 为**模拟生成**（本地文本引擎），用于完整演示产品交互全流程；真实生成请使用下方本地部署方式接入 LLM。

---

## 📖 全流程指南（每步含界面截图）

以下截图均由自动化工具（Playwright）打开 Demo 自动截取。

### 第 1 步 · 进入创作工坊
**主标题：打开即用，无需注册** — 副标题：侧边栏五大功能一屏直达

打开 Demo 链接即进入「创作工坊」。左侧配置创作参数，右侧实时显示生成进度；侧边栏提供 **创作工坊 / 对话创作 / 我的作品 / 提示词模板 / 模型配置** 五个入口，左下角实时显示本地存储的记录数与字数。

![创作工坊初始界面](docs/images/demo-01-create.png)

### 第 2 步 · 输入种子句，配置创作参数
**主标题：一句话就是全部输入** — 副标题：频道 / 题材 / 风格 / 章节数 / 叙事开关

在「种子句」输入框写下一句话故事起点（可点击示例种子快速填入），随后选择：

- **频道**：男频 / 女频
- **题材**（多选）：玄幻、都市、科幻、悬疑、历史、武侠、仙侠、系统、穿越、无限流
- **风格**：热血燃系 / 轻松搞笑 / 冷硬暗黑 / 细腻治愈 / 爽文快节奏 / 文青慢热
- **章节数**：3 / 5 / 8 章；**美学风格**：关闭 / 轻度 / 中度 / 重度
- **叙事开关**：悬念设置、情节反转、多版本结局

![配置创作参数](docs/images/demo-02-config.png)

### 第 3 步 · 四智能体流式生成
**主标题：像看流水线一样看 AI 写书** — 副标题：要素解析 → 大纲规划 → 逐章生成 → 标题生成

点击「🚀 开始生成」后，右侧面板实时展示四智能体接力：

1. **ParserAgent（故事要素分析师）**：从种子句提取 人物/时间/地点/起因/发展/结局 六维要素；
2. **OutlinerAgent（大纲架构师）**：构建战略/人物/设定/结构/节奏/风格 六层大纲并排出章节表；
3. **WriterAgent（章节作家）**：逐章流式生成正文，token 级滚动输出 + 进度条；
4. **TitlerAgent（标题专家）**：基于全文生成候选书名并定稿。

![四智能体流式生成中](docs/images/demo-03-generating.png)

### 第 4 步 · 生成完成，自动落库
**主标题：生成即存档** — 副标题：记录自动写入 localStorage，弹出完成卡片

生成结束后系统弹出完成卡片（书名 / 章节数 / 字数），并把**整条生成记录**（种子句、参数、逐章全文、字数、时间戳）写入浏览器 localStorage——这就是 Demo 的数据存储层，对应真实项目里的 SQLite `generation_records / novels / chapter_contents` 三张表。

![生成完成](docs/images/demo-04-done.png)

### 第 5 步 · 对话式创作
**主标题：像聊天一样引导 AI** — 副标题：左侧对话流 + 右侧创作状态看板

不想填表单？进入「对话创作」，用自然语言告诉助手想法（例如"主角是外卖员，赛博朋克风格"），助手逐轮拆解要素、排布大纲，右侧**状态看板**实时同步配置结果，确认后一键跳转创作工坊开始生成。

![对话式创作](docs/images/demo-07-chat.png)

### 第 6 步 · 我的作品：数据记录一目了然
**主标题：所有作品都在本地** — 副标题：localStorage 数据记录，支持导出与清空

「我的作品」页展示全部生成记录卡片（书名、种子句、题材标签、章节数、字数、时间），支持**阅读 / 导出 / 删除**，顶部工具栏可**一键导出全部记录为 JSON**（完整数据记录快照）或清空记录。

![我的作品（数据记录）](docs/images/demo-06-history.png)

### 第 7 步 · 阅读与多格式导出
**主标题：写完就能读、能带走** — 副标题：TXT / Markdown / 复制全文

作品详情页按章节排版全文，提供 **导出 TXT、导出 Markdown、复制全文** 三种取回方式；真实项目还支持 PDF / EPUB / 逐章 ZIP / 大纲（Markdown / XMind）导出。

![作品详情与多格式导出](docs/images/demo-05-detail.png)

### 第 8 步 · 提示词模板库
**主标题：不知道写什么？先抄作业** — 副标题：分类种子句模板一键填入

「提示词模板」页收录各频道各题材的精选种子句（都市×系统、玄幻×废柴流、科幻×无限流……），点击「使用此模板」自动回填到创作工坊。

![提示词模板](docs/images/demo-08-prompts.png)

### 第 9 步 · 模型配置（含数据安全说明）
**主标题：密钥永远不出本机** — 副标题：Demo 仅存 localStorage，真实版只放后端 .env

「模型配置」页演示 OpenCode Zen / OpenAI 兼容 / DeepSeek / 通义千问 / AGNES 等提供商的配置方式：

- **Demo**：纯静态站点，不发送任何网络请求，API Key 只写入浏览器 localStorage 且展示即脱敏（`sk-••••末3位`）；
- **真实项目**：密钥仅存放在后端 `backend/.env`（已被 `.gitignore` 排除，**永远不会提交到 GitHub**），`.env.example` 只提供占位符模板。

![模型配置](docs/images/demo-09-settings.png)

---

## 🏗️ 系统架构（真实全栈版）

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
│  LLM Provider Factory (OpenAI / DeepSeek / Qwen / MiMo /    │
│                        AGNES / OpenCode Zen)                 │
└───────────────────────┬─────────────────────────────────────┘
                        │
┌───────────────────────┴─────────────────────────────────────┐
│                    数据层 (SQLite + 文件系统)                  │
├─────────────────────────────────────────────────────────────┤
│  generation_records  │  novels  │  chapter_contents          │
│  paragraph_versions  │  model_configs                        │
└─────────────────────────────────────────────────────────────┘
```

在线 Demo 用「前端模拟引擎 + localStorage」等效替代了上图的后端与数据层，交互流程完全一致。

---

## 🗂️ 项目矩阵

| 项目 | 定位 | 技术栈 | 状态 |
|------|------|--------|------|
| [`novel-build-system/v1`](novel-build-system/v1) | **骨架版**（最精简的 AI 内容生成实现） | FastAPI + LangChain/CrewAI + React(JS) | ✅ 维护中（v1.6.0，含 AGNES 模型） |
| [`novel-build-system/v2`](novel-build-system/v2) | 血肉版（润色/段落版本） | 同 v1 | 🧊 冻结（能力并入 v3） |
| [`novel-build-system/v3`](novel-build-system/v3) | **灵魂版（推荐）**，F1-F13 全功能 | FastAPI + React(TS) + Zustand | ✅ 主力版本（v3.1.1） |
| [`demo/`](demo/) | **GitHub Pages 在线 Demo** | 纯静态 HTML/CSS/JS | 🚀 已上线 |
| [`novel-build-test`](novel-build-test) | AISQA — AI 驱动智能测试平台（独立项目） | FastAPI + MySQL/Redis/Qdrant + React 19 | 🚧 v1.3.0 开发中 |

---

## ⚡ 本地运行（真实全栈版）

### 环境要求

Python ≥ 3.10、Node ≥ 18、一个 LLM API Key（推荐 OpenCode Zen 免费模型）。

### V3 灵魂版（推荐）

```bash
# 方式 A：Docker 一键（V1+V3 全栈，无需本机装 Python/Node）
cd novel-build-system && docker compose up -d --build
# V3 → http://localhost:3003 ｜ V1 → http://localhost:3001

# 方式 B：手动
# 1. 后端（自动创建 venv + 安装依赖 + 复制 .env）
cd novel-build-system/v3/backend
bash run.sh                          # http://localhost:8000

# 2. 前端
cd novel-build-system/v3/frontend
npm install && npm run dev           # http://localhost:5173

# 3. 配置密钥：编辑 backend/.env（该文件已被 .gitignore 排除，不会上传）
```

### V1 骨架版（最小实现）

```bash
cd novel-build-system/v1/backend  && bash run.sh   # 默认代理到 :8001
cd novel-build-system/v1/frontend && npm install && npm run dev
```

### 测试

```bash
# V3 前端 E2E（Playwright）
cd novel-build-system/v3/frontend && npx playwright test
# V1 E2E 冒烟
cd novel-build-system/v1 && python -m pytest tests/ -v
# AISQA 单元测试
cd novel-build-test/backend && pytest
```

---

## 🛠️ 技术栈

| 层 | 技术 |
|----|------|
| 前端 | React 18 · TypeScript 5 · Vite 6 · TailwindCSS · Zustand · React Router · Lucide |
| 后端 | Python 3.10+ · FastAPI · LangChain · CrewAI · SQLAlchemy 2.0 · Pydantic 2 |
| 数据 | SQLite（真实版） / localStorage（Demo） |
| LLM | OpenCode Zen（MiMo V2.5 / DeepSeek V4 Flash / 混元 3 / Nemotron 3，免费） · DeepSeek · 通义千问 · OpenAI 兼容 · AGNES |
| 工程 | GitHub Actions（Pages 部署 / CI） · Playwright E2E · pytest |

---

## 🔐 数据安全与隐私

- **密钥零入库**：`backend/.env`、`*.db`、备份目录均被 [.gitignore](.gitignore) 排除；仓库仅保留 `.env.example` 占位模板；
- **响应脱敏**：后端 API 返回模型配置时 Key 自动打码；CORS 限制 localhost；请求体限制 10MB；
- **Demo 零上传**：在线 Demo 无任何网络请求，作品与配置只存在访问者浏览器 localStorage；
- **生成内容不入库**：AI 生成的小说正文（txt/xmind/大纲）已从仓库清理并加入忽略规则，避免误传创作数据。

详见 [docs/SECURITY.md](docs/SECURITY.md)。

---

## 📚 文档导航

| 文档 | 内容 |
|------|------|
| [docs/README.md](docs/README.md) | 文档总索引 |
| [docs/PRD.md](docs/PRD.md) | 需求文档（产品定位 / 用户故事 / 功能需求 F1-F13） |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | 技术架构文档（四智能体管线 / API / 数据模型） |
| [docs/USER-GUIDE.md](docs/USER-GUIDE.md) | 操作说明（端到端使用手册） |
| [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) | 部署与运维（本地 / Docker / GitHub Pages） |
| [docs/SECURITY.md](docs/SECURITY.md) | 数据安全与隐私配置 |
| [docs/DEMO.md](docs/DEMO.md) | 在线 Demo 说明（实现原理 / 数据记录机制） |
| [CHANGELOG.md](CHANGELOG.md) | 更新日志（v1.0.0 → 2026.10.18 全量里程碑） |
| [README.en.md](README.en.md) | English version |
| [novel-build-system/docs/prd/](novel-build-system/docs/prd/) | 各版本 PRD 与 API 规格（v1/v2/v3细分文档在 docs/spec/） |
| [novel-build-test/docs/](novel-build-test/docs/) | AISQA 项目文档 |

各项目内还有 `README.md`（项目级）、`AGENT.md / AGENTS.md / CLAUDE.md`（AI 协作上下文）、`TODO.md`（路线图）。

---

## 📝 版本历史（节选）

| 版本 | 日期 | 要点 |
|------|------|------|
| **Demo v1.0** | 2026-10-18 | GitHub Pages 在线 Demo 上线；数据记录迁至 localStorage；文档全量更新；清理仓库生成内容 |
| v1.6.0 | 2026-10-16 | V1 新增 AGNES 模型 Provider、模型配置持久化、错误处理优化 |
| v3.1.1 | 2026-08-29 | 代码去重、CORS/Key 脱敏、N+1 修复、8 项 Bug 修复 |
| v3.1.0 | 2026-07-15 | TTS 语音、AI 配图、统计分析、段落润色 |
| v3.0.0 | 2026-07-08 | 灵魂版：F1-F9 创作增强全量落地 |
| v1.0.0 | 2026-07-08 | 初始版本：四智能体管线 + SSE 流式生成 |

---

## 🤝 贡献指南

1. Fork 本仓库并创建特性分支（`git checkout -b feature/AmazingFeature`）
2. 提交符合 Conventional Commits 规范的变更
3. 本地跑通对应测试（pytest / playwright）后发起 Pull Request

## 📄 许可证 & 联系

MIT License ｜ GitHub: [@snow-sakura](https://github.com/snow-sakura) ｜ Issues: [github.com/snow-sakura/novel-generator/issues](https://github.com/snow-sakura/novel-generator/issues)

<p align="center">Made with ❤️ by AI + Human · Demo powered by GitHub Pages</p>
