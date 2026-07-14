"""调度总控智能体 — 基于 CrewAI 的任务分发与流程编排引擎

本模块提供 DispatchController 类，负责将复杂测试任务拆解并分发到
多个专业 Agent 执行。优先使用 CrewAI 框架进行智能编排，若不可用
则依次回退到 LangGraph 工作流和顺序执行模式。

支持三种执行模式:
    1. CrewAI 编排（首选）— 使用 CrewAI 的 Agent/Role/Process 机制
    2. LangGraph 工作流（回退）— 使用有向图工作流引擎
    3. 顺序执行（最终回退）— 按预定义顺序逐一执行 Agent
"""

import asyncio
import json
import logging
from datetime import datetime
from typing import Any, Optional

from .base import AgentBase, AgentResult
from .workflow_graph import AgentState, workflow_graph
from .requirements_analyst import RequirementsAnalyst
from .test_architect import TestArchitect
from .test_designer import TestDesigner
from .test_case_writer import TestCaseWriter
from .execution_analyst import ExecutionAnalyst
from .quality_auditor import QualityAuditor
from .cost_optimizer import CostOptimizer

logger = logging.getLogger(__name__)

# 工作流定义：执行模式到 Agent 执行序列的映射
WORKFLOW_DEFINITIONS: dict[str, list[dict[str, Any]]] = {
    "全流程": [
        {"step": 1, "agent": "RequirementsAnalyst", "description": "分析需求文档，提取测试要点"},
        {"step": 2, "agent": "TestArchitect", "description": "设计整体测试架构和策略"},
        {"step": 3, "agent": "TestDesigner", "description": "设计测试场景和测试数据"},
        {"step": 4, "agent": "TestCaseWriter", "description": "编写具体的测试用例"},
        {"step": 5, "agent": "CostOptimizer", "description": "优化测试成本和资源分配"},
        {"step": 6, "agent": "ExecutionAnalyst", "description": "执行测试并分析结果"},
        {"step": 7, "agent": "QualityAuditor", "description": "质量审计与最终报告"},
    ],
    "快速检测": [
        {"step": 1, "agent": "RequirementsAnalyst", "description": "快速需求分析"},
        {"step": 2, "agent": "ExecutionAnalyst", "description": "执行快速检测"},
        {"step": 3, "agent": "QualityAuditor", "description": "质量审计"},
    ],
    "架构评审": [
        {"step": 1, "agent": "TestArchitect", "description": "架构设计评审"},
        {"step": 2, "agent": "CostOptimizer", "description": "成本优化评估"},
        {"step": 3, "agent": "QualityAuditor", "description": "质量审计"},
    ],
    "用例生成": [
        {"step": 1, "agent": "RequirementsAnalyst", "description": "需求分析"},
        {"step": 2, "agent": "TestDesigner", "description": "测试场景设计"},
        {"step": 3, "agent": "TestCaseWriter", "description": "测试用例编写"},
        {"step": 4, "agent": "QualityAuditor", "description": "质量审计"},
    ],
}


class DispatchController(AgentBase):
    """调度总控智能体 — 任务分发、流程编排、决策仲裁

    根据执行模式选择最优编排策略，管理多个专业 Agent 的协作执行，
    并提供全流程追踪和成本核算。

    特性:
        - 三级编排策略：CrewAI → LangGraph → 顺序执行
        - 支持多种预定义工作流模板
        - 实时执行状态追踪
        - 聚合所有子 Agent 的执行成本和结果
    """

    def __init__(self):
        super().__init__(
            name="DispatchController",
            role_description="调度总控：任务分发、流程编排、仲裁决策",
            model="deepseek-v3",
        )
        # 实例化子 Agent
        self._analyst = RequirementsAnalyst()
        self._architect = TestArchitect()
        self._designer = TestDesigner()
        self._writer = TestCaseWriter()
        self._executor = ExecutionAnalyst()
        self._auditor = QualityAuditor()
        self._optimizer = CostOptimizer()

        # Agent 名称到实例的映射
        self._agent_map: dict[str, AgentBase] = {
            "RequirementsAnalyst": self._analyst,
            "TestArchitect": self._architect,
            "TestDesigner": self._designer,
            "TestCaseWriter": self._writer,
            "ExecutionAnalyst": self._executor,
            "QualityAuditor": self._auditor,
            "CostOptimizer": self._optimizer,
        }

    async def _try_crewai_orchestrate(self, context: dict[str, Any]) -> Optional[AgentResult]:
        """尝试使用 CrewAI 框架进行智能编排

        将各专业 Agent 包装为 CrewAI 的 Agent 角色，通过 Crew
        的 Process 机制自动管理任务依赖和执行顺序。

        Args:
            context: 执行上下文

        Returns:
            编排成功返回 AgentResult，CrewAI 不可用时返回 None
        """
        try:
            from crewai import Agent, Crew, Process, Task
        except ImportError:
            logger.warning("CrewAI 不可用，将回退到 LangGraph 工作流模式")
            return None

        try:
            execution_mode = context.get("execution_mode", "全流程")
            workflow = WORKFLOW_DEFINITIONS.get(
                execution_mode, WORKFLOW_DEFINITIONS["全流程"]
            )

            # 创建 CrewAI Agent 列表
            crew_agents: list[Agent] = []
            crew_tasks: list[Task] = []

            agent_role_map = {
                "RequirementsAnalyst": (
                    "需求分析师",
                    "负责分析 PRD/需求文档，提取功能点和测试要点",
                ),
                "TestArchitect": (
                    "测试架构师",
                    "负责设计整体测试架构、技术选型和策略规划",
                ),
                "TestDesigner": (
                    "测试设计师",
                    "负责设计具体的测试场景、测试数据和验收标准",
                ),
                "TestCaseWriter": (
                    "用例编写师",
                    "负责将测试场景转化为可执行的测试用例",
                ),
                "CostOptimizer": (
                    "成本优化师",
                    "负责优化测试资源分配和成本控制",
                ),
                "ExecutionAnalyst": (
                    "执行分析师",
                    "负责执行测试计划并分析测试结果",
                ),
                "QualityAuditor": (
                    "质量审计师",
                    "负责质量审计、缺陷分析和最终报告生成",
                ),
            }

            # 为工作流中的每个步骤创建 CrewAI Agent 和 Task
            for step_info in workflow:
                agent_name = step_info["agent"]
                role_info = agent_role_map.get(agent_name, (agent_name, ""))
                agent_instance = self._agent_map.get(agent_name)
                if not agent_instance:
                    continue

                crew_agent = Agent(
                    role=role_info[0],
                    goal=step_info["description"],
                    backstory=f"你是{role_info[0]}，擅长{role_info[1]}",
                    verbose=True,
                    allow_delegation=False,
                )
                crew_agents.append(crew_agent)

                crew_task = Task(
                    description=(
                        f"执行任务：{step_info['description']}\n"
                        f"项目名称：{context.get('project_name', '未知项目')}\n"
                        f"上下文：{json.dumps(context, ensure_ascii=False)}"
                    ),
                    agent=crew_agent,
                    expected_output="结构化的任务执行结果",
                )
                crew_tasks.append(crew_task)

            # 创建并执行 Crew
            crew = Crew(
                agents=crew_agents,
                tasks=crew_tasks,
                process=Process.sequential,
                verbose=True,
            )

            crew_result = await asyncio.to_thread(crew.kickoff)

            # 构建输出
            output = json.dumps(
                {
                    "execution_mode": execution_mode,
                    "orchestrator": "crewai",
                    "workflow": workflow,
                    "result": str(crew_result),
                },
                ensure_ascii=False,
                indent=2,
            )

            return AgentResult(
                status="completed",
                output_content=output,
                model_used="deepseek-v3",
                prompt_tokens=0,
                completion_tokens=0,
                cost_yuan=0.0,
                agent_name=self.name,
                metadata={
                    "execution_mode": execution_mode,
                    "orchestrator": "crewai",
                    "total_steps": len(workflow),
                },
            )

        except Exception as e:
            logger.error(f"CrewAI 编排失败: {e}", exc_info=True)
            return None

    async def _langgraph_execute(self, context: dict[str, Any]) -> AgentResult:
        """使用 LangGraph 工作流引擎执行全流程

        通过预定义的 workflow_graph 有向图执行完整的 Agent 管线，
        每个节点代表一个 Agent 的处理步骤。

        Args:
            context: 执行上下文

        Returns:
            合并后的 AgentResult 对象
        """
        execution_mode = context.get("execution_mode", "全流程")
        workflow = WORKFLOW_DEFINITIONS.get(
            execution_mode, WORKFLOW_DEFINITIONS["全流程"]
        )

        # 构建初始状态
        initial_state: AgentState = {
            "context": context,
            "current_step": 0,
            "results": {},
            "errors": [],
            "total_cost": 0.0,
            "status": "running",
            "execution_mode": execution_mode,
        }

        # 执行工作流图中的每个节点
        state = initial_state
        for step_info in workflow:
            agent_name = step_info["agent"]
            agent_instance = self._agent_map.get(agent_name)

            if not agent_instance:
                logger.warning(f"未知 Agent: {agent_name}，跳过")
                continue

            # 准备步骤上下文（包含之前步骤的结果）
            step_context = {
                **context,
                "task_id": f"{context.get('task_id', '')}_{agent_name}",
                "previous_results": state["results"],
            }

            try:
                # 执行当前 Agent
                agent_result = await agent_instance.execute(step_context)

                step_data = {
                    "agent": agent_name,
                    "description": step_info["description"],
                    "status": agent_result.status,
                    "cost": agent_result.cost_yuan,
                    "output": agent_result.output_content[:500] if agent_result.output_content else "",
                    "error": agent_result.metadata.get("error", "") if agent_result.metadata else "",
                }

                state["results"][agent_name] = step_data
                state["total_cost"] += agent_result.cost_yuan

                if agent_result.status == "failed":
                    state["errors"].append({
                        "step": step_info["step"],
                        "agent": agent_name,
                        "error": agent_result.metadata.get("error", "") if agent_result.metadata else "",
                    })

            except Exception as e:
                logger.error(f"Agent {agent_name} 执行异常: {e}")
                state["errors"].append({
                    "step": step_info["step"],
                    "agent": agent_name,
                    "error": str(e),
                })
                state["results"][agent_name] = {
                    "agent": agent_name,
                    "status": "failed",
                    "error": str(e),
                }

            state["current_step"] = step_info["step"]

        # 标记完成状态
        state["status"] = "completed" if not state["errors"] else "completed_with_errors"

        # 更新 workflow_graph 状态
        try:
            workflow_graph.update_state(state)
        except Exception as e:
            logger.warning(f"更新工作流状态失败: {e}")

        # 构建输出
        output = json.dumps(
            {
                "execution_mode": execution_mode,
                "orchestrator": "langgraph",
                "total_steps": len(workflow),
                "completed_steps": state["current_step"],
                "status": state["status"],
                "results": state["results"],
                "errors": state["errors"],
                "total_cost": state["total_cost"],
            },
            ensure_ascii=False,
            indent=2,
        )

        return AgentResult(
            status=state["status"],
            output_content=output,
            model_used="deepseek-v3",
            prompt_tokens=0,
            completion_tokens=0,
            cost_yuan=state["total_cost"],
            agent_name=self.name,
            metadata={
                "execution_mode": execution_mode,
                "orchestrator": "langgraph",
                "total_steps": len(workflow),
                "total_cost": state["total_cost"],
                "error_count": len(state["errors"]),
            },
        )

    async def _sequential_execute(self, context: dict[str, Any]) -> AgentResult:
        """顺序执行所有 Agent（最终回退方案）

        按照工作流定义依次实例化并执行每个 Agent，
        将上一步的输出作为下一步的输入上下文。

        Args:
            context: 执行上下文

        Returns:
            合并后的 AgentResult 对象
        """
        execution_mode = context.get("execution_mode", "全流程")
        workflow = WORKFLOW_DEFINITIONS.get(
            execution_mode, WORKFLOW_DEFINITIONS["全流程"]
        )

        results: dict[str, Any] = {}
        errors: list[dict[str, Any]] = []
        total_cost = 0.0

        for step_info in workflow:
            agent_name = step_info["agent"]
            agent_class = self._agent_map.get(agent_name)

            if not agent_class:
                logger.warning(f"未知 Agent: {agent_name}，跳过")
                continue

            # 构建当前步骤上下文（包含前面所有步骤的结果）
            step_context = {
                **context,
                "task_id": f"{context.get('task_id', '')}_{agent_name}",
                "pipeline_results": results,
                "execution_mode": execution_mode,
                "step": step_info,
            }

            try:
                # 实例化并执行 Agent
                agent_instance = agent_class
                agent_result = await agent_instance.execute(step_context)

                results[agent_name] = {
                    "status": agent_result.status,
                    "cost": agent_result.cost_yuan,
                    "output": agent_result.output_content[:500] if agent_result.output_content else "",
                    "error": agent_result.metadata.get("error", "") if agent_result.metadata else "",
                }
                total_cost += agent_result.cost_yuan

                if agent_result.status == "failed":
                    errors.append({
                        "agent": agent_name,
                        "step": step_info["step"],
                        "error": agent_result.metadata.get("error", "") if agent_result.metadata else "",
                    })

            except Exception as e:
                logger.error(f"顺序执行 Agent {agent_name} 失败: {e}")
                errors.append({
                    "agent": agent_name,
                    "step": step_info["step"],
                    "error": str(e),
                })
                results[agent_name] = {
                    "status": "failed",
                    "error": str(e),
                }

        overall_status = "completed" if not errors else "completed_with_errors"

        output = json.dumps(
            {
                "execution_mode": execution_mode,
                "orchestrator": "sequential",
                "total_steps": len(workflow),
                "status": overall_status,
                "results": results,
                "errors": errors,
                "total_cost": total_cost,
            },
            ensure_ascii=False,
            indent=2,
        )

        return AgentResult(
            status=overall_status,
            output_content=output,
            model_used="deepseek-v3",
            prompt_tokens=0,
            completion_tokens=0,
            cost_yuan=total_cost,
            agent_name=self.name,
            metadata={
                "execution_mode": execution_mode,
                "orchestrator": "sequential",
                "total_steps": len(workflow),
                "total_cost": total_cost,
                "error_count": len(errors),
            },
        )

    async def execute(self, context: dict[str, Any]) -> AgentResult:
        """执行调度总控任务

        根据 execution_mode 选择工作流模板，按优先级尝试三种编排策略：
        1. CrewAI 智能编排
        2. LangGraph 工作流
        3. 顺序执行（保底）

        Args:
            context: 执行上下文，支持字段：
                - execution_mode: 执行模式（全流程/快速检测/架构评审/用例生成）
                - task_id: 任务 ID
                - project_name: 项目名称
                - 以及其他传递给子 Agent 的上下文参数

        Returns:
            AgentResult 对象，包含完整的执行记录和成本信息
        """
        execution_mode = context.get("execution_mode", "全流程")
        task_id = context.get("task_id", f"task_{datetime.now().strftime('%Y%m%d_%H%M%S')}")

        logger.info(
            f"调度总控开始执行 | 模式={execution_mode} | 任务ID={task_id}"
        )

        # 策略 1: 尝试 CrewAI 编排
        logger.info("尝试 CrewAI 编排模式...")
        result = await self._try_crewai_orchestrate(context)

        if result is not None:
            logger.info("CrewAI 编排执行成功")
            return result

        # 策略 2: 回退到 LangGraph 工作流
        logger.info("CrewAI 不可用，回退到 LangGraph 工作流模式...")
        result = await self._langgraph_execute(context)

        if result.status != "failed":
            logger.info("LangGraph 工作流执行成功")
            return result

        # 策略 3: 最终回退到顺序执行
        logger.warning("LangGraph 工作流执行异常，回退到顺序执行模式...")
        result = await self._sequential_execute(context)

        logger.info(
            f"调度总控执行完成 | 状态={result.status} | "
            f"成本=¥{result.cost_yuan:.4f}"
        )

        return result
