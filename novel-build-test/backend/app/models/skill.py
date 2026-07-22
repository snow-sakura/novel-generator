"""Skills 技能中心模型 — 技能注册、权限与调用日志"""

from sqlalchemy import Boolean, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base
from app.models.base import TimestampMixin


class Skill(TimestampMixin, Base):
    """技能注册表"""

    __tablename__ = "skills"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(100), nullable=False, comment="技能名称")
    skill_type: Mapped[str] = mapped_column(String(30), nullable=False, comment="类型: mcp/internal/custom")
    description: Mapped[str | None] = mapped_column(Text, nullable=True, comment="描述")
    config: Mapped[str] = mapped_column(Text, nullable=False, comment="配置(JSON)")
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, comment="是否启用")

    def __repr__(self) -> str:
        return f"<Skill id={self.id} name={self.name}>"


class McpTool(TimestampMixin, Base):
    """MCP 工具注册表"""

    __tablename__ = "mcp_tools"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(100), unique=True, nullable=False, comment="工具名称")
    description: Mapped[str | None] = mapped_column(Text, nullable=True, comment="描述")
    schema_def: Mapped[str] = mapped_column(Text, nullable=False, comment="工具Schema(JSON)")
    endpoint: Mapped[str | None] = mapped_column(String(500), nullable=True, comment="调用端点")
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, comment="是否启用")

    def __repr__(self) -> str:
        return f"<McpTool id={self.id} name={self.name}>"


class SkillPermission(TimestampMixin, Base):
    """技能权限分配表"""

    __tablename__ = "skill_permissions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    agent_key: Mapped[str] = mapped_column(String(100), nullable=False, comment="Agent 标识")
    skill_id: Mapped[int] = mapped_column(Integer, ForeignKey("skills.id"), nullable=False)
    is_enabled: Mapped[bool] = mapped_column(Boolean, default=True, comment="是否启用")

    def __repr__(self) -> str:
        return f"<SkillPermission agent={self.agent_key} skill={self.skill_id}>"


class SkillLog(TimestampMixin, Base):
    """技能调用日志表"""

    __tablename__ = "skill_logs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    skill_id: Mapped[int] = mapped_column(Integer, ForeignKey("skills.id"), nullable=False)
    agent_key: Mapped[str | None] = mapped_column(String(100), nullable=True, comment="Agent 标识")
    input_data: Mapped[str | None] = mapped_column(Text, nullable=True, comment="输入(JSON)")
    output_data: Mapped[str | None] = mapped_column(Text, nullable=True, comment="输出(JSON)")
    duration_ms: Mapped[int] = mapped_column(Integer, default=0, comment="耗时(ms)")
    status: Mapped[str] = mapped_column(String(20), default="success", comment="状态: success/failed")

    def __repr__(self) -> str:
        return f"<SkillLog id={self.id} skill={self.skill_id} status={self.status}>"
