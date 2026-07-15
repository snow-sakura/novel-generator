"""测试报告相关 Pydantic 模型 — 请求与响应"""

import datetime

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


# 泛型分页别名
from app.schemas.base import Page, page_from_query

ReportPage = Page["ReportResponse"]


def report_page_from_query(items: list, total: int, page: int, page_size: int) -> ReportPage:
    """构造报告分页响应"""
    return page_from_query(ReportResponse, items, total, page, page_size)
