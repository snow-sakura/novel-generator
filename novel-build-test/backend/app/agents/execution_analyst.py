"""执行分析智能体 — 分析测试执行结果，识别失败原因，生成缺陷报告"""

import json
import logging

from .base import AgentBase, AgentResult

logger = logging.getLogger(__name__)


class ExecutionAnalyst(AgentBase):
    """执行分析智能体：分析测试执行结果，识别失败原因并生成缺陷报告"""

    def __init__(self):
        super().__init__(
            name="ExecutionAnalyst",
            model="deepseek-v4-flash",
            role_description="执行分析专家",
            system_prompt=(
                "你是一个资深的测试执行分析专家，擅长分析测试执行日志和结果。"
                "你需要识别失败原因、分类缺陷、评估影响范围并给出修复建议。"
                "输出格式要求：返回合法的 JSON 对象，包含以下字段：\n"
                "  - execution_summary: {total, passed, failed, skipped, blocked, pass_rate}\n"
                "  - failed_cases: array of {id, title, error_message, root_cause, severity, suggestion}\n"
                "  - defect_report: array of {id, description, category, impact, priority, recommended_action}\n"
                "  - overall_assessment: string，整体评估\n"
                "请确保输出是合法的 JSON，不要包含 markdown 代码块标记。"
            ),
        )

    async def execute(self, context: dict) -> AgentResult:
        """执行测试结果分析

        Args:
            context: 上下文，需包含 execution_results（执行结果列表）
                      可选字段：test_cases, project_name

        Returns:
            AgentResult: 包含缺陷报告和分析结论的执行结果
        """
        project_name = context.get("project_name", "未知项目")
        execution_results = context.get("execution_results", context.get("执行结果", []))
        test_cases = context.get("test_cases", context.get("测试用例", []))

        if not execution_results:
            logger.warning("未提供执行结果，使用空列表")
            execution_results = []

        prompt = (
            f"## 项目名称\n{project_name}\n\n"
            f"## 执行结果\n{json.dumps(execution_results, ensure_ascii=False, indent=2)}\n\n"
            f"## 关联测试用例\n{json.dumps(test_cases, ensure_ascii=False, indent=2)}\n\n"
            "请分析以上测试执行结果，输出 JSON 对象：\n"
            "1. execution_summary：执行摘要，包含 total（总数）、passed（通过）、"
            "failed（失败）、skipped（跳过）、blocked（阻塞）、pass_rate（通过率百分比）\n"
            "2. failed_cases：失败用例分析列表，每个用例包含 id、title、"
            "error_message（错误信息）、root_cause（根因分析）、"
            "severity（严重程度 blocker/critical/major/minor）、suggestion（修复建议）\n"
            "3. defect_report：缺陷报告列表，每个缺陷包含 id、description、"
            "category（类别）、impact（影响范围）、priority（优先级）、"
            "recommended_action（建议措施）\n"
            "4. overall_assessment：整体评估结论"
        )

        try:
            raw_output = await self._execute_with_retry(prompt)
        except RuntimeError as e:
            return self._build_result(
                output=str(e),
                error=str(e),
                metadata={"execution_analysis": {}},
            )

        analysis_result = self._parse_analysis(raw_output)

        return self._build_result(
            output=raw_output,
            metadata={"execution_analysis": analysis_result},
        )

    def _parse_analysis(self, raw: str) -> dict:
        """解析 LLM 输出为结构化分析结果"""
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

        logger.warning("无法解析执行分析输出为 JSON，使用文本回退格式")
        return {
            "execution_summary": {
                "total": 0,
                "passed": 0,
                "failed": 0,
                "skipped": 0,
                "blocked": 0,
                "pass_rate": 0.0,
            },
            "failed_cases": [],
            "defect_report": [],
            "overall_assessment": raw[:500] if raw else "",
            "_parse_warning": "输出未能解析为 JSON",
        }
