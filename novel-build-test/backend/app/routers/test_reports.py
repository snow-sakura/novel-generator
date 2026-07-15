"""测试报告路由 — 报告的创建、查询与 AI 分析"""

import logging

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select, func, desc
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.test_execution import TestExecution
from app.models.test_report import TestReport
from app.schemas.test_report import ReportCreate, ReportPage, ReportResponse, report_page_from_query
from app.utils.rbac import 操作, 检查权限

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1", tags=["测试报告"])


# ==================== 报告 CRUD ====================


@router.post("/executions/{execution_id}/report", response_model=ReportResponse)
async def create_report(
    execution_id: int,
    report_data: ReportCreate,
    db: AsyncSession = Depends(get_db),
    当前用户: dict = Depends(检查权限(操作.创建)),
):
    """3.2.2 C: 创建测试报告"""
    # 验证执行记录存在
    exec_result = await db.execute(
        select(TestExecution).where(TestExecution.id == execution_id)
    )
    if not exec_result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="执行记录不存在")

    user_id = 当前用户["用户ID"]
    total = report_data.total_cases
    pass_rate = (report_data.passed / total * 100) if total > 0 else 0.0

    report = TestReport(
        execution_id=execution_id,
        total_cases=report_data.total_cases,
        passed=report_data.passed,
        failed=report_data.failed,
        skipped=report_data.skipped,
        duration=report_data.duration,
        pass_rate=round(pass_rate, 2),
        summary=report_data.summary,
        details=report_data.details,
        created_by=user_id,
    )
    db.add(report)
    await db.commit()
    await db.refresh(report)

    logger.info(f"测试报告已创建: id={report.id} execution={execution_id}")
    return report


@router.get("/executions/{execution_id}/report", response_model=ReportResponse)
async def get_report_by_execution(
    execution_id: int,
    db: AsyncSession = Depends(get_db),
    当前用户: dict = Depends(检查权限(操作.读取)),
):
    """3.2.2 R1: 获取指定执行的报告"""
    result = await db.execute(
        select(TestReport).where(TestReport.execution_id == execution_id)
    )
    report = result.scalar_one_or_none()
    if not report:
        raise HTTPException(status_code=404, detail="报告不存在")
    return report


@router.get("/reports", response_model=ReportPage)
async def list_reports(
    page: int = Query(1, ge=1, description="页码"),
    page_size: int = Query(20, ge=1, le=100, description="每页数量"),
    project_id: int | None = Query(None, description="按项目筛选"),
    db: AsyncSession = Depends(get_db),
    当前用户: dict = Depends(检查权限(操作.读取)),
):
    """3.2.2 R2: 全局报告列表（分页，支持按项目筛选）"""
    query = select(TestReport)
    count_query = select(func.count()).select_from(TestReport)

    if project_id:
        # 通过 execution → project 关联筛选
        query = (
            query.join(TestExecution, TestReport.execution_id == TestExecution.id)
            .where(TestExecution.project_id == project_id)
        )
        count_query = (
            count_query.join(TestExecution, TestReport.execution_id == TestExecution.id)
            .where(TestExecution.project_id == project_id)
        )

    total_result = await db.execute(count_query)
    total = total_result.scalar() or 0

    query = query.order_by(desc(TestReport.created_at))
    query = query.offset((page - 1) * page_size).limit(page_size)
    result = await db.execute(query)
    items = list(result.scalars().all())

    return report_page_from_query(items, total, page, page_size)


@router.get("/reports/{report_id}", response_model=ReportResponse)
async def get_report(
    report_id: int,
    db: AsyncSession = Depends(get_db),
    当前用户: dict = Depends(检查权限(操作.读取)),
):
    """获取单个报告详情"""
    result = await db.execute(
        select(TestReport).where(TestReport.id == report_id)
    )
    report = result.scalar_one_or_none()
    if not report:
        raise HTTPException(status_code=404, detail="报告不存在")
    return report
