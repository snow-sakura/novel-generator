"""提示词模板备份模型 — 仅作为原始模板阅览参考，不参与生成"""
from datetime import datetime
from sqlalchemy import Column, Integer, String, Text, DateTime
from app.database import Base


class PromptTemplate(Base):
    __tablename__ = "prompt_templates"

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(50), unique=True, nullable=False)
    label = Column(String(100), nullable=False)
    content = Column(Text, nullable=False)
    version = Column(String(20), default="v1")
    created_at = Column(DateTime, default=datetime.now)
