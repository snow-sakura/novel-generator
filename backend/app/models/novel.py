from datetime import datetime
from sqlalchemy import Column, Integer, String, Text, Float, DateTime
from app.database import Base


class Novel(Base):
    __tablename__ = "novels"

    id = Column(Integer, primary_key=True, autoincrement=True)
    title = Column(String(255), default="")
    seed_text = Column(Text, nullable=False)
    gender = Column(String(10), default="男频")          # 男频/女频
    genre = Column(String(50), default="玄幻脑洞")
    style = Column(String(50), default="轻松搞笑")
    word_count = Column(Integer, default=3000)
    per_chapter_min = Column(Integer, default=800)        # 每章最少字数
    per_chapter_max = Column(Integer, default=2500)       # 每章最多字数
    actual_count = Column(Integer, default=0)
    content = Column(Text, default="")
    chapters = Column(Text, default="[]")
    outline = Column(Text, default="")                    # 存储大纲JSON+思维导图文本
    model_used = Column(String(100), default="")
    model_config = Column(Text, default="{}")             # 自定义模型配置JSON
    time_cost = Column(Float, default=0.0)
    created_at = Column(DateTime, default=datetime.now)
