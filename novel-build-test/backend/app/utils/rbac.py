"""RBAC 权限校验 — 基于角色的访问控制"""

from enum import Enum

from fastapi import Depends, Header, HTTPException, status

from app.utils.security import decode_token


class 角色(str, Enum):
    """系统角色"""
    管理员 = "admin"
    工程师 = "engineer"
    观察者 = "viewer"


# 角色权限映射
角色权限表 = {
    角色.管理员: ["create", "read", "update", "delete", "manage_users", "manage_system"],
    角色.工程师: ["create", "read", "update", "delete"],
    角色.观察者: ["read"],
}


class 操作(str, Enum):
    """系统操作"""
    创建 = "create"
    读取 = "read"
    更新 = "update"
    删除 = "delete"


def 获取当前用户(authorization: str = Header(..., alias="Authorization")):
    """从 JWT 提取用户信息"""
    token = authorization
    if token.startswith("Bearer "):
        token = token[7:]
    payload = decode_token(token)
    if not payload:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="无效的认证令牌")
    return {
        "用户ID": int(payload.get("sub", 0)),
        "用户名": payload.get("username", ""),
        "角色": payload.get("role", "viewer"),
    }


def 检查权限(所需操作: 操作):
    """权限校验装饰器"""
    async def 校验器(当前用户: dict = Depends(获取当前用户)):
        用户角色 = 当前用户.get("角色", "viewer")
        try:
            角色枚举 = 角色(用户角色)
        except ValueError:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="未知角色")

        允许操作 = 角色权限表.get(角色枚举, [])
        if 所需操作.value not in 允许操作:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"角色 '{用户角色}' 没有 '{所需操作.value}' 权限",
            )
        return 当前用户
    return 校验器
