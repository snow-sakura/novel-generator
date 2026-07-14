"""事件总线 — AI-Native 第二支柱。基于 Redis 的异步事件驱动系统，用于智能体间通信。"""

from .event_types import (
    EventTypes,
    TestEvent,
    AgentEvent,
    DebateEvent,
    SystemEvent,
    EventPayload,
)
from .producer import EventProducer
from .consumer import EventConsumer

__all__ = [
    "EventTypes",
    "TestEvent",
    "AgentEvent",
    "DebateEvent",
    "SystemEvent",
    "EventPayload",
    "EventProducer",
    "EventConsumer",
]
