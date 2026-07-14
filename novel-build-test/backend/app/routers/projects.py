"""项目路由 — 项目的 CRUD 操作（含 RBAC 权限校验）"""

import math
import logging

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

logger = logging.getLogger(__name__)

from app.database import get_db
from app.models.project import Project
from app.schemas.project import ProjectCreate, ProjectPage, ProjectResponse, ProjectUpdate
from app.utils.rbac import 操作, 检查权限, 获取当前用户

router = APIRouter(prefix="/api/v1/projects", tags=["项目"])


@router.get("", response_model=ProjectPage)
async def list_projects(
    page: int = Query(1, ge=1, description="页码"),
    page_size: int = Query(20, ge=1, le=100, description="每页数量"),
    search: str | None = Query(None, description="按名称搜索"),
    db: AsyncSession = Depends(get_db),
    当前用户: dict = Depends(检查权限(操作.读取)),
):
    """获取项目列表（分页，支持按名称搜索）"""
    user_id = 当前用户["用户ID"]
    query = select(Project).where(Project.owner_id == user_id)
    count_query = select(func.count()).select_from(Project).where(Project.owner_id == user_id)

    if search:
        like_pattern = f"%{search}%"
        query = query.where(Project.name.like(like_pattern))
        count_query = count_query.where(Project.name.like(like_pattern))

    # 计算总数
    total_result = await db.execute(count_query)
    total = total_result.scalar() or 0

    # 分页
    query = query.order_by(Project.created_at.desc())
    query = query.offset((page - 1) * page_size).limit(page_size)
    result = await db.execute(query)
    items = list(result.scalars().all())

    return ProjectPage(
        items=[ProjectResponse.model_validate(p) for p in items],
        total=total,
        page=page,
        page_size=page_size,
        total_pages=math.ceil(total / page_size) if total > 0 else 0,
    )


@router.post("", response_model=ProjectResponse, status_code=status.HTTP_201_CREATED)
async def create_project(
    project_data: ProjectCreate,
    db: AsyncSession = Depends(get_db),
    当前用户: dict = Depends(检查权限(操作.创建)),
):
    """创建新项目"""
    user_id = 当前用户["用户ID"]
    project = Project(
        name=project_data.name,
        description=project_data.description,
        repo_url=project_data.repo_url,
        owner_id=user_id,
    )
    db.add(project)
    await db.commit()
    await db.refresh(project)
    return project


@router.get("/{project_id}", response_model=ProjectResponse)
async def get_project(
    project_id: int,
    db: AsyncSession = Depends(get_db),
    当前用户: dict = Depends(检查权限(操作.读取)),
):
    """获取项目详情"""
    user_id = 当前用户["用户ID"]
    result = await db.execute(
        select(Project).where(Project.id == project_id, Project.owner_id == user_id)
    )
    project = result.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="项目不存在")
    return project


@router.put("/{project_id}", response_model=ProjectResponse)
async def update_project(
    project_id: int,
    project_data: ProjectUpdate,
    db: AsyncSession = Depends(get_db),
    当前用户: dict = Depends(检查权限(操作.更新)),
):
    """更新项目信息"""
    user_id = 当前用户["用户ID"]
    result = await db.execute(
        select(Project).where(Project.id == project_id, Project.owner_id == user_id)
    )
    project = result.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="项目不存在")

    update_data = project_data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(project, key, value)

    await db.commit()
    await db.refresh(project)
    return project


# ── 辅助函数：安全统计 ──────────────────────────────────


async def _safe_count(
    db: AsyncSession,
    model_class,
    filter_field,
    filter_value: int,
) -> int:
    """安全地查询关联表数量，表不存在时返回 0"""
    try:
        stmt = select(func.count()).select_from(model_class).where(filter_field == filter_value)
        result = await db.execute(stmt)
        return result.scalar() or 0
    except Exception as exc:
        logger.debug(f"统计查询失败（表可能未创建）: {exc}")
        return 0


# ── 统计接口 ──────────────────────────────────────────


@router.get("/{project_id}/stats")
async def get_project_stats(
    project_id: int,
    db: AsyncSession = Depends(get_db),
    当前用户: dict = Depends(检查权限(操作.读取)),
):
    """获取项目统计信息"""
    # 确保项目存在
    user_id = 当前用户["用户ID"]
    result = await db.execute(
        select(Project).where(Project.id == project_id, Project.owner_id == user_id)
    )
    if not result.scalar_one_or_none():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="项目不存在")

    # 统计关联模块数量（表不存在时安全降级为 0）
    from app.models.requirement import Requirement
    from app.models.environment import TestEnvironment
    from app.models.asset import TestAsset
    from app.models.knowledge import KnowledgeDoc as KnowledgeEntry

    return {
        "total_requirements": await _safe_count(db, Requirement, Requirement.project_id, project_id),
        "total_environments": await _safe_count(db, TestEnvironment, TestEnvironment.project_id, project_id),
        "total_assets": await _safe_count(db, TestAsset, TestAsset.project_id, project_id),
        "total_knowledge": await _safe_count(db, KnowledgeEntry, KnowledgeEntry.project_id, project_id),
    }


@router.delete("/{project_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_project(
    project_id: int,
    db: AsyncSession = Depends(get_db),
    当前用户: dict = Depends(检查权限(操作.删除)),
):
    """删除项目"""
    user_id = 当前用户["用户ID"]
    result = await db.execute(
        select(Project).where(Project.id == project_id, Project.owner_id == user_id)
    )
    project = result.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="项目不存在")

    await db.delete(project)
    await db.commit()
