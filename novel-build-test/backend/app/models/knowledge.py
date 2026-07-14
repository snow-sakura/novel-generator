"""知识库模型 — AISQA 测试知识条目管理

知识条目存储在 MySQL 中做 CRUD 管理，
同时同步到 Qdrant 向量数据库供语义检索。
"""

import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class KnowledgeDoc(Base):
    """知识条目表

    属性说明：
        id: 主键自增
        project_id: 所属项目 ID
        title: 知识标题
        content: 知识正文（Markdown 格式）
        source: 来源（file/manual/api）
        tags: 逗号分隔的标签
        collection_name: 所属 Qdrant 集合
        vector_id: Qdrant 中的点 ID（同步后记录）
        vector_synced: 是否已同步到向量库
        created_by: 创建者用户 ID
        created_at: 创建时间
        updated_at: 更新时间
    """

    __tablename__ = "knowledge_docs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    project_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("projects.id"), nullable=False, comment="所属项目"
    )
    title: Mapped[str] = mapped_column(String(200), nullable=False, comment="知识标题")
    content: Mapped[str | None] = mapped_column(Text, nullable=True, comment="知识正文（Markdown）")
    source: Mapped[str] = mapped_column(
        String(20), default="manual",
        comment="来源: file/manual/api",
    )
    tags: Mapped[str | None] = mapped_column(String(500), nullable=True, comment="逗号分隔标签")
    collection_name: Mapped[str] = mapped_column(
        String(50), default="tech_doc_knowledge",
        comment="所属 Qdrant 集合",
    )
    vector_id: Mapped[str | None] = mapped_column(
        String(100), nullable=True, comment="Qdrant 点 ID"
    )
    vector_synced: Mapped[bool] = mapped_column(
        Integer, default=False, comment="是否已同步到向量库"
    )
    created_by: Mapped[int] = mapped_column(
        Integer, ForeignKey("users.id"), nullable=False, comment="创建者"
    )
    created_at: Mapped[datetime.datetime] = mapped_column(
        DateTime, server_default=func.now(), comment="创建时间"
    )
    updated_at: Mapped[datetime.datetime] = mapped_column(
        DateTime, server_default=func.now(), onupdate=func.now(), comment="更新时间"
    )

    project = relationship("Project", backref="knowledge_docs")

    def __repr__(self) -> str:
        return f"<KnowledgeDoc id={self.id} title={self.title}>"
