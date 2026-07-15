"""测试环境模型 — AISQA 测试环境"""

from sqlalchemy import ForeignKey, Integer, String, Text
from sqlalchemy.dialects.mysql import JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base
from app.models.base import TimestampMixin


class TestEnvironment(TimestampMixin, Base):
    """测试环境表

    属性说明：
        id: 主键自增
        project_id: 所属项目 ID
        name: 环境名称
        type: 环境类型（dev/test/staging/production/custom）
        config: 配置信息（JSON，如 {"url":"...", "db":"..."}）
        status: 状态（preparing/ready/in_use/maintenance/unavailable）
        owner_id: 负责人用户 ID
    """

    __tablename__ = "test_environments"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    project_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("projects.id"), nullable=False, comment="所属项目"
    )
    name: Mapped[str] = mapped_column(String(200), nullable=False, comment="环境名称")
    type: Mapped[str] = mapped_column(
        String(20), default="test",
        comment="环境类型: dev/test/staging/production/custom",
    )
    config: Mapped[dict | None] = mapped_column(JSON, nullable=True, comment="配置信息")
    status: Mapped[str] = mapped_column(
        String(20), default="ready",
        comment="状态: preparing/ready/in_use/maintenance/unavailable",
    )
    owner_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("users.id"), nullable=False, comment="负责人"
    )

    # 关联
    project = relationship("Project", backref="environments")

    def __repr__(self) -> str:
        return f"<TestEnvironment id={self.id} name={self.name}>"
