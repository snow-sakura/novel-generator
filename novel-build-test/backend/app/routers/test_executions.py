"""测试执行路由 — 执行记录的 CRUD + 后台执行 + SSE 流式日志"""

import asyncio
import datetime
import json
import logging
import time

from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import StreamingResponse
from sqlalchemy import select, func, desc
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.test_execution import TestExecution
from app.schemas.test_execution import (
    ExecutionCreate,
    ExecutionPage,
    ExecutionResponse,
    ExecutionUpdate,
)
from app.services.executor import (
    cancel_execution as _cancel_exec,
    execute_test,
    get_execution_logs,
)
from app.utils.rbac import 操作, 检查权限

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1", tags=["测试执行"])


# ==================== 项目级执行 CRUD ====================


@router.get("/projects/{project_id}/executions", response_model=ExecutionPage)
async def list_project_executions(
    project_id: int,
    page: int = Query(1, ge=1, description="页码"),
    page_size: int = Query(20, ge=1, le=100, description="每页数量"),
    status: str | None = Query(None, description="按状态筛选"),
    db: AsyncSession = Depends(get_db),
    当前用户: dict = Depends(检查权限(操作.读取)),
):
    """3.1.2 R1: 获取项目级执行记录列表（分页）"""
    query = select(TestExecution).where(TestExecution.project_id == project_id)
    count_query = (
        select(func.count())
        .select_from(TestExecution)
        .where(TestExecution.project_id == project_id)
    )

    if status:
        query = query.where(TestExecution.status == status)
        count_query = count_query.where(TestExecution.status == status)

    total_result = await db.execute(count_query)
    total = total_result.scalar() or 0

    query = query.order_by(desc(TestExecution.created_at))
    query = query.offset((page - 1) * page_size).limit(page_size)
    result = await db.execute(query)
    items = list(result.scalars().all())

    return ExecutionPage.from_query(items, total, page, page_size)


@router.post(
    "/projects/{project_id}/executions",
    response_model=ExecutionResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_execution(
    project_id: int,
    exec_data: ExecutionCreate,
    db: AsyncSession = Depends(get_db),
    当前用户: dict = Depends(检查权限(操作.创建)),
):
    """3.1.2 C: 创建新的测试执行"""
    user_id = 当前用户["用户ID"]
    now = datetime.datetime.now(datetime.UTC)

    execution = TestExecution(
        project_id=project_id,
        name=exec_data.name,
        status="pending",
        agent_execution_id=exec_data.agent_execution_id,
        started_at=now,
        created_by=user_id,
    )
    db.add(execution)
    await db.commit()
    await db.refresh(execution)

    logger.info(f"测试执行已创建: id={execution.id} project={project_id} name={exec_data.name}")

    # 自动启动后台异步执行
    asyncio.create_task(execute_test(execution.id, exec_data.test_script or ""))

    return execution


# ==================== 全局执行 CRUD ====================


@router.get("/executions/{execution_id}", response_model=ExecutionResponse)
async def get_execution(
    execution_id: int,
    db: AsyncSession = Depends(get_db),
    当前用户: dict = Depends(检查权限(操作.读取)),
):
    """3.1.2 R2: 获取执行详情"""
    result = await db.execute(
        select(TestExecution).where(TestExecution.id == execution_id)
    )
    execution = result.scalar_one_or_none()
    if not execution:
        raise HTTPException(status_code=404, detail="执行记录不存在")
    return execution


@router.patch("/executions/{execution_id}/cancel", response_model=ExecutionResponse)
async def cancel_execution(
    execution_id: int,
    db: AsyncSession = Depends(get_db),
    当前用户: dict = Depends(检查权限(操作.更新)),
):
    """3.1.2 U1: 取消执行"""
    result = await db.execute(
        select(TestExecution).where(TestExecution.id == execution_id)
    )
    execution = result.scalar_one_or_none()
    if not execution:
        raise HTTPException(status_code=404, detail="执行记录不存在")

    if execution.status in ("completed", "failed", "cancelled"):
        raise HTTPException(status_code=400, detail=f"当前状态({execution.status})不允许取消")

    execution.status = "cancelled"
    execution.completed_at = datetime.datetime.now(datetime.UTC)
    await db.commit()
    await db.refresh(execution)

    # 通知异步执行器取消
    await _cancel_exec(execution_id)

    logger.info(f"测试执行已取消: id={execution_id}")
    return execution


@router.delete("/executions/{execution_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_execution(
    execution_id: int,
    db: AsyncSession = Depends(get_db),
    当前用户: dict = Depends(检查权限(操作.删除)),
):
    """3.1.2 D1: 删除执行记录"""
    result = await db.execute(
        select(TestExecution).where(TestExecution.id == execution_id)
    )
    execution = result.scalar_one_or_none()
    if not execution:
        raise HTTPException(status_code=404, detail="执行记录不存在")

    await db.delete(execution)
    await db.commit()
    logger.info(f"测试执行已删除: id={execution_id}")


# ==================== SSE 流式日志 ====================


@router.get("/executions/{execution_id}/stream")
async def stream_execution_logs(execution_id: int):
    """3.1.7: SSE 流式推送执行日志

    通过 Server-Sent Events 实时推送执行日志和状态变更。
    客户端可使用 EventSource API 消费。
    """
    from app.services.executor import get_execution_status

    async def event_generator():
        last_log_count = 0
        while True:
            # 检查执行是否已结束
            status = get_execution_status(execution_id)
            logs = get_execution_logs(execution_id)

            # 推送新增日志
            if len(logs) > last_log_count:
                new_lines = logs[last_log_count:]
                for line in new_lines:
                    yield f"data: {json.dumps({'type': 'log', 'message': line})}\n\n"
                last_log_count = len(logs)

            # 推送状态
            yield f"data: {json.dumps({'type': 'status', 'status': status})}\n\n"

            if status in ("done", "not_found"):
                yield f"data: {json.dumps({'type': 'complete'})}\n\n"
                break

            await asyncio.sleep(0.5)

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )
