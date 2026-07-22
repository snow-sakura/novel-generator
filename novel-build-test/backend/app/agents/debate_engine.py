"""辩论引擎 — 基于 AutoGen 的多模型辩论引擎，支持自动辩论与回退模拟

本模块提供 DebateEngine 类，通过多 Agent 辩论机制对测试方案、
架构设计等关键决策进行质量门禁校验。优先使用 AutoGen 框架进行
真实多轮辩论，若 AutoGen 不可用则自动回退到 LLM 模拟辩论。
"""

import asyncio
import json
import logging
from dataclasses import dataclass, field
from typing import Any

from .base import AgentBase, AgentResult

logger = logging.getLogger(__name__)


@dataclass
class DebateRound:
    """单轮辩论记录，包含正反双方论点及共识评估"""

    round_number: int
    pro_argument: str = ""
    con_argument: str = ""
    consensus_score: float = 0.0
    consensus_reached: bool = False


@dataclass
class DebateResult:
    """完整辩论结果，包含所有轮次及最终决策"""

    topic: str
    rounds: list[DebateRound] = field(default_factory=list)
    final_consensus: bool = False
    final_decision: str = ""
    total_cost: float = 0.0
    total_prompt_tokens: int = 0
    total_completion_tokens: int = 0


class DebateEngine(AgentBase):
    """辩论引擎 — 管理多模型辩论流程，支持 AutoGen 原生辩论与模拟回退

    特性:
        - 优先使用 AutoGen 框架进行双智能体辩论
        - 自动回退到 LLM 交替调用模拟辩论
        - 每轮结束后进行共识度评估
        - 所有轮次结束后若未达成共识则进行仲裁
    """

    def __init__(self):
        super().__init__(
            name="DebateEngine",
            role_description="多模型辩论引擎，用于质量门禁校验和决策论证",
            model="deepseek-v4-flash",
        )
        self._max_rounds: int = 3
        self._consensus_threshold: float = 0.7

    async def _try_autogen_debate(
        self,
        topic: str,
        pro_side: str,
        con_side: str,
        max_rounds: int,
    ) -> DebateResult | None:
        """尝试使用 AutoGen 框架进行原生多智能体辩论

        创建两个 AutoGen AssistantAgent 分别代表正方和反方，
        通过 AutoGen 的对话管理层进行多轮辩论。

        Args:
            topic: 辩论议题
            pro_side: 正方立场描述
            con_side: 反方立场描述
            max_rounds: 最大辩论轮数

        Returns:
            辩论成功返回 DebateResult，AutoGen 不可用时返回 None
        """
        try:
            import autogen
        except ImportError:
            logger.warning("AutoGen 不可用，将回退到模拟辩论模式")
            return None

        try:
            # 配置 AutoGen 智能体
            llm_config = {
                "config_list": [
                    {"model": "deepseek-v4-flash", "api_type": "openai"},
                    {"model": "qwen3-max", "api_type": "openai"},
                ],
                "temperature": 0.7,
            }

            # 创建正方和反方智能体
            pro_agent = autogen.AssistantAgent(
                name="ProSide",
                system_message=(
                    f"你是一名为「{topic}」辩论的正方辩手。你的立场是：{pro_side}。"
                    f"请用有力的论据支持你的观点，逻辑清晰，条理分明。"
                ),
                llm_config=llm_config,
            )

            con_agent = autogen.AssistantAgent(
                name="ConSide",
                system_message=(
                    f"你是一名为「{topic}」辩论的反方辩手。你的立场是：{con_side}。"
                    f"请用有力的论据反驳对方，逻辑清晰，条理分明。"
                ),
                llm_config=llm_config,
            )

            # 使用 AutoGen 的对话流程进行多轮辩论
            rounds: list[DebateRound] = []
            final_consensus = False
            final_decision = ""

            for round_num in range(1, max_rounds + 1):
                round_record = DebateRound(round_number=round_num)

                # 正方发言
                pro_message = f"第 {round_num} 轮辩论开始。作为正方，请阐述你的论点。"
                pro_reply = await asyncio.to_thread(
                    pro_agent.generate_reply,
                    messages=[{"role": "user", "content": pro_message}],
                )
                round_record.pro_argument = str(pro_reply)

                # 反方发言
                con_message = f"正方在第 {round_num} 轮的论点是：{pro_reply}\n作为反方，请反驳并阐述你的论点。"
                con_reply = await asyncio.to_thread(
                    con_agent.generate_reply,
                    messages=[{"role": "user", "content": con_message}],
                )
                round_record.con_argument = str(con_reply)

                # 共识评估
                consensus_check = (
                    f"正方论点：{pro_reply}\n\n反方论点：{con_reply}\n\n"
                    f"请评估双方的共识程度，只返回 JSON 格式："
                    f'{{"consensus_score": 0.0-1.0, "consensus_reached": bool}}'
                )
                consensus_reply = await asyncio.to_thread(
                    pro_agent.generate_reply,
                    messages=[{"role": "user", "content": consensus_check}],
                )

                try:
                    consensus_data = json.loads(str(consensus_reply))
                    round_record.consensus_score = float(consensus_data.get("consensus_score", 0.0))
                    round_record.consensus_reached = bool(consensus_data.get("consensus_reached", False))
                except (json.JSONDecodeError, ValueError, TypeError):
                    round_record.consensus_score = 0.0
                    round_record.consensus_reached = False

                rounds.append(round_record)

                if round_record.consensus_reached:
                    final_consensus = True
                    final_decision = f"在第 {round_num} 轮达成共识，共识度 {round_record.consensus_score:.2f}"
                    break

            # 所有轮次结束后若未达成共识，进行仲裁
            if not final_consensus:
                arbitration_prompt = f"辩论「{topic}」经过 {len(rounds)} 轮辩论仍未达成共识。\n\n"
                for r in rounds:
                    arbitration_prompt += (
                        f"第 {r.round_number} 轮：\n  正方：{r.pro_argument[:300]}\n  反方：{r.con_argument[:300]}\n\n"
                    )
                arbitration_prompt += "请作为仲裁者给出最终决策。"
                arbitration_result = await asyncio.to_thread(
                    pro_agent.generate_reply,
                    messages=[{"role": "user", "content": arbitration_prompt}],
                )
                final_decision = str(arbitration_result)

            return DebateResult(
                topic=topic,
                rounds=rounds,
                final_consensus=final_consensus,
                final_decision=final_decision,
                total_cost=0.0,
            )

        except Exception as e:
            logger.error(f"AutoGen 辩论失败: {e}", exc_info=True)
            return None

    async def _simulated_debate(
        self,
        topic: str,
        pro_side: str,
        con_side: str,
        max_rounds: int,
    ) -> DebateResult:
        """使用 LLM 交替调用模拟多轮辩论（AutoGen 不可用时的回退方案）

        通过交替向 LLM 发送提示词来模拟正反双方辩论，
        每轮结束后进行共识度评估，所有轮次结束后仲裁。

        Args:
            topic: 辩论议题
            pro_side: 正方立场描述
            con_side: 反方立场描述
            max_rounds: 最大辩论轮数

        Returns:
            完整的 DebateResult 对象
        """
        rounds: list[DebateRound] = []
        total_cost = 0.0
        total_prompt_tokens = 0
        total_completion_tokens = 0
        last_con_argument = ""

        for round_num in range(1, max_rounds + 1):
            round_record = DebateRound(round_number=round_num)

            # 正方发言
            pro_prompt = f"辩论议题：{topic}\n你的立场：{pro_side}\n当前轮次：第 {round_num} 轮 / 共 {max_rounds} 轮\n"
            if last_con_argument:
                pro_prompt += f"反方上轮论点：{last_con_argument}\n\n"
            pro_prompt += "请阐述你的论点，逻辑清晰，条理分明。"

            pro_llm_result = await self._call_llm(
                prompt=pro_prompt,
                temperature=0.7,
                max_tokens=2048,
            )
            pro_content = pro_llm_result.content
            round_record.pro_argument = pro_content
            total_cost += pro_llm_result.usage.cost_yuan
            total_prompt_tokens += pro_llm_result.usage.prompt_tokens
            total_completion_tokens += pro_llm_result.usage.completion_tokens

            # 反方发言
            con_prompt = (
                f"辩论议题：{topic}\n"
                f"你的立场：{con_side}\n"
                f"当前轮次：第 {round_num} 轮 / 共 {max_rounds} 轮\n"
                f"正方论点：{pro_content}\n\n"
                f"请反驳正方论点并阐述你的论点，逻辑清晰，条理分明。"
            )

            con_llm_result = await self._call_llm(
                prompt=con_prompt,
                temperature=0.7,
                max_tokens=2048,
            )
            con_content = con_llm_result.content
            round_record.con_argument = con_content
            total_cost += con_llm_result.usage.cost_yuan
            total_prompt_tokens += con_llm_result.usage.prompt_tokens
            total_completion_tokens += con_llm_result.usage.completion_tokens

            last_con_argument = con_content

            # 共识评估
            consensus_prompt = (
                f"辩论议题：{topic}\n"
                f"正方论点（第 {round_num} 轮）：{pro_content}\n"
                f"反方论点（第 {round_num} 轮）：{con_content}\n\n"
                f"请评估双方的共识程度（0-1），并判断是否达成一致。\n"
                f"只返回 JSON 格式：\n"
                f'{{"consensus_score": 0.0-1.0, "consensus_reached": bool, '
                f'"分歧点": "..."}}'
            )

            consensus_llm_result = await self._call_llm(
                prompt=consensus_prompt,
                temperature=0.3,
                max_tokens=512,
            )
            consensus_content = consensus_llm_result.content
            total_cost += consensus_llm_result.usage.cost_yuan
            total_prompt_tokens += consensus_llm_result.usage.prompt_tokens
            total_completion_tokens += consensus_llm_result.usage.completion_tokens

            try:
                consensus_data = json.loads(consensus_content)
                round_record.consensus_score = float(consensus_data.get("consensus_score", 0.0))
                round_record.consensus_reached = bool(consensus_data.get("consensus_reached", False))
            except (json.JSONDecodeError, ValueError, TypeError):
                round_record.consensus_score = 0.0
                round_record.consensus_reached = False

            rounds.append(round_record)

            if round_record.consensus_reached:
                return DebateResult(
                    topic=topic,
                    rounds=rounds,
                    final_consensus=True,
                    final_decision=(f"在第 {round_num} 轮达成共识，共识度 {round_record.consensus_score:.2f}"),
                    total_cost=total_cost,
                    total_prompt_tokens=total_prompt_tokens,
                    total_completion_tokens=total_completion_tokens,
                )

        # 所有轮次结束后未达成共识 → 仲裁
        arbitration_prompt = (
            f"你作为中立仲裁者，需要对以下辩论进行最终仲裁。\n\n"
            f"辩论议题：{topic}\n"
            f"正方立场：{pro_side}\n"
            f"反方立场：{con_side}\n\n"
            f"辩论过程：\n"
        )
        for r in rounds:
            arbitration_prompt += (
                f"--- 第 {r.round_number} 轮 ---\n正方：{r.pro_argument[:500]}\n反方：{r.con_argument[:500]}\n\n"
            )
        arbitration_prompt += (
            f"请给出最终决策，包括采纳方案（正方/反方/折中）和理由。\n"
            f"只返回 JSON 格式：\n"
            f'{{"final_decision": "...", "reason": "...", '
            f'"adopted_side": "正方/反方/折中"}}'
        )

        arbitration_llm_result = await self._call_llm(
            prompt=arbitration_prompt,
            temperature=0.5,
            max_tokens=1024,
        )
        arbitration_content = arbitration_llm_result.content
        total_cost += arbitration_llm_result.usage.cost_yuan
        total_prompt_tokens += arbitration_llm_result.usage.prompt_tokens
        total_completion_tokens += arbitration_llm_result.usage.completion_tokens

        try:
            arbitration_data = json.loads(arbitration_content)
            final_decision = arbitration_data.get("final_decision", arbitration_content)
        except json.JSONDecodeError:
            final_decision = arbitration_content

        return DebateResult(
            topic=topic,
            rounds=rounds,
            final_consensus=False,
            final_decision=final_decision,
            total_cost=total_cost,
            total_prompt_tokens=total_prompt_tokens,
            total_completion_tokens=total_completion_tokens,
        )

    async def execute(self, context: dict[str, Any]) -> AgentResult:
        """执行辩论引擎任务

        从 context 中提取辩论参数，优先尝试 AutoGen 原生辩论，
        若不可用则自动回退到 LLM 模拟辩论。

        Args:
            context: 执行上下文，需包含以下字段：
                - topic: 辩论议题
                - pro_side: 正方立场
                - con_side: 反方立场
                - max_rounds: 最大辩论轮数（可选，默认 3）

        Returns:
            AgentResult 对象，输出内容包含完整辩论记录
        """
        topic = context.get("topic", "")
        pro_side = context.get("pro_side", "")
        con_side = context.get("con_side", "")
        max_rounds = context.get("max_rounds", self._max_rounds)

        if not topic or not pro_side or not con_side:
            return AgentResult(
                status="failed",
                output_content="缺少辩论参数：需要 topic、pro_side、con_side",
                model_used=self.model,
                prompt_tokens=0,
                completion_tokens=0,
                cost_yuan=0.0,
                metadata={},
                agent_name=self.name,
            )

        # 优先尝试 AutoGen 原生辩论
        debate_result = await self._try_autogen_debate(
            topic=topic,
            pro_side=pro_side,
            con_side=con_side,
            max_rounds=max_rounds,
        )

        # AutoGen 不可用或失败时回退到模拟辩论
        if debate_result is None:
            logger.info("使用模拟辩论模式作为回退方案")
            debate_result = await self._simulated_debate(
                topic=topic,
                pro_side=pro_side,
                con_side=con_side,
                max_rounds=max_rounds,
            )

        # 构建结构化输出
        rounds_data = []
        for r in debate_result.rounds:
            rounds_data.append(
                {
                    "round_number": r.round_number,
                    "pro_argument": r.pro_argument,
                    "con_argument": r.con_argument,
                    "consensus_score": r.consensus_score,
                    "consensus_reached": r.consensus_reached,
                }
            )

        output = json.dumps(
            {
                "topic": debate_result.topic,
                "rounds": rounds_data,
                "total_rounds": len(debate_result.rounds),
                "final_consensus": debate_result.final_consensus,
                "final_decision": debate_result.final_decision,
                "total_cost": debate_result.total_cost,
            },
            ensure_ascii=False,
            indent=2,
        )

        return AgentResult(
            status="completed",
            output_content=output,
            model_used=self.model,
            prompt_tokens=debate_result.total_prompt_tokens,
            completion_tokens=debate_result.total_completion_tokens,
            cost_yuan=debate_result.total_cost,
            metadata={
                "topic": topic,
                "total_rounds": len(debate_result.rounds),
                "final_consensus": debate_result.final_consensus,
                "debate_mode": "autogen" if debate_result.rounds else "simulated",
            },
            agent_name=self.name,
        )
