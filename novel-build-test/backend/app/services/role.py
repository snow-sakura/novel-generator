"""角色管理服务 — 角色 CRUD"""

import json

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.role import Role
from app.models.user import User
from app.schemas.role import RoleCreate, RoleUpdate


async def get_role_by_id(db: AsyncSession, role_id: int) -> Role | None:
    """根据 ID 获取角色"""
    result = await db.execute(select(Role).where(Role.id == role_id))
    return result.scalar_one_or_none()


async def get_role_by_code(db: AsyncSession, code: str) -> Role | None:
    """根据编码获取角色"""
    result = await db.execute(select(Role).where(Role.code == code))
    return result.scalar_one_or_none()


async def create_role(db: AsyncSession, role_data: RoleCreate) -> Role:
    """创建角色"""
    role = Role(
        name=role_data.name,
        code=role_data.code,
        description=role_data.description,
        menu_permissions=json.dumps(role_data.menu_permissions) if role_data.menu_permissions else None,
        data_scope=role_data.data_scope,
    )
    db.add(role)
    await db.commit()
    await db.refresh(role)
    return role


async def update_role(db: AsyncSession, role_id: int, role_data: RoleUpdate) -> Role | None:
    """更新角色"""
    result = await db.execute(select(Role).where(Role.id == role_id))
    role = result.scalar_one_or_none()

    if not role:
        return None

    update_data = role_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        if field == "menu_permissions":
            setattr(role, field, json.dumps(value) if value else None)
        else:
            setattr(role, field, value)

    await db.commit()
    await db.refresh(role)
    return role


async def delete_role(db: AsyncSession, role_id: int) -> bool:
    """删除角色"""
    result = await db.execute(select(Role).where(Role.id == role_id))
    role = result.scalar_one_or_none()

    if not role:
        return False

    await db.delete(role)
    await db.commit()
    return True


async def get_role_user_count(db: AsyncSession, role_code: str) -> int:
    """获取角色下的用户数量"""
    result = await db.execute(select(func.count(User.id)).where(User.role == role_code))
    return result.scalar() or 0
