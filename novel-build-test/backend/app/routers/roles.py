"""角色管理路由 — 角色 CRUD"""

import json

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.role import Role
from app.schemas.role import (
    RoleCreate,
    RoleListResponse,
    RoleResponse,
    RoleUpdate,
)
from app.services.role import (
    create_role,
    delete_role,
    get_role_by_code,
    get_role_by_id,
    get_role_user_count,
    update_role,
)

router = APIRouter(prefix="/api/v1/roles", tags=["角色管理"])


@router.get("", response_model=RoleListResponse)
async def list_roles(
    page: int = Query(1, ge=1, description="页码"),
    page_size: int = Query(20, ge=1, le=100, description="每页条数"),
    search: str = Query(None, description="搜索关键词"),
    db: AsyncSession = Depends(get_db),
):
    """获取角色列表"""
    query = select(Role)
    count_query = select(func.count(Role.id))

    # 搜索过滤
    if search:
        search_filter = Role.name.ilike(f"%{search}%") | Role.code.ilike(f"%{search}%")
        query = query.where(search_filter)
        count_query = count_query.where(search_filter)

    # 计算总数
    total_result = await db.execute(count_query)
    total = total_result.scalar()

    # 分页查询
    query = query.order_by(Role.id).offset((page - 1) * page_size).limit(page_size)
    result = await db.execute(query)
    roles = result.scalars().all()

    # 构建响应（包含用户数量）
    role_responses = []
    for role in roles:
        user_count = await get_role_user_count(db, role.code)
        menu_perms = json.loads(role.menu_permissions) if role.menu_permissions else []
        role_responses.append(
            RoleResponse(
                id=role.id,
                name=role.name,
                code=role.code,
                description=role.description,
                menu_permissions=menu_perms,
                data_scope=role.data_scope,
                user_count=user_count,
                created_at=role.created_at,
                updated_at=role.updated_at,
            )
        )

    return RoleListResponse(
        items=role_responses,
        total=total,
        page=page,
        page_size=page_size,
    )


@router.get("/{role_id}", response_model=RoleResponse)
async def get_role(
    role_id: int,
    db: AsyncSession = Depends(get_db),
):
    """获取角色详情"""
    role = await get_role_by_id(db, role_id)
    if not role:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="角色不存在")

    user_count = await get_role_user_count(db, role.code)
    menu_perms = json.loads(role.menu_permissions) if role.menu_permissions else []

    return RoleResponse(
        id=role.id,
        name=role.name,
        code=role.code,
        description=role.description,
        menu_permissions=menu_perms,
        data_scope=role.data_scope,
        user_count=user_count,
        created_at=role.created_at,
        updated_at=role.updated_at,
    )


@router.post("", response_model=RoleResponse, status_code=status.HTTP_201_CREATED)
async def create_role_endpoint(
    role_data: RoleCreate,
    db: AsyncSession = Depends(get_db),
):
    """创建角色"""
    # 检查编码是否已存在
    existing = await get_role_by_code(db, role_data.code)
    if existing:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="角色编码已存在")

    role = await create_role(db, role_data)
    menu_perms = json.loads(role.menu_permissions) if role.menu_permissions else []

    return RoleResponse(
        id=role.id,
        name=role.name,
        code=role.code,
        description=role.description,
        menu_permissions=menu_perms,
        data_scope=role.data_scope,
        user_count=0,
        created_at=role.created_at,
        updated_at=role.updated_at,
    )


@router.put("/{role_id}", response_model=RoleResponse)
async def update_role_endpoint(
    role_id: int,
    role_data: RoleUpdate,
    db: AsyncSession = Depends(get_db),
):
    """更新角色"""
    role = await update_role(db, role_id, role_data)
    if not role:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="角色不存在")

    user_count = await get_role_user_count(db, role.code)
    menu_perms = json.loads(role.menu_permissions) if role.menu_permissions else []

    return RoleResponse(
        id=role.id,
        name=role.name,
        code=role.code,
        description=role.description,
        menu_permissions=menu_perms,
        data_scope=role.data_scope,
        user_count=user_count,
        created_at=role.created_at,
        updated_at=role.updated_at,
    )


@router.delete("/{role_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_role_endpoint(
    role_id: int,
    db: AsyncSession = Depends(get_db),
):
    """删除角色"""
    # 检查是否有用户使用此角色
    role = await get_role_by_id(db, role_id)
    if role:
        user_count = await get_role_user_count(db, role.code)
        if user_count > 0:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"该角色下还有 {user_count} 个用户，无法删除",
            )

    success = await delete_role(db, role_id)
    if not success:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="角色不存在")
