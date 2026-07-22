"""工作流执行模型 — 跟踪 Agent 编排执行的状态"""

from datetime import datetime

from sqlalchemy import Boolean, DateTime, Float, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base
from app.models.base import TimestampMixin


class WorkflowExecution(TimestampMixin, Base):
    """工作流执行记录表

    记录每次 Agent 编排工作流的执行状态、进度和结果。
    支持断点续跑：通过 thread_id 关联 LangGraph 检查点。
    """

    __tablename__ = "workflow_executions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    project_id: Mapped[int] = mapped_column(Integer, nullable=False, index=True)
    template_id: Mapped[int | None] = mapped_column(Integer, nullable=True)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    status: Mapped[str] = mapped_column(
        String(20), nullable=False, default="pending", index=True
    )
    # pending / running / paused / completed / failed / cancelled
    current_step: Mapped[str | None] = mapped_column(String(100), nullable=True)
    steps_result: Mapped[str | None] = mapped_column(Text, nullable=True)  # JSON
    error_message: Mapped[str | None] = mapped_column(Text, nullable=True)
    total_cost: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    thread_id: Mapped[str | None] = mapped_column(
        String(100), nullable=True, comment="LangGraph 检查点线程 ID"
    )
    started_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    finished_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    is_auto: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
