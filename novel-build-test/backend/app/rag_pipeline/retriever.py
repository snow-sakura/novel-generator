"""
上下文检索器，基于语义相似度从向量数据库中检索与查询最相关的文档片段。
支持单集合查询、多集合交叉检索和元数据过滤查询。
"""

import logging
from typing import Any, Optional

from app.vector_db.knowledge_retriever import global_retriever

logger = logging.getLogger(__name__)


class ContextRetriever:
    """上下文检索器，为 Agent 提供与当前任务相关的测试知识上下文。"""

    def __init__(self, default_limit: int = 5) -> None:
        """
        初始化上下文检索器。

        Args:
            default_limit: 默认返回结果数量上限。
        """
        self._retriever = global_retriever
        self.default_limit = default_limit
        logger.info("ContextRetriever 初始化完成，default_limit=%d", default_limit)

    async def retrieve_context(
        self,
        query: str,
        collection_name: str = "test_case_knowledge",
        limit: int = 5,
    ) -> list[dict]:
        """
        根据查询文本从指定集合中检索相关上下文。

        Args:
            query: 查询文本。
            collection_name: 目标集合名称，默认为 test_case_knowledge。
            limit: 返回结果数量上限。

        Returns:
            检索结果列表，每个结果包含向量数据库中存储的文档字段。
        """
        if not query or not query.strip():
            logger.warning("查询文本为空")
            return []

        try:
            results = await self._retriever.semantic_search(
                collection_name=collection_name,
                query_text=query,
                limit=limit,
            )
            logger.info(
                "从集合 %s 检索到 %d 条相关上下文",
                collection_name,
                len(results),
            )
            return results
        except Exception as e:
            logger.error("上下文检索失败: %s", e)
            return []

    async def retrieve_multi_source(
        self,
        query: str,
        collections: list[str],
        limit_per_source: int = 3,
    ) -> dict[str, list[dict]]:
        """
        从多个集合中并行检索相关上下文。

        Args:
            query: 查询文本。
            collections: 集合名称列表。
            limit_per_source: 每个集合返回的结果数量上限。

        Returns:
            以集合名称为键、检索结果列表为值的字典。
        """
        results: dict[str, list[dict]] = {}

        for collection_name in collections:
            try:
                collection_results = await self._retriever.semantic_search(
                    collection_name=collection_name,
                    query_text=query,
                    limit=limit_per_source,
                )
                results[collection_name] = collection_results
                logger.info(
                    "从集合 %s 检索到 %d 条结果",
                    collection_name,
                    len(collection_results),
                )
            except Exception as e:
                logger.error(
                    "从集合 %s 检索失败: %s",
                    collection_name,
                    e,
                )
                results[collection_name] = []

        return results

    async def retrieve_with_filter(
        self,
        query: str,
        collection_name: str,
        filter_condition: dict,
        limit: int = 5,
    ) -> list[dict]:
        """
        根据查询文本和元数据过滤条件检索相关上下文。

        Args:
            query: 查询文本。
            collection_name: 目标集合名称。
            filter_condition: Qdrant 过滤条件字典，例如 {"must": [{"key": "类型", "match": {"value": ".py"}}]}。
            limit: 返回结果数量上限。

        Returns:
            符合条件的检索结果列表。
        """
        if not query or not query.strip():
            logger.warning("查询文本为空")
            return []

        try:
            results = await self._retriever.semantic_search(
                collection_name=collection_name,
                query_text=query,
                filter_condition=filter_condition,
                limit=limit,
            )
            logger.info(
                "带过滤检索到 %d 条结果（集合: %s）",
                len(results),
                collection_name,
            )
            return results
        except Exception as e:
            logger.error("带过滤检索失败: %s", e)
            return []


# 全局单例，供系统其他模块直接使用
global_context_retriever = ContextRetriever()
