"""工作流执行器 — 编排 Agent DAG 执行"""

import json
import logging
import uuid
from datetime import UTC, datetime

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.workflow_execution import WorkflowExecution

logger = logging.getLogger(__name__)


def _make_initial_state(project_id: int, project_name: str, mode: str) -> dict:
    """构建 LangGraph 初始状态。"""
    return {
        "project_id": str(project_id),
        "project_name": project_name,
        "requirement_doc": "",
        "execution_mode": mode,
        "status": "running",
        "current_step": "",
        "errors": [],
        "results": {},
        "total_cost": 0.0,
    }


async def start_execution(
    db: AsyncSession,
    execution: WorkflowExecution,
    project_name: str = "",
) -> WorkflowExecution:
    """启动工作流执行。

    创建 LangGraph 线程并异步启动编排。
    """
    from app.agents.workflow_graph import workflow_graph

    thread_id = str(uuid.uuid4())
    execution.thread_id = thread_id
    execution.status = "running"
    execution.started_at = datetime.now(UTC)
    await db.flush()

    try:
        initial_state = _make_initial_state(
            execution.project_id,
            project_name or execution.name,
            "auto" if execution.is_auto else "manual",
        )

        config = {"configurable": {"thread_id": thread_id}}
        result = await workflow_graph.ainvoke(initial_state, config)

        execution.status = result.get("status", "completed")
        execution.current_step = result.get("current_step", "")
        execution.total_cost = result.get("total_cost", 0.0)
        execution.steps_result = json.dumps(result.get("results", {}), ensure_ascii=False, default=str)
        execution.finished_at = datetime.now(UTC)

        if result.get("errors"):
            execution.error_message = "; ".join(result["errors"])
            if execution.status != "failed":
                execution.status = "completed_with_warnings"

        logger.info(
            "工作流 %s 执行完成: status=%s cost=%.2f",
            execution.id, execution.status, execution.total_cost,
        )

    except Exception as e:
        execution.status = "failed"
        execution.error_message = str(e)
        execution.finished_at = datetime.now(UTC)
        logger.exception("工作流 %s 执行失败: %s", execution.id, e)

    await db.flush()
    return execution


async def get_execution(db: AsyncSession, execution_id: int) -> WorkflowExecution | None:
    """获取执行记录。"""
    result = await db.execute(
        select(WorkflowExecution).where(WorkflowExecution.id == execution_id)
    )
    return result.scalar_one_or_none()


async def list_executions(
    db: AsyncSession,
    project_id: int | None = None,
    page: int = 1,
    page_size: int = 20,
) -> tuple[list[WorkflowExecution], int]:
    """分页列出执行记录。"""
    query = select(WorkflowExecution)
    count_query = select(WorkflowExecution.id)

    if project_id:
        query = query.where(WorkflowExecution.project_id == project_id)
        count_query = count_query.where(WorkflowExecution.project_id == project_id)

    query = query.order_by(WorkflowExecution.created_at.desc())
    query = query.offset((page - 1) * page_size).limit(page_size)

    total_result = await db.execute(count_query)
    total = len(total_result.all())

    result = await db.execute(query)
    items = list(result.scalars().all())

    return items, total


async def cancel_execution(db: AsyncSession, execution_id: int) -> WorkflowExecution | None:
    """取消工作流执行。"""
    execution = await get_execution(db, execution_id)
    if execution and execution.status in ("pending", "running"):
        execution.status = "cancelled"
        execution.finished_at = datetime.now(UTC)
        await db.flush()
    return execution
