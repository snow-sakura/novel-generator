"""需求相关 Pydantic 模型 — 请求/响应"""

import datetime

from pydantic import BaseModel, Field


class RequirementCreate(BaseModel):
    """创建需求请求"""

    project_id: int = Field(..., description="所属项目 ID")
    title: str = Field(..., min_length=1, max_length=300, description="需求标题")
    description: str | None = Field(None, description="需求描述")
    module: str | None = Field(None, max_length=100, description="所属模块")
    priority: str = Field("P2", pattern=r"^P[0-3]$", description="优先级: P0/P1/P2/P3")


class RequirementUpdate(BaseModel):
    """更新需求请求"""

    title: str | None = Field(None, min_length=1, max_length=300, description="需求标题")
    description: str | None = Field(None, description="需求描述")
    module: str | None = Field(None, max_length=100, description="所属模块")
    priority: str | None = Field(None, pattern=r"^P[0-3]$", description="优先级: P0/P1/P2/P3")
    status: str | None = Field(
        None,
        pattern=r"^(draft|review|approved|implemented|rejected)$",
        description="状态: draft/review/approved/implemented/rejected",
    )


class RequirementResponse(BaseModel):
    """需求信息响应"""

    id: int
    project_id: int
    title: str
    description: str | None
    module: str | None
    priority: str
    status: str
    created_by: int
    created_at: datetime.datetime
    updated_at: datetime.datetime

    model_config = {"from_attributes": True}


# 泛型分页别名
from app.schemas.base import Page

RequirementPage = Page[RequirementResponse]
