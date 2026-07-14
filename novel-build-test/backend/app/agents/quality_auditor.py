"""质量审计智能体 — 质量评分与合规检查，评估测试覆盖率、缺陷密度等"""

import json
import logging

from .base import AgentBase, AgentResult

logger = logging.getLogger(__name__)


class QualityAuditor(AgentBase):
    """质量审计智能体：进行质量评分与合规检查，评估测试覆盖率和缺陷密度等指标"""

    def __init__(self):
        super().__init__(
            name="QualityAuditor",
            model="deepseek-r1",
            role_description="质量审计专家",
            system_prompt=(
                "你是一个严谨的质量审计专家，擅长从多维度评估软件质量。"
                "你需要基于测试覆盖、缺陷数据、执行结果等生成量化的质量报告。"
                "输出格式要求：返回合法的 JSON 对象，包含以下字段：\n"
                "  - quality_score: {overall, dimensions: array of {name, score, weight, reason}}\n"
                "  - coverage_analysis: {statement, branch, function, risk_areas}\n"
                "  - defect_density: {value, benchmark, assessment}\n"
                "  - compliance_checklist: array of {item, status, detail}\n"
                "  - improvement_suggestions: array of string\n"
                "  - audit_conclusion: string\n"
                "请确保输出是合法的 JSON，不要包含 markdown 代码块标记。"
            ),
        )

    async def execute(self, context: dict) -> AgentResult:
        """执行质量审计

        Args:
            context: 上下文，需包含审计所需的各类数据
                      支持字段：analysis_result, test_design, test_cases,
                               execution_analysis, project_name

        Returns:
            AgentResult: 包含质量评分和审计结论的执行结果
        """
        project_name = context.get("project_name", "未知项目")
        analysis_result = context.get("analysis_result", {})
        test_design = context.get("test_design", {})
        test_cases = context.get("test_cases", [])
        execution_analysis = context.get("execution_analysis", {})

        functional_points = analysis_result.get(
            "functional_points",
            analysis_result.get("功能点列表", []),
        )
        test_scenarios = test_design.get("test_scenarios", [])
        execution_summary = execution_analysis.get("execution_summary", {})
        defect_report = execution_analysis.get("defect_report", [])

        prompt = (
            f"## 项目名称\n{project_name}\n\n"
            f"## 功能点数量\n{len(functional_points)}\n\n"
            f"## 测试场景数量\n{len(test_scenarios)}\n\n"
            f"## 测试用例数量\n{len(test_cases)}\n\n"
            f"## 执行摘要\n{json.dumps(execution_summary, ensure_ascii=False, indent=2)}\n\n"
            f"## 缺陷列表\n{json.dumps(defect_report, ensure_ascii=False, indent=2)}\n\n"
            "请执行全面的质量审计，输出 JSON 对象：\n"
            "1. quality_score：质量评分，包含 overall（综合评分 0-100）"
            "和 dimensions（各维度评分数组，每项含 name、score、weight、reason）\n"
            "2. coverage_analysis：覆盖率分析，包含 statement（语句覆盖）、"
            "branch（分支覆盖）、function（函数覆盖）、risk_areas（风险区域）\n"
            "3. defect_density：缺陷密度，包含 value（实际值）、"
            "benchmark（基准值）、assessment（评估）\n"
            "4. compliance_checklist：合规检查清单，每项含 item、status（pass/fail/na）、detail\n"
            "5. improvement_suggestions：改进建议列表\n"
            "6. audit_conclusion：审计结论"
        )

        try:
            raw_output = await self._execute_with_retry(prompt)
        except RuntimeError as e:
            return self._build_result(
                output=str(e),
                error=str(e),
                metadata={"quality_report": {}},
            )

        quality_report = self._parse_report(raw_output)

        return self._build_result(
            output=raw_output,
            metadata={"quality_report": quality_report},
        )

    def _parse_report(self, raw: str) -> dict:
        """解析 LLM 输出为结构化质量报告"""
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

        logger.warning("无法解析质量审计输出为 JSON，使用文本回退格式")
        return {
            "quality_score": {"overall": 0, "dimensions": []},
            "coverage_analysis": {},
            "defect_density": {},
            "compliance_checklist": [],
            "improvement_suggestions": [],
            "audit_conclusion": raw[:500] if raw else "",
            "_parse_warning": "输出未能解析为 JSON",
        }
