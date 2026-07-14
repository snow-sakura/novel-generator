"""测试设计智能体 — 根据测试架构设计具体的测试场景、测试用例大纲"""

import json
import logging

from .base import AgentBase, AgentResult

logger = logging.getLogger(__name__)


class TestDesigner(AgentBase):
    """测试设计智能体：根据测试架构设计具体的测试场景和测试用例大纲"""

    def __init__(self):
        super().__init__(
            name="TestDesigner",
            model="glm-4",
            role_description="测试设计专家",
            system_prompt=(
                "你是一个专业的测试设计专家，擅长将测试架构转化为具体的测试场景和用例大纲。"
                "你需要覆盖功能测试、边界测试、异常测试、性能测试等维度。"
                "输出格式要求：返回合法的 JSON 对象，包含以下字段：\n"
                "  - test_scenarios: array of {id, name, description, priority, coverage}\n"
                "    - 测试场景列表，每个场景包含唯一标识、名称、描述、优先级(P0-P3)、覆盖维度\n"
                "  - test_data_strategy: string，测试数据策略\n"
                "  - environment_requirements: array of string，环境需求\n"
                "  - design_notes: string，设计说明\n"
                "请确保输出是合法的 JSON，不要包含 markdown 代码块标记。"
            ),
        )

    async def execute(self, context: dict) -> AgentResult:
        """执行测试设计

        Args:
            context: 上下文，需包含 architecture_plan（测试架构方案）
                      推荐包含 analysis_result（需求分析结果）

        Returns:
            AgentResult: 包含结构化测试设计的执行结果
        """
        project_name = context.get("project_name", "未知项目")
        analysis_result = context.get("analysis_result", {})
        architecture_plan = context.get("architecture_plan", {})

        functional_points = analysis_result.get(
            "functional_points",
            analysis_result.get("功能点列表", []),
        )
        test_strategy = architecture_plan.get("test_strategy", "")
        test_levels = architecture_plan.get("test_levels", [])
        key_metrics = architecture_plan.get("key_metrics", [])

        prompt = (
            f"## 项目名称\n{project_name}\n\n"
            f"## 功能点列表\n{json.dumps(functional_points, ensure_ascii=False, indent=2)}\n\n"
            f"## 测试策略\n{test_strategy}\n\n"
            f"## 测试层级\n{json.dumps(test_levels, ensure_ascii=False, indent=2)}\n\n"
            f"## 关键指标\n{json.dumps(key_metrics, ensure_ascii=False, indent=2)}\n\n"
            "请根据以上信息设计具体的测试场景和用例大纲，输出 JSON 对象：\n"
            "1. test_scenarios：测试场景列表，每个场景包含 id（如 TC-001）、"
            "name（场景名称）、description（描述）、priority（优先级 P0-P3）、"
            "coverage（覆盖的功能点列表）\n"
            "2. test_data_strategy：测试数据准备策略\n"
            "3. environment_requirements：环境需求列表\n"
            "4. design_notes：补充的设计说明和注意事项"
        )

        try:
            raw_output = await self._execute_with_retry(prompt)
        except RuntimeError as e:
            return self._build_result(
                output=str(e),
                error=str(e),
                metadata={"test_design": {}},
            )

        test_design = self._parse_design(raw_output)

        return self._build_result(
            output=raw_output,
            metadata={"test_design": test_design},
        )

    def _parse_design(self, raw: str) -> dict:
        """解析 LLM 输出为结构化测试设计"""
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

        logger.warning("无法解析测试设计输出为 JSON，使用文本回退格式")
        return {
            "test_scenarios": [],
            "test_data_strategy": "",
            "environment_requirements": [],
            "design_notes": raw[:500] if raw else "",
            "_parse_warning": "输出未能解析为 JSON",
        }
