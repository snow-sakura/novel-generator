"""知识库路由 — 知识条目的 CRUD + 向量同步 + 语义搜索"""

import math
import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, status
from qdrant_client.models import PointStruct
from sqlalchemy import func, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import async_session, get_db
from app.models.knowledge import KnowledgeDoc
from app.schemas.knowledge import (
    KnowledgeCreate,
    KnowledgePage,
    KnowledgeResponse,
    KnowledgeSearchParams,
    KnowledgeSearchResult,
    KnowledgeUpdate,
)
from app.utils.rbac import 操作, 检查权限

router = APIRouter(prefix="/api/v1/knowledge", tags=["AI 知识库"])


@router.get("", response_model=KnowledgePage)
async def list_knowledge(
    page: int = Query(1, ge=1, description="页码"),
    page_size: int = Query(20, ge=1, le=100, description="每页数量"),
    project_id: int | None = Query(None, description="按项目筛选"),
    source: str | None = Query(None, description="按来源筛选"),
    collection: str | None = Query(None, description="按集合筛选"),
    search: str | None = Query(None, description="按标题搜索"),
    db: AsyncSession = Depends(get_db),
    当前用户: dict = Depends(检查权限(操作.读取)),
):
    """获取知识条目列表（分页，多条件筛选）"""
    user_id = 当前用户["用户ID"]
    query = select(KnowledgeDoc).where(KnowledgeDoc.created_by == user_id)
    count_query = select(func.count()).select_from(KnowledgeDoc).where(KnowledgeDoc.created_by == user_id)

    if project_id:
        query = query.where(KnowledgeDoc.project_id == project_id)
        count_query = count_query.where(KnowledgeDoc.project_id == project_id)
    if source:
        query = query.where(KnowledgeDoc.source == source)
        count_query = count_query.where(KnowledgeDoc.source == source)
    if collection:
        query = query.where(KnowledgeDoc.collection_name == collection)
        count_query = count_query.where(KnowledgeDoc.collection_name == collection)
    if search:
        like_pattern = f"%{search}%"
        query = query.where(KnowledgeDoc.title.like(like_pattern))
        count_query = count_query.where(KnowledgeDoc.title.like(like_pattern))

    total_result = await db.execute(count_query)
    total = total_result.scalar() or 0

    query = query.order_by(KnowledgeDoc.updated_at.desc())
    query = query.offset((page - 1) * page_size).limit(page_size)
    result = await db.execute(query)
    items = list(result.scalars().all())

    return KnowledgePage(
        items=[KnowledgeResponse.model_validate(k) for k in items],
        total=total,
        page=page,
        page_size=page_size,
        total_pages=math.ceil(total / page_size) if total > 0 else 0,
    )


@router.post("", response_model=KnowledgeResponse, status_code=status.HTTP_201_CREATED)
async def create_knowledge(
    data: KnowledgeCreate,
    db: AsyncSession = Depends(get_db),
    当前用户: dict = Depends(检查权限(操作.创建)),
):
    """创建知识条目（同时异步同步到 Qdrant 向量库）"""
    user_id = 当前用户["用户ID"]
    doc = KnowledgeDoc(
        project_id=data.project_id,
        title=data.title,
        content=data.content,
        source=data.source,
        tags=data.tags,
        collection_name=data.collection_name,
        created_by=user_id,
    )
    db.add(doc)
    await db.commit()
    await db.refresh(doc)

    # 同步到向量库
    await _sync_to_vector_db(doc)

    return doc


@router.get("/{doc_id}", response_model=KnowledgeResponse)
async def get_knowledge(
    doc_id: int,
    db: AsyncSession = Depends(get_db),
    当前用户: dict = Depends(检查权限(操作.读取)),
):
    """获取知识条目详情"""
    user_id = 当前用户["用户ID"]
    result = await db.execute(select(KnowledgeDoc).where(KnowledgeDoc.id == doc_id, KnowledgeDoc.created_by == user_id))
    doc = result.scalar_one_or_none()
    if not doc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="知识条目不存在")
    return doc


@router.put("/{doc_id}", response_model=KnowledgeResponse)
async def update_knowledge(
    doc_id: int,
    data: KnowledgeUpdate,
    db: AsyncSession = Depends(get_db),
    当前用户: dict = Depends(检查权限(操作.更新)),
):
    """更新知识条目（同时重新同步向量库）"""
    user_id = 当前用户["用户ID"]
    result = await db.execute(select(KnowledgeDoc).where(KnowledgeDoc.id == doc_id, KnowledgeDoc.created_by == user_id))
    doc = result.scalar_one_or_none()
    if not doc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="知识条目不存在")

    update_data = data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(doc, key, value)

    # 内容变更后标记为未同步
    if "content" in update_data or "title" in update_data:
        doc.vector_synced = False
        doc.vector_id = None

    await db.commit()
    await db.refresh(doc)

    # 同步到向量库
    await _sync_to_vector_db(doc)

    return doc


@router.delete("/{doc_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_knowledge(
    doc_id: int,
    db: AsyncSession = Depends(get_db),
    当前用户: dict = Depends(检查权限(操作.删除)),
):
    """删除知识条目（同时删除向量库中的对应点）"""
    user_id = 当前用户["用户ID"]
    result = await db.execute(select(KnowledgeDoc).where(KnowledgeDoc.id == doc_id, KnowledgeDoc.created_by == user_id))
    doc = result.scalar_one_or_none()
    if not doc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="知识条目不存在")

    # 删除向量
    if doc.vector_id:
        try:
            from app.vector_db.client import vector_db

            client = vector_db.get_async_client()
            await client.delete(
                collection_name=doc.collection_name,
                points_selector=[doc.vector_id],
            )
        except Exception:
            pass

    await db.delete(doc)
    await db.commit()


@router.post("/search", response_model=list[KnowledgeSearchResult])
async def search_knowledge(
    params: KnowledgeSearchParams,
    当前用户: dict = Depends(检查权限(操作.读取)),
):
    """语义搜索知识库（直接查询 Qdrant 向量库）"""
    try:
        from app.vector_db.knowledge_retriever import global_retriever

        results = await global_retriever.semantic_search(
            collection_name=params.collection_name,
            query_text=params.query,
            limit=params.limit,
            score_threshold=params.score_threshold,
        )

        return [
            KnowledgeSearchResult(
                id=r["id"],
                score=r["分数"],
                payload=r.get("载荷", {}),
            )
            for r in results
        ]
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"向量搜索失败: {e}",
        )


@router.post("/{doc_id}/sync", response_model=KnowledgeResponse)
async def sync_knowledge(
    doc_id: int,
    db: AsyncSession = Depends(get_db),
    当前用户: dict = Depends(检查权限(操作.更新)),
):
    """手动触发指定知识条目同步到向量库"""
    user_id = 当前用户["用户ID"]
    result = await db.execute(select(KnowledgeDoc).where(KnowledgeDoc.id == doc_id, KnowledgeDoc.created_by == user_id))
    doc = result.scalar_one_or_none()
    if not doc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="知识条目不存在")

    await _sync_to_vector_db(doc)
    await db.refresh(doc)
    return doc


async def _sync_to_vector_db(doc: KnowledgeDoc) -> None:
    """将知识条目同步到 Qdrant 向量库"""
    try:
        from app.vector_db.knowledge_retriever import global_retriever

        # 编码文本
        text_to_encode = f"{doc.title}\n{doc.content}" if doc.content else doc.title
        vector = await global_retriever.encode_text(text_to_encode)

        # 准备载荷
        payload = {
            "title": doc.title,
            "content": doc.content or "",
            "tags": doc.tags or "",
            "source": doc.source,
            "project_id": doc.project_id,
            "doc_id": doc.id,
        }

        from app.vector_db.client import vector_db
        from app.vector_db.collection_manager import global_collection_manager

        client = vector_db.get_async_client()

        # 如果已有向量 ID，先删除旧的
        if doc.vector_id:
            try:
                await client.delete(
                    collection_name=doc.collection_name,
                    points_selector=[doc.vector_id],
                )
            except Exception:
                pass

        # 创建新的点
        point_id = str(uuid.uuid4())
        point = PointStruct(id=point_id, vector=vector, payload=payload)

        # 先确保集合存在
        await global_collection_manager.ensure_collection_exists(doc.collection_name)

        # upsert 到 Qdrant
        await client.upsert(
            collection_name=doc.collection_name,
            points=[point],
        )

        # 更新数据库中的向量同步状态
        async with async_session() as session:
            stmt = update(KnowledgeDoc).where(KnowledgeDoc.id == doc.id).values(vector_id=point_id, vector_synced=True)
            await session.execute(stmt)
            await session.commit()

    except Exception:
        # 同步失败不阻塞主流程，标记为未同步
        try:
            async with async_session() as session:
                stmt = update(KnowledgeDoc).where(KnowledgeDoc.id == doc.id).values(vector_synced=False)
                await session.execute(stmt)
                await session.commit()
        except Exception:
            pass
