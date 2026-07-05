# 番茄小说生成智能体 V1 — 设计文档

## 决策总表

| 维度 | 选择 |
|------|------|
| 项目形态 | Web 全栈应用（前后端分离） |
| 前端框架 | Vite + React |
| UI 方案 | TailwindCSS + shadcn/ui |
| 状态管理 | Zustand |
| 前端路由 | React Router（多页模式） |
| 后端框架 | Python FastAPI |
| 包管理 | pip + venv |
| LLM 框架 | LangChain |
| 模型选型 | 多 Provider 可配置（OpenAI / Anthropic / Ollama） |
| 数据库 | SQLite（全文入库） |
| 用户认证 | V1 不启用 |
| 生成方式 | 同步请求 + SSE 流式输出 |
| 导出格式 | Markdown + TXT + PDF |
| Prompt 管理 | 硬编码在 Python 代码中 |
| API 风格 | RESTful |
| 项目架构 | monorepo |

---

## 一、项目目录结构

```
novel-generator/
├── backend/
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py              # FastAPI 入口 + SSE 路由
│   │   ├── config.py            # 配置管理（模型 key、数据库路径等）
│   │   ├── database.py          # SQLite 连接 + 表定义
│   │   ├── models/
│   │   │   ├── __init__.py
│   │   │   ├── novel.py         # 小说数据模型
│   │   │   └── generation.py    # 生成请求/响应模型
│   │   ├── routers/
│   │   │   ├── __init__.py
│   │   │   ├── generate.py      # 生成小说 API
│   │   │   ├── novel.py         # 小说 CRUD API
│   │   │   └── export.py        # 导出 API
│   │   ├── services/
│   │   │   ├── __init__.py
│   │   │   ├── generator.py     # 生成引擎（LangChain 编排）
│   │   │   ├── prompts.py       # Prompt 模板
│   │   │   └── export.py        # 导出服务（MD/TXT/PDF）
│   │   └── llm/
│   │       ├── __init__.py
│   │       └── provider.py      # LLM Provider 工厂（支持多模型）
│   ├── requirements.txt
│   └── .env                     # API Key 等敏感配置
├── frontend/
│   ├── src/
│   │   ├── main.jsx
│   │   ├── App.jsx              # 路由定义
│   │   ├── index.css            # Tailwind 入口
│   │   ├── pages/
│   │   │   ├── CreatePage.jsx   # 输入参数 + 生成页
│   │   │   ├── NovelPage.jsx    # 小说展示/阅读页
│   │   │   └── HistoryPage.jsx  # 历史记录页
│   │   ├── components/
│   │   │   ├── NovelForm.jsx    # 生成参数表单
│   │   │   ├── NovelReader.jsx  # 小说阅读器（流式展示）
│   │   │   ├── NovelCard.jsx    # 历史卡片
│   │   │   └── ExportBar.jsx    # 导出工具栏
│   │   ├── stores/
│   │   │   └── novelStore.js    # Zustand 状态
│   │   ├── services/
│   │   │   └── api.js           # API 调用 + SSE 处理
│   │   └── lib/
│   │       └── utils.js         # 工具函数
│   ├── index.html
│   ├── vite.config.js
│   ├── tailwind.config.js
│   ├── postcss.config.js
│   └── package.json
├── .gitignore
└── README.md
```

---

## 二、数据库设计（SQLite）

### 表：novels

| 字段 | 类型 | 说明 |
|------|------|------|
| id | INTEGER PK | 自增主键 |
| title | TEXT | 小说标题 |
| seed_text | TEXT | 用户输入的种子句 |
| genre | TEXT | 题材（玄幻/都市/悬疑/言情/科幻/历史） |
| style | TEXT | 风格（简洁/文艺/幽默/冷峻） |
| word_count | INTEGER | 目标字数 |
| actual_count | INTEGER | 实际字数 |
| content | TEXT | 小说全文（Markdown 格式） |
| chapters | TEXT | JSON 数组，记录章节标题和起止位置 |
| model_used | TEXT | 使用的模型名称 |
| time_cost | REAL | 生成耗时（秒） |
| created_at | DATETIME | 创建时间 |

### 表：generation_logs

| 字段 | 类型 | 说明 |
|------|------|------|
| id | INTEGER PK | 自增主键 |
| novel_id | INTEGER FK | 关联 novel |
| prompt_tokens | INTEGER | Prompt 消耗 tokens |
| completion_tokens | INTEGER | 生成消耗 tokens |
| status | TEXT | success / failed |
| error_msg | TEXT | 失败原因 |
| created_at | DATETIME | 记录时间 |

---

## 三、API 设计（RESTful）

### 3.1 生成小说 — `POST /api/v1/generate`

**请求体：**
```json
{
  "seed_text": "一个少年在废弃图书馆发现了一本会发光的书",
  "genre": "玄幻",
  "style": "简洁",
  "word_count": 3000
}
```

**响应（SSE 流式）：**
```
event: chapter_start
data: {"title": "第一章 发光的书"}

event: content
data: {"text": "林墨从未想过，自己在图书馆的兼职会遇到这样的怪事..."}

event: chapter_end
data: {"title": "第一章 发光的书", "word_count": 1024}

event: complete
data: {"novel_id": 1, "title": "光之书", "total_words": 3120}

event: error
data: {"message": "生成失败，请重试"}
```

### 3.2 获取小说详情 — `GET /api/v1/novels/{id}`

```json
{
  "id": 1,
  "title": "光之书",
  "seed_text": "一个少年在废弃图书馆发现了一本会发光的书",
  "genre": "玄幻",
  "style": "简洁",
  "word_count": 3000,
  "actual_count": 3120,
  "content": "# 光之书\n\n## 第一章 发光的书\n\n林墨从未想过...",
  "model_used": "gpt-4o-mini",
  "created_at": "2026-07-05T12:00:00"
}
```

### 3.3 历史列表 — `GET /api/v1/novels?page=1&size=10`

```json
{
  "total": 25,
  "items": [
    {
      "id": 1,
      "title": "光之书",
      "genre": "玄幻",
      "style": "简洁",
      "actual_count": 3120,
      "created_at": "2026-07-05T12:00:00"
    }
  ]
}
```

### 3.4 导出小说 — `GET /api/v1/novels/{id}/export?format=markdown|txt|pdf`

返回文件下载（Content-Disposition: attachment）。

### 3.5 删除小说 — `DELETE /api/v1/novels/{id}`

返回 204 No Content。

---

## 四、生成管线架构

```
用户输入
    │
    ▼
┌─────────────────────────────────┐
│  POST /api/v1/generate          │
│  校验参数 → 存入 pending 记录    │
└──────────┬──────────────────────┘
           │
           ▼
┌─────────────────────────────────┐
│  GeneratorService               │
│  1. 解析种子句 → 提取关键要素    │
│  2. 构建大纲（章节规划）         │
│  3. 逐章生成（流式输出）         │
│  4. 合并全篇 + 后处理           │
└──────────┬──────────────────────┘
           │ SSE 流
           ▼
┌─────────────────────────────────┐
│  前端 NovelReader 逐段渲染      │
│  完成后存入 SQLite               │
│  展示完整小说页面                │
└─────────────────────────────────┘
```

### 4.1 生成流程（三步走）

**Step 1 — 要素解析：** 分析种子句，补充故事六要素
**Step 2 — 大纲规划：** 根据目标字数规划章节和每章概要
**Step 3 — 逐章生成：** 按章节流式输出，每章结束后flush一次

---

## 五、LLM 多 Provider 设计

### Provider 工厂模式

```python
# backend/app/llm/provider.py

class LLMProvider:
    """统一抽象接口"""
    def generate_stream(self, prompt: str, params: dict):
        """返回 AsyncGenerator[str]"""

class OpenAIProvider(LLMProvider):
    def generate_stream(self, prompt, params):
        # 调用 OpenAI SDK，yield 流式结果

class AnthropicProvider(LLMProvider):
    def generate_stream(self, prompt, params):
        # 调用 Anthropic SDK，yield 流式结果

class OllamaProvider(LLMProvider):
    def generate_stream(self, prompt, params):
        # 调用本地 Ollama API，yield 流式结果
```

### 配置方式（`.env`）

```env
# 当前使用的 Provider
LLM_PROVIDER=openai

# OpenAI
OPENAI_API_KEY=sk-xxx
OPENAI_MODEL=gpt-4o-mini

# Anthropic
ANTHROPIC_API_KEY=sk-ant-xxx
ANTHROPIC_MODEL=claude-sonnet-4-20250514

# Ollama
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=qwen2.5:7b
```

---

## 六、前端组件树与路由

```
App.jsx (BrowserRouter)
├── / → CreatePage
│   ├── NovelForm.jsx         # 种子句输入 + 下拉选择 + 字数滑块
│   ├── [生成中] NovelReader.jsx  # 流式展示生成过程
│   └── [生成后] ExportBar.jsx    # 导出按钮
├── /novel/:id → NovelPage
│   ├── NovelReader.jsx       # 显示已生成的小说全文
│   └── ExportBar.jsx
└── /history → HistoryPage
    └── NovelCard.jsx × N     # 历史小说卡片列表
```

### 核心交互流程

```
CreatePage:
  填写表单 → 点击"生成" → POST /api/v1/generate
    → 接收 SSE 流 → NovelReader 实时渲染
    → 生成完成 → 跳转到 /novel/:id

NovelPage:
  请求 GET /api/v1/novels/:id
    → NovelReader 展示全文
    → ExportBar 导出功能

HistoryPage:
  请求 GET /api/v1/novels
    → 展示 NovelCard 列表
    → 点击卡片跳转 NovelPage
```

---

## 七、SSE 流式通信设计

### 后端（FastAPI）

```python
@router.post("/api/v1/generate")
async def generate(req: GenerateRequest):
    return StreamingResponse(
        generate_stream(req),
        media_type="text/event-stream"
    )

async def generate_stream(req):
    yield f"event: chapter_start\ndata: {json.dumps({'title': '第一章'})}\n\n"
    async for chunk in llm.generate_stream(prompt):
        yield f"event: content\ndata: {json.dumps({'text': chunk})}\n\n"
    yield f"event: complete\ndata: {json.dumps({'novel_id': id})}\n\n"
```

### 前端（EventSource）

```javascript
// frontend/src/services/api.js
export function generateNovel(params, onChunk, onComplete, onError) {
  fetch('/api/v1/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params)
  }).then(response => {
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    // 逐段读取 SSE 流
    // 解析 event/data → 调用 onChunk / onComplete / onError
  });
}
```

---

## 八、Prompt 设计（V1 硬编码）

### 要素解析 Prompt

```python
SYSTEM_PROMPT_PARSE = """你是一位小说创作助手。根据用户输入的一句话，
提取并补全以下故事六要素：
1. 人物（主角是谁，什么身份）
2. 时间（故事发生在什么时代/时间段）
3. 地点（主要场景在哪里）
4. 起因（故事的起点是什么）
5. 经过（可能的发展方向）
6. 结果（可能的结局倾向）

以 JSON 格式输出。"""
```

### 大纲规划 Prompt

```python
SYSTEM_PROMPT_OUTLINE = """根据以下故事要素，规划一篇{genre}题材、
{style}风格、约{word_count}字的小说章节大纲。
要求：
- 按{word_count}字合理分配章节数量
- 每章给出标题和200字概要
- 章节之间要有合理的起承转合
- 结尾要有完整的收束"""
```

### 逐章生成 Prompt

```python
SYSTEM_PROMPT_CHAPTER = """你正在创作一篇{genre}题材、{style}风格的小说。
当前章节：{chapter_title}
章节概要：{chapter_summary}
前情提要：{previous_summary}

要求：
- 每段控制在100-200字，便于阅读
- 对话和描写交替进行
- 保持语言风格一致
- 注意控制节奏，该紧张时紧张，该舒缓时舒缓
- 输出 Markdown 格式"""
```

---

## 九、关键技术点

### 9.1 字数控制策略
- 按目标字数反推章节数（每章约 800-1500 字）
- 生成完成后校验实际字数，差值 < 20% 即合格
- 在 Prompt 中明确指定"本章约需 {target_words} 字"

### 9.2 Token 成本控制
- 短篇（2000 字）≈ 3000 tokens
- 中篇（5000 字）≈ 7500 tokens
- 长篇（10000 字）≈ 15000 tokens
- 使用 gpt-4o-mini 成本约 ¥0.15/千token，长篇小说约 ¥2-3

### 9.3 错误处理
- LLM 调用失败 → 重试 2 次，间隔 3 秒
- 内容安全检查（敏感词过滤）
- 超时控制（单次生成最长 120 秒）
- 前端展示友好错误提示，不清空已生成内容

### 9.4 PDF 导出方案
- 使用 `reportlab` 或 `weasyprint` 将 Markdown 转 PDF
- 保留章节标题、段落缩进、字体排版
- 封面页提取小说标题 + 生成时间

---

## 十、开发计划

| 步骤 | 内容 | 预估工时 |
|------|------|----------|
| 1 | 创建项目目录结构 + 初始化配置 | 0.5h |
| 2 | 实现 LLM Provider 工厂 + LangChain 集成 | 1.5h |
| 3 | 实现 Prompt 模板 + 生成管线 | 2h |
| 4 | 实现 API 路由（生成/查询/导出/删除） | 1h |
| 5 | 实现 SQLite 数据库 + 数据存取 | 1h |
| 6 | 初始化 Vite + React + Tailwind + shadcn/ui | 0.5h |
| 7 | 实现 NovelForm + NovelReader + 流式对接 | 2h |
| 8 | 实现 NovelPage + HistoryPage + ExportBar | 1.5h |
| 9 | 联调 + 测试 | 1h |
| 10 | 编写 README + 启动脚本 | 0.5h |
| **合计** | | **~11.5h** |

---

## 十一、Bug 修复与迭代记录

### 11.1 Bug：章节标题重复 + 居中不对齐

**根因：**
- 后端在 `generator.py:73` 拼接内容时统一加 `## {title}\n\n` 前缀
- LLM 生成的内容开头往往也包含 `## 第X章` 或 `# 第X章` 标题，导致标题出现两次
- 前端 `index.css` 中 `h2` 使用了 `text-center`

**修复：**
- 新增 `_strip_leading_title()` 函数，在拼接前检测并清除 LLM 输出中重复的章节标题行
- 清除规则：如果第一行是 Markdown 标题（`#` 或 `##` 开头）且包含当前章节标题或"第X章"字样，则移除
- CSS 中 `.novel-content h1` / `.novel-content h2` 改为 `text-left`

### 11.2 Bug：字数远远低于目标

**根因：**
- Prompt 仅说"约{word_count}字"，没有给 LLM 明确的分章字数约束
- LLM 默认倾向于生成简短内容，无压力机制保证篇幅

**修复：**
- `prompts.py` 中 `SYSTEM_PROMPT_CHAPTER` 增加字段：`本章目标字数：{target_words}字，请务必达到这个字数要求`
- `generator.py` 中计算 `per_chapter_words = max(800, word_count // len(chapters))`，保证每章的字数分配合理
- 增加 `不要提前结束本章，内容要充实、细节要丰富` 的强硬指示

### 11.3 Bug：导出中文文件名 UnicodeEncodeError

**根因：**
- `Content-Disposition: attachment; filename="中文标题.txt"` 中，HTTP 头 latin-1 编码无法表示中文字符
- Python 的 FastAPI 默认使用 ASCII 编码 Content-Disposition 的 filename 参数

**修复：**
- 使用 RFC 5987 规范的 `filename*=UTF-8''{url_encoded_name}` 格式
- 新增 `_safe_filename()` 辅助函数，使用 `urllib.parse.quote()` 对文件名进行 URL 编码
- 同时去除文件名中 Windows 不允许的特殊字符 `\ / : * ? " < > |`

### 11.4 新增：后端实时日志打印

**方案：**
- 在 `generator.py` 中新增 `_log(msg)` 辅助函数，在每个关键 yield 点调用
- 输出格式：`[HH:MM:SS.ms] [生成管线] 信息内容`
- 关键日志点：Step 开始/完成、章节生成进度、实际字数、耗时

### 11.5 新增：前端思考日志面板

**数据流：**
```
generator.py yield {"event": "log", "data": "📝 开始..."}
  → SSE 流到前端 api.js 解析 event/data
  → CreatePage onEvent 处理 "log" 事件
    → addThinkingLog({ time, type, text })
    → ThinkingLog 组件自动渲染 + 滚动到底部
```

**新增前端组件：ThinkingLog.jsx**
- 终端风格暗色面板（bg-gray-950 + 等宽字体）
- 日志类型驱动 CSS class：info/success/warn/error/chapter
- 使用 emoji 前缀自动判断日志类型
- 日志淡入动画（logFadeIn）
- 新日志自动滚到底部（useRef + scrollIntoView）

**新增 Store 字段：`thinkingLogs: [{ time, type, text }]`**

### 11.6 修复后验证要点

| 验证项 | 预期结果 |
|--------|----------|
| 10000 字请求 | 实际字数 ≥ 8000 |
| 章节标题 | 每章标题仅出现一次 |
| 导出中文名 | 文件名正确显示中文 |
| 后端终端 | 实时打印带时间戳的日志 |
| 前端面板 | 生成时实时显示思考日志 |

## 十二、错误处理与 UX 状态机架构（V1 补充）

### 12.1 问题根因分析

V1 初始版本在模型未配置时的卡死逻辑链：

```
用户点击"生成"
  → frontend startGeneration() 设置 generating=true
  → POST /api/v1/generate
    → backend create OpenAIProvider（不校验 Key，静默成功）
    → 调用 astream() → OpenAI SDK 请求失败抛出异常
    → GeneratorService 捕获异常 → yield error 事件
  → frontend 收到 error 事件 → alert() 弹窗
  → 用户点掉弹窗 → generating=false 正常 ✅ 理论上
```

**实际卡死原因：** 在特定 Provider 下（如 Ollama 不可用），异常在生成器内部未被正确传播到 SSE 流中，导致前端收不到 error/complete 事件，`generating` 永远为 `true`。

### 12.2 修复方案架构

```
┌────────────────────────────────────────────────────────┐
│                    Pre-check 层（新增）                  │
│                                                        │
│  后端: GET /api/v1/config/check                         │
│    → provider.validate() 检查 Key 是否配置               │
│    → 返回 { configured: bool, error: string }           │
│                                                        │
│  前端: ConfigStatus 组件                                │
│    → 页面加载时自动调用 /config/check                    │
│    → 未配置：显示红色警告条 + 禁用/降级生成按钮          │
│                                                        │
│  生成前双重校验:                                        │
│    NovelForm 提交时检查 configOk                         │
│    backend generate() 路由中再次预检                     │
└────────────────────────────────────────────────────────┘
                            │
                            ▼
┌────────────────────────────────────────────────────────┐
│                  防御式执行层（增强）                     │
│                                                        │
│  Provider 层:                                          │
│    validate() 方法 → 构造时检测 Key 有效性              │
│    ⚠️ 在调用 astream() 之前就阻断                       │
│                                                        │
│  SSE 错误处理:                                         │
│    路由层预检失败 → 直接返回 error 事件流               │
│    GeneratorService 异常 → yield error + 中止           │
│    3 分钟前端 AbortController 超时                      │
└────────────────────────────────────────────────────────┘
                            │
                            ▼
┌────────────────────────────────────────────────────────┐
│                  UX 反馈层（新增）                       │
│                                                        │
│  StepProgress 组件:                                     │
│    4 步状态机: 要素解析 → 大纲规划 → 逐章生成 → 标题      │
│    实时显示当前步骤 + 已完成 ✅ + 进行中 🔄               │
│                                                        │
│  ErrorBanner 组件:                                      │
│    红色横幅展示错误信息，替代 alert()                    │
│    显示 "重新开始" 按钮                                  │
│                                                        │
│  ConfigStatus 组件:                                     │
│    顶部导航栏右侧，常驻显示配置状态                      │
│    绿色: ✅ xxx 已配置 | 红色: ❌ 错误信息              │
└────────────────────────────────────────────────────────┘
```

### 12.3 新增 API 端点

#### `GET /api/v1/config/check`

**响应：**
```json
{
  "provider": "openai",
  "configured": false,
  "error": "OpenAI API Key 仍为默认值，请修改为真实密钥",
  "model": "gpt-4o-mini"
}
```

### 12.4 更新后的 SSE 事件流（完整生命周期）

```
event: parse            → 开始要素解析
event: parse_done       → 要素解析完成
event: outline          → 开始大纲规划
event: outline_done     → 大纲规划完成
event: chapter_start    → 开始生成某一章
event: content          → 流式内容块
event: chapter_end      → 单章生成完成
event: title            → 开始生成标题
event: complete         → 全部完成 { novel_id, title, total_words }
event: error            → 出错 { message, type: "config"|"api"|"unknown" }
```

### 12.5 前端状态机

```
IDLE → PARSING → OUTLINING → WRITING → TITLING → DONE
  │                                                   
  └──────────→ ERROR (任何时候可中断) ←───────────────┘
```

Store 中新增字段：

| 字段 | 类型 | 说明 |
|------|------|------|
| currentStep | enum | 当前步骤 IDLE/PARSING/OUTLINING/WRITING/TITLING/DONE/ERROR |
| errorMessage | string | 错误信息 |
| configChecked | bool | 是否已检查配置 |
| configOk | bool | 配置是否正常 |
| configInfo | object | 配置详情 { provider, model, error } |

### 12.6 新增前端组件

| 组件 | 用途 |
|------|------|
| StepProgress.jsx | 4 步进度指示器，显示当前步骤和已完成步骤 |
| ConfigStatus.jsx | 顶部常驻配置状态条，自动检测后端配置 |

### 12.7 更新后的组件树

```
App.jsx (BrowserRouter)
├── / → CreatePage
│   ├── ConfigStatus.jsx        # ← 新增：顶部配置状态
│   ├── ErrorBanner              # ← 新增：内联错误横幅
│   ├── NovelForm.jsx           # 增强：表单预检 + 配置警告
│   ├── StepProgress.jsx        # ← 新增：步骤进度
│   └── NovelReader.jsx         # 增强：加载状态细化
├── /novel/:id → NovelPage
│   ├── NovelReader.jsx
│   └── ExportBar.jsx
└── /history → HistoryPage
    └── NovelCard.jsx × N
