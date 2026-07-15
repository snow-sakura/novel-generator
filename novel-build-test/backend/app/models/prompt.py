"""提示词工程模型 — Agent 提示词管理、版本控制、模板与 Few-shot"""

from sqlalchemy import Boolean, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base
from app.models.base import TimestampMixin


class AgentPrompt(TimestampMixin, Base):
    """Agent 提示词表

    属性说明：
        id: 主键自增
        agent_key: Agent 唯一标识（如 requirements-analyst）
        content: 提示词内容
        version: 当前版本号
        description: 说明
        created_by: 创建者用户 ID
    """

    __tablename__ = "agent_prompts"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    agent_key: Mapped[str] = mapped_column(
        String(100), unique=True, nullable=False, comment="Agent 标识"
    )
    content: Mapped[str] = mapped_column(Text, nullable=False, comment="提示词内容")
    version: Mapped[int] = mapped_column(Integer, default=1, comment="当前版本")
    description: Mapped[str | None] = mapped_column(String(500), nullable=True, comment="说明")
    created_by: Mapped[int | None] = mapped_column(Integer, nullable=True, comment="创建者")

    def __repr__(self) -> str:
        return f"<AgentPrompt key={self.agent_key} v{self.version}>"


class PromptVersion(TimestampMixin, Base):
    """提示词版本历史表"""

    __tablename__ = "prompt_versions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    agent_key: Mapped[str] = mapped_column(String(100), nullable=False, comment="Agent 标识")
    version: Mapped[int] = mapped_column(Integer, nullable=False, comment="版本号")
    content: Mapped[str] = mapped_column(Text, nullable=False, comment="版本内容")
    change_note: Mapped[str | None] = mapped_column(String(500), nullable=True, comment="变更说明")
    created_by: Mapped[int | None] = mapped_column(Integer, nullable=True, comment="创建者")

    def __repr__(self) -> str:
        return f"<PromptVersion key={self.agent_key} v{self.version}>"


class PromptTemplate(TimestampMixin, Base):
    """提示词模板表"""

    __tablename__ = "prompt_templates"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(100), nullable=False, comment="模板名称")
    category: Mapped[str | None] = mapped_column(String(50), nullable=True, comment="分类")
    content: Mapped[str] = mapped_column(Text, nullable=False, comment="模板内容")
    is_preset: Mapped[bool] = mapped_column(Boolean, default=False, comment="是否预置")
    created_by: Mapped[int | None] = mapped_column(Integer, nullable=True, comment="创建者")

    def __repr__(self) -> str:
        return f"<PromptTemplate id={self.id} name={self.name}>"


class FewShotExample(TimestampMixin, Base):
    """Few-shot 示例表"""

    __tablename__ = "fewshot_examples"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    agent_key: Mapped[str] = mapped_column(String(100), nullable=False, comment="Agent 标识")
    input_text: Mapped[str] = mapped_column(Text, nullable=False, comment="输入示例")
    output_text: Mapped[str] = mapped_column(Text, nullable=False, comment="输出示例")
    description: Mapped[str | None] = mapped_column(String(500), nullable=True, comment="说明")
    sort_order: Mapped[int] = mapped_column(Integer, default=0, comment="排序")

    def __repr__(self) -> str:
        return f"<FewShotExample id={self.id} key={self.agent_key}>"
