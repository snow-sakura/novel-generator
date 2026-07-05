"""多 Provider 工厂：支持 OpenAI / Anthropic / Ollama / OpenCode Zen / 自定义国产模型"""
from abc import ABC, abstractmethod
from typing import AsyncGenerator, Optional

from app.config import settings


class LLMProvider(ABC):
    """LLM 统一抽象接口"""

    @abstractmethod
    async def generate_stream(self, prompt: str, system_prompt: str = "") -> AsyncGenerator[str, None]:
        ...

    @abstractmethod
    def validate(self) -> Optional[str]:
        ...


class OpenAIProvider(LLMProvider):
    def __init__(self):
        from langchain_openai import ChatOpenAI
        self.model_name = settings.openai_model
        self.llm = ChatOpenAI(api_key=settings.openai_api_key, model=self.model_name, streaming=True, temperature=0.8)

    def validate(self) -> Optional[str]:
        if not settings.openai_api_key or settings.openai_api_key == "sk-your-key-here":
            return "未配置正确的 OpenAI API Key"
        return None

    async def generate_stream(self, prompt: str, system_prompt: str = "") -> AsyncGenerator[str, None]:
        from langchain.schema import HumanMessage, SystemMessage
        messages = []
        if system_prompt:
            messages.append(SystemMessage(content=system_prompt))
        messages.append(HumanMessage(content=prompt))
        async for chunk in self.llm.astream(messages):
            if chunk.content:
                yield chunk.content


class AnthropicProvider(LLMProvider):
    def __init__(self):
        from langchain_anthropic import ChatAnthropic
        self.model_name = settings.anthropic_model
        self.llm = ChatAnthropic(api_key=settings.anthropic_api_key, model=self.model_name, streaming=True, temperature=0.8)

    def validate(self) -> Optional[str]:
        if not settings.anthropic_api_key:
            return "未配置 Anthropic API Key"
        return None

    async def generate_stream(self, prompt: str, system_prompt: str = "") -> AsyncGenerator[str, None]:
        from langchain.schema import HumanMessage
        messages = [HumanMessage(content=prompt)]
        async for chunk in self.llm.astream(messages, system=system_prompt if system_prompt else None):
            if chunk.content:
                yield chunk.content


class OllamaProvider(LLMProvider):
    def __init__(self):
        from langchain_ollama import ChatOllama
        self.model_name = settings.ollama_model
        self.llm = ChatOllama(base_url=settings.ollama_base_url, model=self.model_name, temperature=0.8)

    def validate(self) -> Optional[str]:
        if not settings.ollama_base_url:
            return "未配置 Ollama 地址"
        return None

    async def generate_stream(self, prompt: str, system_prompt: str = "") -> AsyncGenerator[str, None]:
        from langchain.schema import HumanMessage, SystemMessage
        messages = []
        if system_prompt:
            messages.append(SystemMessage(content=system_prompt))
        messages.append(HumanMessage(content=prompt))
        async for chunk in self.llm.astream(messages):
            if chunk.content:
                yield chunk.content


class OpenCodeProvider(LLMProvider):
    def __init__(self):
        from langchain_openai import ChatOpenAI
        self.model_name = settings.opencode_model
        self.llm = ChatOpenAI(api_key=settings.opencode_api_key, model=self.model_name, base_url=settings.opencode_base_url, streaming=True, temperature=0.8)

    def validate(self) -> Optional[str]:
        if not settings.opencode_api_key:
            return "未配置 OpenCode API Key"
        return None

    async def generate_stream(self, prompt: str, system_prompt: str = "") -> AsyncGenerator[str, None]:
        from langchain.schema import HumanMessage, SystemMessage
        messages = []
        if system_prompt:
            messages.append(SystemMessage(content=system_prompt))
        messages.append(HumanMessage(content=prompt))
        async for chunk in self.llm.astream(messages):
            if chunk.content:
                yield chunk.content


class CustomProvider(LLMProvider):
    """支持任意 OpenAI 兼容接口的自定义 Provider（国产模型）"""

    def __init__(self, base_url: str, model: str, api_key: str = ""):
        from langchain_openai import ChatOpenAI
        self.model_name = model
        self.base_url = base_url
        self.api_key = api_key
        self.llm = ChatOpenAI(
            api_key=api_key or "sk-placeholder",
            model=model,
            base_url=base_url,
            streaming=True,
            temperature=0.8,
        )

    def validate(self) -> Optional[str]:
        if not self.base_url:
            return "未配置 API 地址"
        if not self.model_name:
            return "未选择模型"
        return None

    async def generate_stream(self, prompt: str, system_prompt: str = "") -> AsyncGenerator[str, None]:
        from langchain.schema import HumanMessage, SystemMessage
        messages = []
        if system_prompt:
            messages.append(SystemMessage(content=system_prompt))
        messages.append(HumanMessage(content=prompt))
        try:
            async for chunk in self.llm.astream(messages):
                if chunk.content:
                    yield chunk.content
        except Exception as e:
            yield f"\n\n[生成错误: {e}]"


def get_llm_provider(model_config: dict = None) -> LLMProvider:
    """工厂方法，支持动态模型配置"""
    if model_config and model_config.get("provider"):
        provider_name = model_config["provider"]
        if provider_name in ("openai", "anthropic", "ollama", "opencode"):
            # 使用内置 Provider（忽略 custom 配置）
            pass
        else:
            # 自定义国产模型
            return CustomProvider(
                base_url=model_config.get("base_url", ""),
                model=model_config.get("model", ""),
                api_key=model_config.get("api_key", ""),
            )

    provider_map = {
        "openai": OpenAIProvider,
        "anthropic": AnthropicProvider,
        "ollama": OllamaProvider,
        "opencode": OpenCodeProvider,
    }
    provider_class = provider_map.get(settings.llm_provider)
    if not provider_class:
        raise ValueError(f"不支持的 LLM Provider，可选: {', '.join(provider_map.keys())}")
    return provider_class()


def get_current_provider_name() -> str:
    return settings.llm_provider


def get_provider_config_status() -> dict:
    try:
        provider = get_llm_provider()
        err = provider.validate()
        return {
            "provider": get_current_provider_name(),
            "configured": err is None,
            "error": err or "",
            "model": getattr(provider, "model_name", "未知"),
        }
    except Exception as e:
        return {"provider": get_current_provider_name(), "configured": False, "error": str(e), "model": "未知"}
