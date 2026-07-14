# AISQA 技术设计

## 后端架构
- FastAPI 异步框架
- SQLAlchemy 2.0 异步 ORM + MySQL 9
- Alembic 数据库迁移
- JWT + RBAC 双因子认证
- 7 智能体服务层
- LLM Provider 工厂（国产 5 模型）

## 前端架构
- React 19 + Vite 8 + TypeScript 6
- TailwindCSS 4 + shadcn/ui
- TanStack Query 数据获取
- Zustand 状态管理
- React Router v7 路由
- Recharts 可视化

## API 设计
- RESTful API，统一前缀 /api/v1
- 分页、搜索、过滤标准化
- 审计日志全埋点
- 实时事件推送
