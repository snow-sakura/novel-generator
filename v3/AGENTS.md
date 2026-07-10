# AGENTS.md — 番茄小说生成智能体 V3

> **版本标识**: V3 灵魂版，API 前缀 `/api/v3`，数据库 `novel_generator_v3.db`
> V3（灵魂版）在 V1（骨架版）基础上升级完整 F1-F13 创作辅助功能。
> 覆盖：频道题材风格配置、叙事技巧、金句、美学、解读、设定档案、不同结局、对话插入、
> 主题推荐、生成记录管理、AI 配图、TTS 语音合成、统计分析。
> 查看完整规格文档：`docs/spec/API-v3.md`、`docs/spec/DB-v3.md`、`docs/spec/DESIGN-v3.md`

## 核心流程

```
种子句 → 选择(频道/题材/风格[多选]/字数) → 后端 CrewAI 四智能体管线
(要素解析 Agent → 大纲规划 Agent → 逐章生成 Agent → 标题生成 Agent)
→ SSE 流式推送前端 → 自动存储到 docs/novel/{title}/ + DB
```

## 多智能体架构 (CrewAI)

四角色智能体团队，顺序执行小说创作：

1. **故事要素分析师 (ParserAgent)** — 从种子句中提取六维故事要素
2. **小说大纲架构师 (OutlinerAgent)** — 构建六层完整大纲 (战略/人物/设定/结构/节奏/风格)
3. **小说章节作家 (WriterAgent)** — 逐章流式生成正文（通过 LangChain Tool 实现 token 级流式输出）
4. **小说标题专家 (TitlerAgent)** — 根据全文生成吸引人的标题

所有 Agent 定义于 `backend/app/services/agents.py`，使用 `crewai.Agent`。

## AI 对话创作 (`/chat`)

左侧对话流 + 右侧状态看板布局：
- `ChatPage.jsx` — 对话主页面
- `ChatMessage.jsx` — 消息气泡（用户/助手）
- `ChatInput.jsx` — 输入框（Enter 发送，Shift+Enter 换行）
- `NovelStatusPanel.jsx` — 右侧看板（大纲/章节进度/字数/步骤）
- `backend/app/routers/chat.py` — SSE 流式接口
- `backend/app/services/chat_service.py` — 对话式生成包装器

## 开发命令

```bash
# 后端 (run.sh 自动激活 .venv + 安装依赖 + 复制 .env)
cd backend && bash run.sh

# 前端
cd frontend && npm run dev     # http://localhost:5173, /api → proxy localhost:8000

# 构建
cd frontend && npm run build

# 运行测试
# cd v3/backend && .venv/bin/pytest tests/ -v
#
# 无 lint/typecheck 脚本；无 pre-commit hook
```

## 架构关键

- **前端**: Vite + React 18 + TailwindCSS 3 + Zustand + React Router；无 TypeScript
- **后端**: FastAPI + LangChain + CrewAI + SQLAlchemy 2.0 + SQLite
- **多 Provider 工厂**: `backend/app/llm/provider.py` — 统一 `generate_stream` / `validate` 接口
- **生成管线**: `backend/app/services/generator.py` — CrewAI 编配 + 流式逐章生成
- **CrewAI 智能体**: `backend/app/services/agents.py` — 四角色 Agent 定义（仅角色/目标/背景，不含 llm 参数）
- **数据硬编码**: `backend/app/data.py` — 男频19类/女频18类/15种风格 + 国产模型列表
- **大纲六层结构**: 战略层 → 人物层 → 设定层 → 结构层 → 节奏层 → 风格层
- **风格多选**: 前端 `selectedStyles[]` 以 `+` 拼接后提交

## LLM 超时保护

LLM Provider 调用可能因 API 不可达而挂死。GeneratorService 有三层保护：

1. **启动预检** — `generate()` 入口调用 `self.llm.validate()`，API key 缺失则立即 error 返回
2. **`_call_llm(timeout=120)`** — 收集式调用（parse/outline/title）设 120s 总超时，超时返回空字符串（走 fallback）
3. **`_timeout_iterate(agen, timeout=120)`** — 流式逐章写作时每块间 120s 超时，防止卡在单次 chunk

## SSE 事件流

`event: xxx\ndata: {...}\n\n` 格式。

事件类型：`parse`, `parse_done`, `outline`, `outline_thinking`, `outline_done`, `emotion_curve`, `chapter_start`, `content`, `chapter_end`, `title`, `interpretation`, `log`, `complete`, `error`, `record_id`, `continue_from`, `opening_version`, `openings_done`, `dialogue_content`

- `log` data 格式包含 `step` 字段（parsing/outlining/writing/titling）
- `outline_done` data: `{chapters: [...], outline: {...}}`
- `complete` 触发前端 `CompleteDialog`（确认→跳转详情页 / 取消→停留）
- 章节弹窗仅在用户手动点击 TOC 时打开

## 前端关键约定

- **MultiStepLog**: 生成期间始终显示，每步骤一个可折叠卡片，日志按 `step` 字段自动归入对应面板
- **OutlineModal / ChaptersModal**: 详情页和生成页共用的大纲/章节弹窗
  - `OutlineModal` — 6 层 tab 切换，每层使用 `outline-card-grid` CSS 网格 + 彩色边框卡片
  - `ChaptersModal` — 章节 tab 导航，单章卡片展示，轮换 5 色左竖条区分
  - NovelPage 通过 `outlineLayerList`（`[{type, data}]`）将 `novel.outline` 字典转换后传入
  - CreatePage/MultiStepLog 从 zustand store 的 `outlineThinking` 直接传入
- **停止生成**: 红色「停止生成」按钮 → 先调用 `POST /records/{id}/cancel` 标记 DB 记录 → 再 `abortController.abort()`
- **章节目录 (TOC)**: 仅在逐章生成阶段（`currentStep >= WRITING`）及之后显示
- **生成中可切历史 tab**: HistoryPage 每 3s 轮询 `GET /records/{id}/status`，`in_progress` 记录高亮 + 进度条，点击回到 CreatePage 恢复
- **NovelForm**: 题材/风格面板互斥折叠；风格多选切换 + 芯片展示；字数配置：章节数→每章范围→自动计算目标字数
- **高级设置**: 仅保留 ModelConfig + PromptDisplay

## 后端关键约定

- `migrate_database()` 在启动时自动检测并 ALTER TABLE 新增列
- 文件导出统一 `filename*=UTF-8''` 支持中文文件名
- 小说文件存储: `docs/novel/{title}/`（逐章 TXT + 全文 TXT + 大纲 Markdown + 大纲 XMind）
- `.env` 从 `.env.example` 复制（`run.sh` 自动处理）
- CrewAI Agent 不含 `llm` 参数（避免 Pydantic 验证错误），仅用作角色/目标/背景的结构化容器；实际 LLM 调用走项目自身 `LLMProvider`
- CrewAI Agent 初始化需要 `OPENAI_API_KEY` 环境变量（即使不使用 OpenAI），`main.py` 启动时设置占位值 `sk-crewai-placeholder`

## 模型配置

默认使用 MiMo-V3.5 (小米) 通过 OpenCode Zen 接口访问：

```env
# backend/.env
LLM_PROVIDER=opencode
OPENCODE_API_KEY=sk-xxx
OPENCODE_BASE_URL=https://opencode.ai/zen/v1
OPENCODE_MODEL=mimo-v2.5-free
```

可用免费模型：`mimo-v2.5-free`, `deepseek-v4-flash-free`, `hy3-free`, `nemotron-3-ultra-free`

国产模型列表见 `backend/app/data.py` 的 `CHINESE_MODELS`，支持 DeepSeek / Qwen / GLM / Kimi / 豆包 / 文心 / MiniMax / 百川 / 混元 / 零一万物 / 硅基流动。

前端模型配置持久化到 `model_configs` 表，可通过设置页面切换。

## 题材隔离防护

生成管线内置三层防护，防止跨题材污染：

1. **大纲 L5 Prompt 隔离** — `SYSTEM_PROMPT_L5_CHAPTERS` 包含 `【⚠️ 类型一致性要求】`，强制所有章节符合指定题材世界观
2. **章节 Prompt 隔离** — `SYSTEM_PROMPT_CHAPTER` 包含 `【⚠️ 类型隔离规则】`，禁止混入其他题材元素
3. **每章上下文注入** — `generator.py` 每章生成时注入 `【题材约束】` 提醒，不仅限前3章

## 数据清理

- `POST /api/v3/cleanup` — 一键清理孤立的 in_progress 记录、"生成中..."小说、无主完成记录
- `POST /api/v3/records/{id}/reset` — 将卡住的 in_progress 记录重置为 failed
- 前端 HistoryPage 提供「清理无效数据」按钮

## 生成记录状态

`in_progress` / `completed` / `failed` / `cancelled` — DB 字段 `GenerationRecord.status`

- **取消**: `POST /records/{id}/cancel` 标记为 `cancelled`，前端先调用此接口再 abort SSE
- **继续**: `?continue=true&record_id=X` 接受 `failed` 和 `cancelled` 两种状态，精确定位断点章节

## API 路由

| 端点 | 说明 |
|---|---|---|
| POST `/api/v3/generate` | SSE 流式生成（含情感曲线/解读/设定档案） |
| POST `/api/v3/generate/continue?record_id=X` | 从失败/取消点继续 |
| POST `/api/v3/generate/openings` | SSE 多版本开头对比（F7） |
| POST `/api/v3/chat/generate` | AI 对话式生成 SSE |
| GET `/api/v3/records` | 生成记录（分页） |
| GET `/api/v3/records/{id}` | 记录详情 |
| GET `/api/v3/records/{id}/status` | 轻量状态轮询（用于 HistoryPage polling） |
| POST `/api/v3/records/{id}/cancel` | 标记记录为 cancelled（停止生成前调用） |
| POST `/api/v3/records/{id}/reset` | 重置卡住的 in_progress 记录为 failed |
| DELETE `/api/v3/records/{id}` | 删除记录 |
| POST `/api/v3/cleanup` | 清理孤立数据（无主记录 + 无效小说） |
| GET `/api/v3/novels` | 分页小说列表 |
| GET `/api/v3/novels/{id}` | 小说详情（含主题/情感曲线/圣经/配图） |
| PATCH `/api/v3/novels/{id}/bible` | 更新设定档案（F6） |
| GET `/api/v3/novels/{id}/bible` | 获取设定档案 |
| PATCH `/api/v3/novels/{id}/emotion-curve` | 更新情感曲线（F13） |
| DELETE `/api/v3/novels/{id}` | 删除小说 |
| POST `/api/v3/paragraphs/insert` | 插入段落（F8 对话/金句） |
| GET `/api/v3/novels/{id}/export?format=md/txt/pdf` | 全文导出 |
| GET `/api/v3/novels/{id}/export/chapters` | 逐章 ZIP |
| GET `/api/v3/novels/{id}/export/outline?format=markdown/xmind` | 大纲导出 |
| GET `/api/v3/models/list` | 国产模型列表 |
| GET `/api/v3/genres/list?gender=` | 题材列表 |
| POST `/api/v3/dialogue/generate` | SSE 角色对话生成（F8） |
| POST `/api/v3/assist/continue` | SSE 续写 |
| POST `/api/v3/assist/rewrite` | SSE 智能改写 |
| POST `/api/v3/theme/suggest` | AI 推荐主题（F9） |
| POST `/api/v3/illustrations/generate` | AI 配图生成（F11） |
| GET `/api/v3/illustrations/{novel_id}` | 获取配图列表 |
| DELETE `/api/v3/illustrations/{novel_id}/{chapter_index}` | 删除配图 |
| GET `/api/v3/tts/voices` | 可用声优列表 |
| POST `/api/v3/tts/generate` | 生成单章音频 |
| POST `/api/v3/tts/generate_all` | 全本生成 |
| GET `/api/v3/tts/audio/{novel_id}/{chapter_index}` | 获取音频文件 |
| GET `/api/v3/tts/status/{novel_id}` | TTS 生成状态 |
| DELETE `/api/v3/tts/{novel_id}/{chapter_index}` | 删除音频 |
| POST `/api/v3/analysis/{novel_id}` | 统计分析（F13：词频/角色/情感曲线） |
| GET `/api/v3/quotes/{novel_id}` | 金句提取（F3） |
| POST `/api/v3/refine` | SSE 段落润色（重写/扩写/精简） |
| GET `/api/v3/refine/versions` | 获取段落版本历史 |
