"""冒烟测试路由 — 冒烟测试套件 CRUD、运行与自动触发配置"""

import logging

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.test_modules import SmokeSuite
from app.schemas.base import Page, page_from_query
from app.schemas.test_modules import (
    SmokeSuiteCreate,
    SmokeSuiteResponse,
    SmokeSuiteUpdate,
)
from app.utils.rbac import 操作, 检查权限

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/test-smoke", tags=["冒烟测试"])


@router.get("/suites", response_model=Page[SmokeSuiteResponse])
async def list_smoke_suites(
    page: int = Query(1, ge=1, description="页码"),
    page_size: int = Query(20, ge=1, le=100, description="每页数量"),
    project_id: int | None = Query(None, description="按项目筛选"),
    status: str | None = Query(None, description="按状态筛选"),
    db: AsyncSession = Depends(get_db),
    当前用户: dict = Depends(检查权限(操作.读取)),
):
    """获取冒烟测试套件列表（分页，支持按项目和状态筛选）"""
    user_id = 当前用户["用户ID"]

    base_query = select(SmokeSuite).where(SmokeSuite.created_by == user_id)
    count_base = select(func.count()).select_from(SmokeSuite).where(SmokeSuite.created_by == user_id)

    if project_id is not None:
        base_query = base_query.where(SmokeSuite.project_id == project_id)
        count_base = count_base.where(SmokeSuite.project_id == project_id)
    if status is not None:
        base_query = base_query.where(SmokeSuite.status == status)
        count_base = count_base.where(SmokeSuite.status == status)

    total = (await db.execute(count_base)).scalar() or 0

    query = base_query.order_by(SmokeSuite.updated_at.desc()).offset((page - 1) * page_size).limit(page_size)
    result = await db.execute(query)
    items = list(result.scalars().all())

    return page_from_query(SmokeSuiteResponse, items, total, page, page_size)


@router.post("/suites", response_model=SmokeSuiteResponse, status_code=status.HTTP_201_CREATED)
async def create_smoke_suite(
    data: SmokeSuiteCreate,
    db: AsyncSession = Depends(get_db),
    当前用户: dict = Depends(检查权限(操作.创建)),
):
    """创建冒烟测试套件"""
    user_id = 当前用户["用户ID"]
    suite = SmokeSuite(
        project_id=data.project_id,
        name=data.name,
        description=data.description,
        test_cases=data.test_cases,
        auto_trigger=data.auto_trigger,
        trigger_config=data.trigger_config,
        created_by=user_id,
    )
    db.add(suite)
    await db.commit()
    await db.refresh(suite)
    return suite


@router.get("/suites/{suite_id}", response_model=SmokeSuiteResponse)
async def get_smoke_suite(
    suite_id: int,
    db: AsyncSession = Depends(get_db),
    当前用户: dict = Depends(检查权限(操作.读取)),
):
    """获取冒烟测试套件详情"""
    user_id = 当前用户["用户ID"]
    result = await db.execute(select(SmokeSuite).where(SmokeSuite.id == suite_id, SmokeSuite.created_by == user_id))
    suite = result.scalar_one_or_none()
    if not suite:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="测试套件不存在")
    return suite


@router.put("/suites/{suite_id}", response_model=SmokeSuiteResponse)
async def update_smoke_suite(
    suite_id: int,
    data: SmokeSuiteUpdate,
    db: AsyncSession = Depends(get_db),
    当前用户: dict = Depends(检查权限(操作.更新)),
):
    """更新冒烟测试套件"""
    user_id = 当前用户["用户ID"]
    result = await db.execute(select(SmokeSuite).where(SmokeSuite.id == suite_id, SmokeSuite.created_by == user_id))
    suite = result.scalar_one_or_none()
    if not suite:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="测试套件不存在")

    update_data = data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(suite, key, value)

    await db.commit()
    await db.refresh(suite)
    return suite


@router.delete("/suites/{suite_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_smoke_suite(
    suite_id: int,
    db: AsyncSession = Depends(get_db),
    当前用户: dict = Depends(检查权限(操作.删除)),
):
    """删除冒烟测试套件"""
    user_id = 当前用户["用户ID"]
    result = await db.execute(select(SmokeSuite).where(SmokeSuite.id == suite_id, SmokeSuite.created_by == user_id))
    suite = result.scalar_one_or_none()
    if not suite:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="测试套件不存在")

    await db.delete(suite)
    await db.commit()


@router.post("/suites/{suite_id}/run", response_model=SmokeSuiteResponse)
async def run_smoke_suite(
    suite_id: int,
    db: AsyncSession = Depends(get_db),
    当前用户: dict = Depends(检查权限(操作.更新)),
):
    """模拟运行冒烟测试套件"""
    user_id = 当前用户["用户ID"]
    result = await db.execute(select(SmokeSuite).where(SmokeSuite.id == suite_id, SmokeSuite.created_by == user_id))
    suite = result.scalar_one_or_none()
    if not suite:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="测试套件不存在")

    suite.status = "running"
    await db.commit()
    await db.refresh(suite)
    return suite


class AutoTriggerUpdate(BaseModel):
    """自动触发配置更新"""

    auto_trigger: bool = Field(..., description="是否自动触发")
    trigger_config: str | None = Field(None, description="触发配置(JSON)")


@router.put("/suites/{suite_id}/auto", response_model=SmokeSuiteResponse)
async def update_smoke_suite_auto_trigger(
    suite_id: int,
    data: AutoTriggerUpdate,
    db: AsyncSession = Depends(get_db),
    当前用户: dict = Depends(检查权限(操作.更新)),
):
    """更新冒烟测试套件的自动触发配置"""
    user_id = 当前用户["用户ID"]
    result = await db.execute(select(SmokeSuite).where(SmokeSuite.id == suite_id, SmokeSuite.created_by == user_id))
    suite = result.scalar_one_or_none()
    if not suite:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="测试套件不存在")

    suite.auto_trigger = data.auto_trigger
    if data.trigger_config is not None:
        suite.trigger_config = data.trigger_config

    await db.commit()
    await db.refresh(suite)
    return suite
