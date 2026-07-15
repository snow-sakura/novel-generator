"""用户管理服务 — 用户 CRUD"""

import datetime

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.user import User
from app.schemas.user import UserUpdate
from app.utils.security import hash_password


async def get_user_by_id(db: AsyncSession, user_id: int) -> User | None:
    """根据 ID 获取用户"""
    result = await db.execute(select(User).where(User.id == user_id, User.deleted_at.is_(None)))
    return result.scalar_one_or_none()


async def update_user(db: AsyncSession, user_id: int, user_data: UserUpdate) -> User | None:
    """更新用户信息"""
    result = await db.execute(select(User).where(User.id == user_id, User.deleted_at.is_(None)))
    user = result.scalar_one_or_none()

    if not user:
        return None

    update_data = user_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(user, field, value)

    await db.commit()
    await db.refresh(user)
    return user


async def delete_user(db: AsyncSession, user_id: int) -> bool:
    """软删除用户"""
    result = await db.execute(select(User).where(User.id == user_id, User.deleted_at.is_(None)))
    user = result.scalar_one_or_none()

    if not user:
        return False

    user.deleted_at = datetime.datetime.now(datetime.UTC)
    await db.commit()
    return True


async def update_user_role(db: AsyncSession, user_id: int, role: str) -> User | None:
    """更新用户角色"""
    result = await db.execute(select(User).where(User.id == user_id, User.deleted_at.is_(None)))
    user = result.scalar_one_or_none()

    if not user:
        return None

    user.role = role
    await db.commit()
    await db.refresh(user)
    return user


async def update_user_status(db: AsyncSession, user_id: int, is_active: bool) -> User | None:
    """更新用户状态"""
    result = await db.execute(select(User).where(User.id == user_id, User.deleted_at.is_(None)))
    user = result.scalar_one_or_none()

    if not user:
        return None

    user.is_active = is_active
    await db.commit()
    await db.refresh(user)
    return user


async def reset_user_password(db: AsyncSession, user_id: int, new_password: str) -> bool:
    """重置用户密码"""
    result = await db.execute(select(User).where(User.id == user_id, User.deleted_at.is_(None)))
    user = result.scalar_one_or_none()

    if not user:
        return False

    user.hashed_password = hash_password(new_password)
    await db.commit()
    return True
