"""AI Agent 模型 — 执行记录与辩论记录"""

import datetime

from sqlalchemy import JSON, Boolean, DateTime, Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class AgentExecution(Base):
    """AI Agent 执行记录表

    记录每个 Agent 任务的执行过程，包括输入输出、模型消耗和费用。

    属性说明：
        id: 主键自增
        project_id: 所属项目（外键 → projects.id）
        agent_name: Agent 名称
        agent_type: Agent 类型（如 reviewer, analyzer, debater）
        task_type: 任务类型
        status: 状态（pending / running / completed / failed）
        input_data: 输入数据（JSON）
        output_data: 输出数据（JSON）
        model_used: 使用的模型名称
        prompt_tokens: Prompt 消耗 token 数
        completion_tokens: Completion 消耗 token 数
        cost_yuan: 费用（人民币，元）
        started_at: 开始时间
        completed_at: 完成时间
        error_message: 错误信息
    """

    __tablename__ = "agent_executions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    project_id: Mapped[int] = mapped_column(Integer, ForeignKey("projects.id"), nullable=False, comment="所属项目")
    agent_name: Mapped[str] = mapped_column(String(100), nullable=False, comment="Agent 名称")
    agent_type: Mapped[str] = mapped_column(String(50), nullable=False, comment="Agent 类型")
    task_type: Mapped[str] = mapped_column(String(50), nullable=True, comment="任务类型")
    status: Mapped[str] = mapped_column(String(20), default="pending", comment="状态: pending/running/completed/failed")
    input_data: Mapped[dict | None] = mapped_column(JSON, nullable=True, comment="输入数据")
    output_data: Mapped[dict | None] = mapped_column(JSON, nullable=True, comment="输出数据")
    model_used: Mapped[str] = mapped_column(String(100), nullable=True, comment="使用的模型")
    prompt_tokens: Mapped[int] = mapped_column(Integer, default=0, comment="Prompt token 数")
    completion_tokens: Mapped[int] = mapped_column(Integer, default=0, comment="Completion token 数")
    cost_yuan: Mapped[float] = mapped_column(Float, default=0.0, comment="费用（人民币元）")
    started_at: Mapped[datetime.datetime | None] = mapped_column(DateTime, nullable=True, comment="开始时间")
    completed_at: Mapped[datetime.datetime | None] = mapped_column(DateTime, nullable=True, comment="完成时间")
    error_message: Mapped[str] = mapped_column(Text, nullable=True, comment="错误信息")

    def __repr__(self) -> str:
        return f"<AgentExecution id={self.id} name={self.agent_name} status={self.status}>"


class AgentDebateRecord(Base):
    """Agent 辩论记录表

    记录多个 Agent 之间的辩论过程，用于质量评审场景。

    属性说明：
        id: 主键自增
        execution_id: 所属执行记录（外键 → agent_executions.id）
        round_number: 辩论轮次
        agent_role: Agent 角色（如 proponent, opponent, arbitrator）
        stance: 立场说明
        content: 辩论内容（Text 类型）
        consensus_reached: 是否达成共识
        final_decision: 最终决策（JSON）
        arbitrator_notes: 仲裁者备注
    """

    __tablename__ = "agent_debate_records"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    execution_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("agent_executions.id"), nullable=False, comment="所属执行记录"
    )
    round_number: Mapped[int] = mapped_column(Integer, nullable=False, comment="辩论轮次")
    agent_role: Mapped[str] = mapped_column(String(50), nullable=False, comment="Agent 角色")
    stance: Mapped[str] = mapped_column(String(200), nullable=True, comment="立场说明")
    content: Mapped[str] = mapped_column(Text, nullable=False, comment="辩论内容")
    consensus_reached: Mapped[bool] = mapped_column(Boolean, default=False, comment="是否达成共识")
    final_decision: Mapped[dict | None] = mapped_column(JSON, nullable=True, comment="最终决策")
    arbitrator_notes: Mapped[str] = mapped_column(Text, nullable=True, comment="仲裁者备注")

    def __repr__(self) -> str:
        return f"<AgentDebateRecord id={self.id} round={self.round_number} role={self.agent_role}>"
