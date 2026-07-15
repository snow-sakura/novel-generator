# 番茄小说生成智能体 V1

一句话输入，AI 自动生成完整小说。

> 🎯 **在线 Demo：** https://snow-sakura.github.io/novel-generator/
>
> Demo 模式无需后端，可在浏览器中直接体验完整生成流程。

## 快速启动

### 后端

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env .env.local  # 编辑 API Key
python -m app.main
```

### 前端

```bash
cd frontend
npm install
npm run dev
```

访问 http://localhost:5173

## 技术栈

- 前端：Vite + React + TailwindCSS + Zustand
- 后端：Python FastAPI + LangChain + SQLite
- 模型：支持 OpenAI / Anthropic / Ollama / OpenCode Zen / MiMo V2.5 切换

## 项目结构

```
novel-generator/
├── backend/            # Python FastAPI 后端
│   ├── app/
│   │   ├── routers/    # API 路由（生成/查询/导出）
│   │   ├── services/   # 生成管线 + Prompt 模板
│   │   └── llm/        # LLM Provider 工厂
│   └── requirements.txt
├── frontend/           # Vite + React 前端
│   └── src/
│       ├── pages/      # 创作/阅读/历史页面
│       ├── components/ # UI 组件
│       └── services/   # API 调用 + Demo 模式
├── docs/               # 设计文档 + 生成的小说文件
│   ├── novel/          # 生成的小说文件（自动创建）
│   ├── prd/            # PRD 文档（V1-V3）
│   └── spec/           # 技术设计 + API + 数据库文档
└── .github/workflows/  # GitHub Pages 自动部署
```

## Demo 模式说明

部署到 GitHub Pages 时，前端自动进入 Demo 模式：

- 使用预生成的样例小说模拟完整 SSE 生成流程
- 支持体验：要素解析 → 大纲规划 → 逐章生成 → 标题生成
- 展示 StepProgress 进度条 + ThinkingLog 思考日志 + NovelReader 阅读器
- 可查看样例小说详情页面

## 模型配置

后端支持多模型切换，在 `backend/.env` 中配置：

```env
LLM_PROVIDER=opencode  # 可选：openai / anthropic / ollama / opencode

# OpenCode Zen（默认）
OPENCODE_API_KEY=sk-xxx
OPENCODE_BASE_URL=https://opencode.ai/zen/v1
OPENCODE_MODEL=mimo-v2.5-free  # 可选: mimo-v2.5-free, deepseek-v4-flash-free, hy3-free
```

可用免费模型：MiMo-V2.5 (小米) / DeepSeek V4 Flash / Hy3 / Nemotron-3 Ultra

国产模型（需 API Key）：DeepSeek / Qwen / GLM / Kimi / 豆包 / 文心 / MiniMax / 百川 / 混元 / 零一万物 / 硅基流动

前端可通过设置页面切换模型，配置持久化到数据库。

可用的免费模型（OpenCode Zen）：
- `mimo-v2.5-free` — MiMo V2.5（小米，限免）
- `deepseek-v4-flash-free` — DeepSeek V4 Flash
- `hy3-free` — 混元 3
- `nemotron-3-ultra-free` — Nemotron 3 Ultra

## 版本历史

### v1.4.0 (2026-07-08)

**新增功能:**
- 详情页大纲/章节弹窗 — 支持6层tab切换展示
- 卡片式UI风格 — 使用outline-card-grid网格布局
- 全中文LABEL_MAP — 补齐24个缺失的中文key映射

### v1.3.0 (2026-07-05)

**新增功能:**
- 生成日志持久化 — 完整生成日志存储到DB
- 继续生成内容回显 — 自动回显已生成章节内容
- 回到顶部按钮 — 悬浮圆角回到顶部按钮
- 存储结构调整 — 所有小说文件统一存储至docs/novel/

### v1.2.0 (2026-07-05)

**新增功能:**
- 题材/风格可折叠 — 支持点击折叠收起
- 大纲自动导出XMind — 自动生成思维导图文件
- 生成记录系统 — 记录每次生成的参数、进度、状态
- 失败继续生成 — 从失败记录重建参数重新生成

### v1.1.0 (2026-07-05)

**新增功能:**
- 男频/女频频道 — 区分读者群体
- 番茄小说题材库 — 男频19类、女频18类
- 番茄小说风格库 — 15种常见写作风格
- 目标字数扩展 — 500~500,000字
- 自定义模型配置 — 支持多种国产模型

### v1.0.0 (2026-07-05)

**初始版本:**
- Vite + React前端
- Python FastAPI后端
- SSE流式生成
- 多Provider支持
- 导出格式：Markdown/TXT/PDF
- 前端Demo模式
- GitHub Actions自动部署

## 许可证

MIT
