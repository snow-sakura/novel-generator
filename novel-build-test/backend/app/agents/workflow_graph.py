"""LangGraph 工作流图 — 多智能体协作的有状态编排

定义 7 个核心步骤 + 1 个人工审批节点，按流水线顺序执行：

1. step_requirements_analysis  — 需求解析
2. step_test_architecture      — 测试架构设计
3. step_test_design            — 测试场景设计
4. step_test_case_writing      — 测试用例编写
5. step_execution_analysis     — 执行结果分析
6. step_quality_audit          — 质量审计
7. step_cost_optimization      — 成本优化
8. human_approval              — 人工审批（自动模式直接通过）

使用 LangGraph 的 StateGraph 管理状态流转，
支持 Checkpointer 实现断点续跑和状态回溯。
"""

import logging
from typing import Annotated, Any, Literal, Optional, TypedDict

from langgraph.graph import END, StateGraph
from langgraph.checkpoint.memory import MemorySaver

from .requirements_analyst import RequirementsAnalyst
from .test_architect import TestArchitect
from .test_designer import TestDesigner
from .test_case_writer import TestCaseWriter
from .execution_analyst import ExecutionAnalyst
from .quality_auditor import QualityAuditor
from .cost_optimizer import CostOptimizer

logger = logging.getLogger(__name__)


class AgentState(TypedDict):
    """工作流节点间传递的全局状态。

    所有 step 函数读取和写入此状态对象，
    LangGraph 负责合并各节点返回的增量更新。
    """

    project_id: str
    """项目唯一标识"""
    project_name: str
    """项目名称"""
    requirement_doc: str
    """原始需求文档 / PRD 内容"""
    execution_mode: str
    """执行模式: auto / manual / review"""
    status: str
    """当前工作流状态: running / paused / completed / failed"""
    current_step: str
    """当前正在执行的步骤名称"""
    errors: list[str]
    """执行过程中产生的错误列表"""
    results: dict
    """各步骤的输出结果，key 为步骤名"""
    total_cost: float
    """累计总成本（人民币）"""


# ==================== 步骤函数 ====================

async def step_requirements_analysis(state: AgentState) -> dict:
    """步骤 1: 需求解析 — 解析 PRD/需求文档，提取测试要点。"""
    logger.info("开始执行步骤: 需求解析 (step_requirements_analysis)")

    agent = RequirementsAnalyst()
    context = {
        "project_id": state.get("project_id", ""),
        "project_name": state.get("project_name", ""),
        "requirement_doc": state.get("requirement_doc", ""),
        "execution_mode": state.get("execution_mode", "auto"),
    }
    result = await agent.execute(context)

    return {
        "results": {
            "requirements_analysis": {
                "output": result.output_content,
                "status": result.status,
                "cost_yuan": result.cost_yuan,
                "model_used": result.model_used,
            }
        },
        "status": result.status,
        "current_step": "requirements_analysis",
        "total_cost": state.get("total_cost", 0.0) + result.cost_yuan,
    }


async def step_test_architecture(state: AgentState) -> dict:
    """步骤 2: 测试架构设计 — 基于需求分析结果设计测试架构与策略。"""
    logger.info("开始执行步骤: 测试架构设计 (step_test_architecture)")

    agent = TestArchitect()
    prev_result = state.get("results", {}).get("requirements_analysis", {})
    context = {
        "project_id": state.get("project_id", ""),
        "project_name": state.get("project_name", ""),
        "requirement_doc": state.get("requirement_doc", ""),
        "analysis_result": prev_result.get("output", ""),
        "execution_mode": state.get("execution_mode", "auto"),
    }
    result = await agent.execute(context)

    return {
        "results": {
            **state.get("results", {}),
            "test_architecture": {
                "output": result.output_content,
                "status": result.status,
                "cost_yuan": result.cost_yuan,
                "model_used": result.model_used,
            }
        },
        "status": result.status,
        "current_step": "test_architecture",
        "total_cost": state.get("total_cost", 0.0) + result.cost_yuan,
    }


async def step_test_design(state: AgentState) -> dict:
    """步骤 3: 测试场景设计 — 根据架构设计具体的测试场景与用例规划。"""
    logger.info("开始执行步骤: 测试场景设计 (step_test_design)")

    agent = TestDesigner()
    prev_results = state.get("results", {})
    context = {
        "project_id": state.get("project_id", ""),
        "project_name": state.get("project_name", ""),
        "requirement_doc": state.get("requirement_doc", ""),
        "analysis_result": prev_results.get("requirements_analysis", {}).get("output", ""),
        "architecture_result": prev_results.get("test_architecture", {}).get("output", ""),
        "execution_mode": state.get("execution_mode", "auto"),
    }
    result = await agent.execute(context)

    return {
        "results": {
            **state.get("results", {}),
            "test_design": {
                "output": result.output_content,
                "status": result.status,
                "cost_yuan": result.cost_yuan,
                "model_used": result.model_used,
            }
        },
        "status": result.status,
        "current_step": "test_design",
        "total_cost": state.get("total_cost", 0.0) + result.cost_yuan,
    }


async def step_test_case_writing(state: AgentState) -> dict:
    """步骤 4: 测试用例编写 — 基于测试场景生成详细的测试用例。"""
    logger.info("开始执行步骤: 测试用例编写 (step_test_case_writing)")

    agent = TestCaseWriter()
    prev_results = state.get("results", {})
    context = {
        "project_id": state.get("project_id", ""),
        "project_name": state.get("project_name", ""),
        "requirement_doc": state.get("requirement_doc", ""),
        "analysis_result": prev_results.get("requirements_analysis", {}).get("output", ""),
        "architecture_result": prev_results.get("test_architecture", {}).get("output", ""),
        "design_result": prev_results.get("test_design", {}).get("output", ""),
        "execution_mode": state.get("execution_mode", "auto"),
    }
    result = await agent.execute(context)

    return {
        "results": {
            **state.get("results", {}),
            "test_case_writing": {
                "output": result.output_content,
                "status": result.status,
                "cost_yuan": result.cost_yuan,
                "model_used": result.model_used,
            }
        },
        "status": result.status,
        "current_step": "test_case_writing",
        "total_cost": state.get("total_cost", 0.0) + result.cost_yuan,
    }


async def step_execution_analysis(state: AgentState) -> dict:
    """步骤 5: 执行结果分析 — 分析测试执行结果并生成报告。"""
    logger.info("开始执行步骤: 执行结果分析 (step_execution_analysis)")

    agent = ExecutionAnalyst()
    prev_results = state.get("results", {})
    context = {
        "project_id": state.get("project_id", ""),
        "project_name": state.get("project_name", ""),
        "requirement_doc": state.get("requirement_doc", ""),
        "test_case_output": prev_results.get("test_case_writing", {}).get("output", ""),
        "execution_mode": state.get("execution_mode", "auto"),
    }
    result = await agent.execute(context)

    return {
        "results": {
            **state.get("results", {}),
            "execution_analysis": {
                "output": result.output_content,
                "status": result.status,
                "cost_yuan": result.cost_yuan,
                "model_used": result.model_used,
            }
        },
        "status": result.status,
        "current_step": "execution_analysis",
        "total_cost": state.get("total_cost", 0.0) + result.cost_yuan,
    }


async def step_quality_audit(state: AgentState) -> dict:
    """步骤 6: 质量审计 — 对整体测试过程进行质量评分与合规检查。"""
    logger.info("开始执行步骤: 质量审计 (step_quality_audit)")

    agent = QualityAuditor()
    prev_results = state.get("results", {})
    context = {
        "project_id": state.get("project_id", ""),
        "project_name": state.get("project_name", ""),
        "requirement_doc": state.get("requirement_doc", ""),
        "all_results": prev_results,
        "execution_mode": state.get("execution_mode", "auto"),
    }
    result = await agent.execute(context)

    return {
        "results": {
            **state.get("results", {}),
            "quality_audit": {
                "output": result.output_content,
                "status": result.status,
                "cost_yuan": result.cost_yuan,
                "model_used": result.model_used,
            }
        },
        "status": result.status,
        "current_step": "quality_audit",
        "total_cost": state.get("total_cost", 0.0) + result.cost_yuan,
    }


async def step_cost_optimization(state: AgentState) -> dict:
    """步骤 7: 成本优化 — 对整个过程进行 5 层成本分析与优化建议。"""
    logger.info("开始执行步骤: 成本优化 (step_cost_optimization)")

    agent = CostOptimizer()
    prev_results = state.get("results", {})
    context = {
        "project_id": state.get("project_id", ""),
        "project_name": state.get("project_name", ""),
        "total_cost": state.get("total_cost", 0.0),
        "all_results": prev_results,
        "execution_history": {
            step: data
            for step, data in prev_results.items()
            if isinstance(data, dict) and "cost_yuan" in data
        },
        "execution_mode": state.get("execution_mode", "auto"),
    }
    result = await agent.execute(context)

    return {
        "results": {
            **state.get("results", {}),
            "cost_optimization": {
                "output": result.output_content,
                "status": result.status,
                "cost_yuan": result.cost_yuan,
                "model_used": result.model_used,
            }
        },
        "status": result.status,
        "current_step": "cost_optimization",
        "total_cost": state.get("total_cost", 0.0) + result.cost_yuan,
    }


async def human_approval(state: AgentState) -> str:
    """步骤 8: 人工审批节点 — 决定是否进入下一阶段或需要人工复核。

    自动模式下始终返回 'continue'，直接结束工作流。
    手动模式下可返回 'human_review' 暂停等待人工介入。

    Returns:
        路由指令: 'continue' 继续到 END, 'human_review' 等待人工审批。
    """
    mode = state.get("execution_mode", "auto")

    if mode == "auto":
        logger.info("自动模式: 跳过人工审批，工作流结束")
        return "continue"

    logger.info("手动模式: 工作流已完成，等待人工审批")
    return "human_review"


# ==================== 图构建 ====================

def create_workflow_graph() -> StateGraph:
    """构建并编译完整的 LangGraph 工作流图。

    包含 8 个节点（7 个 Agent 步骤 + 1 个人工审批），
    按流水线顺序连接，支持自动模式和手动审批模式。

    Returns:
        已编译的 StateGraph 实例，可通过 .invoke() 执行。
    """
    # 创建状态图，使用 AgentState 作为全局状态类型
    workflow = StateGraph(AgentState)

    # ---- 注册节点 ----
    workflow.add_node("requirements_analysis", step_requirements_analysis)
    workflow.add_node("test_architecture", step_test_architecture)
    workflow.add_node("test_design", step_test_design)
    workflow.add_node("test_case_writing", step_test_case_writing)
    workflow.add_node("execution_analysis", step_execution_analysis)
    workflow.add_node("quality_audit", step_quality_audit)
    workflow.add_node("cost_optimization", step_cost_optimization)
    workflow.add_node("human_approval", human_approval)

    # ---- 设置入口 ----
    workflow.set_entry_point("requirements_analysis")

    # ---- 添加边（流水线顺序） ----
    workflow.add_edge("requirements_analysis", "test_architecture")
    workflow.add_edge("test_architecture", "test_design")
    workflow.add_edge("test_design", "test_case_writing")
    workflow.add_edge("test_case_writing", "execution_analysis")
    workflow.add_edge("execution_analysis", "quality_audit")
    workflow.add_edge("quality_audit", "cost_optimization")
    workflow.add_edge("cost_optimization", "human_approval")

    # ---- 条件分支（从 human_approval 出发） ----
    workflow.add_conditional_edges(
        "human_approval",
        # 路由函数：根据 human_approval 的返回值决定下一节点
        lambda approval_result: approval_result,
        {
            "continue": END,
            "human_review": END,  # 当前简化实现：人工审核也导向 END
        },
    )

    # ---- 编译图（启用内存检查点支持状态持久化） ----
    checkpointer = MemorySaver()
    compiled_graph = workflow.compile(checkpointer=checkpointer)

    logger.info("LangGraph 工作流图已编译完成（8 节点流水线）")
    return compiled_graph


# 模块级全局实例 — 应用启动时加载
workflow_graph = create_workflow_graph()
