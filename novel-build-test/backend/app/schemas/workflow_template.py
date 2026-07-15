"""工作流模板 Pydantic 模型 — 请求与响应"""

import datetime

from pydantic import BaseModel, Field

from app.schemas.base import Page


class WorkflowTemplateCreate(BaseModel):
    """创建工作流模板请求"""

    name: str = Field(..., min_length=1, max_length=200, description="模板名称")
    description: str | None = Field(None, max_length=500)
    steps: str = Field("[]", description="步骤定义(JSON)")
    config: str | None = Field(None, description="配置(JSON)")


class WorkflowTemplateUpdate(BaseModel):
    """更新工作流模板请求"""

    name: str | None = Field(None, min_length=1, max_length=200)
    description: str | None = None
    steps: str | None = None
    config: str | None = None
    is_active: bool | None = None


class WorkflowTemplateResponse(BaseModel):
    """工作流模板响应"""

    id: int
    name: str
    description: str | None = None
    steps: str = "[]"
    config: str | None = None
    is_preset: bool = False
    is_active: bool = True
    created_by: int | None = None
    created_at: datetime.datetime | None = None
    updated_at: datetime.datetime | None = None

    model_config = {"from_attributes": True}


WorkflowTemplatePage = Page[WorkflowTemplateResponse]


class WorkflowStepUpdate(BaseModel):
    """步骤编排更新请求"""

    steps: str = Field(..., description="步骤定义(JSON)")


class WorkflowConfigUpdate(BaseModel):
    """配置更新请求（超时/重试/断点）"""

    config: str = Field(..., description="配置(JSON)")
