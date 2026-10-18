# 番茄小说生成智能体 V3 — 灵魂版

> **一句话输入，AI 自动生成完整小说**

> 🎯 **在线 Demo：** https://snow-sakura.github.io/novel-generator/
>
> Demo 模式无需后端，可在浏览器中直接体验完整生成流程。

## 界面预览

> 以下截图由 Playwright 自动截取 **[在线 Demo](https://snow-sakura.github.io/novel-generator/)**（V3 交互流程 1:1 复刻）。

### 创作页面

![创作页面](../../docs/images/demo-02-config.png)

### 对话式创作

![对话式创作](../../docs/images/demo-07-chat.png)

### 历史记录

![历史记录](../../docs/images/demo-06-history.png)

### 模板库

![模板库](../../docs/images/demo-08-prompts.png)

## 快速启动

### 后端

```bash
cd backend
bash run.sh                        # 自动创建 .venv + 安装依赖 + 复制 .env
```

### 前端

```bash
cd frontend
npm install
npm run dev                        # http://localhost:5173
```

## 技术栈

- 前端：Vite + React + TailwindCSS + Zustand
- 后端：Python FastAPI + LangChain + CrewAI + SQLite
- 模型：支持 OpenAI / Anthropic / Ollama / OpenCode Zen / MiMo V2.5 切换

## V3 新增功能（F1-F13）

| 编号 | 功能 | 说明 |
|------|------|------|
| F1 | 频道/题材/风格多选配置 | 男频19类 + 女频18类 + 15种风格 |
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

## 模型配置

后端支持多模型切换，在 `backend/.env` 中配置：

```env
LLM_PROVIDER=opencode  # 可选：openai / anthropic / ollama / opencode

# OpenCode Zen（默认）
OPENCODE_API_KEY=sk-xxx
OPENCODE_BASE_URL=https://opencode.ai/zen/v1
OPENCODE_MODEL=deepseek-v4-flash-free
```

可用免费模型（OpenCode Zen）：
- `deepseek-v4-flash-free` — DeepSeek V4 Flash
- `mimo-v2.5-free` — MiMo V2.5（小米，限免）
- `hy3-free` — 混元 3
- `nemotron-3-ultra-free` — Nemotron 3 Ultra

国产模型（需 API Key）：DeepSeek / Qwen / GLM / Kimi / 豆包 / 文心 / MiniMax / 百川 / 混元 / 零一万物 / 硅基流动

## 测试与文档导航

```bash
# E2E 92 用例（Playwright）——离线运行：tests/mock-server.mjs 托管 dist + /api/v3 mock，无需后端/密钥
cd frontend && npm run build && npx playwright test
# CI 自动执行：.github/workflows/e2e.yml（push/PR 触发，失败上传 report 制品）

# backend API 冒烟（TestClient + 临时 SQLite，零密钥）：9 passed；CI: .github/workflows/api-tests.yml
cd backend && python -m pytest tests/ -q
```

| 文档 | 说明 |
|------|------|
| [../../README.md](../../README.md) | 大项目总览 + 9 步全流程图文指南 |
| [../../docs/USER-GUIDE.md](../../docs/USER-GUIDE.md) | 端到端操作说明 |
| [../../docs/ARCHITECTURE.md](../../docs/ARCHITECTURE.md) | 架构 / API / 数据模型 |
| [../../docs/SECURITY.md](../../docs/SECURITY.md) | 密钥与隐私配置 |
| [../docs/prd/PRD-v3.md](../docs/prd/PRD-v3.md) · [API-v3](../docs/spec/API-v3.md) · [DB-v3](../docs/spec/DB-v3.md) · [DESIGN-v3](../docs/spec/DESIGN-v3.md) | V3 细分规格 |

## 版本历史

### v3.1.2-docs (2026-10-18)

- 在线 Demo 上线（GitHub Pages，本版本交互 1:1 复刻），README 截图全部替换为自动化实拍
- 顶层文档体系落地：需求 / 架构 / 操作说明 / 部署 / 安全 / Demo
- 仓库清理：AI 生成内容（docs/novel）、旧截图、临时报告移出版本库并加固 .gitignore

### v3.1.1 (2026-08-29)

**代码质量优化:**
- 前端代码去重 — LABEL_MAP/flattenDict/addItemRows 提取到 `lib/constants.ts` 共享模块（4个组件复用）
- STEP_CONFIG 提取到 zustand store（StepProgress 与 store 共享）
- DEMO_GENRES/DEMO_STYLES 提取到共享常量（NovelForm + ChatOptionSelector 复用）
- 后端 extract_chapters 去重 — quotes.py 改为从 chapter_utils 导入（消除精确重复）
- 后端死代码清理 — 移除未使用的 GenerationLog 模型、DEFAULT_PROMPTS 常量、_strip_leading_title 函数
- generate.py 验证错误改用 HTTPException（统一错误格式）
- 新增 `_sse_error_stream` 辅助函数（消除 SSE 错误流重复代码）
- 清理 api.ts 中的调试 console.log 语句

**安全/性能增强:**
- CORS 限制为 localhost:5173/5174（移除通配符）
- API Key 在 GET 响应中脱敏显示
- 请求体大小限制 10MB（RequestSizeLimitMiddleware）
- DB 性能索引（4个关键查询路径）
- 全局异常处理器（统一 JSON 错误格式）
- v3 模型配置 PUT 请求保留已脱敏的 API Key
- chat.py 独立 SessionLocal 防止 SSE 请求中 session 关闭

**Bug 修复:**
- LENGTH_RANGES 中 medium 和 long 范围相同（medium: 1500-3000, long: 3000-8000）
- .env.example 引用 v2 数据库名（改为 v3）
- tts.py 返回类型标注错误（str → tuple[str, str]）
- index.html 引用 main.jsx（改为 main.tsx）
- package.json 版本号无效（Vite 8.1.4 → ^6.0.0）
- novel.py 删除小说时缺少级联删除（ParagraphVersion + ChapterContent + GenerationRecord）
- novel.py 长篇小说搜索 N+1 查询优化（IN 查询替代循环）
- chat.py session 在 SSE generator 中失效（独立 SessionLocal）

### v3.1.0 (2026-07-15)

**新增功能:**
- TTS语音合成集成 — 支持edge-tts多声优
- AI配图功能 — 生成/展示/删除封面配图
- 统计分析 — 词频/角色出现/情感曲线SVG
- 段落润色 — 重写/扩写/精简功能
- 段落版本历史 — 获取段落修改历史

**优化改进:**
- 生成记录管理增强 — 支持分页/轮询/继续/取消
- 前端UI优化 — 多版本开头对比、对话插入确认
- 后端性能优化 — SSE事件流优化、超时保护增强

### v3.0.0 (2026-07-08)

**核心功能:**
- 频道/题材/风格多选配置 — 男频19类 + 女频18类 + 15种风格
- 叙事技巧 — 视角控制、节奏调节、悬念/反转开关
- 金句管理 — 自动提取、收藏、复制
- 美学风格 — 关闭/轻度/中度/重度
- 文末解读 — 意义提炼与主题升华
- 设定档案 — 跨章节人物/地点一致性
- 多版本开头 — 好结局/坏结局/开放式 + 多版本对比

## 许可证

MIT
