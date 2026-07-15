# CLAUDE.md — 番茄小说生成智能体 V3

## 项目概述

番茄小说生成智能体 V3（Tomato Novel Generator V3）—— 一句话输入，AI 自动生成完整小说。
支持风格多选、六层大纲、CrewAI 多智能体管线、XMind 导出、对话式创作、段落润色（重写/扩写/精简）。

> **版本标识**: 本目录为 V3 血肉版，API 前缀 `/api/v3`，数据库文件 `novel_generator_v3.db`
> V3 在 V1 基础上新增：段落润色、版本历史、ParagraphVersion 模型、TTS语音合成、AI配图、统计分析

## 技术栈

- **前端**: Vite + React 18 + TailwindCSS 3 + Zustand + React Router
- **后端**: Python 3.12 + FastAPI + LangChain + CrewAI + SQLAlchemy + SQLite
- **多智能体**: CrewAI（ParserAgent / OutlinerAgent / WriterAgent / TitlerAgent，**不含 llm 参数**）
- **模型**: 多 Provider 工厂模式（OpenAI / Anthropic / Ollama / OpenCode Zen / MiMo V3.5 / 国产模型）
- **CI/CD**: GitHub Actions → GitHub Pages

## 目录结构

```
novel-generator/
├── backend/app/
│   ├── routers/       # API 路由 (generate/novel/export/chat)
│   ├── services/      # 生成管线 + CrewAI智能体 + Prompt + 导出 + 对话服务
│   ├── llm/           # LLM Provider 工厂
│   ├── models/        # SQLAlchemy 模型
│   ├── data.py        # 番茄分类/风格/国产模型数据
│   ├── config.py      # 环境配置
│   └── main.py        # FastAPI 入口
├── frontend/src/
│   ├── pages/         # CreatePage / NovelPage / HistoryPage / ChatPage
│   ├── components/    # NovelForm / MultiStepLog / ChatMessage / ChatInput / NovelStatusPanel
│   ├── stores/        # novelStore.js + chatStore.js
│   └── services/      # API 调用 + Demo 模式
├── docs/novel/         # 生成的小说文件
└── novels_index.json  # 跨设备 DB 同步
```

## 关键约定

- 前端使用 TailwindCSS，`index.css` 仅保留 `.novel-content` 和 `.thinking-log` 样式
- 后端使用 LangChain SDK 调用 LLM（**CrewAI Agent 仅作角色容器，不含 llm 参数**）
- 所有 LLM Provider 必须实现 `generate_stream` 和 `validate` 方法
- SSE 事件使用 `event: xxx\ndata: {...}\n\n` 格式
- log 事件 data 含 `step` 字段（parsing/outlining/writing/titling）
- 数据库使用 SQLite，ORM 为 SQLAlchemy 2.0
- CrewAI 初始化需要 `OPENAI_API_KEY`，`main.py` 启动时设置占位值 `sk-crewai-placeholder`
- CrewAI 初始化需要 `OPENAI_API_KEY` 占位值，`main.py` 启动时自动设置

## 三层 LLM 超时保护

LLM 调用可能因 API 不可达而挂死，generator.py 有三层保护：

1. **启动预检** — `generate()` 入口调 `self.llm.validate()`，API key 缺失则立即返回 error
2. **`_call_llm(timeout=120)`** — 收集式调用（parse/outline/title）设 120s 总超时，超时走 fallback
3. **`_timeout_iterate(agen, timeout=120)`** — 流式逐章写作时每块间 120s 超时

## CrewAI 智能体

所有 Agent 定义于 `backend/app/services/agents.py`，**不含 `llm` 参数**（仅作角色描述容器）：

- **ParserAgent**: 故事要素分析师 — 从种子句提取六要素
- **OutlinerAgent**: 小说大纲架构师 — 六层完整大纲
- **WriterAgent**: 小说章节作家 — 逐章流式生成
- **TitlerAgent**: 小说标题专家 — 生成吸引人的标题

## 关键文件

- `agents.py` — CrewAI Agent 定义（无 llm 参数）
- `generator.py` — 生成管线 + 超时保护 + 流式逐章 + 题材约束注入
- `prompts.py` — Prompt 模板，含类型隔离规则（SYSTEM_PROMPT_CHAPTER / SYSTEM_PROMPT_L5_CHAPTERS）
- `chat_service.py` — 对话式生成服务
- `provider.py` — LLM Provider 工厂（OpenAI/Anthropic/Ollama/OpenCode/Custom/MiMo）
- `data.py` — 番茄分类/风格/国产模型数据（含 MiMo-V3.5）
- `MultiStepLog.jsx` — 4 步骤分卡片日志
- `ChatPage.jsx` — 对话页面（左侧对话 + 右侧看板）
- `api.js` — 返回 `{controller}`，提供 `cancelRecord()` / `cleanupData()`
- `novelStore.js` — 含 `abortController` / `currentRecordId`
- `chatStore.js` — 独立 chat 状态管理

## 停止生成流程

1. 用户点「停止生成」→ confirm 弹窗
2. 前端调用 `POST /api/v3/records/{id}/cancel` → 后端标记 `cancelled`
3. 前端调用 `abortController.abort()` → SSE 连接断开
4. 后端 `finally` 块感知取消 → 保存已生成内容

## 运行命令

```bash
# 后端
cd backend && bash run.sh

# 前端
cd frontend && npm run dev

# 构建
cd frontend && npm run build
```
