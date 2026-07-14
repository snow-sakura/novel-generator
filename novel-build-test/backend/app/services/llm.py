"""国产大模型 Provider 工厂

支持的大模型（人民币计价）：
  - DeepSeek-V3
  - DeepSeek-R1
  - 通义千问-Max (Qwen-Max)
  - GLM-4
  - Moonshot-v1 (Kimi)
"""

from abc import ABC, abstractmethod
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


class BaseLLMProvider(ABC):
    """大模型 Provider 抽象基类"""

    def __init__(self, api_key: str, base_url: str):
        self.api_key = api_key
        self.base_url = base_url.rstrip("/")

    @abstractmethod
    async def chat(self, messages: list[dict], **kwargs: Any) -> LLMResult:
        """发送对话请求"""
        ...

    @abstractmethod
    def calculate_cost(self, prompt_tokens: int, completion_tokens: int) -> float:
        """按人民币计价计算费用"""
        ...


class DeepSeekV3Provider(BaseLLMProvider):
    """DeepSeek-V3（深度求索）

    价格：输入 0.5 元/百万 token，输出 2 元/百万 token
    """

    async def chat(self, messages: list[dict], **kwargs: Any) -> LLMResult:
        import httpx

        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
        }
        payload = {
            "model": "deepseek-chat",
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
                usage=LLMUsage(prompt_tokens=pt, completion_tokens=ct, cost_yuan=self.calculate_cost(pt, ct)),
                model_name="deepseek-v3",
            )

    def calculate_cost(self, prompt_tokens: int, completion_tokens: int) -> float:
        return (prompt_tokens * 0.5 + completion_tokens * 2.0) / 1_000_000


class DeepSeekR1Provider(BaseLLMProvider):
    """DeepSeek-R1（深度求索推理模型）

    价格：输入 2 元/百万 token，输出 8 元/百万 token
    """

    async def chat(self, messages: list[dict], **kwargs: Any) -> LLMResult:
        import httpx

        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
        }
        payload = {
            "model": "deepseek-reasoner",
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
                usage=LLMUsage(prompt_tokens=pt, completion_tokens=ct, cost_yuan=self.calculate_cost(pt, ct)),
                model_name="deepseek-r1",
            )

    def calculate_cost(self, prompt_tokens: int, completion_tokens: int) -> float:
        return (prompt_tokens * 2.0 + completion_tokens * 8.0) / 1_000_000


class QwenMaxProvider(BaseLLMProvider):
    """通义千问-Max（阿里云）

    价格：输入 2 元/百万 token，输出 6 元/百万 token
    """

    async def chat(self, messages: list[dict], **kwargs: Any) -> LLMResult:
        import httpx

        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
        }
        payload = {
            "model": "qwen-max",
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
                usage=LLMUsage(prompt_tokens=pt, completion_tokens=ct, cost_yuan=self.calculate_cost(pt, ct)),
                model_name="qwen-max",
            )

    def calculate_cost(self, prompt_tokens: int, completion_tokens: int) -> float:
        return (prompt_tokens * 2.0 + completion_tokens * 6.0) / 1_000_000


class GLM4Provider(BaseLLMProvider):
    """GLM-4（智谱 AI）

    价格：输入 1 元/百万 token，输出 2 元/百万 token
    """

    async def chat(self, messages: list[dict], **kwargs: Any) -> LLMResult:
        import httpx

        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
        }
        payload = {
            "model": "glm-4-plus",
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
                usage=LLMUsage(prompt_tokens=pt, completion_tokens=ct, cost_yuan=self.calculate_cost(pt, ct)),
                model_name="glm-4-plus",
            )

    def calculate_cost(self, prompt_tokens: int, completion_tokens: int) -> float:
        return (prompt_tokens * 1.0 + completion_tokens * 2.0) / 1_000_000


class MoonshotV1Provider(BaseLLMProvider):
    """Moonshot-v1（月之暗面 Kimi）

    价格：输入 1 元/百万 token，输出 2 元/百万 token
    """

    async def chat(self, messages: list[dict], **kwargs: Any) -> LLMResult:
        import httpx

        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
        }
        payload = {
            "model": "moonshot-v1-8k",
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
                usage=LLMUsage(prompt_tokens=pt, completion_tokens=ct, cost_yuan=self.calculate_cost(pt, ct)),
                model_name="moonshot-v1",
            )

    def calculate_cost(self, prompt_tokens: int, completion_tokens: int) -> float:
        return (prompt_tokens * 1.0 + completion_tokens * 2.0) / 1_000_000


# ==================== 工厂函数 ====================

_PROVIDER_MAP = {
    "deepseek-v3": ("deepseek_api_key", "deepseek_base_url", DeepSeekV3Provider),
    "deepseek-r1": ("deepseek_api_key", "deepseek_base_url", DeepSeekR1Provider),
    "qwen-max": ("qwen_api_key", "qwen_base_url", QwenMaxProvider),
    "glm-4": ("glm_api_key", "glm_base_url", GLM4Provider),
    "moonshot-v1": ("moonshot_api_key", "moonshot_base_url", MoonshotV1Provider),
}


def get_provider(model_name: str) -> BaseLLMProvider | None:
    """根据模型名称获取对应的 Provider 实例

    Args:
        model_name: 模型名称（deepseek-v3 / deepseek-r1 / qwen-max / glm-4 / moonshot-v1）

    Returns:
        Provider 实例，如果模型不存在或 API Key 未配置则返回 None
    """
    info = _PROVIDER_MAP.get(model_name.lower())
    if not info:
        return None

    api_key_attr, base_url_attr, provider_cls = info
    api_key = getattr(settings, api_key_attr, "")
    base_url = getattr(settings, base_url_attr, "")

    if not api_key:
        return None

    return provider_cls(api_key=api_key, base_url=base_url)
