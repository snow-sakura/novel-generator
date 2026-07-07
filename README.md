# 番茄小说生成智能体

> 🎯 **在线 Demo：** https://snow-sakura.github.io/novel-generator/

一句话输入，AI 自动生成完整小说。

## 项目结构

```
novel-generator/
├── v1/                    # V1 版本（骨架版）
│   ├── backend/           # Python FastAPI 后端
│   ├── frontend/          # Vite + React 前端
│   └── *.md               # V1 文档
├── v2/                    # V2 版本（血肉版）
│   ├── backend/           # Python FastAPI 后端
│   ├── frontend/          # Vite + React 前端
│   └── *.md               # V2 文档
├── doc/                   # 文档和小说
│   ├── novel/
│   │   ├── v1/            # V1 生成的小说
│   │   └── v2/            # V2 生成的小说
│   ├── prd/               # 需求文档
│   └── spec/              # 技术规格文档
└── README.md              # 本文件
```

## 版本说明

### V1 — 骨架版（基础生成）
- 一句话输入 → 六要素解析 → 六层大纲 → 逐章生成
- 支持 37 种题材（男频19类/女频18类）+ 15 种风格
- SSE 流式输出 + 多 Provider LLM 支持
- Markdown/TXT/PDF/XMind 导出

### V2 — 血肉版（叙事升级）
- 在 V1 基础上增加叙事技巧
- 视角控制、节奏调节、语言风格预设
- 叙事张力增强、细节填充
- 多轮对话润色（重写/扩写/精简）

## 快速启动

### V1 版本

```bash
cd v1/backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env  # 编辑 API Key
python -m app.main

# 另开终端
cd v1/frontend
npm install
npm run dev
```

### V2 版本

```bash
cd v2/backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env  # 编辑 API Key
python -m app.main

# 另开终端
cd v2/frontend
npm install
npm run dev
```

## 技术栈

- **前端**: Vite + React 18 + TailwindCSS 3 + Zustand
- **后端**: Python 3.12 + FastAPI + LangChain + CrewAI + SQLite
- **模型**: OpenAI / Anthropic / Ollama / OpenCode Zen / MiMo V2.5

## 许可证

MIT
