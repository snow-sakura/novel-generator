"""事件类型定义 — 定义系统中所有智能体间通信的事件结构与常量。

事件是 AI-Native 第二支柱（事件总线）的核心数据单元。每个事件携带
必要的元数据和载荷，供生产者在 Redis 频道上发布、消费者订阅处理。
"""

from dataclasses import dataclass, field
from datetime import datetime

# =============================================================================
# 事件类型常量
# =============================================================================

# 测试执行
TEST_EXECUTION_STARTED: str = "test.execution.started"
TEST_EXECUTION_COMPLETED: str = "test.execution.completed"
TEST_EXECUTION_FAILED: str = "test.execution.failed"

# 智能体任务
AGENT_TASK_ASSIGNED: str = "agent.task.assigned"
AGENT_TASK_COMPLETED: str = "agent.task.completed"
AGENT_TASK_FAILED: str = "agent.task.failed"

# 辩论
DEBATE_STARTED: str = "debate.started"
DEBATE_ROUND_COMPLETED: str = "debate.round.completed"
DEBATE_CONSENSUS_REACHED: str = "debate.consensus.reached"

# 系统
SYSTEM_HEARTBEAT: str = "system.heartbeat"
SYSTEM_ERROR: str = "system.error"


# =============================================================================
# 枚举 / 常量集合
# =============================================================================


class EventTypes:
    """事件类型常量集合，方便统一引用。"""

    TEST_EXECUTION_STARTED: str = TEST_EXECUTION_STARTED
    TEST_EXECUTION_COMPLETED: str = TEST_EXECUTION_COMPLETED
    TEST_EXECUTION_FAILED: str = TEST_EXECUTION_FAILED
    AGENT_TASK_ASSIGNED: str = AGENT_TASK_ASSIGNED
    AGENT_TASK_COMPLETED: str = AGENT_TASK_COMPLETED
    AGENT_TASK_FAILED: str = AGENT_TASK_FAILED
    DEBATE_STARTED: str = DEBATE_STARTED
    DEBATE_ROUND_COMPLETED: str = DEBATE_ROUND_COMPLETED
    DEBATE_CONSENSUS_REACHED: str = DEBATE_CONSENSUS_REACHED
    SYSTEM_HEARTBEAT: str = SYSTEM_HEARTBEAT
    SYSTEM_ERROR: str = SYSTEM_ERROR


# =============================================================================
# 数据结构
# =============================================================================


@dataclass
class EventPayload:
    """事件载荷 — 所有事件的公共元数据结构。"""

    event_type: str
    timestamp: str = field(default_factory=lambda: datetime.utcnow().isoformat())
    source: str = ""
    data: dict = field(default_factory=dict)
    correlation_id: str | None = None


@dataclass
class TestEvent:
    """测试执行事件 — 测试用例开始、完成或失败时发布。"""

    payload: EventPayload
    test_case_id: str
    status: str
    duration_ms: float | None = None


@dataclass
class AgentEvent:
    """智能体任务事件 — 智能体接收到任务或完成任务时发布。"""

    payload: EventPayload
    agent_name: str
    task_id: str
    status: str
    cost_yuan: float | None = None


@dataclass
class DebateEvent:
    """辩论事件 — 智能体辩论各阶段发布。"""

    payload: EventPayload
    topic: str
    round_number: int
    pro_side: str
    con_side: str
    consensus_reached: bool = False


@dataclass
class SystemEvent:
    """系统事件 — 心跳、错误等系统级消息。"""

    payload: EventPayload
    event_type: str
    message: str
    severity: str = "info"
