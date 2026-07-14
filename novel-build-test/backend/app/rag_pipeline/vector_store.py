"""
向量存储管理器，负责将分割后的文档块编码为向量并存入 Qdrant 向量数据库。
支持文档的增删操作和集合的批量清理。
"""

import logging
import uuid
from typing import Any, Optional

from qdrant_client.http import models

from app.vector_db.client import vector_db
from app.vector_db.knowledge_retriever import global_retriever

logger = logging.getLogger(__name__)


class VectorStoreManager:
    """向量存储管理器，处理文档的向量化存储与维护。"""

    def __init__(self) -> None:
        """初始化向量存储管理器。"""
        self._client = vector_db
        self._retriever = global_retriever
        logger.info("VectorStoreManager 初始化完成")

    async def _get_async_client(self):
        """获取异步 Qdrant 客户端。"""
        return await self._client.get_async_client()

    async def store_documents(
        self,
        collection_name: str,
        documents: list[dict],
    ) -> int:
        """
        将文档列表编码为向量并存入指定集合。

        Args:
            collection_name: Qdrant 集合名称。
            documents: 文档字典列表，每个字典须包含 "文本" 字段。

        Returns:
            成功存储的文档数量。
        """
        if not documents:
            logger.warning("没有文档需要存储")
            return 0

        points = []
        for doc in documents:
            text = doc.get("文本", "")
            if not text:
                continue

            try:
                # 使用 retriever 的编码器将文本转为向量
                vector = await self._retriever.encode_text(text)
            except Exception as e:
                logger.error("编码文本失败: %s", e)
                continue

            point = models.PointStruct(
                id=str(uuid.uuid4()),
                vector=vector,
                payload={
                    "文本": text,
                    "来源": doc.get("来源", ""),
                    "类型": doc.get("类型", ""),
                },
            )
            points.append(point)

        if not points:
            return 0

        try:
            async_client = await self._get_async_client()
            await async_client.upsert(
                collection_name=collection_name,
                points=points,
            )
            logger.info(
                "成功存储 %d 个文档到集合 %s",
                len(points),
                collection_name,
            )
            return len(points)
        except Exception as e:
            logger.error("存储文档到 Qdrant 失败: %s", e)
            return 0

    async def delete_document(self, collection_name: str, doc_id: str) -> bool:
        """
        从指定集合中删除单个文档点。

        Args:
            collection_name: Qdrant 集合名称。
            doc_id: 文档点的 ID。

        Returns:
            删除是否成功。
        """
        try:
            async_client = await self._get_async_client()
            await async_client.delete(
                collection_name=collection_name,
                points_selector=models.PointIdsList(
                    points=[doc_id],
                ),
            )
            logger.info("已删除文档 %s 从集合 %s", doc_id, collection_name)
            return True
        except Exception as e:
            logger.error("删除文档失败 %s: %s", doc_id, e)
            return False

    async def clear_collection(self, collection_name: str) -> bool:
        """
        清空指定集合中的所有文档点。

        Args:
            collection_name: Qdrant 集合名称。

        Returns:
            清空操作是否成功。
        """
        try:
            async_client = await self._get_async_client()
            await async_client.delete(
                collection_name=collection_name,
                points_selector=models.FilterSelector(
                    filter=models.Filter(
                        must=[],
                    ),
                ),
            )
            logger.info("已清空集合 %s 中的所有文档", collection_name)
            return True
        except Exception as e:
            logger.error("清空集合失败 %s: %s", collection_name, e)
            return False
