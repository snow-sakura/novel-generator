"""用户管理路由 — 用户 CRUD"""

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.user import User
from app.schemas.user import (
    UserCreate,
    UserListResponse,
    UserResponse,
    UserUpdate,
    PasswordResetRequest,
)
from app.services.auth import register_user
from app.services.user import (
    delete_user,
    get_user_by_id,
    reset_user_password,
    update_user,
    update_user_role,
    update_user_status,
)
from app.utils.security import hash_password

router = APIRouter(prefix="/api/v1/users", tags=["用户管理"])


@router.get("", response_model=UserListResponse)
async def list_users(
    page: int = Query(1, ge=1, description="页码"),
    page_size: int = Query(20, ge=1, le=100, description="每页条数"),
    search: str = Query(None, description="搜索关键词"),
    role: str = Query(None, description="角色筛选"),
    status_filter: str = Query(None, alias="status", description="状态筛选"),
    db: AsyncSession = Depends(get_db),
):
    """获取用户列表"""
    query = select(User).where(User.deleted_at.is_(None))
    count_query = select(func.count(User.id)).where(User.deleted_at.is_(None))

    # 搜索过滤
    if search:
        search_filter = or_(
            User.username.ilike(f"%{search}%"),
            User.display_name.ilike(f"%{search}%"),
            User.email.ilike(f"%{search}%"),
        )
        query = query.where(search_filter)
        count_query = count_query.where(search_filter)

    # 角色过滤
    if role:
        query = query.where(User.role == role)
        count_query = count_query.where(User.role == role)

    # 状态过滤
    if status_filter == "active":
        query = query.where(User.is_active == True)
        count_query = count_query.where(User.is_active == True)
    elif status_filter == "disabled":
        query = query.where(User.is_active == False)
        count_query = count_query.where(User.is_active == False)

    # 计算总数
    total_result = await db.execute(count_query)
    total = total_result.scalar()

    # 分页查询
    query = query.order_by(User.id.desc()).offset((page - 1) * page_size).limit(page_size)
    result = await db.execute(query)
    users = result.scalars().all()

    return UserListResponse(
        items=[UserResponse.model_validate(u) for u in users],
        total=total,
        page=page,
        page_size=page_size,
    )


@router.get("/{user_id}", response_model=UserResponse)
async def get_user(
    user_id: int,
    db: AsyncSession = Depends(get_db),
):
    """获取用户详情"""
    user = await get_user_by_id(db, user_id)
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="用户不存在")
    return UserResponse.model_validate(user)


@router.post("", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def create_user(
    user_data: UserCreate,
    db: AsyncSession = Depends(get_db),
):
    """创建用户"""
    try:
        user = await register_user(db, user_data)
        return UserResponse.model_validate(user)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(e))


@router.put("/{user_id}", response_model=UserResponse)
async def update_user_info(
    user_id: int,
    user_data: UserUpdate,
    db: AsyncSession = Depends(get_db),
):
    """更新用户信息"""
    user = await update_user(db, user_id, user_data)
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="用户不存在")
    return UserResponse.model_validate(user)


@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_user_endpoint(
    user_id: int,
    db: AsyncSession = Depends(get_db),
):
    """删除用户（软删除）"""
    success = await delete_user(db, user_id)
    if not success:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="用户不存在")


@router.put("/{user_id}/role", response_model=UserResponse)
async def update_user_role_endpoint(
    user_id: int,
    body: dict,
    db: AsyncSession = Depends(get_db),
):
    """更新用户角色"""
    role = body.get("role")
    if not role:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="缺少 role 参数")

    user = await update_user_role(db, user_id, role)
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="用户不存在")
    return UserResponse.model_validate(user)


@router.put("/{user_id}/status", response_model=UserResponse)
async def update_user_status_endpoint(
    user_id: int,
    body: dict,
    db: AsyncSession = Depends(get_db),
):
    """更新用户状态"""
    is_active = body.get("is_active")
    if is_active is None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="缺少 is_active 参数")

    user = await update_user_status(db, user_id, is_active)
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="用户不存在")
    return UserResponse.model_validate(user)


@router.post("/{user_id}/reset-password", status_code=status.HTTP_200_OK)
async def reset_user_password_endpoint(
    user_id: int,
    body: PasswordResetRequest,
    db: AsyncSession = Depends(get_db),
):
    """重置用户密码"""
    success = await reset_user_password(db, user_id, body.new_password)
    if not success:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="用户不存在")
    return {"message": "密码重置成功"}
