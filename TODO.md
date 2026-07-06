# 番茄小说生成智能体 — 版本记录

> 按时间倒序排列

---

## v1.3.0 (2026-07-05)

### 新增功能

- **生成日志持久化**：
  - `GenerationRecord.thinking_logs` 字段存储 JSON 格式的完整生成日志
  - 生成过程中在 `chapter_end` / `complete` / `error` 节点自动保存日志到 DB
  - NovelPage 详情页底部新增「生成日志」可折叠面板，展示最新记录的生成日志
  - CreatePage 继续生成时自动加载并展示历史日志
- **继续生成内容回显**：
  - 点击「继续生成」后自动回显 `content_sofar` 已生成章节内容
  - 自动从 `content_sofar` 解析章节标题列表
  - 自动回填表单参数（种子句、频道、题材、风格、字数等）
  - 生成日志始终在 StepProgress 下方展示，非生成状态下也可见
- **回到顶部按钮**：NovelPage 新增悬浮圆角回到顶部按钮（渐变色），滚动超过 400px 后出现
- **存储结构调整**：
  - 删除 `backend/novel/` 目录
  - 所有小说文件统一存储至 `doc/novel/{title}/`
  - 已有小说从 `doc/` 根目录迁移至 `doc/novel/`
- **Demo 模式默认页面**：默认渲染「创作」CreatePage，不再展示空白页

### 修正（v1.3.0 fix）

- **每章状态跟踪**：`GenerationRecord` 新增 `chapter_states` 字段，记录每章生成状态（`generating`/`completed`）、起止时间
- **大纲导出回退**：`export_outline` 和 `export_package` 在 `outline.chapters` 为空时回退到 `novel.chapters`
- **每章独立文本管理**：Store 新增 `chapterTexts` 数组 + `appendChapterText`，每章内容独立存储而非拼接后切分
- **CreatePage 弹窗逻辑重构**：移除 `delay()` 工具函数，弹窗由 `chapter_start` 立即打开、`chapter_end` 立即关闭，中间保持关闭
- **NovelPage 日志位置调整**：生成日志面板移到章节导航上方，回到顶部按钮右边缘与内容区对齐
- **继续生成内容回显修复**：使用 `appendChapterText` 替代 `appendContent`，正确填充每章独立的 `chapterTexts`

### API 变更

- `GET /api/v1/records/{id}` 新增返回 `thinking_logs` JSON 数组
- `GET /api/v1/records/{id}` 新增返回 `chapter_states` JSON 数组

### 文档

- TODO.md v1.3.0 记录
- AGENT.md 更新
- README.md 项目结构更新

---

## v1.2.1 (2026-07-05)

### Bug 修复

- **数据库迁移**：新增 `migrate_database()` 自动检查并添加缺失列（gender / per_chapter_min / per_chapter_max），兼容 v1.0 旧表升级

### 新增功能

- **题材/风格可折叠**：题材和风格区域默认展开，支持点击折叠收起，减少表单占用空间
- **左侧表单高度自适应**：左侧表单面板 max-h 限制跟随视口，右侧内容同步 flex-stretch 对齐
- **大纲自动导出 XMind**：生成管线在 `novel/{title}/` 目录下自动生成 `{title} 大纲.xmind` 思维导图文件（XMind 8 兼容格式）
- **大纲导出 API 增强**：`GET /novels/{id}/export/outline?format=xmind` 支持 XMind 格式调用，前端 NovelPage 增加「大纲XMind」导出按钮
- **生成记录系统**：
  - 新建 `generation_records` SQLite 表，记录每次生成的参数、进度、状态
  - 生成过程自动更新记录（开始时 `in_progress` → 逐章更新进度 → 完成 `completed` / 失败 `failed`）
- **失败继续生成**：
  - `POST /api/v1/generate/continue?record_id=X` 端点：从失败记录重建参数重新生成
  - 历史页 `生成记录` Tab：展示所有记录状态徽标（成功/失败/生成中）
  - 失败的记录显示「继续生成」按钮 → 跳转 CreatePage 重新启动
  - 成功的记录显示「查看」按钮 → 进入详情页
- **章节阅读体验重构**：
  - NovelReader 全面重写：IntersectionObserver 自动跟踪当前阅读位置
  - 章节标题大号醒目（10x10 圆角徽章 + 粗体标题 + 底部双线分隔）
  - TOC 侧栏 64 宽度全标题展示，无省略
  - 当前章节高亮（橙色边框 + 淡橙背景）
  - 顶部导航栏使用圆角数字徽章，全名展示不截断
  - 底部「滚动到顶部」快捷按钮（>3章时显示）

### API 变更

- `POST /api/v1/generate` 新增字段：
  - `chapter_count`（可选，前端计算传入）
  - `custom_prompts`（可选，`{ parse, outline, chapter, title }` 覆盖默认 Prompt）
- `POST /api/v1/generate/continue` 新增：
  - 参数 `record_id` → 重建生成参数重新生成
- `GET /api/v1/records` 新增：
  - 分页列出所有生成记录（id / novel_id / status / progress / error）
- `GET /api/v1/records/{id}` 新增：
  - 单条记录详情（含 params / content_sofar）
- `GET /novels/{id}/export/outline?format=xmind` 新增格式参数

### 文档

- TODO.md v1.2.1 记录
- AGENT.md 更新
- DESIGN-v1.md 增加 Section 15

---

## v1.1.0 (2026-07-05)

### 新增功能

- **男频/女频频道**：第一选择即可区分读者群体，题材自动按频道筛选
- **番茄小说题材库**：男频19类、女频18类，实时同步番茄小说官网分类
- **番茄小说风格库**：15种常见写作风格
- **目标字数扩展**：500 ~ 500,000字（50万字）
- **每章字数自定义**：支持设置每章最小/最大字数范围
- **自定义模型配置**：支持 DeepSeek / Qwen / GLM / Kimi / 豆包 / 文心 / MiniMax 等国产模型，全部 OpenAI 兼容
- **逐章导出 TXT**：后端自动按章节导出独立 TXT 文件，保存至 `novel/小说名/` 文件夹
- **大纲思维导图导出**：后端自动生成 `创作大纲.mm.md` 文件（含要素 + 章节缩进结构）
- **前端章节重新设计**：章节编号圆形徽章 + 梯度配色标题 + 边框分隔
- **可点击目录(TOC)**：侧栏目录面板，点击自动滚动定位到对应章节
- **大纲实时思考打印**：后端逐章打印 + SSE 事件 `outline_thinking` 推送 → 前端 ThinkingLog 展示
- **默认提示词展示**：前端可展开查看要素解析/大纲/逐章/标题 Prompt 模板

### 优化

- NovelReader 重构：按 `<section>` 渲染章节，支持锚点定位
- NovelForm 重构：频道/题材/风格分步选择，字数滑杆对数分布
- NovelPage 新增：大纲预览 + 章节ZIP/大纲导出按钮
- 生成超时从 3 分钟提升至 10 分钟（适配50万字长文）
- CORS 放宽为 `*`（开发友好）

### 修复

- Prompts 中引号字符不兼容问题（中文引号 `""` → 单引号）
- Pydantic v2 保留字段冲突（`model_config` → `llm_config`）
- generator.py `{title》》` 语法错误

---

## v1.0.0 (2026-07-05)

### 初始版本

- Vite + React 前端（TailwindCSS + Zustand + React Router）
- Python FastAPI 后端（LangChain + SQLite）
- SSE 流式生成：要素解析 → 大纲规划 → 逐章生成 → 标题
- 多 Provider 支持：OpenAI / Anthropic / Ollama / OpenCode Zen
- 导出格式：Markdown / TXT / PDF
- 前端 Demo 模式（GitHub Pages 无需后端可预览）
- GitHub Actions 自动部署

### 文档

- PRD-v1/v2/v3
- DESIGN-v1 设计文档
- API-v1 / DB-v1 规格文档
