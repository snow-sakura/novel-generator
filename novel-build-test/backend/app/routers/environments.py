"""环境路由 — 测试环境的 CRUD + 运维操作"""

import math
import logging

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.environment import TestEnvironment
from app.schemas.environment import (
    EnvironmentCreate,
    EnvironmentPage,
    EnvironmentResponse,
    EnvironmentUpdate,
)
from app.utils.rbac import 操作, 检查权限

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/environments", tags=["测试环境"])


@router.get("", response_model=EnvironmentPage)
async def list_environments(
    page: int = Query(1, ge=1, description="页码"),
    page_size: int = Query(20, ge=1, le=100, description="每页数量"),
    project_id: int | None = Query(None, description="按项目筛选"),
    status: str | None = Query(None, description="按状态筛选"),
    type: str | None = Query(None, description="按类型筛选"),
    db: AsyncSession = Depends(get_db),
    当前用户: dict = Depends(检查权限(操作.读取)),
):
    """获取环境列表（分页，支持筛选）"""
    user_id = 当前用户["用户ID"]
    query = select(TestEnvironment).where(TestEnvironment.owner_id == user_id)
    count_query = select(func.count()).select_from(TestEnvironment).where(TestEnvironment.owner_id == user_id)

    if project_id:
        query = query.where(TestEnvironment.project_id == project_id)
        count_query = count_query.where(TestEnvironment.project_id == project_id)
    if status:
        query = query.where(TestEnvironment.status == status)
        count_query = count_query.where(TestEnvironment.status == status)
    if type:
        query = query.where(TestEnvironment.type == type)
        count_query = count_query.where(TestEnvironment.type == type)

    total_result = await db.execute(count_query)
    total = total_result.scalar() or 0

    query = query.order_by(TestEnvironment.created_at.desc())
    query = query.offset((page - 1) * page_size).limit(page_size)
    result = await db.execute(query)
    items = list(result.scalars().all())

    return EnvironmentPage(
        items=[EnvironmentResponse.model_validate(e) for e in items],
        total=total,
        page=page,
        page_size=page_size,
        total_pages=math.ceil(total / page_size) if total > 0 else 0,
    )


@router.post("", response_model=EnvironmentResponse, status_code=status.HTTP_201_CREATED)
async def create_environment(
    env_data: EnvironmentCreate,
    db: AsyncSession = Depends(get_db),
    当前用户: dict = Depends(检查权限(操作.创建)),
):
    """创建新环境"""
    user_id = 当前用户["用户ID"]
    env = TestEnvironment(
        project_id=env_data.project_id,
        name=env_data.name,
        type=env_data.type,
        config=env_data.config,
        owner_id=user_id,
    )
    db.add(env)
    await db.commit()
    await db.refresh(env)
    return env


@router.get("/{env_id}", response_model=EnvironmentResponse)
async def get_environment(
    env_id: int,
    db: AsyncSession = Depends(get_db),
    当前用户: dict = Depends(检查权限(操作.读取)),
):
    """获取环境详情"""
    user_id = 当前用户["用户ID"]
    result = await db.execute(
        select(TestEnvironment).where(
            TestEnvironment.id == env_id, TestEnvironment.owner_id == user_id
        )
    )
    env = result.scalar_one_or_none()
    if not env:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="环境不存在")
    return env


@router.put("/{env_id}", response_model=EnvironmentResponse)
async def update_environment(
    env_id: int,
    env_data: EnvironmentUpdate,
    db: AsyncSession = Depends(get_db),
    当前用户: dict = Depends(检查权限(操作.更新)),
):
    """更新环境信息"""
    user_id = 当前用户["用户ID"]
    result = await db.execute(
        select(TestEnvironment).where(
            TestEnvironment.id == env_id, TestEnvironment.owner_id == user_id
        )
    )
    env = result.scalar_one_or_none()
    if not env:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="环境不存在")

    update_data = env_data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(env, key, value)

    await db.commit()
    await db.refresh(env)
    return env


@router.delete("/{env_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_environment(
    env_id: int,
    db: AsyncSession = Depends(get_db),
    当前用户: dict = Depends(检查权限(操作.删除)),
):
    """删除环境"""
    user_id = 当前用户["用户ID"]
    result = await db.execute(
        select(TestEnvironment).where(
            TestEnvironment.id == env_id, TestEnvironment.owner_id == user_id
        )
    )
    env = result.scalar_one_or_none()
    if not env:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="环境不存在")

    await db.delete(env)
    await db.commit()


# ── 运维操作 ────────────────────────────────────────


@router.post("/{env_id}/health-check")
async def health_check_environment(
    env_id: int,
    db: AsyncSession = Depends(get_db),
    当前用户: dict = Depends(检查权限(操作.更新)),
):
    """执行环境健康检查"""
    user_id = 当前用户["用户ID"]
    result = await db.execute(
        select(TestEnvironment).where(
            TestEnvironment.id == env_id, TestEnvironment.owner_id == user_id
        )
    )
    env = result.scalar_one_or_none()
    if not env:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="环境不存在")

    # 模拟健康检查（后续对接真实检测）
    logger.info(f"健康检查: 环境 {env.name} (id={env_id})")
    return {
        "status": "ok",
        "message": f"环境「{env.name}」健康检查通过",
        "config_url": (env.config or {}).get("url", "未知"),
    }


@router.post("/{env_id}/deploy")
async def deploy_environment(
    env_id: int,
    db: AsyncSession = Depends(get_db),
    当前用户: dict = Depends(检查权限(操作.更新)),
):
    """部署环境"""
    user_id = 当前用户["用户ID"]
    result = await db.execute(
        select(TestEnvironment).where(
            TestEnvironment.id == env_id, TestEnvironment.owner_id == user_id
        )
    )
    env = result.scalar_one_or_none()
    if not env:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="环境不存在")

    # 更新状态为 "in_use"
    env.status = "in_use"
    await db.commit()

    logger.info(f"部署: 环境 {env.name} (id={env_id})")
    return {
        "status": "ok",
        "message": f"环境「{env.name}」部署成功",
        "environment_id": env_id,
    }
