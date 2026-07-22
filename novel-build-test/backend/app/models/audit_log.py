"""审计日志模型 — 记录系统操作轨迹"""

import datetime

from sqlalchemy import JSON, DateTime, Integer, String, func
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class AuditLog(Base):
    """审计日志表

    记录用户操作、AI 决策等关键事件，用于追踪和回查。

    属性说明：
        id: 主键自增
        entity_type: 操作实体类型（如 project, user, agent_execution）
        entity_id: 操作实体 ID
        action: 操作名称（如 create, update, delete, review）
        source: 来源（user / ai_agent / system）
        actor_id: 操作者 ID
        actor_name: 操作者名称
        changes: 变更详情（JSON，记录修改前后的字段）
        ai_metadata: AI 决策元数据（JSON，如模型名称、推理过程等）
        ip_address: 请求 IP
        created_at: 操作时间
    """

    __tablename__ = "audit_logs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    entity_type: Mapped[str] = mapped_column(String(50), nullable=False, comment="实体类型")
    entity_id: Mapped[int] = mapped_column(Integer, nullable=False, comment="实体 ID")
    action: Mapped[str] = mapped_column(String(50), nullable=False, comment="操作名称")
    source: Mapped[str] = mapped_column(String(20), nullable=False, comment="来源: user/ai_agent/system")
    actor_id: Mapped[int] = mapped_column(Integer, nullable=True, comment="操作者 ID")
    actor_name: Mapped[str] = mapped_column(String(100), nullable=True, comment="操作者名称")
    changes: Mapped[dict | None] = mapped_column(JSON, nullable=True, comment="变更详情")
    ai_metadata: Mapped[dict | None] = mapped_column(JSON, nullable=True, comment="AI 决策元数据")
    ip_address: Mapped[str] = mapped_column(String(45), nullable=True, comment="请求 IP")
    created_at: Mapped[datetime.datetime] = mapped_column(DateTime, server_default=func.now(), comment="操作时间")

    def __repr__(self) -> str:
        return f"<AuditLog id={self.id} action={self.action} entity={self.entity_type}#{self.entity_id}>"
