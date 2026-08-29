"""模型配置持久化 — 存储前端选中的模型配置到数据库"""

from datetime import datetime
from sqlalchemy import Column, Integer, String, Text, Boolean, DateTime
from app.database import Base


class ModelConfig(Base):
    __tablename__ = "model_configs"

    id = Column(Integer, primary_key=True, autoincrement=True)
    provider = Column(String(50), nullable=False, default="openai")
    label = Column(String(100), default="")
    base_url = Column(String(500), default="")
    model_id = Column(String(100), default="")
    api_key = Column(Text, default="")
    is_default = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.now)
    updated_at = Column(DateTime, default=datetime.now, onupdate=datetime.now)
