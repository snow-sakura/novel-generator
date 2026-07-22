"""AI 助手路由 — 快捷操作、概览看板与简单对话"""

import logging

from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.audit_log import AuditLog
from app.models.project import Project
from app.models.test_execution import TestExecution
from app.schemas.phase3 import AssistantOverview, QuickAction
from app.utils.rbac import 操作, 检查权限

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/ai-assistant", tags=["AI 助手"])


@router.get("/quick-actions", response_model=list[QuickAction])
async def list_quick_actions(
    当前用户: dict = Depends(检查权限(操作.读取)),
):
    """获取 AI 助手快捷操作列表（模块入口）"""
    return [
        QuickAction(key="create_project", label="新建项目", icon="FolderPlus"),
        QuickAction(key="run_test", label="运行测试", icon="Play"),
        QuickAction(key="view_reports", label="查看报告", icon="FileText"),
        QuickAction(key="knowledge_base", label="知识库管理", icon="BookOpen"),
        QuickAction(key="chat_assistant", label="AI 对话", icon="MessageSquare"),
        QuickAction(key="db_tuning", label="数据库调优", icon="Database"),
        QuickAction(key="cicd_config", label="CI/CD 配置", icon="GitBranch"),
        QuickAction(key="user_management", label="用户管理", icon="Users"),
    ]


@router.get("/overview", response_model=AssistantOverview)
async def get_assistant_overview(
    db: AsyncSession = Depends(get_db),
    当前用户: dict = Depends(检查权限(操作.读取)),
):
    """获取 AI 助手概览数据（项目数、执行数、通过率、近期活动）"""
    try:
        # 项目总数
        project_count_result = await db.execute(select(func.count()).select_from(Project))
        project_count = project_count_result.scalar() or 0

        # 执行总数
        execution_count_result = await db.execute(select(func.count()).select_from(TestExecution))
        execution_count = execution_count_result.scalar() or 0

        # 通过率（成功执行 / 总执行数）
        completed_count_result = await db.execute(
            select(func.count()).select_from(TestExecution).where(TestExecution.status == "completed")
        )
        completed_count = completed_count_result.scalar() or 0
        pass_rate = round((completed_count / execution_count * 100), 2) if execution_count > 0 else 0.0

        # 最近 5 条审计日志
        recent_logs_result = await db.execute(select(AuditLog).order_by(AuditLog.created_at.desc()).limit(5))
        recent_logs = recent_logs_result.scalars().all()

        recent_activities = []
        for log in recent_logs:
            recent_activities.append(
                {
                    "id": log.id,
                    "action": log.action,
                    "entity_type": log.entity_type,
                    "entity_id": log.entity_id,
                    "actor_name": log.actor_name or "",
                    "created_at": str(log.created_at) if log.created_at else "",
                }
            )

        return AssistantOverview(
            project_count=project_count,
            execution_count=execution_count,
            pass_rate=pass_rate,
            recent_activities=recent_activities,
        )
    except Exception:
        logger.exception("获取概览数据失败")
        return AssistantOverview(
            project_count=0,
            execution_count=0,
            pass_rate=0.0,
            recent_activities=[],
        )


@router.post("/chat")
async def assistant_chat(
    body: dict,
    当前用户: dict = Depends(检查权限(操作.创建)),
):
    """与 AI 助手对话（Mock：返回预设回复）"""
    message = body.get("message", "").strip()
    if not message:
        return {"reply": "请输入您的问题。"}

    return {
        "reply": f"您好！已收到您的消息：「{message[:50]}」"
        f"{'...' if len(message) > 50 else ''}"
        f"\n\nAI 智能对话功能正在开发中，敬请期待！"
    }
