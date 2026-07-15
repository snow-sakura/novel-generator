"""集成与通知模型 — CI/CD 配置、通知渠道、外部工具"""

from sqlalchemy import Boolean, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base
from app.models.base import TimestampMixin


class CicdConfig(TimestampMixin, Base):
    """CI/CD 集成配置表"""

    __tablename__ = "cicd_configs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    project_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("projects.id"), nullable=False, comment="项目ID"
    )
    name: Mapped[str] = mapped_column(String(100), nullable=False, comment="配置名称")
    ci_type: Mapped[str] = mapped_column(String(30), nullable=False, comment="类型: jenkins/github/gitlab")
    webhook_url: Mapped[str] = mapped_column(String(500), nullable=False, comment="Webhook URL")
    secret: Mapped[str | None] = mapped_column(String(500), nullable=True, comment="密钥")
    events: Mapped[str | None] = mapped_column(Text, nullable=True, comment="触发事件(JSON)")
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, comment="是否启用")

    def __repr__(self) -> str:
        return f"<CicdConfig id={self.id} name={self.name}>"


class NotificationChannel(TimestampMixin, Base):
    """通知渠道配置表"""

    __tablename__ = "notification_channels"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(100), nullable=False, comment="渠道名称")
    channel_type: Mapped[str] = mapped_column(String(30), nullable=False, comment="类型: email/dingtalk/feishu/slack")
    config: Mapped[str] = mapped_column(Text, nullable=False, comment="配置(JSON)")
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, comment="是否启用")

    def __repr__(self) -> str:
        return f"<NotificationChannel id={self.id} name={self.name}>"


class ExternalTool(TimestampMixin, Base):
    """外部工具配置表"""

    __tablename__ = "external_tools"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(100), nullable=False, comment="工具名称")
    tool_type: Mapped[str] = mapped_column(String(30), nullable=False, comment="类型: jira/git/zentao")
    config: Mapped[str] = mapped_column(Text, nullable=False, comment="配置(JSON)")
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, comment="是否启用")

    def __repr__(self) -> str:
        return f"<ExternalTool id={self.id} name={self.name}>"
