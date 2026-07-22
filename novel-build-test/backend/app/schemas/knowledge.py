"""知识库相关 Pydantic 模型 — 请求/响应"""

import datetime

from pydantic import BaseModel, Field


class KnowledgeCreate(BaseModel):
    """创建知识条目请求"""

    project_id: int = Field(..., description="所属项目 ID")
    title: str = Field(..., min_length=1, max_length=200, description="知识标题")
    content: str | None = Field(None, description="知识正文（Markdown）")
    source: str = Field("manual", pattern=r"^(file|manual|api)$", description="来源")
    tags: str | None = Field(None, max_length=500, description="逗号分隔标签")
    collection_name: str = Field(
        "tech_doc_knowledge",
        pattern=r"^(test_case_knowledge|tech_doc_knowledge|execution_history|agent_memory|bug_knowledge)$",
        description="所属向量集合",
    )


class KnowledgeUpdate(BaseModel):
    """更新知识条目请求"""

    title: str | None = Field(None, min_length=1, max_length=200, description="知识标题")
    content: str | None = Field(None, description="知识正文（Markdown）")
    source: str | None = Field(None, pattern=r"^(file|manual|api)$", description="来源")
    tags: str | None = Field(None, max_length=500, description="逗号分隔标签")


class KnowledgeResponse(BaseModel):
    """知识条目响应"""

    id: int
    project_id: int
    title: str
    content: str | None
    source: str
    tags: str | None
    collection_name: str
    vector_id: str | None
    vector_synced: bool
    created_by: int
    created_at: datetime.datetime
    updated_at: datetime.datetime

    model_config = {"from_attributes": True}


# 泛型分页别名
from app.schemas.base import Page

KnowledgePage = Page[KnowledgeResponse]


class KnowledgeSearchParams(BaseModel):
    """知识搜索参数"""

    query: str = Field(..., min_length=1, description="搜索文本")
    collection_name: str = Field(
        "tech_doc_knowledge",
        description="目标向量集合",
    )
    limit: int = Field(10, ge=1, le=50, description="返回数量")
    score_threshold: float | None = Field(None, ge=0, le=1, description="分数阈值")


class KnowledgeSearchResult(BaseModel):
    """知识搜索结果"""

    id: str  # Qdrant point ID
    score: float
    payload: dict
