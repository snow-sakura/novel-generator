"""AI 聊天室模型 — 对话会话与消息"""

from sqlalchemy import ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base
from app.models.base import TimestampMixin


class ChatSession(TimestampMixin, Base):
    """聊天会话表"""

    __tablename__ = "chat_sessions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    title: Mapped[str | None] = mapped_column(String(200), nullable=True, comment="会话标题")
    model: Mapped[str | None] = mapped_column(String(100), nullable=True, comment="使用的模型")
    created_by: Mapped[int | None] = mapped_column(Integer, nullable=True)

    def __repr__(self) -> str:
        return f"<ChatSession id={self.id} title={self.title}>"


class ChatMessage(TimestampMixin, Base):
    """聊天消息表"""

    __tablename__ = "chat_messages"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    session_id: Mapped[int] = mapped_column(Integer, ForeignKey("chat_sessions.id"), nullable=False)
    role: Mapped[str] = mapped_column(String(20), nullable=False, comment="角色: user/assistant/system")
    content: Mapped[str] = mapped_column(Text, nullable=False, comment="消息内容")

    def __repr__(self) -> str:
        return f"<ChatMessage id={self.id} session={self.session_id} role={self.role}>"
