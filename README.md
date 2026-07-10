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
├── v3/                    # V3 版本（灵魂版）
│   ├── backend/           # Python FastAPI 后端
│   ├── frontend/          # Vite + React 前端
│   └── *.md               # V3 文档
├── docs/                  # 文档和小说
│   ├── novel/
│   │   ├── v1/            # V1 生成的小说
│   │   ├── v2/            # V2 生成的小说
│   │   └── v3/            # V3 生成的小说
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

### V3 — 灵魂版（深度创作辅助）
- F1 频道/题材/风格多选配置 | F2 叙事技巧（视角/节奏/悬念/反转）
- F3 金句管理（提取/收藏/复制） | F4 美学风格（关闭/轻度/中度/重度）
- F5 文末解读（意义提炼） | F6 设定档案（跨章节一致性）
- F7 不同结局生成（好结局/坏结局/开放式）+ 多版本开头对比
- F8 对话插入确认 | F9 AI 推荐主题
- F10 生成记录管理（分页/轮询/继续/取消）
- F11 AI 配图（生成/展示/删除） | F12 TTS 语音合成（edge-tts）
- F13 统计分析（词频/角色出现/情感曲线 SVG 可视化）
- 完整规格文档：`docs/spec/API-v3.md`、`docs/spec/DB-v3.md`、`docs/spec/DESIGN-v3.md`

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

### V3 版本

```bash
cd v3/backend
bash run.sh                        # 自动创建 .venv + 安装依赖 + 复制 .env

# 另开终端
cd v3/frontend
npm install
npm run dev                        # http://localhost:5173
```

## 技术栈

- **前端**: Vite + React 18 + TailwindCSS 3 + Zustand
- **后端**: Python 3.12 + FastAPI + LangChain + CrewAI + SQLite
- **模型**: OpenAI / Anthropic / Ollama / OpenCode Zen / MiMo V2.5

## 许可证

MIT
