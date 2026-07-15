"""项目相关 Pydantic 模型 — 请求/响应"""

import datetime

from pydantic import BaseModel, Field


class ProjectCreate(BaseModel):
    """创建项目请求"""

    name: str = Field(..., min_length=1, max_length=200, description="项目名称")
    description: str | None = Field(None, description="项目描述")
    repo_url: str | None = Field(None, description="仓库地址")


class ProjectUpdate(BaseModel):
    """更新项目请求"""

    name: str | None = Field(None, min_length=1, max_length=200, description="项目名称")
    description: str | None = Field(None, description="项目描述")
    status: str | None = Field(None, description="状态: active/archived/deleted")
    repo_url: str | None = Field(None, description="仓库地址")


class ProjectResponse(BaseModel):
    """项目信息响应"""

    id: int
    name: str
    description: str | None
    status: str
    repo_url: str | None
    owner_id: int
    created_at: datetime.datetime
    updated_at: datetime.datetime

    model_config = {"from_attributes": True}


# 泛型分页别名 — 保持与路由导入兼容
from app.schemas.base import Page

ProjectPage = Page[ProjectResponse]
