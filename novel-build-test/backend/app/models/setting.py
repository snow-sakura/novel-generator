"""系统设置模型 — AISQA 键值对配置存储"""

import datetime

from sqlalchemy import DateTime, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class Setting(Base):
    """系统设置表（键值对存储）

    属性说明：
        id: 主键自增
        key: 设置键名（唯一）
        value: 设置值
        description: 设置说明
        updated_at: 最后更新时间
    """

    __tablename__ = "settings"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    key: Mapped[str] = mapped_column(
        String(100), unique=True, nullable=False, comment="设置键名"
    )
    value: Mapped[str] = mapped_column(Text, nullable=False, comment="设置值")
    description: Mapped[str | None] = mapped_column(
        String(500), nullable=True, comment="设置说明"
    )
    updated_at: Mapped[datetime.datetime] = mapped_column(
        DateTime, server_default=func.now(), onupdate=func.now(), comment="更新时间"
    )

    def __repr__(self) -> str:
        return f"<Setting key={self.key}>"
