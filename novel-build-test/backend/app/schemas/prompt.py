"""提示词工程 Pydantic 模型 — 请求与响应"""

import datetime

from pydantic import BaseModel, Field

from app.schemas.base import Page

# ==================== AgentPrompt ====================


class PromptCreate(BaseModel):
    """创建提示词请求"""

    agent_key: str = Field(..., min_length=1, max_length=100, description="Agent 标识")
    content: str = Field(..., min_length=1, description="提示词内容")
    description: str | None = Field(None, max_length=500)


class PromptUpdate(BaseModel):
    """更新提示词请求（自动创建新版本）"""

    content: str = Field(..., min_length=1, description="提示词新内容")
    change_note: str | None = Field(None, max_length=500, description="变更说明")


class PromptResponse(BaseModel):
    """提示词响应"""

    id: int
    agent_key: str
    content: str
    version: int = 1
    description: str | None = None
    created_by: int | None = None
    created_at: datetime.datetime | None = None
    updated_at: datetime.datetime | None = None

    model_config = {"from_attributes": True}


PromptPage = Page[PromptResponse]


class PromptVersionResponse(BaseModel):
    """提示词版本历史响应"""

    id: int
    agent_key: str
    version: int
    content: str
    change_note: str | None = None
    created_by: int | None = None
    created_at: datetime.datetime | None = None

    model_config = {"from_attributes": True}


PromptVersionPage = Page[PromptVersionResponse]


class PromptDiffResponse(BaseModel):
    """A/B 对比响应"""

    version_a: PromptVersionResponse
    version_b: PromptVersionResponse
    diff: str = ""


# ==================== PromptTemplate ====================


class PromptTemplateCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    category: str | None = Field(None, max_length=50)
    content: str = Field(..., min_length=1)
    is_preset: bool = False


class PromptTemplateUpdate(BaseModel):
    name: str | None = Field(None, min_length=1, max_length=100)
    category: str | None = None
    content: str | None = None
    is_preset: bool | None = None


class PromptTemplateResponse(BaseModel):
    id: int
    name: str
    category: str | None = None
    content: str
    is_preset: bool = False
    created_by: int | None = None
    created_at: datetime.datetime | None = None

    model_config = {"from_attributes": True}


PromptTemplatePage = Page[PromptTemplateResponse]


# ==================== FewShotExample ====================


class FewShotCreate(BaseModel):
    agent_key: str = Field(..., min_length=1, max_length=100)
    input_text: str = Field(..., min_length=1)
    output_text: str = Field(..., min_length=1)
    description: str | None = None
    sort_order: int = 0


class FewShotUpdate(BaseModel):
    input_text: str | None = None
    output_text: str | None = None
    description: str | None = None
    sort_order: int | None = None


class FewShotResponse(BaseModel):
    id: int
    agent_key: str
    input_text: str
    output_text: str
    description: str | None = None
    sort_order: int = 0
    created_at: datetime.datetime | None = None

    model_config = {"from_attributes": True}


FewShotPage = Page[FewShotResponse]


# ==================== 在线调试 ====================


class PromptDebugRequest(BaseModel):
    agent_key: str = Field(..., description="Agent 标识")
    prompt: str = Field(..., description="提示词内容（用于调试）")
    input_text: str = Field(..., description="样本输入")
    model: str = Field("deepseek-v4-flash", description="测试模型")


class PromptDebugResponse(BaseModel):
    output: str = ""
    model: str = ""
    latency_ms: int = 0
    prompt_tokens: int = 0
    completion_tokens: int = 0
