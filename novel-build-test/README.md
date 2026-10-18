# 🧪 AISQA — AI 驱动的智能测试平台

> **AI-driven Software Quality Assurance Platform** ｜ 后端 v1.2.0（42 modules / 287 APIs）｜ v1.3.0 开发中（≈46%）
>
> 隶属 [novel-generator](../README.md) 仓库的独立子项目：用 Agent 驱动测试用例生成、执行与质量评估。

---

## 1. 项目定位

- 面向测试工程师的 AI 平台：需求 → 用例 → 执行 → 报告的自动化闭环；
- Agent 编排：LangGraph + AutoGen + MCP 工具协议；
- 知识库：sentence-transformers 向量化 + Qdrant 检索。

## 2. 技术栈

| 层 | 技术 |
|----|------|
| 后端 | Python 3.12 · FastAPI · SQLAlchemy 2 + Alembic · LangGraph · AutoGen · MCP · pytest · ruff |
| 存储 | MySQL (aiomysql) · Redis · Qdrant |
| 前端 | React 19 · TypeScript · Radix UI · TanStack Query/Table · TailwindCSS v4 · vitest · Playwright |
| 编排 | docker-compose（MySQL + Redis + Qdrant + backend + frontend） |

## 3. 快速启动

```bash
# 一键（Docker 全栈 + 前后端）
./run.sh

# 仅中间件（MySQL/Redis/Qdrant），本地起前后端调试
./run.sh --docker
bash start-dev.sh

# 手动
cd backend  && python -m venv .venv && .venv/bin/pip install -e ".[dev]" \
            && cp .env.example .env   # 填入 DB/Redis/Qdrant/LLM 配置（.env 不会入库）
.venv/bin/uvicorn app.main:app --reload --port 8000
cd frontend && npm install && npm run dev
```

> 🔐 敏感配置一律写入 `backend/.env`（已被根 .gitignore 排除），仓库只保留 `.env.example` 模板。详见 [docs/SECURITY.md](../docs/SECURITY.md)。

## 4. 测试与 CI

```bash
cd backend  && .venv/bin/pytest            # 单测
cd frontend && npm run test                # vitest
cd frontend && npx playwright test         # E2E（e2e/*.spec.ts 4 套）
```

CI：[.github/workflows/ci.yml](.github/workflows/ci.yml)（后端 ruff + pytest；前端 lint + build）。

## 5. 目录与文档

```
novel-build-test/
├── backend/            # FastAPI（42 模块 / 287 API，见 docs/v1/v1.2.0-版本清单.md）
├── frontend/           # React 19 SPA
├── scripts/            # 辅助脚本
├── docker-compose.yml  # 全栈编排
├── run.sh / start-dev.sh
└── docs/
    ├── README.md       # 文档索引
    ├── v0/             # v0 归档：功能清单 / 架构 / API / 部署 / 设计规范 / 执行计划
    └── v1/             # v1 现行：模块拆解(P0-P3) / 版本清单 / GUI 化规划 / 设计规范
```

## 6. 里程碑

| 版本 | 状态 | 内容 |
|------|------|------|
| v1.2.0 | ✅ 完成 | 42 模块 / 287 API |
| v1.3.0 | 🚧 46% | GUI 化 + P2/P3 模块（进度见 [TODO.md](TODO.md)） |
