"""国产大模型 Provider 工厂（2026-07 最新版）

支持的模型：
  - DeepSeek-V4-Flash  (L1 — 常规任务，需求分析、用例生成、报告编写)
  - DeepSeek-V4-Pro    (L2 — 推理审计，质量审计、辩论、缺陷分析)
  - GLM-5              (L3 — 结构化输出，测试计划、架构设计)
  - Qwen3-Max          (L4 — 复杂决策，架构评审、重大缺陷判定)
  - Kimi K2.5          (L5 — 长文档分析，256K 上下文)

所有 Provider 均兼容 OpenAI API 格式，通过统一配置驱动。
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any

from app.config import settings


@dataclass
class LLMUsage:
    """模型调用消耗统计"""

    prompt_tokens: int = 0
    completion_tokens: int = 0
    cost_yuan: float = 0.0


@dataclass
class LLMResult:
    """模型调用结果"""

    content: str
    usage: LLMUsage
    model_name: str


@dataclass
class ModelPrice:
    """模型定价配置（人民币/百万 token）"""

    input_price_per_m: float
    output_price_per_m: float


# ==================== 模型定价注册表 ====================
# 所有定价数据集中管理，便于统一更新

_MODEL_REGISTRY: dict[str, ModelPrice] = {
    # DeepSeek
    "deepseek-v4-flash": ModelPrice(input_price_per_m=1.0, output_price_per_m=2.0),
    "deepseek-v4-pro": ModelPrice(input_price_per_m=12.0, output_price_per_m=24.0),
    # 阿里云
    "qwen3-max": ModelPrice(input_price_per_m=2.5, output_price_per_m=10.0),
    # 智谱 AI
    "glm-5": ModelPrice(input_price_per_m=7.0, output_price_per_m=22.0),
    # 月之暗面
    "kimi-k2.5": ModelPrice(input_price_per_m=6.5, output_price_per_m=28.0),
}

# 模型 → (config 属性名 API Key, config 属性名 Base URL)
_CONFIG_MAP: dict[str, tuple[str, str]] = {
    "deepseek-v4-flash": ("deepseek_api_key", "deepseek_base_url"),
    "deepseek-v4-pro": ("deepseek_api_key", "deepseek_base_url"),
    "qwen3-max": ("qwen_api_key", "qwen_base_url"),
    "glm-5": ("glm_api_key", "glm_base_url"),
    "kimi-k2.5": ("moonshot_api_key", "moonshot_base_url"),
}


# ==================== 统一 Provider ====================


class OpenAICompatibleProvider:
    """OpenAI 兼容 API 的统一 Provider（替代 5 个重复 Provider 类）

    所有国产大模型均提供 OpenAI 兼容接口（/chat/completions），
    仅在 model 名称和定价上存在差异，通过注册表驱动即可。

    Args:
        api_key: API 密钥
        base_url: API 基础地址
        model_name: 模型名称（用于注册表查找定价）
    """

    def __init__(self, api_key: str, base_url: str, model_name: str) -> None:
        self.api_key = api_key
        self.base_url = base_url.rstrip("/")
        self.model_name = model_name
        self.price = _MODEL_REGISTRY[model_name]

    async def chat(self, messages: list[dict], **kwargs: Any) -> LLMResult:
        """发送对话请求（OpenAI 兼容接口）"""
        import httpx

        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
        }
        payload = {
            "model": self.model_name,
            "messages": messages,
            **kwargs,
        }
        async with httpx.AsyncClient() as client:
            resp = await client.post(
                f"{self.base_url}/chat/completions",
                headers=headers,
                json=payload,
                timeout=120,
            )
            resp.raise_for_status()
            data = resp.json()
            choice = data["choices"][0]
            usage = data["usage"]
            pt = usage["prompt_tokens"]
            ct = usage["completion_tokens"]
            return LLMResult(
                content=choice["message"]["content"],
                usage=LLMUsage(
                    prompt_tokens=pt,
                    completion_tokens=ct,
                    cost_yuan=self.calculate_cost(pt, ct),
                ),
                model_name=self.model_name,
            )

    def calculate_cost(self, prompt_tokens: int, completion_tokens: int) -> float:
        """按人民币计价计算费用"""
        return (
            prompt_tokens * self.price.input_price_per_m
            + completion_tokens * self.price.output_price_per_m
        ) / 1_000_000


# ==================== 工厂函数 ====================


def get_provider(model_name: str) -> OpenAICompatibleProvider | None:
    """根据模型名称获取对应的 Provider 实例

    Args:
        model_name: 模型名称（deepseek-v4-flash / deepseek-v4-pro / qwen3-max / glm-5 / kimi-k2.5）

    Returns:
        Provider 实例，如果模型不存在或 API Key 未配置则返回 None
    """
    model_key = model_name.lower()
    if model_key not in _MODEL_REGISTRY or model_key not in _CONFIG_MAP:
        return None

    api_key_attr, base_url_attr = _CONFIG_MAP[model_key]
    api_key = getattr(settings, api_key_attr, "")
    base_url = getattr(settings, base_url_attr, "")

    if not api_key:
        return None

    return OpenAICompatibleProvider(
        api_key=api_key,
        base_url=base_url,
        model_name=model_key,
    )


def get_all_available_models() -> list[dict[str, Any]]:
    """列出所有已配置可用的模型（API Key 非空）"""
    available = []
    for model_key in _MODEL_REGISTRY:
        api_key_attr, _ = _CONFIG_MAP[model_key]
        if getattr(settings, api_key_attr, ""):
            price = _MODEL_REGISTRY[model_key]
            available.append(
                {
                    "model": model_key,
                    "input_price_per_m": price.input_price_per_m,
                    "output_price_per_m": price.output_price_per_m,
                }
            )
    return available
