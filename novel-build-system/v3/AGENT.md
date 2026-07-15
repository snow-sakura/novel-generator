# AGENT.md — AI 开发助手指南

此文档为 AI 编程助手（Claude Code / Cursor 等）提供项目上下文，帮助理解代码结构和开发规范。

## 项目本质

这是一个**番茄小说风格的 AI 小说生成器**，对标番茄小说平台的题材分类体系。V3（灵魂版）在 V1/V2 基础上新增完整 F1-F13 创作辅助功能，包括TTS语音合成、AI配图、统计分析、段落润色等。

```
用户输入种子句
  → 选择(频道/题材/风格[多选]/字数)
  → 后端 CrewAI 四智能体管线(要素解析→大纲→逐章→标题)
  → SSE 流式推送前端
  → 自动存储到 docs/novel/v3/ + DB
```

## 技术要点

### 后端
- **FastAPI + SSE**: `StreamingResponse(text/event-stream)`
- **CrewAI**: 四角色智能体（`agents.py`），仅用作角色/目标/背景容器，**不含 llm 参数**
- **CrewAI 初始化**: 需要 `OPENAI_API_KEY` 环境变量，`main.py` 启动时设置 `sk-crewai-placeholder`
- **Provider 工厂**: `app/llm/provider.py` 支持动态创建任意 OpenAI 兼容模型
- **默认模型**: DeepSeek V4 Flash (deepseek-v4-flash-free) 通过 OpenCode Zen 接口
- **生成管线**: `app/services/generator.py` CrewAI 集成 + 流式逐章生成
- **LLM 超时三层**: `_call_llm(timeout=120)` + `_timeout_iterate(agen, timeout=120)` + 启动 `validate()`
- **题材隔离**: prompts.py 含类型隔离规则，generator.py 每章注入题材约束
- **文件存储**: `docs/novel/v3/{title}/` — 逐章 TXT + 大纲 Markdown + 大纲 XMind + 全文 TXT
- **对话生成**: `app/services/chat_service.py` — 对话式生成包装器（包装 generator.py）
- **大纲五层**: prompts.py JSON schema: strategy/characters/world/plot_structure+rhythm+style_tone/chapters
- **XMind 多级树**: `xmind.py` 递归 `_value_to_topics()` + FIELD_LABELS 中文映射
- **数据清理**: `POST /cleanup` 清理孤立记录和无效小说
- **V3 新增**: 情感曲线(F2)、金句提取(F3)、美学风格(F4)、文末解读(F5)、设定档案(F6)、多版本开头(F7)、对话插入(F8)、主题推荐(F9)、AI配图(F11)、TTS语音(F12)、统计分析(F13)

### 前端
- **状态管理**: Zustand store (`novelStore.js` + `chatStore.js`)
- **日志展示**: `MultiStepLog.jsx` — 4 步骤分卡片展示实时日志，按 `step` 字段过滤
- **OutlineModal**: 6 层 tab 切换卡片弹窗，`outlineThinking`（`[{type, data}]`）驱动，使用 `outline-card-grid` CSS 网格布局 + 各层独立配色
- **ChaptersModal**: 章节 tab 导航弹窗，轮换 5 色左竖条区分章节卡片
- **停止生成**: 先 `POST /records/{id}/cancel` 标记 `cancelled`，再 `abortController.abort()`
- **TOC 条件**: 仅在 `currentStep >= WRITING` 时显示章节目录
- **生成中切 tab**: HistoryPage 每 3s 轮询 `GET /records/{id}/status`，支持回显
- **对话页面**: 左侧对话流 + 右侧状态看板（`ChatPage.jsx`）
- **Demo 模式**: 自动检测 `github.io`，切换 mock 数据流

### 关键路由

| 端点 | 说明 |
|------|------|
| POST `/api/v3/generate` | SSE 流式生成（含情感曲线/解读/设定档案） |
| POST `/api/v3/generate/continue?record_id=X` | 从失败/取消继续 |
| POST `/api/v3/generate/openings` | SSE 多版本开头对比（F7） |
| POST `/api/v3/chat/generate` | AI 对话式生成 SSE |
| GET `/api/v3/records` | 生成记录（分页） |
| GET `/api/v3/records/{id}` | 记录详情 |
| GET `/api/v3/records/{id}/status` | 轻量状态轮询 |
| POST `/api/v3/records/{id}/cancel` | 标记记录为 cancelled |
| POST `/api/v3/records/{id}/reset` | 重置卡住的 in_progress 为 failed |
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
| GET/PUT `/api/v3/model-config` | 模型配置持久化 |
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

### SSE 事件

`parse` / `parse_done` / `outline` / `outline_thinking` / `outline_done` / `emotion_curve` / `chapter_start` / `content` / `chapter_end` / `title` / `interpretation` / `log` / `complete` / `error` / `record_id` / `continue_from` / `opening_version` / `openings_done` / `dialogue_content`

- `log` data 含 `step`（parsing/outlining/writing/titling）用于前端分卡片
- `outline_done` data: `{chapters, outline}`
- `complete` 触发 CompleteDialog 而非自动跳转

### 数据便携机制

`novels_index.json`（项目根目录，git 跟踪）实现跨设备 DB 同步。

## 开发规范

1. **新增字段**: model → router → store → api → 组件同步修改
2. **SSE 事件**: generator yield → store event → CreatePage/ChatPage switch
3. **每章文本**: 使用 `appendChapterText`，不要手动拼接 `currentContent`
4. **新增智能体**: `agents.py` 添加 Agent → `generator.py` 引用 → `chat_service.py` 引用
5. **对话页面**: 确保 `chat_service.py` 包装 `generator.py` 的核心管线，事件透传
6. **停止生成**: 先 `POST /records/{id}/cancel`，再 `abortController.abort()`（保证 DB 记录被标记）
7. **CrewAI Agent**: 永远不加 `llm` 参数，否则 Pydantic 报 `Unknown or missing llm_type`；仅作角色/目标/背景容器
8. **LLM 超时**: 新增收集型调用用 `_call_llm(timeout=120)`，流式用 `_timeout_iterate(agen, timeout=120)`

## Store 核心字段

| 字段 | 类型 | 说明 |
|------|------|------|
| `generating` | `boolean` | 是否正在生成 |
| `currentStep` | `string` | idle/parsing/outlining/writing/titling/done/error |
| `abortController` | `AbortController\|null` | 用于停止生成的流控制 |
| `currentRecordId` | `number\|null` | 当前生成的记录 ID |
| `thinkingLogs` | `Array<{time, text, type, step}>` | 含 step 标记的日志 |
| `chapters` | `Array<{title, index}>` | 章节元信息 |
| `chapterTexts` | `string[]` | 每章独立文本 |
| `selectedStyles` | `string[]` | 多选风格数组 |

### chatStore 核心字段

| 字段 | 类型 | 说明 |
|------|------|------|
| `messages` | `Array<{role, content, streaming?}>` | 对话消息列表 |
| `novelData` | `Object` | 当前生成状态（step/chapters/chapterTexts/outline/totalWords） |
| `generating` | `boolean` | 是否正在生成 |
| `currentRecordId` | `number\|null` | 当前生成的记录 ID |
| `abortController` | `AbortController\|null` | 用于停止生成的流控制 |
