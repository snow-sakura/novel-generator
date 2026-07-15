"""Hermes 智能体配置模型 — 消息通道与权限审批"""

from sqlalchemy import Boolean, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base
from app.models.base import TimestampMixin


class HermesChannel(TimestampMixin, Base):
    """Hermes 消息通道配置表"""

    __tablename__ = "hermes_channels"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(100), nullable=False, comment="通道名称")
    platform: Mapped[str] = mapped_column(String(30), nullable=False, comment="平台: telegram/discord/slack/custom")
    config: Mapped[str] = mapped_column(Text, nullable=False, comment="平台配置(JSON)")
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, comment="是否启用")

    def __repr__(self) -> str:
        return f"<HermesChannel id={self.id} name={self.name}>"


class HermesPermission(TimestampMixin, Base):
    """Hermes 权限审批记录表"""

    __tablename__ = "hermes_permissions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    request_type: Mapped[str] = mapped_column(String(50), nullable=False, comment="请求类型")
    request_data: Mapped[str] = mapped_column(Text, nullable=False, comment="请求数据(JSON)")
    status: Mapped[str] = mapped_column(String(20), default="pending", comment="状态: pending/approved/denied")
    responded_by: Mapped[int | None] = mapped_column(Integer, nullable=True, comment="审批人")
    responded_at: Mapped[str | None] = mapped_column(String(30), nullable=True, comment="审批时间")

    def __repr__(self) -> str:
        return f"<HermesPermission id={self.id} status={self.status}>"
