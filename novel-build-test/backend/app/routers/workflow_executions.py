"""工作流执行路由 — 启动/状态/列表/取消"""

import json
import logging

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.workflow_execution import WorkflowExecution
from app.schemas.workflow_execution import (
    WorkflowExecutionCreate,
    WorkflowExecutionPage,
    WorkflowExecutionResponse,
)
from app.services.workflow_executor import (
    cancel_execution,
    get_execution,
    list_executions,
    start_execution,
)
from app.utils.rbac import 操作, 检查权限

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/workflow-executions", tags=["工作流执行"])


def _to_response(exec: WorkflowExecution) -> WorkflowExecutionResponse:
    return WorkflowExecutionResponse(
        id=exec.id,
        project_id=exec.project_id,
        template_id=exec.template_id,
        name=exec.name,
        status=exec.status,
        current_step=exec.current_step,
        steps_result=json.loads(exec.steps_result) if exec.steps_result else None,
        error_message=exec.error_message,
        total_cost=exec.total_cost,
        thread_id=exec.thread_id,
        started_at=exec.started_at,
        finished_at=exec.finished_at,
        is_auto=exec.is_auto,
        created_at=exec.created_at,
        updated_at=exec.updated_at,
    )


@router.post("", response_model=WorkflowExecutionResponse, status_code=201)
async def create_workflow_execution(
    data: WorkflowExecutionCreate,
    db: AsyncSession = Depends(get_db),
    当前用户: dict = Depends(检查权限(操作.创建)),
):
    """启动新的工作流执行"""
    exec_record = WorkflowExecution(
        project_id=data.project_id,
        template_id=data.template_id,
        name=data.name,
        status="pending",
        is_auto=(data.mode == "auto"),
    )
    db.add(exec_record)
    await db.flush()

    try:
        exec_record = await start_execution(db, exec_record)
    except Exception as e:
        await db.rollback()
        logger.exception("启动工作流失败")
        raise HTTPException(status_code=500, detail=f"启动工作流失败: {e}") from e

    await db.commit()
    await db.refresh(exec_record)
    return _to_response(exec_record)


@router.get("", response_model=WorkflowExecutionPage)
async def list_workflow_executions(
    project_id: int | None = Query(None, description="按项目筛选"),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    当前用户: dict = Depends(检查权限(操作.读取)),
):
    """获取工作流执行列表"""
    items, total = await list_executions(db, project_id, page, page_size)
    return WorkflowExecutionPage(
        items=[_to_response(item) for item in items],
        total=total,
        page=page,
        page_size=page_size,
    )


@router.get("/{execution_id}", response_model=WorkflowExecutionResponse)
async def get_workflow_execution(
    execution_id: int,
    db: AsyncSession = Depends(get_db),
    当前用户: dict = Depends(检查权限(操作.读取)),
):
    """获取工作流执行详情"""
    exec_record = await get_execution(db, execution_id)
    if not exec_record:
        raise HTTPException(status_code=404, detail="执行记录不存在")
    return _to_response(exec_record)


@router.post("/{execution_id}/cancel", response_model=WorkflowExecutionResponse)
async def cancel_workflow_execution(
    execution_id: int,
    db: AsyncSession = Depends(get_db),
    当前用户: dict = Depends(检查权限(操作.更新)),
):
    """取消工作流执行"""
    exec_record = await cancel_execution(db, execution_id)
    if not exec_record:
        raise HTTPException(status_code=404, detail="执行记录不存在")
    await db.commit()
    await db.refresh(exec_record)
    return _to_response(exec_record)
