"""国产大模型 Provider 工厂（2026-07 最新版）

支持的模型：
  - DeepSeek-V4-Flash  (L1 — 常规任务，需求分析、用例生成、报告编写)
  - DeepSeek-V4-Pro    (L2 — 推理审计，质量审计、辩论、缺陷分析)
  - GLM-5              (L3 — 结构化输出，测试计划、架构设计)
  - Qwen3-Max          (L4 — 复杂决策，架构评审、重大缺陷判定)
  - Kimi K2.5          (L5 — 长文档分析，256K 上下文)
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


# ==================== DeepSeek-V4-Flash (L1) ====================


class DeepSeekV4FlashProvider(BaseLLMProvider):
    """DeepSeek-V4-Flash（深度求索 — 常规任务主力模型）

    发布: 2026-04-24
    价格: 输入 ¥1/百万 token，输出 ¥2/百万 token
    上下文: 1M tokens
    特点: 速度快、成本低，替代原 DeepSeek-V3
    """

    async def chat(self, messages: list[dict], **kwargs: Any) -> LLMResult:
        import httpx

        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
        }
        payload = {
            "model": "deepseek-v4-flash",
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
                model_name="deepseek-v4-flash",
            )

    def calculate_cost(self, prompt_tokens: int, completion_tokens: int) -> float:
        return (prompt_tokens * 1.0 + completion_tokens * 2.0) / 1_000_000


# ==================== DeepSeek-V4-Pro (L2) ====================


class DeepSeekV4ProProvider(BaseLLMProvider):
    """DeepSeek-V4-Pro（深度求索 — 推理审计/复杂推理）

    发布: 2026-04-24
    价格: 输入 ¥12/百万 token，输出 ¥24/百万 token
    上下文: 1M tokens
    特点: 强推理、编码、Agent 工作流，替代原 DeepSeek-R1
    """

    async def chat(self, messages: list[dict], **kwargs: Any) -> LLMResult:
        import httpx

        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
        }
        payload = {
            "model": "deepseek-v4-pro",
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
                model_name="deepseek-v4-pro",
            )

    def calculate_cost(self, prompt_tokens: int, completion_tokens: int) -> float:
        return (prompt_tokens * 12.0 + completion_tokens * 24.0) / 1_000_000


# ==================== Qwen3-Max (L4) ====================


class Qwen3MaxProvider(BaseLLMProvider):
    """Qwen3-Max（阿里云通义千问 — 复杂决策旗舰模型）

    发布: 2026
    价格: 输入 ¥2.5/百万 token，输出 ¥10/百万 token
    上下文: 256K tokens
    特点: 通用旗舰，推理能力最强，替代原 Qwen-Max
    """

    async def chat(self, messages: list[dict], **kwargs: Any) -> LLMResult:
        import httpx

        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
        }
        payload = {
            "model": "qwen3-max",
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
                model_name="qwen3-max",
            )

    def calculate_cost(self, prompt_tokens: int, completion_tokens: int) -> float:
        return (prompt_tokens * 2.5 + completion_tokens * 10.0) / 1_000_000


# ==================== GLM-5 (L3) ====================


class GLM5Provider(BaseLLMProvider):
    """GLM-5（智谱 AI — 结构化输出旗舰）

    发布: 2026-02，最新版 GLM-5.2（2026-06）
    价格: 输入 ¥7/百万 token，输出 ¥22/百万 token
    上下文: 128K~1M tokens
    特点: 编码、多模态、推理，替代原 GLM-4
    """

    async def chat(self, messages: list[dict], **kwargs: Any) -> LLMResult:
        import httpx

        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
        }
        payload = {
            "model": "glm-5",
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
                model_name="glm-5",
            )

    def calculate_cost(self, prompt_tokens: int, completion_tokens: int) -> float:
        return (prompt_tokens * 7.0 + completion_tokens * 22.0) / 1_000_000


# ==================== Kimi K2.5 (L5 — 长文档分析) ====================


class KimiK25Provider(BaseLLMProvider):
    """Kimi K2.5（月之暗面 Moonshot — 长文档/多模态分析）

    发布: 2026-01-27
    价格: 输入 ¥6.5/百万 token，输出 ¥28/百万 token
    上下文: 256K tokens
    特点: 多模态（文本+代码+图片+视频），超长上下文，替代原 Moonshot-v1
    """

    async def chat(self, messages: list[dict], **kwargs: Any) -> LLMResult:
        import httpx

        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
        }
        payload = {
            "model": "kimi-k2.5",
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
                model_name="kimi-k2.5",
            )

    def calculate_cost(self, prompt_tokens: int, completion_tokens: int) -> float:
        return (prompt_tokens * 6.5 + completion_tokens * 28.0) / 1_000_000


# ==================== 工厂函数 ====================

_PROVIDER_MAP = {
    "deepseek-v4-flash": ("deepseek_api_key", "deepseek_base_url", DeepSeekV4FlashProvider),
    "deepseek-v4-pro": ("deepseek_api_key", "deepseek_base_url", DeepSeekV4ProProvider),
    "qwen3-max": ("qwen_api_key", "qwen_base_url", Qwen3MaxProvider),
    "glm-5": ("glm_api_key", "glm_base_url", GLM5Provider),
    "kimi-k2.5": ("moonshot_api_key", "moonshot_base_url", KimiK25Provider),
}


def get_provider(model_name: str) -> BaseLLMProvider | None:
    """根据模型名称获取对应的 Provider 实例

    Args:
        model_name: 模型名称（deepseek-v4-flash / deepseek-v4-pro / qwen3-max / glm-5 / kimi-k2.5）

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
