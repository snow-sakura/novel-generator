"""测试报告相关 Pydantic 模型 — 请求与响应"""

import datetime
import math

from pydantic import BaseModel, Field


class ReportCreate(BaseModel):
    """创建报告请求"""

    total_cases: int = Field(0, description="总用例数")
    passed: int = Field(0, description="通过数")
    failed: int = Field(0, description="失败数")
    skipped: int = Field(0, description="跳过数")
    duration: float | None = Field(None, description="耗时（秒）")
    summary: str | None = Field(None, description="报告摘要")
    details: list | None = Field(None, description="用例级详细结果")


class ReportResponse(BaseModel):
    """报告信息响应"""

    id: int
    execution_id: int
    total_cases: int
    passed: int
    failed: int
    skipped: int
    duration: float | None
    pass_rate: float
    summary: str | None
    details: list | None
    quality_score: float | None
    created_by: int
    created_at: datetime.datetime

    model_config = {"from_attributes": True}


class ReportPage(BaseModel):
    """报告列表分页响应"""

    items: list[ReportResponse]
    total: int
    page: int
    page_size: int
    total_pages: int

    @classmethod
    def from_query(cls, items: list, total: int, page: int, page_size: int) -> "ReportPage":
        return cls(
            items=[ReportResponse.model_validate(e) for e in items],
            total=total,
            page=page,
            page_size=page_size,
            total_pages=math.ceil(total / page_size) if total > 0 else 0,
        )
