"""模型配置持久化 API"""

from datetime import datetime
from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.model_config import ModelConfig

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
    """获取持久化的模型配置（API Key 已脱敏）"""
    config = db.query(ModelConfig).filter(ModelConfig.is_default == True).first()
    if config:
        return {
            "provider": config.provider,
            "label": config.label,
            "base_url": config.base_url,
            "model_id": config.model_id,
            "api_key": _mask_key(config.api_key or ""),
        }
    return {
        "provider": "",
        "label": "",
        "base_url": "",
        "model_id": "",
        "api_key": "",
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
