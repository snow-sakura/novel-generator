"""需求分析智能体 — 解析需求/PRD文档，提取测试要点、功能点、边界条件"""

import json
import logging

from .base import AgentBase, AgentResult

logger = logging.getLogger(__name__)


class RequirementsAnalyst(AgentBase):
    """需求分析智能体：解析 PRD / 需求文档，提取功能点、测试范围和边界条件"""

    def __init__(self):
        super().__init__(
            name="RequirementsAnalyst",
            model="deepseek-v4-flash",
            role_description="需求分析专家",
            system_prompt=(
                "你是一个专业的需求分析专家，擅长从产品需求文档（PRD）中提取结构化信息。"
                "请从测试角度分析需求，识别功能点、边界条件、风险点和测试建议。"
                "输出格式要求：返回合法的 JSON 对象，包含以下字段：\n"
                "  - functional_points: string[]，功能点列表\n"
                "  - boundary_conditions: string[]，边界条件列表\n"
                "  - risk_points: array of {description, impact}，风险点\n"
                "  - test_scope: string，测试范围描述\n"
                "  - test_suggestions: string，测试建议\n"
                "请确保输出是合法的 JSON，不要包含 markdown 代码块标记。"
            ),
        )

    async def execute(self, context: dict) -> AgentResult:
        """执行需求分析

        Args:
            context: 上下文，需包含 requirement_doc（需求文档内容）
                      可选字段：project_name, analysis_dimensions

        Returns:
            AgentResult: 包含结构化分析结果的执行结果
        """
        project_name = context.get("project_name", "未知项目")
        requirement_doc = context.get("requirement_doc", context.get("需求文档", ""))
        analysis_dimensions = context.get(
            "analysis_dimensions",
            ["功能点", "边界条件", "测试范围", "风险点"],
        )

        if not requirement_doc:
            requirement_doc = context.get("project_description", "无需求文档")

        prompt = (
            f"## 项目名称\n{project_name}\n\n"
            f"## 需求文档\n{requirement_doc}\n\n"
            f"## 分析维度\n{', '.join(analysis_dimensions)}\n\n"
            "请从测试角度对上述需求进行全面分析，输出 JSON 对象：\n"
            "1. functional_points：列出所有功能点\n"
            "2. boundary_conditions：列出所有边界条件\n"
            "3. risk_points：识别风险点（每个对象含 description 和 impact）\n"
            "4. test_scope：描述测试范围\n"
            "5. test_suggestions：给出具体的测试建议"
        )

        try:
            raw_output = await self._execute_with_retry(prompt)
        except RuntimeError as e:
            return self._build_result(
                output=str(e),
                error=str(e),
                metadata={"analysis_result": {}},
            )

        analysis_result = self._parse_analysis(raw_output)

        return self._build_result(
            output=raw_output,
            metadata={
                "analysis_result": analysis_result,
                "analysis_dimensions": analysis_dimensions,
            },
        )

    def _parse_analysis(self, raw: str) -> dict:
        """解析 LLM 输出为结构化分析结果"""
        # 尝试直接解析 JSON
        try:
            return json.loads(raw)
        except json.JSONDecodeError:
            pass

        # 尝试从 markdown 代码块中提取 JSON
        import re
        match = re.search(r"```(?:json)?\s*(\{.*?\})\s*```", raw, re.DOTALL)
        if match:
            try:
                return json.loads(match.group(1))
            except json.JSONDecodeError:
                pass

        # 回退：将原始文本包装为结构化格式
        logger.warning("无法解析 LLM 输出为 JSON，使用文本回退格式")
        return {
            "functional_points": [],
            "boundary_conditions": [],
            "risk_points": [],
            "test_scope": raw[:500] if raw else "",
            "test_suggestions": raw[500:1000] if len(raw) > 500 else "",
            "_parse_warning": "输出未能解析为 JSON，以上字段为原始文本截取",
        }
