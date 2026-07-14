"""成本优化智能体 — 5层成本优化策略，实现精准成本控制"""

import json
import logging

from .base import AgentBase, AgentResult

logger = logging.getLogger(__name__)


class CostOptimizer(AgentBase):
    """成本优化智能体：通过 5 层优化策略实现精准的 LLM 调用成本控制

    五层优化：
        1. 模型分级层 — 根据任务复杂度匹配合适模型
        2. 缓存层 — 相同请求命中缓存，避免重复调用
        3. 批量处理层 — 合并相似请求减少调用次数
        4. 增量处理层 — 只处理变更部分，减少输入 token
        5. 结构化输出层 — 用 JSON Schema 约束输出，减少无效 token
    """

    def __init__(self):
        super().__init__(
            name="CostOptimizer",
            model="deepseek-v3",
            role_description="成本优化专家",
            system_prompt=(
                "你是一个 LLM 成本优化专家，精通大模型调用成本分析与优化策略。"
                "你需要分析调用日志，给出可执行的优化建议，并计算成本分解。"
                "输出格式要求：返回合法的 JSON 对象，包含以下字段：\n"
                "  - cost_analysis: {total_cost, breakdown: array of {layer, amount, percentage, suggestion}}\n"
                "  - optimization_suggestions: array of {priority, action, expected_saving, difficulty}\n"
                "  - model_usage_distribution: object\n"
                "  - estimated_monthly_saving: number\n"
                "  - summary: string\n"
                "请确保输出是合法的 JSON，不要包含 markdown 代码块标记。"
            ),
        )

    async def execute(self, context: dict) -> AgentResult:
        """执行成本优化分析

        Args:
            context: 上下文，需包含 execution_log（调用日志列表）
                      可选字段：project_name, budget_limit, cost_details

        Returns:
            AgentResult: 包含成本分解和优化建议的执行结果
        """
        project_name = context.get("project_name", "未知项目")
        execution_log = context.get("execution_log", context.get("调用日志", []))
        budget_limit = context.get("budget_limit", 0.0)
        cost_details = context.get("cost_details", {})

        total_cost = sum(
            log.get("cost_yuan", log.get("费用", 0.0))
            for log in execution_log
        )

        cost_breakdown = self._calculate_cost_breakdown(total_cost, cost_details)

        prompt = (
            f"## 项目名称\n{project_name}\n\n"
            f"## 预算上限（元）\n{budget_limit}\n\n"
            f"## 总费用（元）\n{total_cost:.4f}\n\n"
            f"## 成本分解\n{json.dumps(cost_breakdown, ensure_ascii=False, indent=2)}\n\n"
            f"## 调用日志\n{json.dumps(execution_log[:50], ensure_ascii=False, indent=2)}\n\n"
            f"## 补充费用明细\n{json.dumps(cost_details, ensure_ascii=False, indent=2)}\n\n"
            "请分析以上成本数据，输出 JSON 对象：\n"
            "1. cost_analysis：成本分析，包含 total_cost（总成本）、"
            "breakdown（各层成本分解，每项含 layer、amount、percentage、suggestion）\n"
            "2. optimization_suggestions：优化建议列表，每项含 priority、"
            "action、expected_saving（预计节省金额）、difficulty（实施难度）\n"
            "3. model_usage_distribution：模型使用分布\n"
            "4. estimated_monthly_saving：预计月度节省金额\n"
            "5. summary：优化总结"
        )

        try:
            raw_output = await self._execute_with_retry(prompt)
        except RuntimeError as e:
            return self._build_result(
                output=str(e),
                error=str(e),
                metadata={
                    "cost_breakdown": cost_breakdown,
                    "optimization_result": {},
                },
            )

        optimization_result = self._parse_optimization(raw_output)

        return self._build_result(
            output=raw_output,
            metadata={
                "cost_breakdown": cost_breakdown,
                "optimization_result": optimization_result,
                "total_cost": total_cost,
            },
        )

    def _calculate_cost_breakdown(self, total_cost: float, details: dict) -> dict:
        """计算 5 层成本分解结构

        将总成本按五层优化策略拆解，每层包含基础费用和优化后费用。

        Args:
            total_cost: 总成本（元）
            details: 费用明细字典，可选键值：
                      - cache_hit_rate: 缓存命中率
                      - batch_ratio: 批量处理比例
                      - delta_ratio: 增量处理比例
                      - structure_ratio: 结构化输出比例

        Returns:
            包含 5 层成本结构的字典
        """
        cache_hit_rate = details.get("cache_hit_rate", 0.3)
        batch_ratio = details.get("batch_ratio", 0.2)
        delta_ratio = details.get("delta_ratio", 0.15)
        structure_ratio = details.get("structure_ratio", 0.25)
        base_ratio = 1.0 - cache_hit_rate - batch_ratio - delta_ratio - structure_ratio

        return {
            "total_cost_yuan": round(total_cost, 4),
            "layers": [
                {
                    "layer": 1,
                    "name": "模型分级层",
                    "description": "根据任务复杂度选择最优性价比模型",
                    "base_cost": round(total_cost * base_ratio, 4),
                    "optimized_cost": round(total_cost * base_ratio * 0.7, 4),
                    "saving": round(total_cost * base_ratio * 0.3, 4),
                    "ratio": round(base_ratio, 4),
                },
                {
                    "layer": 2,
                    "name": "缓存层",
                    "description": "相同请求命中缓存，避免重复调用",
                    "base_cost": round(total_cost * cache_hit_rate, 4),
                    "optimized_cost": round(total_cost * cache_hit_rate * 0.1, 4),
                    "saving": round(total_cost * cache_hit_rate * 0.9, 4),
                    "ratio": round(cache_hit_rate, 4),
                },
                {
                    "layer": 3,
                    "name": "批量处理层",
                    "description": "合并相似请求减少调用次数",
                    "base_cost": round(total_cost * batch_ratio, 4),
                    "optimized_cost": round(total_cost * batch_ratio * 0.5, 4),
                    "saving": round(total_cost * batch_ratio * 0.5, 4),
                    "ratio": round(batch_ratio, 4),
                },
                {
                    "layer": 4,
                    "name": "增量处理层",
                    "description": "只处理变更部分，减少输入 token",
                    "base_cost": round(total_cost * delta_ratio, 4),
                    "optimized_cost": round(total_cost * delta_ratio * 0.4, 4),
                    "saving": round(total_cost * delta_ratio * 0.6, 4),
                    "ratio": round(delta_ratio, 4),
                },
                {
                    "layer": 5,
                    "name": "结构化输出层",
                    "description": "用 JSON Schema 约束输出，减少无效 token",
                    "base_cost": round(total_cost * structure_ratio, 4),
                    "optimized_cost": round(total_cost * structure_ratio * 0.6, 4),
                    "saving": round(total_cost * structure_ratio * 0.4, 4),
                    "ratio": round(structure_ratio, 4),
                },
            ],
            "total_optimized_cost": round(
                total_cost
                * (base_ratio * 0.7 + cache_hit_rate * 0.1
                   + batch_ratio * 0.5 + delta_ratio * 0.4
                   + structure_ratio * 0.6),
                4,
            ),
            "total_saving": round(
                total_cost
                * (1.0 - (base_ratio * 0.7 + cache_hit_rate * 0.1
                          + batch_ratio * 0.5 + delta_ratio * 0.4
                          + structure_ratio * 0.6)),
                4,
            ),
        }

    def _parse_optimization(self, raw: str) -> dict:
        """解析 LLM 输出为结构化优化结果"""
        try:
            return json.loads(raw)
        except json.JSONDecodeError:
            pass

        import re
        match = re.search(r"```(?:json)?\s*(\{.*?\})\s*```", raw, re.DOTALL)
        if match:
            try:
                return json.loads(match.group(1))
            except json.JSONDecodeError:
                pass

        logger.warning("无法解析成本优化输出为 JSON，使用文本回退格式")
        return {
            "cost_analysis": {},
            "optimization_suggestions": [],
            "model_usage_distribution": {},
            "estimated_monthly_saving": 0.0,
            "summary": raw[:500] if raw else "",
            "_parse_warning": "输出未能解析为 JSON",
        }
