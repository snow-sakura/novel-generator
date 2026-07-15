"""模型配置相关 Pydantic 模型 — 请求与响应"""

import datetime

from pydantic import BaseModel, Field

from app.schemas.base import Page


# ==================== ModelProvider ====================


class ModelProviderCreate(BaseModel):
    """创建 LLM 提供商请求"""

    name: str = Field(..., min_length=1, max_length=100, description="提供商名称")
    provider_type: str = Field(..., description="类型: openai/anthropic/deepseek/qwen/glm/moonshot/custom")
    api_key: str = Field("", description="API 密钥")
    base_url: str = Field("", description="API 基础地址")
    config: str | None = Field(None, description="额外配置(JSON)")
    sort_order: int = Field(0, ge=0, description="排序权重")


class ModelProviderUpdate(BaseModel):
    """更新 LLM 提供商请求"""

    name: str | None = Field(None, min_length=1, max_length=100)
    provider_type: str | None = None
    api_key: str | None = None
    base_url: str | None = None
    config: str | None = None
    is_active: bool | None = None
    sort_order: int | None = Field(None, ge=0)


class ModelProviderResponse(BaseModel):
    """LLM 提供商响应"""

    id: int
    name: str
    provider_type: str
    api_key: str = ""
    base_url: str = ""
    config: str | None = None
    is_active: bool = True
    sort_order: int = 0
    created_at: datetime.datetime | None = None
    updated_at: datetime.datetime | None = None

    model_config = {"from_attributes": True}


ModelProviderPage = Page[ModelProviderResponse]


# ==================== AIModel ====================


class AIModelCreate(BaseModel):
    """创建模型请求"""

    provider_id: int = Field(..., ge=1, description="所属提供商ID")
    name: str = Field(..., min_length=1, max_length=100, description="模型标识名")
    display_name: str | None = Field(None, max_length=100, description="显示名称")
    max_tokens: int = Field(4096, ge=1, description="最大上下文长度")
    input_price_per_m: float = Field(0, ge=0, description="输入价格(元/百万tokens)")
    output_price_per_m: float = Field(0, ge=0, description="输出价格(元/百万tokens)")


class AIModelUpdate(BaseModel):
    """更新模型请求"""

    provider_id: int | None = Field(None, ge=1)
    name: str | None = Field(None, min_length=1, max_length=100)
    display_name: str | None = None
    max_tokens: int | None = Field(None, ge=1)
    input_price_per_m: float | None = Field(None, ge=0)
    output_price_per_m: float | None = Field(None, ge=0)
    is_active: bool | None = None


class AIModelResponse(BaseModel):
    """模型响应"""

    id: int
    provider_id: int
    name: str
    display_name: str | None = None
    max_tokens: int = 4096
    input_price_per_m: float = 0
    output_price_per_m: float = 0
    is_active: bool = True
    created_at: datetime.datetime | None = None

    model_config = {"from_attributes": True}


AIModelPage = Page[AIModelResponse]


# ==================== ModelTierConfig ====================


class TierConfigCreate(BaseModel):
    """创建分级策略请求"""

    name: str = Field(..., min_length=1, max_length=20, description="分级名称: L1-L5")
    description: str | None = Field(None, max_length=500)
    model_id: int = Field(..., ge=1, description="关联模型ID")
    rules: str | None = Field(None, description="路由规则(JSON)")
    weight: int = Field(0, ge=0, le=100, description="权重")


class TierConfigUpdate(BaseModel):
    """更新分级策略请求"""

    name: str | None = Field(None, min_length=1, max_length=20)
    description: str | None = None
    model_id: int | None = Field(None, ge=1)
    rules: str | None = None
    weight: int | None = Field(None, ge=0, le=100)


class TierConfigResponse(BaseModel):
    """分级策略响应"""

    id: int
    name: str
    description: str | None = None
    model_id: int
    rules: str | None = None
    weight: int = 0
    created_at: datetime.datetime | None = None

    model_config = {"from_attributes": True}


TierConfigPage = Page[TierConfigResponse]


# ==================== CostRecord ====================


class CostRecordResponse(BaseModel):
    """成本记录响应"""

    id: int
    execution_id: int | None = None
    model_id: int
    input_tokens: int = 0
    output_tokens: int = 0
    cost_yuan: float = 0
    created_at: datetime.datetime | None = None

    model_config = {"from_attributes": True}


CostRecordPage = Page[CostRecordResponse]


class CostOverview(BaseModel):
    """成本概览"""

    total_cost: float = 0
    total_input_tokens: int = 0
    total_output_tokens: int = 0
    execution_count: int = 0
    model_breakdown: list[dict] = []


class CostTrend(BaseModel):
    """成本趋势"""

    daily_costs: list[dict] = []


# ==================== 连通性测试 ====================


class ProviderTestRequest(BaseModel):
    """连通性测试请求"""

    api_key: str = Field(..., description="API 密钥")
    base_url: str = Field(..., description="API 基础地址")
    model: str = Field("deepseek-v4-flash", description="测试模型")


class ProviderTestResponse(BaseModel):
    """连通性测试响应"""

    success: bool
    message: str
    latency_ms: int | None = None
