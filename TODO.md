# 番茄小说生成智能体 — 版本记录

> 按时间倒序排列

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
