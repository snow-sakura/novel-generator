from datetime import datetime
from sqlalchemy import Column, Integer, String, Text, Float, DateTime
from app.database import Base


class Novel(Base):
    __tablename__ = "novels"

    id = Column(Integer, primary_key=True, autoincrement=True)
    title = Column(String(255), default="")
    seed_text = Column(Text, nullable=False)
    genre = Column(String(50), default="玄幻")
    style = Column(String(50), default="简洁")
    word_count = Column(Integer, default=3000)
    actual_count = Column(Integer, default=0)
    content = Column(Text, default="")
    chapters = Column(Text, default="[]")
    model_used = Column(String(100), default="")
    time_cost = Column(Float, default=0.0)
    created_at = Column(DateTime, default=datetime.now)
