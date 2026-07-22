"""测试环境相关 Pydantic 模型 — 请求/响应"""

import datetime

from pydantic import BaseModel, Field


class EnvironmentCreate(BaseModel):
    """创建环境请求"""

    project_id: int = Field(..., description="所属项目 ID")
    name: str = Field(..., min_length=1, max_length=200, description="环境名称")
    type: str = Field(
        "test",
        pattern=r"^(dev|test|staging|production|custom)$",
        description="环境类型: dev/test/staging/production/custom",
    )
    config: dict | None = Field(None, description="配置信息")


class EnvironmentUpdate(BaseModel):
    """更新环境请求"""

    name: str | None = Field(None, min_length=1, max_length=200, description="环境名称")
    type: str | None = Field(
        None,
        pattern=r"^(dev|test|staging|production|custom)$",
        description="环境类型",
    )
    config: dict | None = Field(None, description="配置信息")
    status: str | None = Field(
        None,
        pattern=r"^(preparing|ready|in_use|maintenance|unavailable)$",
        description="状态",
    )


class EnvironmentResponse(BaseModel):
    """环境信息响应"""

    id: int
    project_id: int
    name: str
    type: str
    config: dict | None
    status: str
    owner_id: int
    created_at: datetime.datetime
    updated_at: datetime.datetime

    model_config = {"from_attributes": True}


# 泛型分页别名
from app.schemas.base import Page

EnvironmentPage = Page[EnvironmentResponse]
