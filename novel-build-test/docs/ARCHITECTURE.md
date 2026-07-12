# AI 驱动多项目测试平台 — 架构设计文档

## 一、概述

本系统是一个 AI 驱动的通用多项目测试平台，实现：
- **AI 全自动**：解析需求 → 生成 Prompt → 设计用例 → 生成代码 → 执行 → 分析 → 报告 → 复盘
- **人仅审核**：人在 3~4 个节点做"批准/驳回/编辑"决策
- **多项目支持**：一次接入多个项目（novel-generator / SHOP / TTS），每个项目独立管理
- **版本追溯**：AI 生成的内容和人的修改均有版本记录，可回滚、可对比

### 核心原则

1. **一切内容由 AI 首次生成** — 人不需要写 Prompt、用例、代码
2. **所有修改都有版本记录** — 每次编辑产生新版本，可追溯、可回滚
3. **人只做审核决策** — 批准、驳回、或编辑后批准
4. **跨项目共享 Agent** — 同一套智能体服务所有项目

---

## 二、软件测试生命周期（STLC）映射

| 阶段 | 智能体 | 核心产出 | 人是否介入 |
|------|--------|---------|-----------|
| 0. 自配置 | prompt_generator | 全套 Prompt 配置 | ✅ 审核 Prompt |
| 1. 需求分析 | requirements_analyst | 结构化需求树 + 安全风险发现 | ❌ 全自动 |
| 2. 测试计划 | test_manager | 测试计划（范围/策略/排期/风险） | ✅ 审核计划 |
| 3a. 用例设计 | test_designer | 测试用例库 + 测试数据 | ✅ 审核用例 |
| 3b. 用例审核 | test_reviewer | 用例质量评分 + 补充建议 | ✅ 最终确认 |
| 4. 代码生成 | test_designer.code_generator | 可执行测试代码(pytest/PHPUnit) | ❌ 全自动 |
| 5. 测试执行 | test_executor | 执行结果 + 截图/日志 | ❌ 全自动 |
| 6. 缺陷管理 | defect_manager | 缺陷报告（严重程度分类） | ✅ 审核分配 |
| 7. 测试报告 | test_reporter | 质量报告 + RTM 更新 | ✅ 归档确认 |
| 8. 知识沉淀 | knowledge_indexer | 失败模式 + Chroma 更新 | ❌ 全自动 |

---

## 三、数据模型核心设计

### 统一版本管理模式

每个"可审核内容"实体采用双表结构：

```
主表: {entity}s
  ├─ id, project_id, current_version, status, created_at, updated_at
  └─ 职责: 当前最新状态

版本表: {entity}_versions
  ├─ id, {entity}_id, version, content(JSON),
  ├─ created_by(ai/user), change_type(generate/edit/append),
  ├─ change_reason, previous_version_id, diff_summary, created_at
  └─ 职责: 所有历史版本
```

### 12 张核心表

| 表名 | 说明 | 版本表 |
|------|------|--------|
| projects | 项目注册 | — |
| requirements | 结构化需求 | requirement_versions |
| prompts | Prompt 配置 | prompt_versions |
| test_plans | 测试计划 | test_plan_versions |
| test_cases | 测试用例 ★核心 | test_case_versions |
| test_suites | 测试套件 | — |
| test_suite_items | 套件↔用例关联 | — |
| requirement_mappings | 需求↔用例关联 | — |
| test_executions | 执行批次 | — |
| execution_results | 逐用例执行结果 | — |
| defects | 缺陷 | — |
| test_reports | 测试报告 | report_versions |
| reviews | 审核记录 | — |
| audit_logs | 全量操作日志 | — |

---

## 四、系统架构图

```
                      用户 (只做审核)
                           │
              ┌────────────┴────────────┐
              │    React 前端 (审核UI)    │
              │  TestCase Edit/Review    │
              │  Version History/Diff    │
              │  Defect Board / Reports  │
              └────────────┬────────────┘
                           │ REST + SSE
              ┌────────────┴────────────┐
              │   FastAPI 后端           │
              │   CRUD + 版本 + 审核     │
              │   SSE 执行管道           │
              └────────────┬────────────┘
                           │
              ┌────────────┴────────────┐
              │   CrewAI Orchestrator    │
              │   (7 STLC Agents)        │
              └────────────┬────────────┘
                           │
    ┌──────────────────────┼──────────────────────┐
    │                      │                      │
    ▼                      ▼                      ▼
┌──────────┐      ┌──────────────┐      ┌────────────────┐
│ Chroma   │      │  SQLite/     │      │  docs/prd/     │
│ 向量库   │      │  PostgreSQL  │      │  需求文档源    │
└──────────┘      └──────────────┘      └────────────────┘
```

---

## 五、项目目录结构

```
novel-build-test/
├── discovery/              # 自动项目发现
├── projects/               # 多项目容器
│   ├── novel-generator/
│   ├── shop/
│   └── tts/
├── agents/                 # AI 智能体
│   ├── orchestrator/
│   ├── prompt_generator/
│   ├── requirements_analyst/
│   ├── test_manager/
│   ├── test_designer/
│   ├── test_reviewer/
│   ├── test_executor/
│   ├── defect_manager/
│   ├── test_reporter/
│   └── knowledge_indexer/
├── core/                   # 共享基础设施
│   ├── runners/
│   ├── models/             # ORM + Pydantic
│   └── reporters/
├── knowledge_base/         # Chroma 向量库
├── app/                    # FastAPI 后端
│   ├── api/
│   └── services/
├── frontend/               # React 前端
├── prompts/                # Prompt 模板基座
├── config/                 # 配置文件
├── docs/                   # 项目文档
└── data/                   # 测试数据
```

---

## 六、审核工作流

每条 AI 生成的内容经过以下状态流转：

```
[draft] → [pending_review] → [approved] → (进入下一阶段)
                  │
                  └→ [rejected] → [draft] (返回修改)
```

人的操作：
1. **批准**：内容直接生效
2. **驳回**：必须填写驳回原因 + 建议修改内容
3. **修改后批准**：人编辑内容后直接批准
4. **要求补充**：人指定方向，AI 补充后重新提交

---

## 七、配置文件

- `config/settings.yaml` — 数据库、LLM、项目注册
- `config/models.yaml` — 大模型 Provider 配置
- `config/workflow.yaml` — 审核关卡开关、管道配置

---

*文档版本: 1.0 | 最后更新: 2026-07-12*
