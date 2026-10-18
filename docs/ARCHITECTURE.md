# 🏗️ 技术架构文档

> 更新日期：2026-10-18 ｜ 对应代码：V3.1.1 / V1.6.0 / Demo v1.0
> 分版本细粒度规格见 [novel-build-system/docs/spec/](../novel-build-system/docs/spec/)（API/DB/DESIGN-v1..v3.md）

---

## 1. 总体架构

系统采用 **前后端分离 + 多智能体管线 + Provider 抽象** 三层架构，另有一条纯静态 Demo 支线：

```
┌────────────── 用户入口 ──────────────┐
│ React SPA（V1/V3）  GitHub Pages Demo │
└──────────────┬───────────────────────┘
        SSE / REST API
┌──────────────┴───────────────────────┐
│ FastAPI Backend                      │
│  routers → services → llm factory   │
│  CrewAI/LangChain 四智能体管线        │
│  SQLAlchemy ORM（SQLite）            │
└──────────────┬───────────────────────┘
┌──────────────┴───────────────────────┐
│ SQLite + 文件系统（小说正文/配图）     │
└──────────────────────────────────────┘

Demo 支线（无后端）：
  demo/static → 模拟引擎(LLM 仿真) → localStorage
  GitHub Actions(push demo/**) → Pages 制品 → github.io
```

## 2. 前端（V3）

- **技术**：React 18 + TypeScript 5 + Vite 6 + TailwindCSS + Zustand + React Router 6
- **页面域**：CreatePage（表单创作）、ChatPage（对话创作 + 状态看板）、NovelPage（阅读/编辑/辅助工具入口）、HistoryPage（记录管理）、PromptsPage、Settings（模型配置）
- **状态管理**：Zustand store 承载生成进度（STEP_CONFIG）、记录列表、模型配置；共享常量集中在 `src/lib/constants.ts`（LABEL_MAP、DEMO_GENRES 等，v3.1.1 去重成果）
- **流式渲染**：`EventSource` 风格 SSE 消费 → 增量 patch store → 组件级订阅更新

## 3. 后端（V3）

- **框架**：FastAPI + Pydantic 2 + SQLAlchemy 2（async session）
- **路由分组**（15 个 router，前缀 `/api/v3`）：
  - 生成：`generate`（SSE）/ `generate/continue` / `generate/openings` / `chat`
  - 记录：`records`（分页/状态轮询/取消/重置/删除）
  - 小说：`novels`（详情/删除级联/bible/情感曲线）
  - 导出：`export`（TXT/MD/PDF/EPUB/逐章 ZIP/outline）
  - 辅助：`dialogue` / `assistant(continue/rewrite/refine)` / `theme` / `illustrations` / `tts` / `analysis` / `quotes`
- **中间件**：CORS localhost 白名单、请求体 10MB 限制、全局异常处理器（统一 JSON 错误）、API Key 响应脱敏
- **SSE 会话安全**：`chat.py` 使用独立 SessionLocal，防止 generator 迭代期间 session 被关闭（v3.1.1 修复）

### 3.1 LLM Provider 工厂

```python
# app/llm/ —— 统一 OpenAI 兼容协议
LLM_PROVIDER=openai|opencode|agnes|...
{PROVIDER}_API_KEY / {PROVIDER}_BASE_URL / {PROVIDER}_MODEL
```

新增 Provider 只需：env 三元组 + factory 注册；V1.6 引入 `config.py` 支持 ModelConfig 持久化到 DB 并前端脱敏回显。

### 3.2 四智能体管线（services/generator.py）

| Agent | 角色 | 输入 | 输出 |
|-------|------|------|------|
| ParserAgent | 故事要素分析师 | 种子句 | 六维要素 JSON（人物/时间/地点/起因/发展/结局） |
| OutlinerAgent | 大纲架构师 | 要素 + 参数 | 六层大纲（战略/人物/设定/结构/节奏/风格）+ 章节表 |
| WriterAgent | 章节作家 | 大纲 + Bible + 前情 | 逐章正文（token 级流式） |
| TitlerAgent | 标题专家 | 全文摘要 | 候选书名 → 定稿 |

一致性机制：F6 设定档案（Bible）注入 Writer 上下文；断点续写按 `paragraph_versions` 与记录 status 定位断点章节。

## 4. 数据模型（SQLite）

| 表 | 关键字段 | 说明 |
|----|----------|------|
| `generation_records` | id, seed, status(running/completed/failed/cancelled), channel/genres/style, progress | 生成任务主记录 |
| `novels` | id, record_id, title, outline_json, word_count | 成书 |
| `chapter_contents` | novel_id, index, title, content | 章节正文 |
| `paragraph_versions` | paragraph_id, version, content | 段落版本历史（润色回溯） |
| `model_configs` | provider, base_url, model, api_key_masked | 模型配置（Key 脱敏存储） |

索引：记录状态轮询、小说列表时间序、章节序号、段落版本查询 4 条关键路径（v3.1.1）。

## 5. 在线 Demo 架构（demo/）

- **零依赖静态站点**：`index.html` + `assets/style.css` + `assets/app.js`（原生 JS，无框架、无构建）
- **模块**：
  - `Store`：localStorage 读写（`tomato.demo.records.v1` / `tomato.demo.config.v1`）
  - `generate()`：async 流水线，逐 Agent `await + DOM 打字机输出`，等价模拟后端 SSE
  - 文本引擎：`extractElements()`（六维要素）→ 章节模板表 → `renderParagraph()`（占位符填充）→ `genTitle()`
  - 页面路由：hash 路由（create/chat/history/detail/prompts/settings）
- **部署链**：`push demo/** → actions/upload-pages-artifact(demo/) → actions/deploy-pages → https://snow-sakura.github.io/novel-generator/`
- **隐私边界**：无任何 fetch/XHR；密钥输入框保存时即转掩码字符串存储

## 6. 与真实后端的能力映射

| 真实能力 | Demo 等价实现 |
|----------|---------------|
| FastAPI + LLM | 前端模板引擎 + 异步流式模拟 |
| SSE 流式 | `await sleep()` 打字机 |
| SQLite 三表 | localStorage 结构化 JSON 记录 |
| 模型配置持久化 + 脱敏 | localStorage + `sk-•••末3位` |
| 多格式导出 | Blob 下载 TXT/MD/JSON |

## 7. 关键技术决策（ADR 摘要）

1. **SQLite 而非 PG**：单机创作者场景，零运维、可随目录备份；
2. **SSE 而非 WebSocket**：单向下行足够，浏览器原生重连；
3. **Provider 工厂只依赖 OpenAI 兼容协议**：国产模型网关大多兼容，扩展成本最低；
4. **Demo 不用构建工具**：Pages 直接发源码目录，杜绝 lockfile/CI 依赖，永久可用；
5. **Demo 数据 localStorage**：满足「数据记录也全部用 GitHub 生态实现」——数据属于访问者本地，平台侧零存储。

## 8. 质量保障（CI 矩阵）

| Workflow | 内容 |
|----------|------|
| `e2e.yml` | **V3 前端 Playwright E2E 92 用例离线运行**：`tests/mock-server.mjs` 托管 dist + `/api/v3` fixture（空/有数据经 `page.route` 精准控制），无需后端与密钥；失败上传 playwright 报告制品 |
| `e2e-v1.yml` | **V1 冒烟（pytest-playwright 12 用例）离线运行**：`v1/tests/mock-server.mjs` 托管 frontend/dist + `/api/v1` fixture，build 后直接跑 |
| `api-tests.yml` | V3 后端 pytest TestClient 冒烟（9 用例）：conftest 注入临时 SQLite 并清空密钥 env，离线无网络调用 |
| `api-tests-v1.yml` | V1 后端同款冒烟（7 用例）；列表断言只锁结构（启动会从 docs/novel 文件恢复，机器间数据量不同） |
| `security-scan.yml` | gitleaks 全历史 + 工作区禁入文件/硬编码 Key 门禁 |
| `docker.yml` | compose 配置校验 + v1/v3 前后端 4 镜像构建 |
| `deploy-pages.yml` | Demo 发布 GitHub Pages |
| `novel-build-test/.github/workflows/ci.yml` | AISQA：ruff + pytest + 前端 lint/build |

其余：`novel-build-system/v1/tests/test_e2e.py`（V1 冒烟）、`novel-build-test/frontend/e2e/*.spec.ts`。仓库 README 截图同样由 Playwright 自动产出（复现方法见 [DEPLOYMENT.md §5](DEPLOYMENT.md#5-截图流水线可选)）。
