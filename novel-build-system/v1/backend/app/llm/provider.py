"""多 Provider 工厂：支持 OpenAI / Anthropic / Ollama / OpenCode Zen / 自定义国产模型"""

from abc import ABC, abstractmethod
from typing import AsyncGenerator, Optional

from app.config import settings


def _get_saved_api_key(provider: str, base_url: str, model: str) -> str:
    from app.database import SessionLocal
    from app.models.model_config import ModelConfig

    db = SessionLocal()
    try:
        config = (
            db.query(ModelConfig)
            .filter(
                ModelConfig.is_default.is_(True),
                ModelConfig.provider == provider,
                ModelConfig.base_url == base_url,
                ModelConfig.model_id == model,
            )
            .first()
        )
        return config.api_key or "" if config else ""
    finally:
        db.close()


class LLMProvider(ABC):
    """LLM 统一抽象接口"""

    @abstractmethod
    async def generate_stream(
        self, prompt: str, system_prompt: str = ""
    ) -> AsyncGenerator[str, None]: ...

    @abstractmethod
    def validate(self) -> Optional[str]: ...


class _LazyLLM:
    """延迟初始化 LangChain LLM，避免 __init__ 时因 API Key 无效而崩溃。"""

    def __init__(self, factory, validate_before: str = None):
        self._factory = factory
        self._validate_before = validate_before
        self._llm = None
        self._error = None

    def _ensure(self):
        if self._llm is not None:
            return self._llm
        if self._error:
            raise RuntimeError(self._error)
        if self._validate_before and not getattr(settings, self._validate_before, None):
            self._error = f"环境变量未配置: {self._validate_before}"
            raise RuntimeError(self._error)
        try:
            self._llm = self._factory()
            return self._llm
        except Exception as e:
            self._error = str(e)
            raise RuntimeError(self._error)

    def __call__(self):
        return self._ensure()


class OpenAIProvider(LLMProvider):
    def __init__(self):
        from langchain_openai import ChatOpenAI

        self.model_name = settings.openai_model
        self._llm = _LazyLLM(
            lambda: ChatOpenAI(
                api_key=settings.openai_api_key,
                model=self.model_name,
                base_url=settings.openai_base_url or None,
                streaming=True,
                temperature=0.8,
            ),
            validate_before="openai_api_key",
        )

    def validate(self) -> Optional[str]:
        try:
            self._llm()
            return None
        except RuntimeError as e:
            return str(e)

    async def generate_stream(
        self, prompt: str, system_prompt: str = ""
    ) -> AsyncGenerator[str, None]:
        from langchain_core.messages import HumanMessage, SystemMessage

        messages = []
        if system_prompt:
            messages.append(SystemMessage(content=system_prompt))
        messages.append(HumanMessage(content=prompt))
        async for chunk in self._llm().astream(messages):
            if chunk.content:
                yield chunk.content


class AnthropicProvider(LLMProvider):
    def __init__(self, api_key: str = None, model: str = None):
        from langchain_anthropic import ChatAnthropic

        self.api_key = api_key or settings.anthropic_api_key
        self.model_name = model or settings.anthropic_model
        self._llm = _LazyLLM(
            lambda: ChatAnthropic(
                api_key=self.api_key,
                model=self.model_name,
                streaming=True,
                temperature=0.8,
            ),
        )

    def validate(self) -> Optional[str]:
        if not self.api_key:
            return "环境变量未配置: ANTHROPIC_API_KEY"
        try:
            self._llm()
            return None
        except RuntimeError as e:
            return str(e)

    async def generate_stream(
        self, prompt: str, system_prompt: str = ""
    ) -> AsyncGenerator[str, None]:
        from langchain_core.messages import HumanMessage

        messages = [HumanMessage(content=prompt)]
        async for chunk in self._llm().astream(
            messages, system=system_prompt if system_prompt else None
        ):
            if chunk.content:
                yield chunk.content


class OllamaProvider(LLMProvider):
    def __init__(self, base_url: str = None, model: str = None):
        self.base_url = base_url or settings.ollama_base_url
        self.model_name = model or settings.ollama_model
        self._llm = _LazyLLM(
            lambda: self._create_ollama(),
        )

    def _create_ollama(self):
        try:
            from langchain_ollama import ChatOllama
        except ImportError:
            raise RuntimeError("langchain-ollama 未安装，无法使用 Ollama Provider")
        return ChatOllama(
            base_url=self.base_url, model=self.model_name, temperature=0.8
        )

    def validate(self) -> Optional[str]:
        try:
            self._llm()
            return None
        except RuntimeError as e:
            return str(e)

    async def generate_stream(
        self, prompt: str, system_prompt: str = ""
    ) -> AsyncGenerator[str, None]:
        from langchain_core.messages import HumanMessage, SystemMessage

        messages = []
        if system_prompt:
            messages.append(SystemMessage(content=system_prompt))
        messages.append(HumanMessage(content=prompt))
        async for chunk in self._llm().astream(messages):
            if chunk.content:
                yield chunk.content


class OpenCodeProvider(LLMProvider):
    def __init__(self):
        from langchain_openai import ChatOpenAI

        self.model_name = settings.opencode_model
        self._llm = _LazyLLM(
            lambda: ChatOpenAI(
                api_key=settings.opencode_api_key,
                model=self.model_name,
                base_url=settings.opencode_base_url,
                streaming=True,
                temperature=0.8,
            ),
            validate_before="opencode_api_key",
        )

    def validate(self) -> Optional[str]:
        try:
            self._llm()
            return None
        except RuntimeError as e:
            return str(e)

    async def generate_stream(
        self, prompt: str, system_prompt: str = ""
    ) -> AsyncGenerator[str, None]:
        from langchain_core.messages import HumanMessage, SystemMessage

        messages = []
        if system_prompt:
            messages.append(SystemMessage(content=system_prompt))
        messages.append(HumanMessage(content=prompt))
        async for chunk in self._llm().astream(messages):
            if chunk.content:
                yield chunk.content
            else:
                yield ""  # 心跳，防止流式超时


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

    async def generate_stream(
        self, prompt: str, system_prompt: str = ""
    ) -> AsyncGenerator[str, None]:
        from langchain_core.messages import HumanMessage, SystemMessage

        messages = []
        if system_prompt:
            messages.append(SystemMessage(content=system_prompt))
        messages.append(HumanMessage(content=prompt))
        try:
            async for chunk in self.llm.astream(messages):
                if chunk.content:
                    yield chunk.content
                else:
                    yield ""  # 心跳，防止流式超时
        except Exception as e:
            raise RuntimeError(f"模型流式请求失败: {e}") from e


def get_llm_provider(model_config: dict = None) -> LLMProvider:
    """工厂方法，支持动态模型配置

    优先级：
    1. 前端传入 custom model_config（含 base_url/api_key/model）→ 使用 CustomProvider
    2. 无 model_config 或无 provider → 使用 .env 中的 LLM_PROVIDER
    """
    if model_config and model_config.get("provider"):
        provider_name = model_config["provider"]
        is_active_provider = provider_name == settings.llm_provider
        base_url = model_config.get("base_url") or (
            settings.llm_base_url if is_active_provider else ""
        )
        api_key = model_config.get("api_key", "")
        if not api_key and is_active_provider:
            api_key = settings.llm_api_key
        model = model_config.get("model") or (
            settings.llm_model if is_active_provider else ""
        )
        if not api_key or api_key.startswith("***"):
            api_key = _get_saved_api_key(provider_name, base_url, model) or api_key
        if api_key.startswith("***"):
            api_key = ""

        if provider_name == "anthropic" and not base_url:
            return AnthropicProvider(
                api_key=api_key or settings.anthropic_api_key,
                model=model or settings.anthropic_model,
            )
        if provider_name == "ollama":
            return OllamaProvider(
                base_url=base_url or settings.ollama_base_url,
                model=model or settings.ollama_model,
            )

        # 如果前端传入了自定义 base_url（即用户在设置页面配置了具体模型），
        # 一律使用 CustomProvider，确保自定义模型生效
        if base_url:
            return CustomProvider(
                base_url=base_url,
                model=model,
                api_key=api_key,
            )

        # 无 base_url 时，按 provider 名选择内置 Provider（使用 .env 配置）
        if provider_name in ("openai", "anthropic", "ollama", "opencode"):
            if provider_name == "openai":
                return CustomProvider(
                    base_url="https://api.openai.com/v1",
                    model=model or settings.openai_model,
                    api_key=api_key or settings.openai_api_key,
                )
        else:
            # 未知 provider，尝试 CustomProvider
            return CustomProvider(
                base_url=base_url,
                model=model,
                api_key=api_key,
            )

    if settings.llm_provider not in ("openai", "anthropic", "ollama", "opencode"):
        return CustomProvider(
            base_url=settings.llm_base_url,
            model=settings.llm_model,
            api_key=settings.llm_api_key,
        )

    provider_map = {
        "openai": OpenAIProvider,
        "anthropic": AnthropicProvider,
        "ollama": OllamaProvider,
        "opencode": OpenCodeProvider,
    }
    provider_class = provider_map.get(settings.llm_provider)
    if not provider_class:
        raise ValueError(
            f"不支持的 LLM Provider，可选: {', '.join(provider_map.keys())}"
        )
    return provider_class()


def get_current_provider_name() -> str:
    # 优先返回 .env 中配置的友好显示名，否则返回 provider 标识
    return settings.llm_provider_label or settings.llm_provider


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
        return {
            "provider": get_current_provider_name(),
            "configured": False,
            "error": str(e),
            "model": "未知",
        }
