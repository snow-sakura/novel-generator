"""Redis 事件生产者 — 将事件发布到 Redis 频道，供消费者订阅处理。

生产者负责序列化事件为 JSON 并发布到指定的频道名称。
使用全局单例 `global_producer` 在应用生命周期内复用连接。
"""

import json
import logging
from typing import Any

import redis.asyncio as aioredis

from app.config import settings

logger = logging.getLogger(__name__)


class EventProducer:
    """Redis 事件生产者。

    维护与 Redis 的异步连接，提供 `publish` 方法将事件对象
    序列化为 JSON 并发布到指定频道。
    """

    def __init__(self) -> None:
        self._client: aioredis.Redis | None = None
        self._connected: bool = False

    async def connect(self) -> None:
        """建立与 Redis 的连接。

        从应用配置读取 REDIS_URL，创建异步 Redis 客户端。
        """
        self._client = aioredis.from_url(
            settings.REDIS_URL,
            decode_responses=True,
        )
        self._connected = True
        logger.info("EventProducer 已连接到 Redis (%s)", settings.REDIS_URL)

    async def publish(self, channel: str, event: Any) -> None:
        """将事件发布到指定的 Redis 频道。

        Args:
            channel: 目标频道名称。
            event:   dataclass 事件实例，将被序列化为 JSON。
        """
        if not self._connected or self._client is None:
            raise RuntimeError("EventProducer 尚未连接，请先调用 connect()")

        from dataclasses import asdict

        payload = json.dumps(asdict(event), ensure_ascii=False, default=str)
        await self._client.publish(channel, payload)
        logger.debug("已发布事件到频道 '%s': %s", channel, payload[:200])

    async def close(self) -> None:
        """关闭 Redis 连接。"""
        if self._client is not None:
            await self._client.close()
            self._client = None
            self._connected = False
            logger.info("EventProducer 连接已关闭")


# 全局单例 — 应用启动时初始化，关闭时清理
global_producer = EventProducer()
