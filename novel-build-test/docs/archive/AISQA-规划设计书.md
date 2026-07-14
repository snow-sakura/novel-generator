# AISQA 规划设计书

## 概述
AISQA (AI Software Quality Assurance) 是一个基于国产大模型的多智能体协作测试平台。

## 核心特性
- 7 大智能体全中文命名协作：调度总控 / 需求分析 / 测试架构 / 测试设计 / 用例编写 / 执行分析 / 质量审计
- 质量门禁辩论机制（3轮辩论 + 调度总控仲裁）
- 多模型共识交叉验证（2-3个模型验证同一决策）
- 人民币计价成本优化（5层：模型分级 + 缓存 + 批量 + 增量 + 结构化输出）
- JWT + RBAC 双因子安全体系

## 技术栈
- 前端：React 19 + Vite 8 + TypeScript 6 + TailwindCSS 4 + shadcn/ui
- 后端：Python FastAPI + SQLAlchemy 2.0 + MySQL 9
- 模型：DeepSeek-V3(¥1/M)、Qwen-Max(¥20)、GLM-4(¥15)、Moonshot-v1(¥12)、DeepSeek-R1(¥2)
