"""UI 测试路由 — 视觉基线 CRUD 与视觉对比"""

import logging

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.test_modules import VisualBaseline
from app.schemas.base import Page, page_from_query
from app.schemas.test_modules import (
    VisualBaselineCreate,
    VisualBaselineResponse,
)
from app.utils.rbac import 操作, 检查权限

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/test-ui", tags=["UI 测试"])


@router.get("/baselines", response_model=Page[VisualBaselineResponse])
async def list_visual_baselines(
    page: int = Query(1, ge=1, description="页码"),
    page_size: int = Query(20, ge=1, le=100, description="每页数量"),
    project_id: int | None = Query(None, description="按项目筛选"),
    db: AsyncSession = Depends(get_db),
    当前用户: dict = Depends(检查权限(操作.读取)),
):
    """获取视觉基线列表（分页，支持按项目筛选）"""
    user_id = 当前用户["用户ID"]

    base_query = select(VisualBaseline).where(VisualBaseline.created_by == user_id)
    count_base = (
        select(func.count())
        .select_from(VisualBaseline)
        .where(VisualBaseline.created_by == user_id)
    )

    if project_id is not None:
        base_query = base_query.where(VisualBaseline.project_id == project_id)
        count_base = count_base.where(VisualBaseline.project_id == project_id)

    total = (await db.execute(count_base)).scalar() or 0

    query = (
        base_query.order_by(VisualBaseline.created_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
    )
    result = await db.execute(query)
    items = list(result.scalars().all())

    return page_from_query(VisualBaselineResponse, items, total, page, page_size)


@router.post(
    "/baselines",
    response_model=VisualBaselineResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_visual_baseline(
    data: VisualBaselineCreate,
    db: AsyncSession = Depends(get_db),
    当前用户: dict = Depends(检查权限(操作.创建)),
):
    """创建视觉基线"""
    user_id = 当前用户["用户ID"]
    baseline = VisualBaseline(
        project_id=data.project_id,
        name=data.name,
        screenshot_url=data.screenshot_url,
        viewport=data.viewport,
        diff_threshold=data.diff_threshold,
        created_by=user_id,
    )
    db.add(baseline)
    await db.commit()
    await db.refresh(baseline)
    return baseline


@router.get("/baselines/{baseline_id}", response_model=VisualBaselineResponse)
async def get_visual_baseline(
    baseline_id: int,
    db: AsyncSession = Depends(get_db),
    当前用户: dict = Depends(检查权限(操作.读取)),
):
    """获取视觉基线详情"""
    user_id = 当前用户["用户ID"]
    result = await db.execute(
        select(VisualBaseline).where(
            VisualBaseline.id == baseline_id, VisualBaseline.created_by == user_id
        )
    )
    baseline = result.scalar_one_or_none()
    if not baseline:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="基线不存在")
    return baseline


@router.delete(
    "/baselines/{baseline_id}", status_code=status.HTTP_204_NO_CONTENT
)
async def delete_visual_baseline(
    baseline_id: int,
    db: AsyncSession = Depends(get_db),
    当前用户: dict = Depends(检查权限(操作.删除)),
):
    """删除视觉基线"""
    user_id = 当前用户["用户ID"]
    result = await db.execute(
        select(VisualBaseline).where(
            VisualBaseline.id == baseline_id, VisualBaseline.created_by == user_id
        )
    )
    baseline = result.scalar_one_or_none()
    if not baseline:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="基线不存在")

    await db.delete(baseline)
    await db.commit()


class VisualDiffRequest(BaseModel):
    """视觉对比请求"""
    baseline_id: int = Field(..., ge=1, description="基线 ID")
    compare_url: str = Field(..., min_length=1, max_length=500, description="待对比 URL")


class VisualDiffResult(BaseModel):
    """视觉对比结果"""
    baseline_id: int
    compare_url: str
    diff_percentage: float = 0.0
    passed: bool = True
    message: str = "模拟对比完成，未检测到差异。"


@router.post("/visual-diff")
async def run_visual_diff(
    data: VisualDiffRequest,
    db: AsyncSession = Depends(get_db),
    当前用户: dict = Depends(检查权限(操作.创建)),
):
    """模拟运行视觉差异对比"""
    user_id = 当前用户["用户ID"]
    result = await db.execute(
        select(VisualBaseline).where(
            VisualBaseline.id == data.baseline_id,
            VisualBaseline.created_by == user_id,
        )
    )
    baseline = result.scalar_one_or_none()
    if not baseline:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="基线不存在")

    return VisualDiffResult(
        baseline_id=baseline.id,
        compare_url=data.compare_url,
        diff_percentage=round(baseline.diff_threshold * 100, 2),
        passed=baseline.diff_threshold <= 0.05,
        message=f"模拟对比完成，差异阈值: {baseline.diff_threshold}。",
    )
