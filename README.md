# 番茄小说生成智能体 V1

一句话输入，AI 自动生成完整小说。

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
- 模型：支持 OpenAI / Anthropic / Ollama 切换
