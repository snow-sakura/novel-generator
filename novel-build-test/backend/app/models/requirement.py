"""需求模型 — AISQA 测试需求"""

import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class Requirement(Base):
    """需求表

    属性说明：
        id: 主键自增
        project_id: 所属项目 ID（外键 → projects.id）
        title: 需求标题
        description: 需求描述
        module: 所属模块名称
        priority: 优先级（P0/P1/P2/P3）
        status: 状态（draft/review/approved/implemented/rejected）
        created_by: 创建者用户 ID
        created_at: 创建时间
        updated_at: 最后更新时间
    """

    __tablename__ = "requirements"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    project_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("projects.id"), nullable=False, comment="所属项目"
    )
    title: Mapped[str] = mapped_column(String(300), nullable=False, comment="需求标题")
    description: Mapped[str | None] = mapped_column(Text, nullable=True, comment="需求描述")
    module: Mapped[str | None] = mapped_column(String(100), nullable=True, comment="所属模块")
    priority: Mapped[str] = mapped_column(
        String(4), default="P2", comment="优先级: P0/P1/P2/P3"
    )
    status: Mapped[str] = mapped_column(
        String(20), default="draft",
        comment="状态: draft/review/approved/implemented/rejected",
    )
    created_by: Mapped[int] = mapped_column(
        Integer, ForeignKey("users.id"), nullable=False, comment="创建者"
    )
    created_at: Mapped[datetime.datetime] = mapped_column(
        DateTime, server_default=func.now(), comment="创建时间"
    )
    updated_at: Mapped[datetime.datetime] = mapped_column(
        DateTime, server_default=func.now(), onupdate=func.now(), comment="更新时间"
    )

    # 关联
    project = relationship("Project", backref="requirements")

    def __repr__(self) -> str:
        return f"<Requirement id={self.id} title={self.title}>"
