"""去AI味配置 Pydantic 模型 — 请求与响应"""

import datetime

from pydantic import BaseModel, Field

from app.schemas.base import Page


# ==================== 全局配置 ====================


class DeaiConfigUpdate(BaseModel):
    """去AI味全局配置更新"""

    style: str | None = Field(None, description="风格: formal/casual/neutral")
    variety: str | None = Field(None, description="句式多样性配置(JSON)")
    humanize: str | None = Field(None, description="人性化配置(JSON)")
    intensity: str | None = Field(None, description="强度: off/light/medium/heavy")


class DeaiConfigResponse(BaseModel):
    """去AI味全局配置响应"""

    id: int = 1
    style: str = "neutral"
    variety: str | None = None
    humanize: str | None = None
    intensity: str = "medium"
    updated_at: datetime.datetime | None = None

    model_config = {"from_attributes": True}


# ==================== 领域术语 ====================


class DeaiTermCreate(BaseModel):
    term: str = Field(..., min_length=1, max_length=200)
    replacement: str | None = Field(None, max_length=200)
    category: str | None = Field(None, max_length=50)


class DeaiTermUpdate(BaseModel):
    term: str | None = None
    replacement: str | None = None
    category: str | None = None


class DeaiTermResponse(BaseModel):
    id: int
    term: str
    replacement: str | None = None
    category: str | None = None
    created_at: datetime.datetime | None = None

    model_config = {"from_attributes": True}


DeaiTermPage = Page[DeaiTermResponse]


# ==================== 输出模板 ====================


class DeaiTemplateCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    pattern: str = Field(..., min_length=1)
    description: str | None = None


class DeaiTemplateUpdate(BaseModel):
    name: str | None = None
    pattern: str | None = None
    description: str | None = None


class DeaiTemplateResponse(BaseModel):
    id: int
    name: str
    pattern: str
    description: str | None = None
    created_at: datetime.datetime | None = None

    model_config = {"from_attributes": True}


DeaiTemplatePage = Page[DeaiTemplateResponse]


# ==================== 黑名单 ====================


class DeaiBlacklistCreate(BaseModel):
    word: str = Field(..., min_length=1, max_length=200)
    replacement: str | None = Field(None, max_length=200)


class DeaiBlacklistResponse(BaseModel):
    id: int
    word: str
    replacement: str | None = None
    created_at: datetime.datetime | None = None

    model_config = {"from_attributes": True}


DeaiBlacklistPage = Page[DeaiBlacklistResponse]
