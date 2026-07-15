"""测试执行相关 Pydantic 模型 — 请求与响应"""

import datetime

from pydantic import BaseModel, Field


class ExecutionCreate(BaseModel):
    """创建执行请求"""

    project_id: int = Field(..., description="项目 ID")
    name: str = Field(..., description="执行名称")
    agent_execution_id: int | None = Field(None, description="关联 Agent 执行 ID")
    test_script: str | None = Field("", description="测试脚本路径或命令，为空时执行模拟测试")


class ExecutionUpdate(BaseModel):
    """更新执行请求"""

    name: str | None = Field(None, description="执行名称")
    status: str | None = Field(None, description="状态")
    summary: dict | None = Field(None, description="执行摘要 JSON")


class ExecutionResponse(BaseModel):
    """执行信息响应"""

    id: int
    project_id: int
    name: str
    status: str
    agent_execution_id: int | None
    started_at: datetime.datetime | None
    completed_at: datetime.datetime | None
    summary: dict | None
    error_message: str | None
    created_by: int
    created_at: datetime.datetime
    updated_at: datetime.datetime

    model_config = {"from_attributes": True}


# 泛型分页别名
from app.schemas.base import Page, page_from_query

ExecutionPage = Page["ExecutionResponse"]


def execution_page_from_query(items: list, total: int, page: int, page_size: int) -> ExecutionPage:
    """构造执行记录分页响应"""
    return page_from_query(ExecutionResponse, items, total, page, page_size)
