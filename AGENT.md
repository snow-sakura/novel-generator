# AGENT.md — AI 开发助手指南

此文档为 AI 编程助手（Claude Code / Cursor 等）提供项目上下文，帮助理解代码结构和开发规范。

## 项目本质

这是一个**番茄小说风格的 AI 小说生成器**，对标番茄小说平台的题材分类体系。核心流程：

```
用户输入种子句
  → 选择频道(男频/女频) → 题材 → 风格 → 字数
  → 后端三步生成(要素解析 → 大纲 → 逐章)
  → SSE 流式推送前端
  → 自动存储到 doc/novel/ 文件夹 + DB
```

## 技术要点

### 后端
- **FastAPI** + **SSE**: `StreamingResponse(text/event-stream)`
- **Provider 工厂**: `app/llm/provider.py` 支持动态创建任意 OpenAI 兼容模型
- **生成管线**: `app/services/generator.py` 三步 yield 事件
- **文件存储**: 自动创建 `doc/novel/{title}/` 文件夹，存储逐章 TXT + 大纲思维导图 + 全文 TXT
- **番茄数据**: `app/data.py` 硬编码男频19类/女频18类/15种风格

### 前端
- **状态管理**: Zustand store (`novelStore.js`) 管理所有生成状态
- **Demo 模式**: 自动检测 `github.io`，切换 mock 数据流
- **章节锚点**: 每个 `<section id="ch-N">` 支持 `scrollIntoView`
- **TOC**: 侧栏目录面板控制 `showToc` 状态

### 关键路由

| 端点 | 说明 |
|------|------|
| POST `/api/v1/generate` | SSE 流式生成 |
| POST `/api/v1/generate/continue?record_id=X` | 从失败继续生成 |
| GET `/api/v1/records` | 生成记录列表 |
| GET `/api/v1/records/{id}` | 单条记录详情 |
| GET `/api/v1/models/list` | 国产模型列表 |
| GET `/api/v1/genres/list?gender=` | 题材列表（按频道） |
| GET `/api/v1/novels/{id}/export` | 全文导出 (md/txt/pdf) |
| GET `/api/v1/novels/{id}/export/chapters` | 逐章 ZIP |
| GET `/api/v1/novels/{id}/export/outline?format=markdown` | 大纲 Markdown |
| GET `/api/v1/novels/{id}/export/outline?format=xmind` | 大纲 XMind |

### SSE 事件类型

parse / parse_done / outline / outline_thinking / outline_done / chapter_start / content / chapter_end / title / log / complete / error / record_id / continue_from

### 新增字段（v1.2 — 表单重设计）

- `chapter_count`: 前端计算传入的章节数（后端优先使用）
- `custom_prompts`: `{ parse, outline, chapter, title }` 覆盖默认 Prompt
- `defaultApiKey`: 前端 store 中 OpenCode 默认模型的 API Key
- `customPrompts`: 前端 store 中自定义提示词编辑内容

### 关键变更（v1.2.1 — 继续生成 + XMind + 章节重设计）

- **数据库迁移**: `migrate_database()` 自动检测缺失列并 ALTER TABLE
- **题材/风格可折叠**: `showGenres` / `showStyles` state 控制展示（NovelForm）
- **大纲自动导出 XMind**: `_save_outline_mindmap()` 调用 `generate_xmind()` 生成 xmind 文件
- **生成记录表**: `GenerationRecord` SQLAlchemy 模型 + `/api/v1/records` CRUD
- **继续生成**: `POST /api/v1/generate/continue?record_id=X` 重建参数重新生成
- **章节阅读优化**: IntersectionObserver 跟踪当前章节 + 高亮 + 大号标题 + 64宽度 TOC 全展示

### SSE 新增事件

- `record_id`: 生成起始时返回 `data: id`（前端记录绑定）
- `continue_from`: 继续生成时返回 `data: { original_record_id }`

### 关键变更（v1.3.0 — 日志持久化 + 内容回显 + 存储迁移）

- **生成日志持久化**: `GenerationRecord.thinking_logs` 列存储 JSON；`event_stream` 自动收集 `log` 事件并保存
- **继续生成回显**: CreatePage 加载 `content_sofar` / `params` / `thinking_logs` 完整回显
- **ThinkingLog 常驻**: 有日志时始终显示（不限于生成中），位于 StepProgress 下方
- **NovelPage 日志面板**: 底部可折叠「生成日志」区域，自动加载最新记录
- **回到顶部按钮**: 固定底部右下方，渐变色悬浮按钮，>400px 滚动时显示
- **存储迁移**: 小说文件从 `doc/` → `doc/novel/`，删除 `backend/novel/`
- **Demo 模式**: 默认直接渲染 CreatePage，移除配置检测空白等待

### 关键变更（v1.3.0 fix — 每章状态 + 独立文本管理）

- **每章状态跟踪**: `GenerationRecord.chapter_states` 列存储每章生成状态（`generating`/`completed`/`failed`）+ 起止时间
- **大纲导出回退**: `outline.chapters` 为空时自动回退到 `novel.chapters` 字段
- **Store 独立章节文本**: `chapterTexts` 数组与 `chapters` 对齐，新增 `appendChapterText` action；生成时内容写入 `chapterTexts[last]` 而非拼接 `currentContent`
- **CreatePage 弹窗重构**: `chapter_start` 立即打开弹窗，`chapter_end` 立即关闭，无延迟；移除 `delay()` 工具函数
- **继续生成回显修复**: 使用 `appendChapterText` + `addChapter` 重建章节内容，确保 `chapterTexts` 正确填充

### 新增/变更 API

| 端点 | 说明 |
|------|------|
| POST `/api/v1/generate/continue?record_id=X` | 从失败记录继续生成 |
| GET `/api/v1/records` | 生成记录列表（分页） |
| GET `/api/v1/records/{id}` | 单条记录详情（含 `thinking_logs` + `chapter_states`） |
| DELETE `/api/v1/records/{id}` | 删除记录 |
| GET `/novels/{id}/export/outline?format=xmind` | 大纲 XMind 导出 |

### 生成记录状态

| 状态 | 含义 | 前端操作 |
|------|------|----------|
| `in_progress` | 生成中 | 不可操作 |
| `completed` | 已完成 | 查看小说 |
| `failed` | 失败 | 继续生成 |

### Store 核心字段

| 字段 | 类型 | 说明 |
|------|------|------|
| `chapters` | `Array<{title, index}>` | 章节元信息列表 |
| `chapterTexts` | `string[]` | 每章独立文本，索引与 `chapters` 对齐 |
| `currentContent` | `string` | 全文拼接（由 `appendChapterText` 自动追加） |
| `thinkingLogs` | `Array<{time, text, type}>` | 生成日志 |

## 开发规范

1. **新增字段**需同步修改: model → router → store → api → 组件
2. **SSE 事件**新增需同步: generator yield → store event → CreatePage switch
3. **每章文本**: 新增内容使用 `appendChapterText`，不要手动拼接 `currentContent`
4. **文档**更新: TODO.md(版本记录) + DESIGN/API/DB 规格文档
5. **Demo 模式**: sampleNovel.js 需维护 mock 数据
