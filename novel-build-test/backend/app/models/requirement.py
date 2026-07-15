"""需求模型 — AISQA 测试需求"""

from sqlalchemy import ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base
from app.models.base import TimestampMixin


class Requirement(TimestampMixin, Base):
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

    # 关联
    project = relationship("Project", backref="requirements")

    def __repr__(self) -> str:
        return f"<Requirement id={self.id} title={self.title}>"
