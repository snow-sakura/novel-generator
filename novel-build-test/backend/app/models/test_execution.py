"""测试执行模型 — 记录一次测试执行的全过程"""

import datetime

from sqlalchemy import JSON, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base
from app.models.base import TimestampMixin


class TestExecution(TimestampMixin, Base):
    """测试执行表

    3.1.1: 记录每次测试执行的完整信息，包括状态、关联 Agent 执行、时间、摘要。

    属性说明：
        id: 主键自增
        project_id: 所属项目（外键 → projects.id）
        name: 执行名称
        status: 状态（pending / running / completed / failed / cancelled）
        agent_execution_id: 关联的 Agent 执行记录（可选）
        started_at: 开始时间
        completed_at: 完成时间
        summary: 执行摘要 JSON（包含总用例/通过/失败/跳过/耗时等）
        error_message: 错误信息
        created_by: 创建者用户 ID
    """

    __tablename__ = "test_executions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    project_id: Mapped[int] = mapped_column(Integer, ForeignKey("projects.id"), nullable=False, comment="所属项目")
    name: Mapped[str] = mapped_column(String(300), nullable=False, comment="执行名称")
    status: Mapped[str] = mapped_column(
        String(20),
        default="pending",
        comment="状态: pending/running/completed/failed/cancelled",
    )
    agent_execution_id: Mapped[int | None] = mapped_column(
        Integer, ForeignKey("agent_executions.id"), nullable=True, comment="关联Agent执行ID"
    )
    started_at: Mapped[datetime.datetime | None] = mapped_column(DateTime, nullable=True, comment="开始时间")
    completed_at: Mapped[datetime.datetime | None] = mapped_column(DateTime, nullable=True, comment="完成时间")
    summary: Mapped[dict | None] = mapped_column(JSON, nullable=True, comment="执行摘要JSON")
    error_message: Mapped[str | None] = mapped_column(Text, nullable=True, comment="错误信息")
    created_by: Mapped[int] = mapped_column(Integer, ForeignKey("users.id"), nullable=False, comment="创建者")

    def __repr__(self) -> str:
        return f"<TestExecution id={self.id} name={self.name} status={self.status}>"
