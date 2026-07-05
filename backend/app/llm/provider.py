"""多 Provider 工厂：支持 OpenAI / Anthropic / Ollama / OpenCode Zen 切换"""
from abc import ABC, abstractmethod
from typing import AsyncGenerator

from app.config import settings


class LLMProvider(ABC):
    """LLM 统一抽象接口"""

    @abstractmethod
    async def generate_stream(self, prompt: str, system_prompt: str = "") -> AsyncGenerator[str, None]:
        """流式生成，逐 chunk 返回文本"""
        ...

    @abstractmethod
    def validate(self) -> str | None:
        """验证配置是否可用，返回 None 表示正常，返回字符串表示错误信息"""
        ...


class OpenAIProvider(LLMProvider):
    def __init__(self):
        from langchain_openai import ChatOpenAI

        self.model_name = settings.openai_model
        self.llm = ChatOpenAI(
            api_key=settings.openai_api_key,
            model=self.model_name,
            streaming=True,
            temperature=0.8,
        )

    def validate(self) -> str | None:
        if not settings.openai_api_key:
            return "未配置 OpenAI API Key，请在 .env 中设置 OPENAI_API_KEY"
        if settings.openai_api_key == "sk-your-key-here":
            return "OpenAI API Key 仍为默认值，请修改为真实密钥"
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
        self.llm = ChatAnthropic(
            api_key=settings.anthropic_api_key,
            model=self.model_name,
            streaming=True,
            temperature=0.8,
        )

    def validate(self) -> str | None:
        if not settings.anthropic_api_key:
            return "未配置 Anthropic API Key，请在 .env 中设置 ANTHROPIC_API_KEY"
        if settings.anthropic_api_key == "sk-ant-your-key-here":
            return "Anthropic API Key 仍为默认值，请修改为真实密钥"
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
        self.llm = ChatOllama(
            base_url=settings.ollama_base_url,
            model=self.model_name,
            temperature=0.8,
        )

    def validate(self) -> str | None:
        if not settings.ollama_base_url:
            return "未配置 Ollama 地址，请在 .env 中设置 OLLAMA_BASE_URL"
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
    """OpenCode Zen 免费模型接口（OpenAI 兼容）"""

    def __init__(self):
        from langchain_openai import ChatOpenAI

        self.model_name = settings.opencode_model
        self.llm = ChatOpenAI(
            api_key=settings.opencode_api_key,
            model=self.model_name,
            base_url=settings.opencode_base_url,
            streaming=True,
            temperature=0.8,
        )

    def validate(self) -> str | None:
        if not settings.opencode_api_key:
            return "未配置 OpenCode API Key，请登录 https://opencode.ai/auth 获取"
        if settings.opencode_api_key == "sk-your-opencode-key-here":
            return "OpenCode API Key 仍为默认值，请修改为真实密钥"
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


def get_llm_provider() -> LLMProvider:
    """工厂方法：根据配置返回对应的 Provider"""
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
    """返回当前 Provider 的配置状态，供前端检查"""
    try:
        provider = get_llm_provider()
        err = provider.validate()
        return {
            "provider": get_current_provider_name(),
            "configured": err is None,
            "error": err,
            "model": getattr(provider, "model_name", "未知"),
        }
    except Exception as e:
        return {
            "provider": get_current_provider_name(),
            "configured": False,
            "error": str(e),
            "model": "未知",
        }
