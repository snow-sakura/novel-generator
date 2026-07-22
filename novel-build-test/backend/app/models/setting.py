"""系统设置模型 — AISQA 键值对配置存储"""

from sqlalchemy import Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base
from app.models.base import TimestampMixin


class Setting(TimestampMixin, Base):
    """系统设置表（键值对存储）

    属性说明：
        id: 主键自增
        key: 设置键名（唯一）
        value: 设置值
        description: 设置说明
    """

    __tablename__ = "settings"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    key: Mapped[str] = mapped_column(String(100), unique=True, nullable=False, comment="设置键名")
    value: Mapped[str] = mapped_column(Text, nullable=False, comment="设置值")
    description: Mapped[str | None] = mapped_column(String(500), nullable=True, comment="设置说明")

    def __repr__(self) -> str:
        return f"<Setting key={self.key}>"
