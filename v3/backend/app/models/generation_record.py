"""生成记录模型 — 记录每次生成的状态，支持失败继续"""
from datetime import datetime
from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey
from app.database import Base


class GenerationRecord(Base):
    __tablename__ = "generation_records"

    id = Column(Integer, primary_key=True, autoincrement=True)
    novel_id = Column(Integer, ForeignKey("novels.id"), nullable=True)
    params = Column(Text, default="{}")           # 生成参数 JSON
    completed_chapters = Column(Integer, default=0)  # 已完成的章节数
    total_chapters = Column(Integer, default=0)      # 目标章节数
    status = Column(String(20), default="in_progress")  # in_progress / completed / failed
    content_sofar = Column(Text, default="")       # 已生成的内容
    outline_data = Column(Text, default="{}")       # 完整 6 层大纲 JSON
    error_message = Column(Text, default="")       # 失败原因
    thinking_logs = Column(Text, default="[]")     # 生成日志列表 JSON
    chapter_states = Column(Text, default="[]")    # 每章生成状态 JSON [{index, title, status, start_time, end_time}]
    seed_text = Column(Text, default="")
    created_at = Column(DateTime, default=datetime.now)
    updated_at = Column(DateTime, default=datetime.now, onupdate=datetime.now)
