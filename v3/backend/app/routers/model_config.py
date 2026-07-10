"""模型配置持久化 API — 支持多配置存储"""
from datetime import datetime
from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.database import get_db, SessionLocal
from app.models.model_config import ModelConfig
from app.config import settings

router = APIRouter(prefix="/api/v3/model-config", tags=["model-config"])


class ModelConfigSchema(BaseModel):
    provider: str = "opencode"
    label: str = ""
    base_url: str = ""
    model_id: str = ""
    api_key: str = ""


def _get_or_seed_env_default(db):
    """返回 .env 配置（查找或创建/更新），作为兜底默认配置"""
    env_model = settings.opencode_model or "deepseek-v4-flash-free"
    env_base_url = settings.opencode_base_url or "https://opencode.ai/zen/v1"
    env_api_key = settings.opencode_api_key or ""

    # 查找已入库的 .env 配置（按 provider + model_id 精准匹配）
    existing = db.query(ModelConfig).filter(
        ModelConfig.provider == "opencode-mimo",
        ModelConfig.model_id == env_model,
    ).first()
    if existing:
        # 更新可能过时的字段
        existing.base_url = env_base_url
        existing.api_key = env_api_key
        existing.label = "默认配置 (.env)"
        existing.is_default = True
        db.commit()
        return existing

    # 检查是否有 stale 的 opencode-mimo 配置（model_id 已过时）
    stale = db.query(ModelConfig).filter(
        ModelConfig.provider == "opencode-mimo",
        ModelConfig.is_default == True,
    ).first()
    if stale:
        stale.model_id = env_model
        stale.base_url = env_base_url
        stale.api_key = env_api_key
        stale.label = "默认配置 (.env)"
        db.commit()
        return stale

    # 全新创建
    env_config = ModelConfig(
        provider="opencode-mimo",
        label="默认配置 (.env)",
        base_url=env_base_url,
        model_id=env_model,
        api_key=env_api_key,
        is_default=True,
    )
    db.add(env_config)
    db.commit()
    return env_config


@router.get("")
async def get_model_config():
    """获取当前激活的配置；无持久化配置时自动从 .env 读取并写入数据库"""
    db = SessionLocal()
    try:
        config = db.query(ModelConfig).filter(ModelConfig.is_default == True).first()
        if config and config.provider and config.model_id:
            # 如果 active 配置是 opencode-mimo 但 model_id 与 .env 不一致 → 更新
            if config.provider == "opencode-mimo" and config.model_id != (settings.opencode_model or "deepseek-v4-flash-free"):
                config = _get_or_seed_env_default(db)
            return {
                "provider": config.provider,
                "label": config.label,
                "base_url": config.base_url,
                "model_id": config.model_id,
                "api_key": config.api_key or "",
            }
        # 无有效配置时从 .env 种子并返回
        env_config = _get_or_seed_env_default(db)
        return {
            "provider": env_config.provider,
            "label": env_config.label,
            "base_url": env_config.base_url,
            "model_id": env_config.model_id,
            "api_key": env_config.api_key or "",
        }
    finally:
        db.close()


@router.put("")
async def save_model_config(data: ModelConfigSchema):
    """保存模型配置（按 provider+model_id 去重），标记为激活"""
    db = SessionLocal()
    try:
        if not data.provider:
            # 恢复默认：清除激活标记，下次 GET 自动从 .env 重新种子
            db.query(ModelConfig).update({ModelConfig.is_default: False})
            db.commit()
            return {"status": "ok"}

        # 查找是否有相同 (provider, model_id) 的已有记录
        config = db.query(ModelConfig).filter(
            ModelConfig.provider == data.provider,
            ModelConfig.model_id == data.model_id,
        ).first()

        now = datetime.now()
        if config:
            config.label = data.label
            config.base_url = data.base_url
            config.api_key = data.api_key
            config.is_default = True
            config.updated_at = now
        else:
            # 存入新配置（保留历史）
            config = ModelConfig(
                provider=data.provider,
                label=data.label,
                base_url=data.base_url,
                model_id=data.model_id,
                api_key=data.api_key,
                is_default=True,
                created_at=now,
                updated_at=now,
            )
            db.add(config)

        # 该配置标记为默认，其他配置取消默认
        db.query(ModelConfig).filter(ModelConfig.id != config.id).update(
            {ModelConfig.is_default: False}
        )
        db.commit()
        return {"status": "ok"}
    finally:
        db.close()
