"""项目模型 — AISQA 测试项目"""

import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class Project(Base):
    """项目表

    属性说明：
        id: 主键自增
        name: 项目名称
        description: 项目描述
        status: 状态（active / archived / deleted）
        repo_url: 代码仓库地址
        owner_id: 所属用户 ID（外键 → users.id）
        created_at: 创建时间
        updated_at: 最后更新时间
    """

    __tablename__ = "projects"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(200), nullable=False, comment="项目名称")
    description: Mapped[str] = mapped_column(Text, nullable=True, comment="项目描述")
    status: Mapped[str] = mapped_column(String(20), default="active", comment="状态: active/archived/deleted")
    repo_url: Mapped[str] = mapped_column(String(500), nullable=True, comment="仓库地址")
    owner_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id"), nullable=False, comment="所属用户")
    created_at: Mapped[datetime.datetime] = mapped_column(
        DateTime, server_default=func.now(), comment="创建时间"
    )
    updated_at: Mapped[datetime.datetime] = mapped_column(
        DateTime, server_default=func.now(), onupdate=func.now(), comment="更新时间"
    )

    # 关联
    owner = relationship("User", back_populates="projects")

    def __repr__(self) -> str:
        return f"<Project id={self.id} name={self.name}>"
