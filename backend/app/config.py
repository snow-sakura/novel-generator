import os
import json
from dotenv import load_dotenv

load_dotenv()


class Settings:
    # LLM Provider
    llm_provider: str = os.getenv("LLM_PROVIDER", "opencode")

    # OpenAI
    openai_api_key: str = os.getenv("OPENAI_API_KEY", "")
    openai_model: str = os.getenv("OPENAI_MODEL", "gpt-4o-mini")

    # Anthropic
    anthropic_api_key: str = os.getenv("ANTHROPIC_API_KEY", "")
    anthropic_model: str = os.getenv("ANTHROPIC_MODEL", "claude-sonnet-4-20250514")

    # Ollama
    ollama_base_url: str = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
    ollama_model: str = os.getenv("OLLAMA_MODEL", "qwen2.5:7b")

    # OpenCode Zen
    opencode_api_key: str = os.getenv("OPENCODE_API_KEY", "")
    opencode_base_url: str = os.getenv("OPENCODE_BASE_URL", "https://opencode.ai/zen/v1")
    opencode_model: str = os.getenv("OPENCODE_MODEL", "deepseek-v4-flash-free")

    # 自定义模型（前端配置）
    custom_model_provider: str = os.getenv("CUSTOM_MODEL_PROVIDER", "")
    custom_model_base_url: str = os.getenv("CUSTOM_MODEL_BASE_URL", "")
    custom_model_name: str = os.getenv("CUSTOM_MODEL_NAME", "")
    custom_model_api_key: str = os.getenv("CUSTOM_MODEL_API_KEY", "")

    # Database
    database_url: str = os.getenv("DATABASE_URL", "sqlite:///./novel_generator.db")

    # Server
    host: str = os.getenv("HOST", "0.0.0.0")
    port: int = int(os.getenv("PORT", "8000"))


settings = Settings()


def get_model_config_from_req(model_config: dict = None) -> dict:
    """根据请求中的模型配置或环境变量，返回完整的模型连接信息"""
    if model_config and model_config.get("provider"):
        return {
            "provider": model_config["provider"],
            "base_url": model_config.get("base_url", ""),
            "model": model_config.get("model", ""),
            "api_key": model_config.get("api_key", ""),
        }

    # 回退到环境变量
    provider = settings.llm_provider
    if provider == "openai":
        return {"provider": "openai", "base_url": "", "model": settings.openai_model, "api_key": settings.openai_api_key}
    elif provider == "anthropic":
        return {"provider": "anthropic", "base_url": "", "model": settings.anthropic_model, "api_key": settings.anthropic_api_key}
    elif provider == "ollama":
        return {"provider": "ollama", "base_url": settings.ollama_base_url, "model": settings.ollama_model, "api_key": ""}
    elif provider == "opencode":
        return {"provider": "opencode", "base_url": settings.opencode_base_url, "model": settings.opencode_model, "api_key": settings.opencode_api_key}
    elif settings.custom_model_provider:
        return {
            "provider": settings.custom_model_provider,
            "base_url": settings.custom_model_base_url,
            "model": settings.custom_model_name,
            "api_key": settings.custom_model_api_key,
        }
    return {"provider": "openai", "base_url": "", "model": "", "api_key": ""}
