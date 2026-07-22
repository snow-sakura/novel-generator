"""Redis 事件消费者 — 订阅 Redis 频道并分发给注册的回调处理器。

消费者通过模式匹配订阅一组频道，收到消息后反序列化 JSON
并根据 event_type 字段分发到对应的事件处理器。
使用全局单例 `global_consumer` 在应用生命周期内管理订阅。
"""

import asyncio
import json
import logging
from collections.abc import Callable

import redis.asyncio as aioredis

from app.config import settings

logger = logging.getLogger(__name__)


class EventConsumer:
    """Redis 事件消费者。

    支持通过 `on` 方法注册事件处理器，启动后持续监听 Redis
    频道并将收到的消息按 event_type 分发给对应的回调函数。
    """

    def __init__(self) -> None:
        self._client: aioredis.Redis | None = None
        self._pubsub: aioredis.client.PubSub | None = None
        self._running: bool = False
        self._task: asyncio.Task | None = None
        self._handlers: dict[str, list[Callable]] = {}

    async def connect(self) -> None:
        """建立与 Redis 的连接并创建 PubSub 对象。"""
        self._client = aioredis.from_url(
            settings.REDIS_URL,
            decode_responses=True,
        )
        self._pubsub = self._client.pubsub()
        logger.info("EventConsumer 已连接到 Redis (%s)", settings.REDIS_URL)

    def on(self, event_type: str, handler: Callable) -> None:
        """注册一个事件处理器。

        Args:
            event_type: 要处理的事件类型（与 EventPayload.event_type 匹配）。
            handler:    异步回调函数，接收反序列化后的事件字典。
        """
        if event_type not in self._handlers:
            self._handlers[event_type] = []
        self._handlers[event_type].append(handler)
        logger.debug("已注册 '%s' 的处理器 (共 %d 个)", event_type, len(self._handlers[event_type]))

    async def _listen(self) -> None:
        """内部循环：持续监听 Redis 频道，反序列化消息并分发。

        订阅所有以 'event.' 开头的频道，接收后按 event_type 查找
        已注册的处理器并依次调用。
        """
        if self._pubsub is None:
            raise RuntimeError("EventConsumer 尚未连接，请先调用 connect()")

        await self._pubsub.psubscribe("event.*")

        logger.info("EventConsumer 开始监听频道模式 'event.*'")

        async for message in self._pubsub.listen():
            if not self._running:
                break

            if message["type"] != "pmessage":
                continue

            try:
                data = json.loads(message["data"])
                event_type = data.get("payload", {}).get("event_type", "")
                logger.debug("收到事件 '%s': %s", event_type, message["channel"])

                handlers = self._handlers.get(event_type, [])
                for handler in handlers:
                    try:
                        if asyncio.iscoroutinefunction(handler):
                            await handler(data)
                        else:
                            handler(data)
                    except Exception:
                        logger.exception("事件处理器执行失败: %s", event_type)
            except json.JSONDecodeError:
                logger.warning("收到无法解析的消息: %s", message["data"][:200])
            except Exception:
                logger.exception("事件消费循环异常")

    async def start(self) -> None:
        """启动消费者后台监听任务。"""
        self._running = True
        self._task = asyncio.create_task(self._listen())
        logger.info("EventConsumer 已启动")

    async def stop(self) -> None:
        """停止消费者监听并释放资源。"""
        self._running = False

        if self._task is not None:
            self._task.cancel()
            try:
                await self._task
            except asyncio.CancelledError:
                pass
            self._task = None

        if self._pubsub is not None:
            await self._pubsub.unsubscribe()
            self._pubsub = None

        if self._client is not None:
            await self._client.close()
            self._client = None

        logger.info("EventConsumer 已停止")

    async def close(self) -> None:
        """关闭消费者（stop 的别名，方便与 producer 对称使用）。"""
        await self.stop()


# 全局单例 — 应用启动时初始化，关闭时清理
global_consumer = EventConsumer()
