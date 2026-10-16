"""模型配置持久化 API"""

from datetime import datetime
from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.model_config import ModelConfig
from app.config import settings

router = APIRouter(prefix="/api/v1/model-config", tags=["model-config"])


def _mask_key(key: str) -> str:
    """对 API Key 脱敏：仅保留后 4 位"""
    if not key or len(key) <= 8:
        return "***" if key else ""
    return "***" + key[-4:]


class ModelConfigSchema(BaseModel):
    provider: str = "openai"
    label: str = ""
    base_url: str = ""
    model_id: str = ""
    api_key: str = ""


@router.get("")
async def get_model_config(db: Session = Depends(get_db)):
    """获取生效中的模型配置（API Key 已脱敏）

    优先级：
    1. 数据库中存在用户保存的配置 → 返回数据库配置
    2. 否则返回 .env 默认配置（from_env=true）
    """
    config = db.query(ModelConfig).filter(ModelConfig.is_default == True).first()

    def _serialize(c):
        return {
            "provider": c.provider,
            "label": c.label,
            "base_url": c.base_url,
            "model_id": c.model_id,
            "api_key": _mask_key(c.api_key or ""),
            "api_key_configured": bool(c.api_key),
            "from_env": False,
        }

    # 用户显式保存的配置优先于 .env，否则切换到其他 provider 后刷新会丢失选择
    if config:
        return _serialize(config)

    # .env 有默认配置 → 返回 .env 配置（默认使用，前端可自定义覆盖）
    if settings.llm_model or settings.llm_base_url:
        return {
            "provider": settings.llm_provider,
            "label": settings.llm_provider_label or settings.llm_provider,
            "base_url": settings.llm_base_url,
            "model_id": settings.llm_model,
            "api_key": _mask_key(settings.llm_api_key or ""),
            "api_key_configured": bool(settings.llm_api_key),
            "from_env": True,
        }

    return {
        "provider": "",
        "label": "",
        "base_url": "",
        "model_id": "",
        "api_key": "",
        "api_key_configured": False,
        "from_env": False,
    }


@router.put("")
async def save_model_config(data: ModelConfigSchema, db: Session = Depends(get_db)):
    """保存模型配置到数据库"""
    config = db.query(ModelConfig).filter(ModelConfig.is_default == True).first()
    if config:
        config.provider = data.provider
        config.label = data.label
        config.base_url = data.base_url
        config.model_id = data.model_id
        # 如果前端传入的是脱敏值（*** 开头），保留原值不覆盖
        if not data.api_key.startswith("***"):
            config.api_key = data.api_key
        config.updated_at = datetime.now()
    else:
        config = ModelConfig(
            provider=data.provider,
            label=data.label,
            base_url=data.base_url,
            model_id=data.model_id,
            api_key=data.api_key,
            is_default=True,
        )
        db.add(config)
    db.commit()
    return {"status": "ok"}
