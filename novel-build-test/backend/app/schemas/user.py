"""用户相关 Pydantic 模型 — 请求/响应"""

import datetime

from pydantic import BaseModel, Field


class UserCreate(BaseModel):
    """用户注册请求"""

    username: str = Field(..., min_length=2, max_length=50, description="用户名")
    email: str = Field(..., description="邮箱地址")
    password: str = Field(..., min_length=6, max_length=128, description="密码")
    display_name: str | None = Field(None, max_length=100, description="显示名称")


class UserLogin(BaseModel):
    """用户登录请求"""

    username: str = Field(..., description="用户名")
    password: str = Field(..., description="密码")


class UserUpdate(BaseModel):
    """用户更新请求"""

    display_name: str | None = Field(None, max_length=100, description="显示名称")
    email: str | None = Field(None, description="邮箱地址")
    role: str | None = Field(None, description="角色")
    is_active: bool | None = Field(None, description="是否激活")


class UserResponse(BaseModel):
    """用户信息响应"""

    id: int
    username: str
    email: str
    display_name: str | None
    role: str
    is_active: bool
    created_at: datetime.datetime
    updated_at: datetime.datetime

    model_config = {"from_attributes": True}


class UserListResponse(BaseModel):
    """用户列表响应"""

    items: list[UserResponse]
    total: int
    page: int
    page_size: int


class TokenResponse(BaseModel):
    """JWT Token 响应"""

    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    user: UserResponse


class PasswordChangeRequest(BaseModel):
    """密码修改请求"""

    current_password: str = Field(..., description="当前密码")
    new_password: str = Field(..., min_length=6, max_length=128, description="新密码")


class PasswordResetRequest(BaseModel):
    """密码重置请求"""

    new_password: str = Field(..., min_length=6, max_length=128, description="新密码")
