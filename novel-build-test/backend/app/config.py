"""应用配置 — 使用 pydantic-settings 加载环境变量

安全说明：
    - 所有敏感信息（数据库密码、JWT密钥、API密钥）必须通过 .env 文件传入
    - .env 文件已加入 .gitignore，不会被提交到仓库
    - 默认值仅为开发环境调试使用，生产环境必须通过环境变量覆盖
"""

from pathlib import Path

from pydantic_settings import BaseSettings

_env_file = Path(__file__).resolve().parent.parent / ".env"


class Settings(BaseSettings):
    """全局应用配置

    安全提醒：所有密码、密钥仅作类型占位，实际值必须通过 .env 提供。
    配置项说明：
        app_name: 应用名称
        debug: 调试模式（开启后 SQLAlchemy 会输出 SQL 语句）
        database_url: MySQL 异步连接字符串
        jwt_secret_key: JWT 签名密钥
        jwt_algorithm: JWT 签名算法
        jwt_access_token_expire_minutes: 访问令牌过期时间（分钟）
        jwt_refresh_token_expire_days: 刷新令牌过期时间（天）
        cors_origins: 跨域来源列表
        deepseek_api_key: DeepSeek API 密钥
        deepseek_base_url: DeepSeek API 基础地址
        qwen_api_key: 通义千问 API 密钥
        qwen_base_url: 通义千问 API 基础地址
        glm_api_key: GLM-4 API 密钥
        glm_base_url: GLM-4 API 基础地址
        moonshot_api_key: Moonshot API 密钥
        moonshot_base_url: Moonshot API 基础地址
        QDRANT_HOST: Qdrant 向量数据库主机地址
        QDRANT_PORT: Qdrant HTTP 端口
        QDRANT_GRPC_PORT: Qdrant gRPC 端口
        REDIS_URL: Redis 连接地址
    """

    app_name: str = "AISQA"
    debug: bool = False

    # ===== 数据库（强制通过环境变量配置，无默认密码！）=====
    database_url: str = ""

    # ===== JWT 认证（生产环境必须修改密钥）=====
    jwt_secret_key: str = ""
    jwt_algorithm: str = "HS256"
    jwt_access_token_expire_minutes: int = 30
    jwt_refresh_token_expire_days: int = 7
    cors_origins: list[str] = ["http://localhost:5173"]

    # ===== 国产大模型配置 =====
    deepseek_api_key: str = ""
    deepseek_base_url: str = "https://api.deepseek.com/v1"
    qwen_api_key: str = ""
    qwen_base_url: str = "https://dashscope.aliyuncs.com/compatible-mode/v1"
    glm_api_key: str = ""
    glm_base_url: str = "https://open.bigmodel.cn/api/paas/v4"
    moonshot_api_key: str = ""
    moonshot_base_url: str = "https://api.moonshot.cn/v1"

    # ===== AI-Native 4 支柱配置 =====
    # 向量数据库 (Qdrant)
    QDRANT_HOST: str = "127.0.0.1"
    QDRANT_PORT: int = 6333
    QDRANT_GRPC_PORT: int = 6334

    # 事件总线 (Redis)
    REDIS_URL: str = "redis://localhost:6379/0"

    model_config = {"env_file": str(_env_file), "env_file_encoding": "utf-8"}


settings = Settings()
