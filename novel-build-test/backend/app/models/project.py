"""项目模型 — AISQA 测试项目"""

from sqlalchemy import ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base
from app.models.base import TimestampMixin


class Project(TimestampMixin, Base):
    """项目表

    属性说明：
        id: 主键自增
        name: 项目名称
        description: 项目描述
        status: 状态（active / archived / deleted）
        repo_url: 代码仓库地址
        owner_id: 所属用户 ID（外键 → users.id）
    """

    __tablename__ = "projects"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(200), nullable=False, comment="项目名称")
    description: Mapped[str] = mapped_column(Text, nullable=True, comment="项目描述")
    status: Mapped[str] = mapped_column(String(20), default="active", comment="状态: active/archived/deleted")
    repo_url: Mapped[str] = mapped_column(String(500), nullable=True, comment="仓库地址")
    owner_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id"), nullable=False, comment="所属用户")

    # 关联
    owner = relationship("User", back_populates="projects")

    def __repr__(self) -> str:
        return f"<Project id={self.id} name={self.name}>"
