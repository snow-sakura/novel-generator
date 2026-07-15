"""测试架构智能体 — 根据需求分析结果设计测试架构和策略，确定测试层级"""

import json
import logging

from .base import AgentBase, AgentResult

logger = logging.getLogger(__name__)


class TestArchitect(AgentBase):
    """测试架构智能体：根据需求分析结果设计测试架构、策略和测试层级"""

    def __init__(self):
        super().__init__(
            name="TestArchitect",
            model="qwen3-max",
            role_description="测试架构师",
            system_prompt=(
                "你是一个经验丰富的测试架构师，擅长设计高质量的测试架构和策略。"
                "你需要根据需求分析结果，确定测试层级、技术选型和架构方案。"
                "输出格式要求：返回合法的 JSON 对象，包含以下字段：\n"
                "  - test_strategy: string，总体测试策略\n"
                "  - test_levels: array of {level, scope, approach}，测试层级\n"
                "  - technology_stack: array of {category, tool, reason}，技术选型\n"
                "  - architecture_diagram: string，架构描述（文字）\n"
                "  - key_metrics: array of string，关键质量指标\n"
                "请确保输出是合法的 JSON，不要包含 markdown 代码块标记。"
            ),
        )

    async def execute(self, context: dict) -> AgentResult:
        """执行测试架构设计

        Args:
            context: 上下文，需包含 analysis_result（需求分析结果）
                      可选字段：project_name, project_type

        Returns:
            AgentResult: 包含结构化架构方案的执行结果
        """
        project_name = context.get("project_name", "未知项目")
        project_type = context.get("project_type", "Web 应用")
        analysis_result = context.get("analysis_result", {})

        functional_points = analysis_result.get(
            "functional_points",
            analysis_result.get("功能点列表", []),
        )
        risk_points = analysis_result.get(
            "risk_points",
            analysis_result.get("风险点", []),
        )
        test_scope = analysis_result.get(
            "test_scope",
            analysis_result.get("测试范围", ""),
        )

        prompt = (
            f"## 项目名称\n{project_name}\n\n"
            f"## 项目类型\n{project_type}\n\n"
            f"## 功能点列表\n{json.dumps(functional_points, ensure_ascii=False, indent=2)}\n\n"
            f"## 风险点\n{json.dumps(risk_points, ensure_ascii=False, indent=2)}\n\n"
            f"## 测试范围\n{test_scope}\n\n"
            "请根据以上信息设计测试架构，输出 JSON 对象：\n"
            "1. test_strategy：总体测试策略（包含自动化策略、环境策略）\n"
            "2. test_levels：测试层级设计（单元测试、集成测试、端到端测试等），"
            "每个层级包含 level（层级名称）、scope（范围）、approach（方法）\n"
            "3. technology_stack：推荐的技术栈，每项包含 category（类别）、"
            "tool（工具）、reason（选择理由）\n"
            "4. architecture_diagram：用文字描述架构关系\n"
            "5. key_metrics：关键质量指标列表"
        )

        try:
            raw_output = await self._execute_with_retry(prompt)
        except RuntimeError as e:
            return self._build_result(
                output=str(e),
                error=str(e),
                metadata={"architecture_plan": {}},
            )

        architecture_plan = self._parse_architecture(raw_output)

        return self._build_result(
            output=raw_output,
            metadata={"architecture_plan": architecture_plan},
        )

    def _parse_architecture(self, raw: str) -> dict:
        """解析 LLM 输出为结构化架构方案"""
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

        logger.warning("无法解析架构方案输出为 JSON，使用文本回退格式")
        return {
            "test_strategy": raw[:500] if raw else "",
            "test_levels": [],
            "technology_stack": [],
            "architecture_diagram": "解析失败，请查看原始输出",
            "key_metrics": [],
            "_parse_warning": "输出未能解析为 JSON",
        }
