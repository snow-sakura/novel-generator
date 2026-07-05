# CLAUDE.md — 番茄小说生成智能体

## 项目概述

番茄小说生成智能体（Tomato Novel Generator）—— 一句话输入，AI 自动生成完整小说。

## 技术栈

- **前端**: Vite + React 18 + TailwindCSS 3 + Zustand + React Router
- **后端**: Python 3.12 + FastAPI + LangChain + SQLAlchemy + SQLite
- **模型**: 多 Provider 工厂模式（OpenAI / Anthropic / Ollama / OpenCode Zen / 国产模型）
- **CI/CD**: GitHub Actions → GitHub Pages

## 目录结构

```
novel-generator/
├── backend/app/
│   ├── routers/       # API 路由 (generate/novel/export)
│   ├── services/      # 生成管线 + Prompt + 导出
│   ├── llm/           # LLM Provider 工厂
│   ├── models/        # SQLAlchemy 模型
│   ├── data.py        # 番茄分类/风格/国产模型数据
│   ├── config.py      # 环境配置
│   ├── database.py    # SQLite 连接
│   └── main.py        # FastAPI 入口
├── frontend/src/
│   ├── pages/         # CreatePage / NovelPage / HistoryPage
│   ├── components/    # NovelForm / NovelReader / ThinkingLog / ModelConfig / PromptDisplay
│   ├── stores/        # Zustand store
│   └── services/      # API 调用 + Demo 模式
├── doc/               # 项目文档
├── doc/               # 生成的小说文件（自动创建）
└── .github/workflows/ # GitHub Actions
```

## 关键约定

- 前端使用 TailwindCSS，不单独写 CSS 文件（index.css 仅保留 novel-content 和 thinking-log 样式）
- 后端使用 LangChain SDK 调用 LLM
- 所有 LLM Provider 必须实现 `generate_stream` 和 `validate` 方法
- SSE 事件使用 `event: xxx\ndata: {...}\n\n` 格式
- 文件导出统一使用 `filename*=UTF-8''` 格式支持中文文件名
- 数据库使用 SQLite，ORM 为 SQLAlchemy 2.0

## 运行命令

```bash
# 后端
cd backend && source .venv/bin/activate && python -m app.main

# 前端
cd frontend && npm run dev

# 构建
cd frontend && npm run build
```

## 部署

- 自动部署：push 到 main → GitHub Actions → GitHub Pages
- Demo 模式自动检测 `github.io` 域名
- 后端需要独立的服务器运行（未部署）
