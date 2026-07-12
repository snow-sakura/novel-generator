# 番茄小说生成智能体 V3

一句话输入，AI 自动生成完整小说。

> 🎯 **在线 Demo：** https://snow-sakura.github.io/novel-generator/
>
> Demo 模式无需后端，可在浏览器中直接体验完整生成流程。

## 快速启动

### 后端

```bash
cd backend
bash run.sh                        # 自动创建 .venv + 安装依赖 + 复制 .env
```

### 前端

```bash
cd frontend
npm install
npm run dev                        # http://localhost:5173
```

## 技术栈

- 前端：Vite + React + TailwindCSS + Zustand
- 后端：Python FastAPI + LangChain + CrewAI + SQLite
- 模型：支持 OpenAI / Anthropic / Ollama / OpenCode Zen / MiMo V2.5 切换

## V3 新增功能（F1-F13）

| 编号 | 功能 | 说明 |
|------|------|------|
| F1 | 频道/题材/风格多选配置 | 男频19类 + 女频18类 + 15种风格 |
| F2 | 叙事技巧 | 视角控制、节奏调节、悬念/反转开关 |
| F3 | 金句管理 | 自动提取、收藏、复制 |
| F4 | 美学风格 | 关闭/轻度/中度/重度 |
| F5 | 文末解读 | 意义提炼与主题升华 |
| F6 | 设定档案 | 跨章节人物/地点一致性 |
| F7 | 多版本开头 | 好结局/坏结局/开放式 + 多版本对比 |
| F8 | 对话插入确认 | 角色对话生成与段落插入 |
| F9 | AI 推荐主题 | 智能推荐核心主题 |
| F10 | 生成记录管理 | 分页/轮询/继续/取消 |
| F11 | AI 配图 | 生成/展示/删除封面配图 |
| F12 | TTS 语音合成 | edge-tts 多声优 |
| F13 | 统计分析 | 词频/角色出现/情感曲线 SVG |

## 模型配置

后端支持多模型切换，在 `backend/.env` 中配置：

```env
LLM_PROVIDER=opencode  # 可选：openai / anthropic / ollama / opencode

# OpenCode Zen（默认）
OPENCODE_API_KEY=sk-xxx
OPENCODE_BASE_URL=https://opencode.ai/zen/v1
OPENCODE_MODEL=deepseek-v4-flash-free
```

可用免费模型（OpenCode Zen）：
- `deepseek-v4-flash-free` — DeepSeek V4 Flash
- `mimo-v2.5-free` — MiMo V2.5（小米，限免）
- `hy3-free` — 混元 3
- `nemotron-3-ultra-free` — Nemotron 3 Ultra

国产模型（需 API Key）：DeepSeek / Qwen / GLM / Kimi / 豆包 / 文心 / MiniMax / 百川 / 混元 / 零一万物 / 硅基流动

## 许可证

MIT
