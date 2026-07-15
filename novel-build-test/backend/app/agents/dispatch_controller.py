"""调度总控智能体 — 基于 LangGraph 的任务分发与流程编排引擎

本模块提供 DispatchController 类，负责将复杂测试任务拆解并分发到
多个专业 Agent 执行。优先使用 LangGraph 工作流引擎，若不可用
则回退到顺序执行模式。

支持两种执行模式:
    1. LangGraph 工作流（首选）— 使用有向图工作流引擎，支持状态持久化和断点续跑
    2. 顺序执行（回退）— 按预定义顺序逐一执行 Agent

执行计划关联:
    - 2.4.3 成本聚合: 每步执行后累加 cost_yuan → 写入最终记录
    - 2.4.4 超时控制: 整个工作流默认 30 分钟超时，超时自动标记 failed
    - 2.3.5 辩论上下文: 自动将已有辩论结果注入下游 Agent 上下文
"""

import asyncio
import json
import logging
from datetime import datetime
from typing import Any, Optional

from .base import AgentBase, AgentResult
from .requirements_analyst import RequirementsAnalyst
from .test_architect import TestArchitect
from .test_designer import TestDesigner
from .test_case_writer import TestCaseWriter
from .execution_analyst import ExecutionAnalyst
from .quality_auditor import QualityAuditor
from .cost_optimizer import CostOptimizer

logger = logging.getLogger(__name__)

# 默认全局超时时间（秒），2.4.4: 30 分钟
DEFAULT_WORKFLOW_TIMEOUT_SECONDS: int = 1800

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
        - 二级编排策略：LangGraph → 顺序执行
        - 支持多种预定义工作流模板（全流程/快速检测/架构评审/用例生成）
        - 实时执行状态追踪
        - 聚合所有子 Agent 的执行成本和结果
    """

    def __init__(self):
        super().__init__(
            name="DispatchController",
            role_description="调度总控：任务分发、流程编排、仲裁决策",
            model="deepseek-v4-flash",
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

        # 辩论结果缓存（2.3.5: 注入下游 Agent 上下文）
        self._debate_results: Optional[dict[str, Any]] = None

    def set_debate_context(self, debate_results: dict[str, Any]) -> None:
        """注入辩论结果到调度上下文（2.3.5）

        在发起工作流执行前，调用此方法传入已有的辩论结果，
        之后所有子 Agent 的 step_context 中会包含 debate 字段。

        Args:
            debate_results: 辩论结果字典，至少包含:
                - topic: 辩论议题
                - final_decision: 最终决策
                - consensus: 是否达成共识
                - disagreements: 分歧点列表（可选）
        """
        self._debate_results = debate_results
        logger.info(
            f"辩论上下文已注入: topic={debate_results.get('topic', 'N/A')}, "
            f"consensus={debate_results.get('consensus', False)}"
        )

    def _build_step_context(
        self,
        context: dict[str, Any],
        agent_name: str,
        previous_results: dict[str, Any],
    ) -> dict[str, Any]:
        """构建步骤上下文（含辩论结果注入 + 历史结果传递）

        2.3.5: 如果已设置辩论结果，自动注入到每个步骤的 context 中
        2.4.3: 前一阶段结果通过 previous_results 传递

        Args:
            context: 原始执行上下文
            agent_name: 当前 Agent 名称
            previous_results: 之前步骤的执行结果

        Returns:
            增强后的步骤上下文
        """
        step_context: dict[str, Any] = {
            **context,
            "task_id": f"{context.get('task_id', '')}_{agent_name}",
            "previous_results": previous_results,
        }

        # 2.3.5: 注入辩论结果
        if self._debate_results is not None:
            step_context["debate_context"] = self._debate_results

        return step_context

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
        initial_state: dict[str, Any] = {
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

            # 准备步骤上下文（2.3.5: 含辩论结果注入, 2.4.3: 含历史结果传递）
            step_context = self._build_step_context(
                context=context,
                agent_name=agent_name,
                previous_results=state["results"],
            )

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
            model_used="deepseek-v4-flash",
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

            # 构建当前步骤上下文（2.3.5: 含辩论结果注入, 2.4.3: 含历史结果传递）
            step_context = self._build_step_context(
                context=context,
                agent_name=agent_name,
                previous_results=results,
            )
            step_context["execution_mode"] = execution_mode
            step_context["step"] = step_info
            step_context["pipeline_results"] = results

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
            model_used="deepseek-v4-flash",
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

        根据 execution_mode 选择工作流模板，按优先级尝试两种编排策略：
        1. LangGraph 工作流（首选）— 有向图引擎，支持状态持久化和断点续跑
        2. 顺序执行（回退）— 按预定义顺序逐一执行 Agent

        2.4.4: 整个工作流有默认 30 分钟超时，超时自动标记 failed

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

        # 2.4.4: 从 context 中读取超时配置，默认 30 分钟
        timeout_seconds = context.get(
            "timeout_seconds",
            DEFAULT_WORKFLOW_TIMEOUT_SECONDS,
        )

        logger.info(
            f"调度总控开始执行 | 模式={execution_mode} | "
            f"任务ID={task_id} | 超时={timeout_seconds}s"
        )

        try:
            # 2.4.4: 整个工作流包裹超时控制
            result = await asyncio.wait_for(
                self._execute_with_fallback(context),
                timeout=timeout_seconds,
            )
        except asyncio.TimeoutError:
            logger.error(
                f"调度总控执行超时 | 模式={execution_mode} | "
                f"任务ID={task_id} | 超时={timeout_seconds}s"
            )
            return AgentResult(
                status="failed",
                output_content=json.dumps({
                    "execution_mode": execution_mode,
                    "status": "failed",
                    "error": f"执行超时（{timeout_seconds}秒）",
                    "total_cost": 0.0,
                }, ensure_ascii=False),
                model_used=self.model,
                prompt_tokens=0,
                completion_tokens=0,
                cost_yuan=0.0,
                agent_name=self.name,
                metadata={
                    "execution_mode": execution_mode,
                    "status": "timeout",
                    "timeout_seconds": timeout_seconds,
                },
            )

        logger.info(
            f"调度总控执行完成 | 状态={result.status} | "
            f"成本=¥{result.cost_yuan:.4f}"
        )

        return result

    async def _execute_with_fallback(self, context: dict[str, Any]) -> AgentResult:
        """执行工作流（含回退逻辑）

        策略 1: LangGraph 工作流（首选）
        策略 2: 顺序执行（回退）
        """
        # 策略 1: 尝试 LangGraph 工作流
        logger.info("尝试 LangGraph 工作流模式...")
        result = await self._langgraph_execute(context)

        if result.status not in ("failed",):
            logger.info("LangGraph 工作流执行成功")
            return result

        # 策略 2: 回退到顺序执行
        logger.warning("LangGraph 工作流执行异常，回退到顺序执行模式...")
        result = await self._sequential_execute(context)
        return result
