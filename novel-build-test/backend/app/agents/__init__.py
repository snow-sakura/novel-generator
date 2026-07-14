"""智能体系统 — AI-Native 多智能体测试平台核心

基于 LangGraph + CrewAI + AutoGen 三引擎混合架构。

架构概览：
- LangGraph: 有状态工作流（Agent 间状态共享与流转）
- CrewAI: 多智能体编排（任务分配与协同）
- AutoGen: 智能体对话（辩论与多轮交互）

7 个核心智能体：
1. RequirementsAnalyst - 解析需求/PRD，提取测试要点
2. TestArchitect - 设计测试架构与策略
3. TestDesigner - 设计测试场景与用例
4. TestCaseWriter - 生成详细测试用例
5. ExecutionAnalyst - 分析执行结果
6. QualityAuditor - 质量评分与合规检查
7. CostOptimizer - 5层成本优化
"""

from .base import AgentBase
from .workflow_graph import create_workflow_graph, AgentState
from .requirements_analyst import RequirementsAnalyst
from .test_architect import TestArchitect
from .test_designer import TestDesigner
from .test_case_writer import TestCaseWriter
from .execution_analyst import ExecutionAnalyst
from .quality_auditor import QualityAuditor
from .cost_optimizer import CostOptimizer
from .debate_engine import DebateEngine
from .dispatch_controller import DispatchController

__all__ = [
    "AgentBase",
    "create_workflow_graph",
    "AgentState",
    "RequirementsAnalyst",
    "TestArchitect",
    "TestDesigner",
    "TestCaseWriter",
    "ExecutionAnalyst",
    "QualityAuditor",
    "CostOptimizer",
    "DebateEngine",
    "DispatchController",
]
