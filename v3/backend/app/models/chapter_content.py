"""章节内容模型 — 每章独立一行，支持存储优化和全文检索"""
from datetime import datetime
from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, UniqueConstraint
from app.database import Base


class ChapterContent(Base):
    __tablename__ = "chapter_contents"

    id = Column(Integer, primary_key=True, autoincrement=True)
    novel_id = Column(Integer, ForeignKey("novels.id", ondelete="CASCADE"), nullable=False, index=True)
    chapter_index = Column(Integer, nullable=False)
    title = Column(String(255), default="")
    content = Column(Text, default="")
    word_count = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.now)

    __table_args__ = (
        UniqueConstraint("novel_id", "chapter_index", name="uq_novel_chapter"),
    )
