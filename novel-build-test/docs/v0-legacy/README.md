# AISQA — AI-Native 多智能体软件质量评估平台

AISQA（AI Software Quality Assurance）是一个基于国产大模型的 AI-Native 多智能体协作测试平台。平台以 novel-generator 为被测系统（SUT），实现白盒/黑盒/灰盒测试全覆盖，由 AI 自主驱动测试全生命周期。

---

## 核心特性

- **7 大 AI 智能体协同工作**：需求分析、测试架构、测试设计、用例编写、执行分析、质量审计、成本优化
- **双引擎架构**：LangGraph 有状态工作流 + AutoGen 多模型辩论引擎
- **5 层模型分级策略**（2026-07 最新）：DeepSeek-V4-Flash 处理 70% 常规任务，DeepSeek-V4-Pro 负责推理审计，GLM-5 结构化输出，Qwen3-Max 复杂决策，Kimi K2.5 长文档分析
- **AI-Native 4 支柱**：向量数据库(Qdrant) + 事件总线(Redis) + MCP 协议集成 + RAG 知识检索
- **6 大公共模块全覆盖**：项目管理、需求管理、测试环境、测试资产、AI 知识库、系统设置
- **暖白拍立得风格前端**：极简 Polaroid 卡片 UI + 交互动画
- **人民币计价成本优化**：5 层优化策略（模型分级 + 缓存 + 批量 + 增量 + 结构化输出）
- **JWT + RBAC 安全体系**：双因子认证 + 角色权限控制

---

## 技术栈

### 前端
| 技术 | 版本 | 用途 |
|------|------|------|
| React | 19 | UI 框架 |
| Vite | 8 | 构建工具 |
| TypeScript | 6 | 类型安全 |
| TailwindCSS | 4 | 样式框架 |
| shadcn/ui | latest | 组件库 |
| TanStack Query | 5 | 数据获取 |
| Zustand | 5 | 状态管理 |
| Recharts | 2 | 可视化图表 |
| framer-motion | 11 | 交互动画 |
| React Router | 7 | 路由管理 |

### 后端
| 技术 | 版本 | 用途 |
|------|------|------|
| Python | 3.12 | 编程语言 |
| FastAPI | 0.115 | Web 框架 |
| SQLAlchemy | 2.0 | ORM |
| MySQL | 9.0 | 数据库 |
| Alembic | 1.14 | 数据库迁移 |
| Redis | 7.x | 事件总线 + 缓存 |
| Qdrant | 1.13 | 向量数据库 |
| LangGraph | 0.3 | 智能体工作流 |
| PyAutoGen | 0.8 | 多智能体辩论 |

### 国产大模型（2026-07 最新版）
| 模型 | API ID | 单价(¥/M tokens) | 用途 |
|------|--------|-----------------|------|
| DeepSeek-V4-Flash | `deepseek-v4-flash` | ~1 | L1 常规任务（需求分析、用例、报告） |
| DeepSeek-V4-Pro | `deepseek-v4-pro` | ~12 | L2 推理审计、质量审计辩论 |
| GLM-5 | `glm-5` | ~7 | L3 结构化输出、测试计划 |
| Qwen3-Max | `qwen3-max` | ~2.5 | L4 复杂决策、架构设计 |
| Kimi K2.5 | `kimi-k2.5` | ~6.5 | L5 长文档分析（256K 上下文） |

---

## 项目结构

```
novel-build-test/
├── backend/
│   ├── app/
│   │   ├── main.py              # FastAPI 应用入口
│   │   ├── config.py            # 配置管理（pydantic-settings）
│   │   ├── database.py          # 数据库引擎与会话
│   │   ├── agents/              # AI 智能体
│   │   │   ├── base.py          # 智能体基类
│   │   │   ├── dispatch_controller.py  # 调度总控
│   │   │   ├── debate_engine.py        # 辩论引擎
│   │   │   ├── workflow_graph.py       # LangGraph 工作流
│   │   │   ├── requirements_analyst.py # 需求分析
│   │   │   ├── test_architect.py       # 测试架构
│   │   │   ├── test_designer.py        # 测试设计
│   │   │   ├── test_case_writer.py     # 用例编写
│   │   │   ├── execution_analyst.py    # 执行分析
│   │   │   ├── quality_auditor.py      # 质量审计
│   │   │   └── cost_optimizer.py       # 成本优化
│   │   ├── models/              # SQLAlchemy ORM 模型（10 个表）
│   │   ├── schemas/             # Pydantic 请求/响应
│   │   ├── routers/             # FastAPI 路由（9 个模块）
│   │   ├── vector_db/           # Qdrant 向量数据库
│   │   ├── event_bus/           # Redis 事件总线
│   │   ├── mcp_integration/     # MCP 协议集成
│   │   └── rag_pipeline/        # RAG 知识检索
│   ├── alembic/                 # 数据库迁移
│   └── requirements.txt
├── frontend/
│   └── src/
│       ├── components/
│       │   ├── polaroid/        # 拍立得卡片组件
│       │   ├── lifecycle/       # STLC 生命周期组件
│       │   ├── ai-chat/         # AI 助手组件
│       │   └── ui/              # shadcn/ui 基础组件
│       ├── pages/               # 页面
│       └── lib/                 # API 客户端、工具函数
├── docs/                        # 项目文档
└── qdrant_storage/              # Qdrant 数据持久化
```

---

## 快速启动

### 环境要求
- Python 3.12+
- Node.js 22+
- pnpm 9+
- MySQL 9.0+
- Redis 7.x+
- Qdrant 1.13+

### 启动步骤

```bash
# 1. 启动基础设施
brew services start mysql
brew services start redis
# Qdrant（本地二进制，非 Docker）
./qdrant --storage-path ./qdrant_storage

# 2. 启动后端
cd novel-build-test/backend
source .venv/bin/activate
uvicorn app.main:app --reload --port 8000

# 3. 启动前端
cd novel-build-test/frontend
pnpm install
pnpm dev
```

访问 http://localhost:5173

---

## 文档索引

| 文档 | 说明 |
|------|------|
| [架构设计.md](./架构设计.md) | 系统架构、模块设计、数据流 |
| [前端设计规范.md](./前端设计规范.md) | 暖白拍立得设计规范、组件库 |
| [API文档.md](./API文档.md) | API 接口参考手册 |
| [部署指南.md](./部署指南.md) | 部署步骤与环境配置 |
