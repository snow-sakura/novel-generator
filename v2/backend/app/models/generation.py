from datetime import datetime
from sqlalchemy import Column, Integer, String, Text, DateTime
from app.database import Base


class GenerationLog(Base):
    __tablename__ = "generation_logs"

    id = Column(Integer, primary_key=True, autoincrement=True)
    novel_id = Column(Integer, nullable=False)
    prompt_tokens = Column(Integer, default=0)
    completion_tokens = Column(Integer, default=0)
    status = Column(String(20), default="success")
    error_msg = Column(Text, default="")
    created_at = Column(DateTime, default=datetime.now)
