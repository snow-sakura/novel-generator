"""仪表盘 — 全局统计数据"""

from datetime import UTC, datetime, timedelta

from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.asset import TestAsset
from app.models.environment import TestEnvironment
from app.models.project import Project
from app.models.requirement import Requirement
from app.models.test_execution import TestExecution
from app.models.test_report import TestReport
from app.utils.rbac import 操作, 检查权限

router = APIRouter(prefix="/api/v1/dashboard", tags=["仪表盘"])


@router.get("/stats")
async def get_dashboard_stats(
    db: AsyncSession = Depends(get_db),
    当前用户: dict = Depends(检查权限(操作.读取)),
):
    """获取仪表盘全局统计数据"""
    user_id = 当前用户["用户ID"]

    # 1. 项目计数
    result = await db.execute(
        select(func.count(Project.id)).where(Project.owner_id == user_id)
    )
    total_projects = result.scalar() or 0

    # 2. 需求计数
    result = await db.execute(select(func.count(Requirement.id)))
    total_requirements = result.scalar() or 0

    # 3. 环境计数
    result = await db.execute(
        select(func.count(TestEnvironment.id))
    )
    total_envs = result.scalar() or 0

    # 4. 资产计数
    result = await db.execute(select(func.count(TestAsset.id)))
    total_assets = result.scalar() or 0

    # 5. 执行统计
    result = await db.execute(select(func.count(TestExecution.id)))
    total_executions = result.scalar() or 0

    # 通过率
    result = await db.execute(
        select(
            func.sum(TestReport.passed),
            func.sum(TestReport.failed),
        )
    )
    row = result.one()
    total_passed = row[0] or 0
    total_failed = row[1] or 0
    total_cases = total_passed + total_failed
    pass_rate = round(total_passed / total_cases * 100, 1) if total_cases > 0 else 0.0

    # 6. 最近 7 天执行趋势
    today = datetime.now(UTC).date()
    seven_days_ago = today - timedelta(days=6)
    trend = []
    for i in range(7):
        day = seven_days_ago + timedelta(days=i)
        day_start = datetime.combine(day, datetime.min.time(), tzinfo=UTC)
        day_end = datetime.combine(day, datetime.max.time(), tzinfo=UTC)
        result = await db.execute(
            select(func.count(TestExecution.id)).where(
                TestExecution.created_at >= day_start,
                TestExecution.created_at <= day_end,
            )
        )
        count = result.scalar() or 0
        trend.append({"date": day.isoformat(), "count": count})

    # 7. 待办事项
    # 待审核执行（status=completed 但未生成报告的）
    result = await db.execute(
        select(func.count(TestExecution.id)).where(
            TestExecution.status == "completed",
            ~TestExecution.id.in_(select(TestReport.execution_id)),
        )
    )
    pending_reviews = result.scalar() or 0

    # 失败用例（最近的 10 个报告）
    result = await db.execute(
        select(TestReport.failed)
        .order_by(TestReport.created_at.desc())
        .limit(10)
    )
    recent_failed = sum((row[0] or 0) for row in result.all())

    # 过期环境（最近 30 天未更新的）
    thirty_days_ago = datetime.now(UTC) - timedelta(days=30)
    result = await db.execute(
        select(func.count(TestEnvironment.id)).where(
            TestEnvironment.updated_at < thirty_days_ago,
            TestEnvironment.status != "archived",
        )
    )
    expired_envs = result.scalar() or 0

    return {
        "total_projects": total_projects,
        "total_requirements": total_requirements,
        "total_environments": total_envs,
        "total_assets": total_assets,
        "total_executions": total_executions,
        "total_cases": total_cases,
        "pass_rate": pass_rate,
        "trend": trend,
        "pending_reviews": pending_reviews,
        "recent_failed_cases": recent_failed,
        "expired_environments": expired_envs,
    }
