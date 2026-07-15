"""测试资产相关 Pydantic 模型 — 请求/响应"""

import datetime

from pydantic import BaseModel, Field


class AssetCreate(BaseModel):
    """创建资产请求"""

    project_id: int = Field(..., description="所属项目 ID")
    name: str = Field(..., min_length=1, max_length=200, description="资产名称")
    type: str = Field(
        "file", pattern=r"^(file|script|data|config|image|other)$",
        description="资产类型",
    )
    tags: str | None = Field(None, max_length=500, description="逗号分隔标签")
    content: str | None = Field(None, description="文本内容")


class AssetUpdate(BaseModel):
    """更新资产请求"""

    name: str | None = Field(None, min_length=1, max_length=200, description="资产名称")
    type: str | None = Field(
        None, pattern=r"^(file|script|data|config|image|other)$",
        description="资产类型",
    )
    tags: str | None = Field(None, max_length=500, description="逗号分隔标签")
    content: str | None = Field(None, description="文本内容")


class AssetResponse(BaseModel):
    """资产信息响应"""

    id: int
    project_id: int
    name: str
    type: str
    tags: str | None
    file_path: str | None
    file_size: int
    content: str | None
    version: int
    created_by: int
    created_at: datetime.datetime
    updated_at: datetime.datetime

    model_config = {"from_attributes": True}


# 泛型分页别名
from app.schemas.base import Page

AssetPage = Page[AssetResponse]
