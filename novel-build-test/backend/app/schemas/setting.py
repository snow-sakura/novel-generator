"""系统设置相关 Pydantic 模型 — 请求/响应"""

import datetime

from pydantic import BaseModel, Field


class SettingCreate(BaseModel):
    """创建设置请求"""

    key: str = Field(..., min_length=1, max_length=100, description="设置键名")
    value: str = Field(..., description="设置值")
    description: str | None = Field(None, max_length=500, description="设置说明")


class SettingUpdate(BaseModel):
    """更新设置请求"""

    value: str = Field(..., description="设置值")
    description: str | None = Field(None, max_length=500, description="设置说明")


class SettingResponse(BaseModel):
    """设置信息响应"""

    id: int
    key: str
    value: str
    description: str | None
    updated_at: datetime.datetime

    model_config = {"from_attributes": True}
