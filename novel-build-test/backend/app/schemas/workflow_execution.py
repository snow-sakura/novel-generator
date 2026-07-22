"""工作流执行 Pydantic 模型"""

import datetime

from pydantic import BaseModel, Field

from app.schemas.base import Page


class WorkflowExecutionCreate(BaseModel):
    """启动工作流请求"""

    project_id: int = Field(..., description="项目 ID")
    template_id: int | None = Field(None, description="工作流模板 ID")
    name: str = Field(..., min_length=1, max_length=200, description="执行名称")
    mode: str = Field("auto", description="执行模式: auto / manual / review")


class WorkflowExecutionResponse(BaseModel):
    """工作流执行响应"""

    id: int
    project_id: int
    template_id: int | None
    name: str
    status: str
    current_step: str | None
    steps_result: dict | None
    error_message: str | None
    total_cost: float
    thread_id: str | None
    started_at: datetime.datetime | None
    finished_at: datetime.datetime | None
    is_auto: bool
    created_at: datetime.datetime | None
    updated_at: datetime.datetime | None

    model_config = {"from_attributes": True}


class WorkflowExecutionPage(Page[WorkflowExecutionResponse]):
    """分页响应"""
