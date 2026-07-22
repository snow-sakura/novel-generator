"""身份认证服务 — 注册、登录、刷新令牌、修改密码"""

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.user import User
from app.schemas.user import UserCreate
from app.utils.security import (
    create_access_token,
    create_refresh_token,
    decode_token,
    hash_password,
    verify_password,
)


async def register_user(db: AsyncSession, user_data: UserCreate) -> User:
    """注册新用户

    检查用户名和邮箱是否已存在，然后创建新用户记录。

    Args:
        db: 数据库会话
        user_data: 用户注册信息

    Returns:
        创建成功的 User 对象

    Raises:
        ValueError: 用户名或邮箱已存在
    """
    # 检查用户名是否已存在
    result = await db.execute(select(User).where(User.username == user_data.username))
    if result.scalar_one_or_none():
        raise ValueError("用户名已存在")

    # 检查邮箱是否已存在
    result = await db.execute(select(User).where(User.email == user_data.email))
    if result.scalar_one_or_none():
        raise ValueError("邮箱已被注册")

    # 创建用户（默认分配工程师角色）
    user = User(
        username=user_data.username,
        email=user_data.email,
        hashed_password=hash_password(user_data.password),
        display_name=user_data.display_name or user_data.username,
        role="engineer",
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return user


async def authenticate_user(db: AsyncSession, username: str, password: str) -> tuple[User, str, str] | None:
    """用户登录认证

    验证用户名密码，返回用户信息和令牌对。

    Args:
        db: 数据库会话
        username: 用户名
        password: 密码

    Returns:
        (user, access_token, refresh_token) 元组，认证失败返回 None
    """
    result = await db.execute(select(User).where(User.username == username))
    user = result.scalar_one_or_none()

    if not user or not verify_password(password, user.hashed_password):
        return None

    if not user.is_active:
        return None

    token_data = {"sub": str(user.id), "username": user.username, "role": user.role}
    access_token = create_access_token(token_data)
    refresh_token = create_refresh_token(token_data)

    return user, access_token, refresh_token


async def refresh_token(db: AsyncSession, token: str) -> tuple[str, str] | None:
    """刷新访问令牌

    使用刷新令牌获取新的访问令牌和刷新令牌。

    Args:
        db: 数据库会话
        token: 刷新令牌

    Returns:
        (new_access_token, new_refresh_token) 元组，无效则返回 None
    """
    payload = decode_token(token)
    if not payload or payload.get("type") != "refresh":
        return None

    user_id = int(payload.get("sub", 0))
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()

    if not user or not user.is_active:
        return None

    token_data = {"sub": str(user.id), "username": user.username, "role": user.role}
    new_access_token = create_access_token(token_data)
    new_refresh_token = create_refresh_token(token_data)

    return new_access_token, new_refresh_token


async def change_password(db: AsyncSession, user: User, current_password: str, new_password: str) -> None:
    """修改用户密码

    Args:
        db: 数据库会话
        user: 当前用户
        current_password: 当前密码
        new_password: 新密码

    Raises:
        ValueError: 当前密码错误
    """
    if not verify_password(current_password, user.hashed_password):
        raise ValueError("当前密码错误")

    user.hashed_password = hash_password(new_password)
    await db.commit()
