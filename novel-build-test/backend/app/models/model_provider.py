"""LLM 模型提供商模型 — 动态管理 AI Provider 配置"""

from sqlalchemy import Boolean, Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base
from app.models.base import TimestampMixin


class ModelProvider(TimestampMixin, Base):
    """LLM 提供商配置表

    属性说明：
        id: 主键自增
        name: 提供商名称（如 DeepSeek, Qwen, GLM, Moonshot）
        provider_type: 提供商类型（openai/anthropic/deepseek/qwen/glm/moonshot/custom）
        api_key: API 密钥（加密存储）
        base_url: API 基础地址
        config: 额外配置（JSON）
        is_active: 是否启用
        sort_order: 排序权重
    """

    __tablename__ = "model_providers"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(100), nullable=False, comment="提供商名称")
    provider_type: Mapped[str] = mapped_column(
        String(50), nullable=False, comment="类型: openai/anthropic/deepseek/qwen/glm/moonshot/custom"
    )
    api_key: Mapped[str] = mapped_column(String(500), default="", comment="API 密钥")
    base_url: Mapped[str] = mapped_column(String(500), default="", comment="API 基础地址")
    config: Mapped[str | None] = mapped_column(Text, nullable=True, comment="额外配置(JSON)")
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, comment="是否启用")
    sort_order: Mapped[int] = mapped_column(Integer, default=0, comment="排序权重")

    def __repr__(self) -> str:
        return f"<ModelProvider id={self.id} name={self.name}>"


class AIModel(TimestampMixin, Base):
    """AI 模型配置表

    属性说明：
        id: 主键自增
        provider_id: 所属提供商（外键 → model_providers.id）
        name: 模型标识名（如 deepseek-v4-flash）
        display_name: 显示名称（如 DeepSeek-V4-Flash）
        max_tokens: 最大上下文长度
        input_price_per_m: 输入价格（人民币/百万 tokens）
        output_price_per_m: 输出价格（人民币/百万 tokens）
        is_active: 是否启用
    """

    __tablename__ = "ai_models"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    provider_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("model_providers.id"), nullable=False, comment="所属提供商ID"
    )
    name: Mapped[str] = mapped_column(String(100), nullable=False, comment="模型标识名")
    display_name: Mapped[str | None] = mapped_column(String(100), nullable=True, comment="显示名称")
    max_tokens: Mapped[int] = mapped_column(Integer, default=4096, comment="最大上下文长度")
    input_price_per_m: Mapped[float] = mapped_column(
        Float, default=0.0, comment="输入价格(分/百万tokens)"
    )
    output_price_per_m: Mapped[float] = mapped_column(
        Float, default=0.0, comment="输出价格(分/百万tokens)"
    )
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, comment="是否启用")

    def __repr__(self) -> str:
        return f"<AIModel id={self.id} name={self.name}>"


class ModelTierConfig(TimestampMixin, Base):
    """模型分级策略表

    属性说明：
        id: 主键自增
        name: 分级名称（如 L1, L2, L3, L4, L5）
        description: 描述
        model_id: 关联模型ID
        rules: 路由规则（JSON）
        weight: 权重（用于多模型负载）
    """

    __tablename__ = "model_tier_configs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(20), nullable=False, comment="分级名称: L1/L2/L3/L4/L5")
    description: Mapped[str | None] = mapped_column(String(500), nullable=True, comment="描述")
    model_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("ai_models.id"), nullable=False, comment="关联模型ID"
    )
    rules: Mapped[str | None] = mapped_column(Text, nullable=True, comment="路由规则(JSON)")
    weight: Mapped[int] = mapped_column(Integer, default=0, comment="权重(0-100)")

    def __repr__(self) -> str:
        return f"<ModelTierConfig id={self.id} name={self.name}>"


class CostRecord(TimestampMixin, Base):
    """模型调用成本记录表

    属性说明：
        id: 主键自增
        execution_id: 关联执行记录ID
        model_id: 使用的模型ID
        input_tokens: 输入 token 数
        output_tokens: 输出 token 数
        cost_yuan: 费用（人民币元）
    """

    __tablename__ = "cost_records"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    execution_id: Mapped[int | None] = mapped_column(
        Integer, ForeignKey("agent_executions.id"), nullable=True, comment="执行记录ID"
    )
    model_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("ai_models.id"), nullable=False, comment="模型ID"
    )
    input_tokens: Mapped[int] = mapped_column(Integer, default=0, comment="输入 tokens")
    output_tokens: Mapped[int] = mapped_column(Integer, default=0, comment="输出 tokens")
    cost_yuan: Mapped[float] = mapped_column(Float, default=0.0, comment="费用(分)")

    def __repr__(self) -> str:
        return f"<CostRecord id={self.id} model_id={self.model_id} cost={self.cost_yuan}>"
