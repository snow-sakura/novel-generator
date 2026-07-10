# 番茄小说生成智能体 V3 — 设计文档

## 决策总表

| 维度 | V3 选择 |
|------|---------|
| 项目形态 | Web 全栈应用（前后端分离），monorepo |
| 前端框架 | Vite + React 18 + TailwindCSS 3 + Zustand + React Router |
| 后端框架 | Python 3.12 + FastAPI + LangChain + CrewAI 0.108+ |
| 数据库 | SQLite 3 + SQLAlchemy 2.0（`novel_generator_v3.db`） |
| LLM 架构 | 多 Provider 工厂模式（OpenAI / Anthropic / Ollama / OpenCode Zen / 国产模型） |
| 生成方式 | CrewAI 4 智能体管线 + SSE 流式逐章输出 |
| 分段策略 | V3 统一单分段（`<--->` 分隔符），不再支持多分段选项 |
| 用户认证 | V3 暂不启用 |
| 导出格式 | Markdown + TXT + PDF + ZIP（逐章） + XMind（大纲） |
| 数据迁移 | `migrate_database()` 启动时自动 ALTER TABLE 新增列 |

---

## 一、V3 新增功能总览

V3（灵魂版）在 V2（血肉版，叙事技巧升级）基础上，聚焦**深度创作辅助**，新增 F1-F13 共 13 项功能。

### F1 — F13 功能矩阵

| 编号 | 功能 | 类型 | 核心文件 |
|------|------|------|----------|
| F1 | 频道/题材/风格多选 | 配置 | `data.py`, `NovelForm.jsx` |
| F2 | 叙事技巧（视角/节奏/风格强度/悬念/反转） | 配置 | `generator.py`, `NovelForm.jsx` |
| F3 | 金句管理（提取/收藏/复制） | 后端+前端 | `routers/quotes.py`, `GoldenQuotesPanel.jsx` |
| F4 | 美学风格（轻度/中度/重度） | 后端 | `prompts.py`（AESTHETIC_BLOCKS） |
| F5 | 文末解读（意义提炼） | 后端 | `generator.py`（interpretation） |
| F6 | 设定档案（跨章节一致性） | 后端 | `character_bible` 字段, `bible.py` |
| F7 | 不同结局生成（好/坏/开放式） | 后端+前端 | `prompts.py`（ENDING_BLOCKS）, `NovelForm.jsx` |
| F8 | 对话插入确认 | 前端 | `DialogueGenerator.jsx`, `NovelPage.jsx` |
| F9 | AI 推荐主题 | 后端 | `routers/theme.py` |
| F10 | 生成记录管理（分页/轮询/继续/取消） | 后端+前端 | `routers/generate.py`, `HistoryPage.jsx` |
| F11 | AI 配图（生成/展示/删除） | 后端+前端 | `routers/illustrations.py`, `IllustrationsPanel.jsx` |
| F12 | TTS 语音合成（edge-tts） | 后端+前端 | `routers/tts.py`, `TTSController.jsx` |
| F13 | 统计分析（词频/角色/情感曲线可视化） | 后端+前端 | `routers/analysis.py`, `AnalysisPanel.jsx` |

---

## 二、项目目录结构（V3）

```
v3/
├── backend/
│   ├── app/
│   │   ├── main.py                    # FastAPI 入口 + CORS + 路由注册 + 数据库迁移
│   │   ├── config.py                  # 配置管理（模型 key、数据库路径等）
│   │   ├── database.py                # SQLite 连接 + migrate_database()
│   │   ├── models/
│   │   │   ├── novel.py               # Novel 模型（V3 新增6字段）
│   │   │   ├── generation_record.py   # GenerationRecord
│   │   │   ├── generation.py          # GenerationLog
│   │   │   ├── model_config.py        # ModelConfig
│   │   │   ├── paragraph_version.py   # ParagraphVersion
│   │   │   └── prompt_template.py     # PromptTemplate
│   │   ├── routers/
│   │   │   ├── generate.py            # SSE 流式生成 + 开头对比 + 继续生成
│   │   │   ├── novels.py              # CRUD + PATCH bible/emotion-curve
│   │   │   ├── refine.py              # 段落润色 SSE + 版本历史
│   │   │   ├── dialogue.py            # 角色对话生成 SSE
│   │   │   ├── assist.py              # 写作助手（续写/改写）SSE
│   │   │   ├── illustrations.py       # AI 配图 CRUD
│   │   │   ├── tts.py                 # TTS 语音合成
│   │   │   ├── analysis.py            # 统计分析
│   │   │   ├── quotes.py              # 金句提取
│   │   │   ├── theme.py               # AI 推荐主题
│   │   │   ├── chat.py                # AI 对话式生成 SSE
│   │   │   ├── model_config.py        # 模型配置 CRUD
│   │   │   └── export.py              # 多格式导出
│   │   ├── services/
│   │   │   ├── generator.py           # 核心生成管线（CrewAI 编配）
│   │   │   ├── prompts.py             # 所有 Prompt 模板 + AESTHETIC_BLOCKS + ENDING_BLOCKS
│   │   │   ├── agents.py              # CrewAI 4 角色 Agent 定义
│   │   │   ├── chat_service.py        # 对话式生成包装器
│   │   │   ├── bible.py               # 设定档案服务
│   │   │   └── analysis_service.py    # 统计分析服务
│   │   ├── llm/
│   │   │   └── provider.py            # 多 Provider 工厂（generate_stream / validate）
│   │   └── data.py                    # 男频19类/女频18类/15种风格 + 国产模型列表
│   ├── requirements.txt
│   ├── .env.example
│   └── run.sh
├── frontend/
│   ├── src/
│   │   ├── App.jsx                    # 路由定义
│   │   ├── pages/
│   │   │   ├── CreatePage.jsx         # 生成页（含 NovelForm + MultiStepLog）
│   │   │   ├── NovelPage.jsx          # 小说详情页（集成所有 F 面板）
│   │   │   ├── HistoryPage.jsx        # 生成记录历史（3s 轮询）
│   │   │   └── SettingsPage.jsx       # 设置页面
│   │   ├── components/
│   │   │   ├── NovelForm.jsx          # F1/F2/F7 配置表单
│   │   │   ├── MultiStepLog.jsx       # 生成过程日志面板
│   │   │   ├── OutlineModal.jsx       # 6层大纲弹窗
│   │   │   ├── ChaptersModal.jsx      # 章节弹窗
│   │   │   ├── CompleteDialog.jsx     # 生成完成确认弹窗
│   │   │   ├── AnalysisPanel.jsx      # F13 统计分析面板（词云+情感曲线+角色分析）
│   │   │   ├── EmotionTab.jsx         # F13 情感曲线 SVG 可视化
│   │   │   ├── WordCloudChart.jsx     # F13 词云组件
│   │   │   ├── CharacterAnalysis.jsx  # F13 角色出现分析
│   │   │   ├── GoldenQuotesPanel.jsx  # F3 金句管理（浏览/收藏/复制）
│   │   │   ├── TTSController.jsx      # F12 语音合成控制器
│   │   │   ├── IllustrationsPanel.jsx # F11 AI 配图展示
│   │   │   ├── DialogueGenerator.jsx  # F8 对话插入
│   │   │   └── BiblePanel.jsx         # F6 设定档案展示
│   │   ├── stores/
│   │   │   └── novelStore.js          # Zustand store（生成状态/进度/日志）
│   │   └── services/
│   │   │       └── api.js             # 所有 API 调用 + demo 模式回退
│   └── package.json
└── *.md                               # 项目文档
```

---

## 三、核心技术决策

### 3.1 金句提取（F3）

- **提取方式**: 从正文中扫描 `> *text*` 格式的引用行（Markdown blockquote + italic）
- **不使用新 DB 表**: 纯文本解析，动态提取，不持久化存储
- **前端功能**: 按章节分组展示、收藏标记（localStorage）、一键复制

### 3.2 美学风格（F4）

- **实现**: 4 级强度（关闭/轻度/中度/重度），通过 `prompts.py` 中的 `AESTHETIC_BLOCKS` 字典注入系统 Prompt
- **注入方式**: 在要素解析（parse）阶段追加到 `SYSTEM_PROMPT_PARSE`；在逐章写作阶段追加到 `SYSTEM_PROMPT_CHAPTER`
- **效果**: 轻度 → 适当文学修饰；中度 → 增加比喻和意境描写；重度 → 大量修辞和诗意表达

### 3.3 文末解读（F5）

- **触发**: 正文生成完成后，`generator.py` 调用 `_call_llm` 生成解读文本
- **上下文**: 传入种子句、大纲 JSON、正文前 3000 字（控制 Token 消耗）
- **存储**: 写入 `novel.interpretation` 字段

### 3.4 设定档案（F6）

- **数据结构**: JSON 对象，包含 `characters`（姓名/角色/性格/描述）、`locations`、`world_rules`、`key_items`、`timeline`
- **生成**: 要素解析阶段由 Agent 自动提取并填充
- **存储**: `novel.character_bible` 字段；`PATCH /novels/{id}/bible` 允许用户手动更新
- **跨章节注入**: 每章开始生成时，将 `character_bible` 中的人物性格描述注入 context

### 3.5 不同结局（F7）

- **实现**: prompt 注入（非独立管道）
  - `ENDING_BLOCKS` 字典定义 3 种结局类型的系统 Prompt 模板（好结局/坏结局/开放式）
  - 用户选择后，在最后 2 章的 Prompt 中注入对应模板
  - `ending_type` 参数通过生成参数传入，默认为空（自动）
- **开头对比**: `POST /api/v3/generate/openings` 生成 2-5 个不同视角×节奏的开头版本 SSE 流式推送

### 3.6 对话插入（F8）

- **前端实现**: `DialogueGenerator.jsx` 组件，在 NovelPage 中作为面板展示
- **交互**: 用户选择角色和场景 → 调用 `POST /api/v3/dialogue/generate` → SSE 流式返回对话 → 用户确认后 `POST /paragraphs/insert` 插入到指定位置
- **角色数据**: 从 `novel.character_bible` 读取角色信息

### 3.7 AI 推荐主题（F9）

- **实现**: `POST /api/v3/theme/suggest` 调用 LLM 分析种子句，返回单字符串主题词
- **调用时机**: 用户填写种子句后自动触发（或手动点击推荐按钮）
- **常用主题**: 成长、勇气、选择、救赎、复仇、爱情、友情、梦想、真相、反抗

### 3.8 生成记录（F10）

- **分页**: `GET /api/v3/records?page=1&page_size=20` 支持分页
- **轮询**: HistoryPage 每 3s 调用 `GET /records/{id}/status`，高亮显示进行中记录
- **继续**: `?continue=true&record_id=X` 接受 `failed` 和 `cancelled` 两种状态，从断点章节恢复
- **取消**: 前端先 `POST /records/{id}/cancel` 标记 DB 状态，再 `abortController.abort()`
- **清理**: `POST /api/v3/cleanup` 一键清理

### 3.9 AI 配图（F11）

- **生成**: `POST /api/v3/illustrations/generate` → 调用 LLM 生成 Prompt → 返回 URL（demo 模式返回占位图）
- **存储**: `novel.illustrations` JSON 数组 `[{chapter_index, prompt, url, generated_at}]`
- **前端**: `IllustrationsPanel.jsx` 在 NovelPage 中展示，每章可独立生成/删除

### 3.10 TTS 语音合成（F12）

- **引擎**: `edge-tts`（免费离线，不支持 macOS Apple Silicon → 降级为 browser TTS）
- **双模式**: 
  - Server TTS（Linux/Windows 可用 edge-tts）
  - Browser TTS（macOS fallback，使用 Web Speech API `speechSynthesis`）
- **声优**: 预置列表（`zh-CN-XiaoxiaoNeural` 等 8 种），`GET /api/v3/tts/voices`
- **音频**: 存储为 `docs/novel/{title}/audio/` 目录下的 WAV 文件
- **前端**: `TTSController.jsx` — 选声优 → 选章节 → 播放/暂停/下载/全本生成

### 3.11 统计分析（F13）

- **情感曲线**: 后端从 `novel.emotion_curve` 读取 JSON，前端 `EmotionTab.jsx` 用 SVG 渲染（起承转合四阶段 + 情感标签 + 强度折线）
- **词频**: `analysis_service.py` 用 jieba 分词 + 停用词过滤 → `word_frequency` JSON
- **角色出现**: 统计每章各角色出现次数 → `char_appearances` JSON
- **基础统计**: 总字数、章节数、每章字数、阅读时间估计
- **缓存**: 后端分析结果按 novel_id 缓存，重复请求直接返回

---

## 四、SSE 事件扩展

V3 在 V2 的 SSE 事件基础上新增：

| 事件 | 用途 |
|------|------|
| `opening_version` | 多开头对比版本 |
| `openings_done` | 所有开头版本完成 |
| `emotion_curve` | 情感曲线数据 |
| `dialogue_content` | 对话生成文本 |

---

## 五、与 V2 架构差异

| 维度 | V2 | V3 |
|------|----|----|
| 新增后端路由 | generate 基础 + refine | +13 个路由（dialogue/assist/illustrations/tts/analysis/quotes/theme） |
| 新增 DB 字段 | paragraph_versions | +7 字段（novels）+ 2 字段（generation_records）+ generation_logs 表 |
| 前端页面 | CreatePage + NovelPage + History | + SettingsPage |
| 前端组件 | 基础面板 | + AnalysisPanel/EmotionTab/GoldenQuotesPanel/TTSController/IllustrationsPanel/DialogueGenerator/BiblePanel |
| 文件存储 | docs/novel/{title}/（txt/md/pdf/xmind） | + audio/ 子目录 |
| Prompt 复杂度 | 基础 + 叙事技巧 | + AESTHETIC_BLOCKS + ENDING_BLOCKS + EMOTION_CURVE_PROMPT |
