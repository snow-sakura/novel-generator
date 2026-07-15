"""性能测试路由 — 脚本 CRUD + Mock 执行 + 监控记录"""

import math

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select, func, desc
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.test_modules import PerfMonitorRecord, PerfTestScript
from app.schemas.test_modules import (
    PerfMonitorPage,
    PerfMonitorResponse,
    PerfScriptCreate,
    PerfScriptPage,
    PerfScriptResponse,
    PerfScriptUpdate,
)
from app.utils.rbac import 操作, 检查权限

router = APIRouter(prefix="/api/v1/test-perf", tags=["性能测试"])

# ==================== 脚本管理 ====================


@router.get("/scripts", response_model=PerfScriptPage)
async def list_perf_scripts(
    page: int = Query(1, ge=1, description="页码"),
    page_size: int = Query(20, ge=1, le=100, description="每页数量"),
    project_id: int | None = Query(None, description="按项目筛选"),
    test_type: str | None = Query(None, description="按测试类型筛选 (jmeter/k6)"),
    db: AsyncSession = Depends(get_db),
    当前用户: dict = Depends(检查权限(操作.读取)),
):
    """获取性能测试脚本列表（分页，支持筛选）"""
    user_id = 当前用户["用户ID"]
    query = select(PerfTestScript).where(PerfTestScript.created_by == user_id)
    count_query = (
        select(func.count())
        .select_from(PerfTestScript)
        .where(PerfTestScript.created_by == user_id)
    )

    if project_id:
        query = query.where(PerfTestScript.project_id == project_id)
        count_query = count_query.where(PerfTestScript.project_id == project_id)
    if test_type:
        query = query.where(PerfTestScript.test_type == test_type)
        count_query = count_query.where(PerfTestScript.test_type == test_type)

    total_result = await db.execute(count_query)
    total = total_result.scalar() or 0

    query = query.order_by(PerfTestScript.updated_at.desc())
    query = query.offset((page - 1) * page_size).limit(page_size)
    result = await db.execute(query)
    items = list(result.scalars().all())

    return PerfScriptPage(
        items=[PerfScriptResponse.model_validate(s) for s in items],
        total=total,
        page=page,
        page_size=page_size,
        total_pages=math.ceil(total / page_size) if total > 0 else 0,
    )


@router.post("/scripts", response_model=PerfScriptResponse, status_code=status.HTTP_201_CREATED)
async def create_perf_script(
    script_data: PerfScriptCreate,
    db: AsyncSession = Depends(get_db),
    当前用户: dict = Depends(检查权限(操作.创建)),
):
    """创建性能测试脚本"""
    user_id = 当前用户["用户ID"]
    script = PerfTestScript(
        project_id=script_data.project_id,
        name=script_data.name,
        test_type=script_data.test_type,
        config=script_data.config,
        created_by=user_id,
    )
    db.add(script)
    await db.commit()
    await db.refresh(script)
    return script


@router.put("/scripts/{script_id}", response_model=PerfScriptResponse)
async def update_perf_script(
    script_id: int,
    script_data: PerfScriptUpdate,
    db: AsyncSession = Depends(get_db),
    当前用户: dict = Depends(检查权限(操作.更新)),
):
    """更新性能测试脚本"""
    user_id = 当前用户["用户ID"]
    result = await db.execute(
        select(PerfTestScript).where(
            PerfTestScript.id == script_id, PerfTestScript.created_by == user_id
        )
    )
    script = result.scalar_one_or_none()
    if not script:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="脚本不存在")

    update_data = script_data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(script, key, value)

    await db.commit()
    await db.refresh(script)
    return script


@router.delete("/scripts/{script_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_perf_script(
    script_id: int,
    db: AsyncSession = Depends(get_db),
    当前用户: dict = Depends(检查权限(操作.删除)),
):
    """删除性能测试脚本"""
    user_id = 当前用户["用户ID"]
    result = await db.execute(
        select(PerfTestScript).where(
            PerfTestScript.id == script_id, PerfTestScript.created_by == user_id
        )
    )
    script = result.scalar_one_or_none()
    if not script:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="脚本不存在")

    await db.delete(script)
    await db.commit()


@router.post("/scripts/{script_id}/run", status_code=status.HTTP_200_OK)
async def run_perf_script(
    script_id: int,
    db: AsyncSession = Depends(get_db),
    当前用户: dict = Depends(检查权限(操作.创建)),
):
    """Mock 执行性能测试脚本（自动创建监控记录）"""
    user_id = 当前用户["用户ID"]
    result = await db.execute(
        select(PerfTestScript).where(
            PerfTestScript.id == script_id, PerfTestScript.created_by == user_id
        )
    )
    script = result.scalar_one_or_none()
    if not script:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="脚本不存在")

    # Mock 创建一条监控记录
    import random

    record = PerfMonitorRecord(
        script_id=script_id,
        concurrent=random.randint(10, 200),
        tps=round(random.uniform(50, 500), 2),
        response_time=round(random.uniform(100, 2000), 2),
        error_rate=round(random.uniform(0, 5), 2),
    )
    db.add(record)
    await db.commit()
    await db.refresh(record)

    return {
        "script_id": script_id,
        "status": "completed",
        "record_id": record.id,
        "message": f"脚本 '{script.name}' 执行完成",
    }


# ==================== 监控管理 ====================


@router.get("/monitor/{script_id}", response_model=PerfMonitorPage)
async def list_perf_monitor(
    script_id: int,
    page: int = Query(1, ge=1, description="页码"),
    page_size: int = Query(20, ge=1, le=100, description="每页数量"),
    db: AsyncSession = Depends(get_db),
    当前用户: dict = Depends(检查权限(操作.读取)),
):
    """获取最新性能监控记录（分页）"""
    # 验证脚本归属
    user_id = 当前用户["用户ID"]
    script_result = await db.execute(
        select(PerfTestScript).where(
            PerfTestScript.id == script_id, PerfTestScript.created_by == user_id
        )
    )
    if not script_result.scalar_one_or_none():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="脚本不存在")

    query = select(PerfMonitorRecord).where(PerfMonitorRecord.script_id == script_id)
    count_query = (
        select(func.count())
        .select_from(PerfMonitorRecord)
        .where(PerfMonitorRecord.script_id == script_id)
    )

    total_result = await db.execute(count_query)
    total = total_result.scalar() or 0

    query = query.order_by(desc(PerfMonitorRecord.created_at))
    query = query.offset((page - 1) * page_size).limit(page_size)
    result = await db.execute(query)
    items = list(result.scalars().all())

    return PerfMonitorPage(
        items=[PerfMonitorResponse.model_validate(r) for r in items],
        total=total,
        page=page,
        page_size=page_size,
        total_pages=math.ceil(total / page_size) if total > 0 else 0,
    )


@router.get("/monitor/{script_id}/history", response_model=PerfMonitorPage)
async def list_perf_monitor_history(
    script_id: int,
    page: int = Query(1, ge=1, description="页码"),
    page_size: int = Query(20, ge=1, le=100, description="每页数量"),
    days: int | None = Query(None, ge=1, description="近 N 天历史"),
    db: AsyncSession = Depends(get_db),
    当前用户: dict = Depends(检查权限(操作.读取)),
):
    """获取性能监控历史记录（分页，支持按天数筛选）"""
    import datetime

    user_id = 当前用户["用户ID"]
    # 验证脚本归属
    script_result = await db.execute(
        select(PerfTestScript).where(
            PerfTestScript.id == script_id, PerfTestScript.created_by == user_id
        )
    )
    if not script_result.scalar_one_or_none():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="脚本不存在")

    query = select(PerfMonitorRecord).where(PerfMonitorRecord.script_id == script_id)
    count_query = (
        select(func.count())
        .select_from(PerfMonitorRecord)
        .where(PerfMonitorRecord.script_id == script_id)
    )

    if days:
        cutoff = datetime.datetime.now() - datetime.timedelta(days=days)
        query = query.where(PerfMonitorRecord.created_at >= cutoff)
        count_query = count_query.where(PerfMonitorRecord.created_at >= cutoff)

    total_result = await db.execute(count_query)
    total = total_result.scalar() or 0

    query = query.order_by(desc(PerfMonitorRecord.created_at))
    query = query.offset((page - 1) * page_size).limit(page_size)
    result = await db.execute(query)
    items = list(result.scalars().all())

    return PerfMonitorPage(
        items=[PerfMonitorResponse.model_validate(r) for r in items],
        total=total,
        page=page,
        page_size=page_size,
        total_pages=math.ceil(total / page_size) if total > 0 else 0,
    )
