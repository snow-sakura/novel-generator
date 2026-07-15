# Novel Generator Project

> 项目: 番茄小说生成器 & AISQA 智能测试平台
> 更新日期: 2026-07-15
> 版本: v1.1.0

## 项目概述

本项目包含两个主要子系统：

### 1. 番茄小说生成器 (novel-build-system/)
AI 驱动的小说创作工具，支持 V1/V2/V3 三个版本：
- **V1** - 骨架版：基础生成功能
- **V2** - 血肉版：叙事升级，段落润色
- **V3** - 灵魂版：主题深度、情感曲线、配图语音

技术栈：Python FastAPI + CrewAI + SQLAlchemy + SQLite

### 2. AISQA 智能测试平台 (novel-build-test/)
AI 驱动的智能测试平台，包含 21 大模块、81 二级功能：
- **公共模块** - 系统设置、审计日志、认证安全、集成通知
- **项目模块** - 项目管理、需求管理、测试环境、资产库、知识库
- **AI 智能体** - 9 个智能体（需求分析、测试架构、测试设计等）
- **AI 测试** - 8 种测试类型 + 执行报告
- **AI 应用** - AI 聊天室、数据库调优、AI 助手
- **AI 配置** - 模型配置、提示词工程、去AI味、技能、工作流等
- **个人设置** - 个人设置、用户管理、角色管理

技术栈：FastAPI + SQLAlchemy (async) + Alembic + React 19 + TypeScript + Vite 8 + Tailwind CSS 4 + shadcn/ui

## 目录结构

```
novel-generator/
├── novel-build-system/          # 番茄小说生成器代码
│   ├── v1/                      # V1 版本代码
│   ├── v2/                      # V2 版本代码
│   ├── v3/                      # V3 版本代码
│   └── docs/                    # PRD 文档和生成的小说
│       ├── prd/                 # 产品需求文档
│       └── novel/               # 生成的小说存储
│
├── novel-build-test/            # AISQA 智能测试平台
│   ├── backend/                 # FastAPI 后端
│   ├── frontend/                # React 前端
│   ├── docs/                    # 项目文档
│   │   ├── v0-legacy/           # v0 版本文档（已归档）
│   │   └── v1/                  # v1 版本文档（当前）
│   ├── scripts/                 # 脚本工具
│   └── TODO.md                  # 实现 TODO 清单
│
└── README.md                    # 本文件
```

## 快速开始

### 番茄小说生成器

```bash
# V1 启动
cd novel-build-system/v1/backend
source .venv/bin/activate
python -m app.main

# V2 启动
cd novel-build-system/v2/backend
source .venv/bin/activate
python -m app.main

# V3 启动
cd novel-build-system/v3/backend
source .venv/bin/activate
python -m app.main
```

### AISQA 智能测试平台

```bash
# 后端启动
cd novel-build-test/backend
source .venv/bin/activate
uvicorn app.main:app --reload --port 8000

# 前端启动
cd novel-build-test/frontend
npm install
npm run dev
```

## 文档

- [AISQA 文档目录](novel-build-test/docs/README.md)
- [AISQA v1 版本文档](novel-build-test/docs/v1/README.md)
- [AISQA 功能清单](novel-build-test/docs/v1/功能清单.md)
- [AISQA 前端设计规范](novel-build-test/docs/v1/前端设计规范.md)
- [AISQA 模块架构](novel-build-test/docs/v1/模块架构.md)
- [AISQA TODO 清单](novel-build-test/TODO.md)

## 版本历史

| 版本 | 日期 | 说明 |
|------|------|------|
| v1.1.0 | 2026-07-15 | AISQA 全部 108 任务完成，Docker 容器化支持 |
| v1.0.0 | 2026-07-14 | AISQA 新增 Hermes 智能体配置、Skills 技能中心 |
| v0.1.0 | 2026-07-14 | 项目初始化，19 大模块 69 二级功能 |

## 开发规范

### 敏感信息保护
- `.env` 文件已添加到 `.gitignore`
- API keys、tokens、数据库文件等敏感信息不会提交到 GitHub
- 使用环境变量管理配置

### 代码规范
- 后端：Python 类型提示、异步 I/O、参数化查询
- 前端：React 函数组件、TypeScript 类型安全、Tailwind CSS

## 许可证

私有项目，仅限内部使用。