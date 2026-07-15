"""测试执行相关 Pydantic 模型 — 请求与响应"""

import datetime
import math

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


class ExecutionPage(BaseModel):
    """执行列表分页响应"""

    items: list[ExecutionResponse]
    total: int
    page: int
    page_size: int
    total_pages: int

    @classmethod
    def from_query(cls, items: list, total: int, page: int, page_size: int) -> "ExecutionPage":
        return cls(
            items=[ExecutionResponse.model_validate(e) for e in items],
            total=total,
            page=page,
            page_size=page_size,
            total_pages=math.ceil(total / page_size) if total > 0 else 0,
        )
