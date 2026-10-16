import os
import json
from dotenv import load_dotenv

load_dotenv()


class Settings:
    # LLM Provider（默认从 .env 读取，未配置则回退 openai）
    llm_provider: str = os.getenv("LLM_PROVIDER", "openai")
    # 前端显示的友好名称（如 AMD Radeon / DeepSeek / OpenCode Zen），未配置则用 llm_provider
    llm_provider_label: str = os.getenv("LLM_PROVIDER_LABEL", "")

    # OpenAI（兼容接口，含 AMD Radeon 等 OpenAI 兼容服务）
    openai_api_key: str = os.getenv("OPENAI_API_KEY", "")
    openai_base_url: str = os.getenv("OPENAI_BASE_URL", "")
    openai_model: str = os.getenv("OPENAI_MODEL", "gpt-4o-mini")

    # Anthropic
    anthropic_api_key: str = os.getenv("ANTHROPIC_API_KEY", "")
    anthropic_model: str = os.getenv("ANTHROPIC_MODEL", "claude-sonnet-4-20250514")

    # Ollama
    ollama_base_url: str = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
    ollama_model: str = os.getenv("OLLAMA_MODEL", "qwen2.5:7b")

    # OpenCode Zen（可选，需在 .env 中显式配置，无代码硬编码默认值）
    opencode_api_key: str = os.getenv("OPENCODE_API_KEY", "")
    opencode_base_url: str = os.getenv("OPENCODE_BASE_URL", "")
    opencode_model: str = os.getenv("OPENCODE_MODEL", "")

    # 自定义模型（前端配置）
    custom_model_provider: str = os.getenv("CUSTOM_MODEL_PROVIDER", "")
    custom_model_base_url: str = os.getenv("CUSTOM_MODEL_BASE_URL", "")
    custom_model_name: str = os.getenv("CUSTOM_MODEL_NAME", "")
    custom_model_api_key: str = os.getenv("CUSTOM_MODEL_API_KEY", "")

    # Database
    database_url: str = os.getenv("DATABASE_URL", "sqlite:///./novel_generator_v1.db")

    # Server
    host: str = os.getenv("HOST", "0.0.0.0")
    port: int = int(os.getenv("PORT", "8001"))

    def __init__(self):
        self.llm_provider = self.llm_provider.strip().lower()
        provider_prefix = self.llm_provider.upper()
        self.llm_api_key = os.getenv(f"{provider_prefix}_API_KEY", "")
        self.llm_base_url = os.getenv(f"{provider_prefix}_BASE_URL", "")
        self.llm_model = os.getenv(f"{provider_prefix}_MODEL", "")

        if not self.llm_model:
            self.llm_model = {
                "openai": self.openai_model,
                "anthropic": self.anthropic_model,
                "ollama": self.ollama_model,
                "opencode": self.opencode_model,
            }.get(self.llm_provider, self.custom_model_name)

        if not self.llm_api_key:
            self.llm_api_key = {
                "openai": self.openai_api_key,
                "anthropic": self.anthropic_api_key,
                "opencode": self.opencode_api_key,
            }.get(self.llm_provider, self.custom_model_api_key)

        if not self.llm_base_url:
            self.llm_base_url = {
                "openai": self.openai_base_url,
                "ollama": self.ollama_base_url,
                "opencode": self.opencode_base_url,
            }.get(self.llm_provider, self.custom_model_base_url)


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

    # 回退到当前 provider 对应的环境变量
    provider = settings.llm_provider
    return {
        "provider": provider,
        "base_url": settings.llm_base_url,
        "model": settings.llm_model,
        "api_key": settings.llm_api_key,
    }
