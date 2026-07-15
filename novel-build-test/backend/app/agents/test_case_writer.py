"""用例编写智能体 — 根据测试设计生成详细的测试用例"""

import json
import logging

from .base import AgentBase, AgentResult

logger = logging.getLogger(__name__)


class TestCaseWriter(AgentBase):
    """用例编写智能体：根据测试设计生成可直接执行的详细测试用例"""

    def __init__(self):
        super().__init__(
            name="TestCaseWriter",
            model="glm-5",
            role_description="测试用例编写专家",
            system_prompt=(
                "你是一个专业的测试用例编写专家，擅长将测试场景转化为结构化的可执行测试用例。"
                "每个用例需包含前置条件、测试步骤、预期结果、优先级和标签。"
                "输出格式要求：返回合法的 JSON 对象，包含以下字段：\n"
                "  - test_cases: array of {\n"
                "      id, title, module, priority, preconditions,\n"
                "      steps: array of {step_number, action, expected},\n"
                "      test_data, tags, related_scenario\n"
                "    }\n"
                "  - total_count: number，用例总数\n"
                "  - coverage_analysis: string，覆盖率分析\n"
                "请确保输出是合法的 JSON，不要包含 markdown 代码块标记。"
            ),
        )

    async def execute(self, context: dict) -> AgentResult:
        """执行测试用例编写

        Args:
            context: 上下文，需包含 test_design（测试设计结果）
                      可选字段：analysis_result, output_format

        Returns:
            AgentResult: 包含完整测试用例列表的执行结果
        """
        project_name = context.get("project_name", "未知项目")
        test_design = context.get("test_design", {})
        analysis_result = context.get("analysis_result", {})
        output_format = context.get("output_format", "detailed")

        test_scenarios = test_design.get("test_scenarios", [])
        design_notes = test_design.get("design_notes", "")
        functional_points = analysis_result.get(
            "functional_points",
            analysis_result.get("功能点列表", []),
        )

        prompt = (
            f"## 项目名称\n{project_name}\n\n"
            f"## 功能点列表\n{json.dumps(functional_points, ensure_ascii=False, indent=2)}\n\n"
            f"## 测试场景\n{json.dumps(test_scenarios, ensure_ascii=False, indent=2)}\n\n"
            f"## 设计说明\n{design_notes}\n\n"
            f"## 输出格式要求\n{output_format}\n\n"
            "请根据以上信息生成详细的测试用例，输出 JSON 对象：\n"
            "1. test_cases：测试用例数组，每个用例包含：\n"
            "   - id：唯一标识（如 TC-001）\n"
            "   - title：用例标题\n"
            "   - module：所属模块\n"
            "   - priority：优先级（P0/P1/P2/P3）\n"
            "   - preconditions：前置条件\n"
            "   - steps：测试步骤数组，每步含 step_number、action、expected\n"
            "   - test_data：测试数据说明\n"
            "   - tags：标签列表\n"
            "   - related_scenario：关联的测试场景 ID\n"
            "2. total_count：用例总数\n"
            "3. coverage_analysis：覆盖率分析说明"
        )

        try:
            raw_output = await self._execute_with_retry(prompt)
        except RuntimeError as e:
            return self._build_result(
                output=str(e),
                error=str(e),
                metadata={"test_cases": []},
            )

        test_cases_output = self._parse_cases(raw_output)

        return self._build_result(
            output=raw_output,
            metadata={
                "test_cases": test_cases_output.get("test_cases", []),
                "total_count": test_cases_output.get("total_count", 0),
                "coverage_analysis": test_cases_output.get("coverage_analysis", ""),
            },
        )

    def _parse_cases(self, raw: str) -> dict:
        """解析 LLM 输出为结构化测试用例"""
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

        logger.warning("无法解析测试用例输出为 JSON，使用空列表回退")
        return {
            "test_cases": [],
            "total_count": 0,
            "coverage_analysis": "解析失败，请查看原始输出",
            "_parse_warning": "输出未能解析为 JSON",
        }
