"""角色相关 Pydantic 模型 — 请求/响应"""

import datetime

from pydantic import BaseModel, Field


class RoleCreate(BaseModel):
    """创建角色请求"""

    name: str = Field(..., min_length=1, max_length=50, description="角色名称")
    code: str = Field(..., min_length=1, max_length=50, description="角色编码")
    description: str | None = Field(None, description="角色描述")
    menu_permissions: list[str] | None = Field(None, description="菜单权限列表")
    data_scope: str = Field("self", description="数据范围: all/project/self")


class RoleUpdate(BaseModel):
    """更新角色请求"""

    name: str | None = Field(None, min_length=1, max_length=50, description="角色名称")
    description: str | None = Field(None, description="角色描述")
    menu_permissions: list[str] | None = Field(None, description="菜单权限列表")
    data_scope: str | None = Field(None, description="数据范围: all/project/self")


class RoleResponse(BaseModel):
    """角色信息响应"""

    id: int
    name: str
    code: str
    description: str | None
    menu_permissions: list[str] | None
    data_scope: str
    user_count: int = 0
    created_at: datetime.datetime
    updated_at: datetime.datetime

    model_config = {"from_attributes": True}


class RoleListResponse(BaseModel):
    """角色列表响应"""

    items: list[RoleResponse]
    total: int
    page: int
    page_size: int
