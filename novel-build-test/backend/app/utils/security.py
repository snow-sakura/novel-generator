"""安全工具 — 密码哈希 & JWT 令牌

直接使用 bcrypt（不用 passlib）和 python-jose。
"""

import datetime

import bcrypt
from jose import JWTError, jwt

from app.config import settings


def hash_password(password: str) -> str:
    """对明文密码进行 bcrypt 哈希

    Args:
        password: 明文密码

    Returns:
        哈希后的密码字符串
    """
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(password.encode("utf-8"), salt)
    return hashed.decode("utf-8")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """校验明文密码与哈希密码是否匹配

    Args:
        plain_password: 明文密码
        hashed_password: 已存储的哈希密码

    Returns:
        匹配返回 True，否则 False
    """
    return bcrypt.checkpw(
        plain_password.encode("utf-8"),
        hashed_password.encode("utf-8"),
    )


def create_access_token(data: dict, expires_delta: int | None = None) -> str:
    """创建 JWT 访问令牌

    Args:
        data: 要编码的数据（必须包含 sub 字段）
        expires_delta: 过期时间（分钟），默认使用配置值

    Returns:
        编码后的 JWT 字符串
    """
    to_encode = data.copy()
    expire_minutes = expires_delta or settings.jwt_access_token_expire_minutes
    expire = datetime.datetime.now(datetime.UTC) + datetime.timedelta(minutes=expire_minutes)
    to_encode.update({"exp": expire, "type": "access"})
    return jwt.encode(to_encode, settings.jwt_secret_key, algorithm=settings.jwt_algorithm)


def create_refresh_token(data: dict) -> str:
    """创建 JWT 刷新令牌

    Args:
        data: 要编码的数据（必须包含 sub 字段）

    Returns:
        编码后的 JWT 字符串
    """
    to_encode = data.copy()
    expire = datetime.datetime.now(datetime.UTC) + datetime.timedelta(
        days=settings.jwt_refresh_token_expire_days
    )
    to_encode.update({"exp": expire, "type": "refresh"})
    return jwt.encode(to_encode, settings.jwt_secret_key, algorithm=settings.jwt_algorithm)


def decode_token(token: str) -> dict | None:
    """解码并验证 JWT 令牌

    Args:
        token: JWT 字符串

    Returns:
        解码后的 payload，如果无效则返回 None
    """
    try:
        payload = jwt.decode(
            token, settings.jwt_secret_key, algorithms=[settings.jwt_algorithm]
        )
        return payload
    except JWTError:
        return None
