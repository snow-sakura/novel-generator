"""测试报告模型 — 记录一次测试执行的完整报告"""

from sqlalchemy import Float, ForeignKey, Integer, JSON, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base
from app.models.base import TimestampMixin


class TestReport(TimestampMixin, Base):
    """测试报告表

    3.2.1: 记录测试执行的结果报告，包含统计汇总和执行详情。

    属性说明：
        id: 主键自增
        execution_id: 关联执行记录（外键 → test_executions.id）
        total_cases: 总用例数
        passed: 通过数
        failed: 失败数
        skipped: 跳过数
        duration: 执行耗时（秒）
        pass_rate: 通过率（0-100）
        summary: 自然语言报告摘要
        details: 用例级详细结果 JSON
        quality_score: AI 质量评分（0-100，由 report_analyzer 生成）
        created_by: 创建者用户 ID
    """

    __tablename__ = "test_reports"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    execution_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("test_executions.id"), nullable=False, comment="关联执行ID"
    )
    total_cases: Mapped[int] = mapped_column(Integer, default=0, comment="总用例数")
    passed: Mapped[int] = mapped_column(Integer, default=0, comment="通过数")
    failed: Mapped[int] = mapped_column(Integer, default=0, comment="失败数")
    skipped: Mapped[int] = mapped_column(Integer, default=0, comment="跳过数")
    duration: Mapped[float | None] = mapped_column(Float, nullable=True, comment="耗时（秒）")
    pass_rate: Mapped[float] = mapped_column(Float, default=0.0, comment="通过率(%)")
    summary: Mapped[str | None] = mapped_column(Text, nullable=True, comment="报告摘要")
    details: Mapped[list | None] = mapped_column(JSON, nullable=True, comment="用例级详细结果")
    quality_score: Mapped[float | None] = mapped_column(Float, nullable=True, comment="AI质量评分(0-100)")
    created_by: Mapped[int] = mapped_column(
        Integer, ForeignKey("users.id"), nullable=False, comment="创建者"
    )

    def __repr__(self) -> str:
        return (
            f"<TestReport id={self.id} execution={self.execution_id} "
            f"pass={self.passed}/{self.total_cases}>"
        )
