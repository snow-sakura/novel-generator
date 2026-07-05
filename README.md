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
- 模型：支持 OpenAI / Anthropic / Ollama / OpenCode Zen 切换

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
├── doc/                # 设计文档 + 生成的小说文件
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
```

## 许可证

MIT
