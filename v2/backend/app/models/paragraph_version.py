"""段落版本模型 — 存储润色历史（最多 3 版）"""
from datetime import datetime
from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey
from app.database import Base


class ParagraphVersion(Base):
    __tablename__ = "paragraph_versions"

    id = Column(Integer, primary_key=True, autoincrement=True)
    novel_id = Column(Integer, ForeignKey("novels.id"), nullable=False)
    chapter_index = Column(Integer, nullable=False)
    paragraph_index = Column(Integer, nullable=False)
    action = Column(String(20), nullable=False)     # rewrite/expand/compress
    content = Column(Text, nullable=False)           # 润色后的内容
    version = Column(Integer, nullable=False)        # 版本号 1/2/3
    created_at = Column(DateTime, default=datetime.now)
