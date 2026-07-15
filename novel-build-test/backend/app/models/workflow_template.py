"""工作流模板模型 — 流程模板定义、步骤编排与配置"""

from sqlalchemy import Boolean, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base
from app.models.base import TimestampMixin


class WorkflowTemplate(TimestampMixin, Base):
    """工作流模板表

    属性说明：
        id: 主键自增
        name: 模板名称
        description: 描述
        steps: 步骤定义（JSON，包含步骤顺序、Agent、参数）
        config: 配置（JSON，包含超时、重试、断点策略）
        is_preset: 是否预置模板
        is_active: 是否启用
        created_by: 创建者用户 ID
    """

    __tablename__ = "workflow_templates"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(200), nullable=False, comment="模板名称")
    description: Mapped[str | None] = mapped_column(String(500), nullable=True, comment="描述")
    steps: Mapped[str] = mapped_column(Text, nullable=False, default="[]", comment="步骤定义(JSON)")
    config: Mapped[str | None] = mapped_column(Text, nullable=True, comment="配置(JSON)")
    is_preset: Mapped[bool] = mapped_column(Boolean, default=False, comment="是否预置")
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, comment="是否启用")
    created_by: Mapped[int | None] = mapped_column(Integer, nullable=True, comment="创建者")

    def __repr__(self) -> str:
        return f"<WorkflowTemplate id={self.id} name={self.name}>"
