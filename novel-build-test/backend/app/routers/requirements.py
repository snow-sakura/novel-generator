"""需求路由 — 需求的 CRUD 操作（含 RBAC 权限校验）"""

import math

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.requirement import Requirement
from app.schemas.requirement import (
    RequirementCreate,
    RequirementPage,
    RequirementResponse,
    RequirementUpdate,
)
from app.utils.rbac import 操作, 检查权限

router = APIRouter(prefix="/api/v1/requirements", tags=["需求"])


@router.get("", response_model=RequirementPage)
async def list_requirements(
    page: int = Query(1, ge=1, description="页码"),
    page_size: int = Query(20, ge=1, le=100, description="每页数量"),
    project_id: int | None = Query(None, description="按项目筛选"),
    status: str | None = Query(None, description="按状态筛选"),
    priority: str | None = Query(None, description="按优先级筛选"),
    search: str | None = Query(None, description="按标题搜索"),
    db: AsyncSession = Depends(get_db),
    当前用户: dict = Depends(检查权限(操作.读取)),
):
    """获取需求列表（分页，支持多条件筛选）"""
    user_id = 当前用户["用户ID"]
    query = select(Requirement).where(Requirement.created_by == user_id)
    count_query = select(func.count()).select_from(Requirement).where(Requirement.created_by == user_id)

    if project_id:
        query = query.where(Requirement.project_id == project_id)
        count_query = count_query.where(Requirement.project_id == project_id)
    if status:
        query = query.where(Requirement.status == status)
        count_query = count_query.where(Requirement.status == status)
    if priority:
        query = query.where(Requirement.priority == priority)
        count_query = count_query.where(Requirement.priority == priority)
    if search:
        like_pattern = f"%{search}%"
        query = query.where(Requirement.title.like(like_pattern))
        count_query = count_query.where(Requirement.title.like(like_pattern))

    total_result = await db.execute(count_query)
    total = total_result.scalar() or 0

    query = query.order_by(Requirement.created_at.desc())
    query = query.offset((page - 1) * page_size).limit(page_size)
    result = await db.execute(query)
    items = list(result.scalars().all())

    return RequirementPage(
        items=[RequirementResponse.model_validate(r) for r in items],
        total=total,
        page=page,
        page_size=page_size,
        total_pages=math.ceil(total / page_size) if total > 0 else 0,
    )


@router.post("", response_model=RequirementResponse, status_code=status.HTTP_201_CREATED)
async def create_requirement(
    req_data: RequirementCreate,
    db: AsyncSession = Depends(get_db),
    当前用户: dict = Depends(检查权限(操作.创建)),
):
    """创建新需求"""
    user_id = 当前用户["用户ID"]
    req = Requirement(
        project_id=req_data.project_id,
        title=req_data.title,
        description=req_data.description,
        module=req_data.module,
        priority=req_data.priority,
        created_by=user_id,
    )
    db.add(req)
    await db.commit()
    await db.refresh(req)
    return req


@router.get("/{req_id}", response_model=RequirementResponse)
async def get_requirement(
    req_id: int,
    db: AsyncSession = Depends(get_db),
    当前用户: dict = Depends(检查权限(操作.读取)),
):
    """获取需求详情"""
    user_id = 当前用户["用户ID"]
    result = await db.execute(
        select(Requirement).where(
            Requirement.id == req_id, Requirement.created_by == user_id
        )
    )
    req = result.scalar_one_or_none()
    if not req:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="需求不存在")
    return req


@router.put("/{req_id}", response_model=RequirementResponse)
async def update_requirement(
    req_id: int,
    req_data: RequirementUpdate,
    db: AsyncSession = Depends(get_db),
    当前用户: dict = Depends(检查权限(操作.更新)),
):
    """更新需求信息"""
    user_id = 当前用户["用户ID"]
    result = await db.execute(
        select(Requirement).where(
            Requirement.id == req_id, Requirement.created_by == user_id
        )
    )
    req = result.scalar_one_or_none()
    if not req:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="需求不存在")

    update_data = req_data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(req, key, value)

    await db.commit()
    await db.refresh(req)
    return req


@router.delete("/{req_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_requirement(
    req_id: int,
    db: AsyncSession = Depends(get_db),
    当前用户: dict = Depends(检查权限(操作.删除)),
):
    """删除需求"""
    user_id = 当前用户["用户ID"]
    result = await db.execute(
        select(Requirement).where(
            Requirement.id == req_id, Requirement.created_by == user_id
        )
    )
    req = result.scalar_one_or_none()
    if not req:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="需求不存在")

    await db.delete(req)
    await db.commit()
