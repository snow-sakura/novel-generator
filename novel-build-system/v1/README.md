# 番茄小说生成智能体 V1 — 骨架版

> **一句话输入，AI 自动生成完整小说**

> 🎯 **在线 Demo：** https://snow-sakura.github.io/novel-generator/
>
> Demo 模式无需后端，可在浏览器中直接体验完整生成流程。

## 界面预览

### 创作页面

![创作页面](../screenshots/v1-create.png)

### 历史记录

![历史记录](../screenshots/v1-history.png)

## 快速启动

### 后端

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env  # 编辑 API Key
bash run.sh           # 自动激活 venv + 启动服务
```

### 前端

```bash
cd frontend
npm install
npm run dev
```

访问 http://localhost:5173

## 技术栈

| 层级 | 技术 |
|------|------|
| 前端 | Vite + React 18 + TailwindCSS 3 + Zustand + Lucide Icons |
| 后端 | Python FastAPI + LangChain + CrewAI + SQLAlchemy 2.0 + SQLite |
| 模型 | OpenCode Zen / DeepSeek / Qwen / GLM / Kimi / 豆包 / 文心 / MiniMax / AMD Radeon |
| 构建 | Vite (前端) + Uvicorn (后端) |
| 流式传输 | SSE (Server-Sent Events) + Vite Proxy 透传 |

## 项目结构

```
novel-generator/
├── backend/                    # Python FastAPI 后端
│   ├── app/
│   │   ├── routers/            # API 路由
│   │   │   ├── generate.py     # 生成 + 记录管理 + SSE
│   │   │   ├── chat.py         # AI 对话式生成
│   │   │   ├── novel.py        # 小说 CRUD
│   │   │   ├── export.py       # 导出（MD/TPT/PDF/ZIP/XMind）
│   │   │   ├── prompts.py      # 提示词模板
│   │   │   └── model_config.py # 模型配置持久化
│   │   ├── services/
│   │   │   ├── generator.py    # 生成管线核心（CrewAI 多智能体）
│   │   │   ├── chat_service.py # 对话式生成包装器
│   │   │   ├── prompts.py      # Prompt 模板
│   │   │   ├── xmind.py        # XMind 思维导图生成
│   │   │   └── export.py       # 导出服务
│   │   ├── llm/
│   │   │   └── provider.py     # 多 Provider LLM 工厂
│   │   ├── models/             # SQLAlchemy ORM 模型
│   │   ├── data.py             # 题材/风格/模型数据
│   │   ├── config.py           # 配置管理
│   │   ├── database.py         # 数据库连接 + 迁移
│   │   └── main.py             # 应用入口
│   ├── .env                    # 环境变量（不提交）
│   ├── .env.example            # 环境变量模板
│   └── run.sh                  # 启动脚本
├── frontend/                   # Vite + React 前端
│   └── src/
│       ├── pages/              # 页面组件
│       │   ├── CreatePage.jsx  # 创作页（垂直布局 + TAB）
│       │   ├── NovelPage.jsx   # 阅读页（大纲/章节/导出）
│       │   ├── HistoryPage.jsx # 历史记录（标签页 + 卡片）
│       │   ├── ChatPage.jsx    # AI 对话页
│       │   └── PromptRefPage.jsx # 提示词参考
│       ├── components/         # 通用组件
│       │   ├── NovelForm.jsx   # 创作表单（TAB 布局）
│       │   ├── StepProgress.jsx # 步骤进度条
│       │   ├── MultiStepLog.jsx # 多步骤日志
│       │   ├── NovelCard.jsx   # 小说卡片
│       │   ├── ChatOptionSelector.jsx # 对话选项
│       │   ├── SettingsModal.jsx # 设置弹窗
│       │   └── ConfirmDialog.jsx # 确认弹窗
│       ├── stores/             # Zustand 状态管理
│       ├── services/           # API 调用
│       └── lib/                # 工具函数
├── docs/                       # 设计文档
├── backups/                    # 数据库自动备份
└── novels_index.json           # 小说索引文件
```

## 核心流程

```
种子句 → 选择(频道/题材/风格[多选]/字数)
→ 后端 CrewAI 四智能体管线
   (要素解析 → 大纲规划 → 逐章生成 → 标题生成)
→ SSE 流式推送前端
→ 自动存储到 docs/novel/{title}/ + DB
```

## 多智能体架构

| 角色 | 职责 |
|------|------|
| 故事要素分析师 | 从种子句中提取六维故事要素 |
| 小说大纲架构师 | 构建六层完整大纲（战略/人物/设定/结构/节奏/风格） |
| 小说章节作家 | 逐章流式生成正文 |
| 小说标题专家 | 根据全文生成吸引人的标题 |

## 模型配置

### 默认配置（OpenCode Zen 免费模型）

```env
LLM_PROVIDER=opencode
OPENCODE_API_KEY=sk-xxx
OPENCODE_BASE_URL=https://opencode.ai/zen/v1
OPENCODE_MODEL=mimo-v2.5-free
```

### 可用免费模型

| 模型 | 说明 |
|------|------|
| `mimo-v2.5-free` | MiMo V2.5（小米） |
| `deepseek-v4-flash-free` | DeepSeek V4 Flash |
| `hy3-free` | 混元 3 |
| `nemotron-3-ultra-free` | Nemotron 3 Ultra |

### 国产模型（需 API Key）

DeepSeek / Qwen / GLM / Kimi / 豆包 / 文心 / MiniMax / 百川 / 混元 / 零一万物 / 硅基流动

前端可通过设置页面切换模型，配置持久化到数据库。

## API 端点

| 方法 | 端点 | 说明 |
|------|------|------|
| POST | `/api/v1/generate` | SSE 流式生成小说 |
| POST | `/api/v1/generate/continue?record_id=X` | 从失败/取消点继续 |
| POST | `/api/v1/chat/generate` | AI 对话式生成 |
| GET | `/api/v1/records` | 生成记录列表（分页） |
| GET | `/api/v1/records/{id}` | 记录详情 |
| GET | `/api/v1/records/{id}/status` | 轻量状态轮询 |
| POST | `/api/v1/records/{id}/cancel` | 取消生成 |
| POST | `/api/v1/records/{id}/reset` | 重置卡住的记录 |
| DELETE | `/api/v1/records/{id}` | 删除记录 |
| POST | `/api/v1/cleanup` | 清理孤立数据 |
| GET | `/api/v1/novels` | 小说列表 |
| GET | `/api/v1/novels/{id}` | 小说详情 |
| GET | `/api/v1/novels/{id}/export` | 导出全文 |
| GET | `/api/v1/novels/{id}/export/chapters` | 逐章 ZIP |
| GET | `/api/v1/novels/{id}/export/outline` | 大纲导出 |
| GET | `/api/v1/models/list` | 国产模型列表 |
| GET | `/api/v1/genres/list?gender=` | 题材列表 |
| GET | `/api/v1/model-config` | 获取模型配置 |
| PUT | `/api/v1/model-config` | 保存模型配置 |
| GET | `/api/v1/prompts` | 提示词模板 |
| GET | `/api/v1/config/check` | 配置状态检查 |
| GET | `/health` | 健康检查（含数据库统计 + 磁盘空间） |
| POST | `/api/v1/backup` | 数据库备份 |

## 健康检查

`GET /health` 返回：

```json
{
  "status": "ok",
  "version": "v1.3.1",
  "database": {
    "novels": 16,
    "records": 21,
    "in_progress": 0,
    "stale_records": 0
  },
  "disk": {
    "total_gb": 256.0,
    "used_gb": 141.2,
    "free_gb": 114.8
  }
}
```

## SSE 事件流

`event: xxx\ndata: {...}\n\n` 格式。

事件类型：`parse`, `parse_done`, `outline`, `outline_thinking`, `outline_done`, `chapter_start`, `content`, `chapter_end`, `title`, `log`, `complete`, `error`, `record_id`, `continue_from`

## 安全特性

- **API Key 脱敏**：GET 响应中 API Key 仅显示后 4 位
- **CORS 限制**：仅允许 localhost:5173/5174
- **请求体限制**：最大 10MB
- **数据库索引**：优化查询性能
- **自动备份**：最多保留 10 个备份
- **SSE 安全**：禁用响应缓冲，防止中间人攻击

## 版本历史

### v1.6.0 (2026-08-31)

**Bug 修复:**
- 修复 LLM 错误（如 429 速率限制）时流水线未立即停止的问题
- 后端 `_timeout_iterate` 所有异常都终止流水线，不再静默继续
- 后端 `_call_with_retry` 重试后仍失败则直接抛出异常
- 前端错误处理：停止 "正在生成..." 指示器，显示失败步骤
- 修复创作页面左右面板高度不一致的问题

**新增功能:**
- 错误状态显示：右侧面板显示红色错误提示框和失败的具体步骤
- `updateLastMessageFull` 函数支持更新消息的 `streaming` 属性
- NovelStatusPanel 新增 `failedStep` 字段追踪失败步骤

### v1.5.1 (2026-08-30)

**Bug 修复:**
- 修复 SSE 流式事件无法通过 Vite proxy 传输的问题
- 后端 StreamingResponse 添加 `Cache-Control: no-cache` + `X-Accel-Buffering: no` 响应头
- Vite proxy 配置 SSE 透传，禁用响应缓冲
- 前端 `api.js` 修复 `currentEvent` 变量作用域 bug（跨 chunk 保留事件名）
- 修复 ConfigStatus 页面刷新后丢失已保存模型配置的问题

**新增功能:**
- ConfigStatus 组件自动从数据库恢复已保存的模型配置
- 支持 AMD Radeon 等自定义模型配置持久化

### v1.5.0 (2026-08-28)

**后端优化:**
- API Key 脱敏（GET 响应仅返回后 4 位）
- CORS 限制为开发域名
- cancelled 状态保护（finally 不再覆盖）
- SSE 流式逻辑提取为公共函数
- Session 统一使用 Depends(get_db)
- 数据库索引优化（4 个索引）
- 请求体大小限制（10MB）
- 全局异常处理
- 增强健康检查（数据库统计 + 磁盘空间）
- 数据库备份端点

**前端优化:**
- 全局风格统一（渐变色/圆角/阴影）
- 可访问性（aria-label）
- 移动端适配
- 页面过渡动画
- 构建零错误

### v1.4.0 (2026-07-08)

**新增功能:**
- 详情页大纲/章节弹窗 — 支持6层tab切换展示
- 卡片式UI风格 — 使用outline-card-grid网格布局
- 全中文LABEL_MAP — 补齐24个缺失的中文key映射

### v1.3.0 (2026-07-05)

**新增功能:**
- 生成日志持久化
- 继续生成内容回显
- 回到顶部按钮
- 存储结构调整

### v1.2.0 (2026-07-05)

**新增功能:**
- 题材/风格可折叠
- 大纲自动导出XMind
- 生成记录系统
- 失败继续生成

### v1.1.0 (2026-07-05)

**新增功能:**
- 男频/女频频道
- 番茄小说题材库/风格库
- 目标字数扩展
- 自定义模型配置

### v1.0.0 (2026-07-05)

**初始版本:**
- Vite + React 前端
- Python FastAPI 后端
- SSE 流式生成
- 多 Provider 支持
- 导出格式：Markdown/TXT/PDF
- 前端 Demo 模式
- GitHub Actions 自动部署

## 许可证

MIT
