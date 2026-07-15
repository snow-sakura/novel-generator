"""AI 测试报告分析器 — 执行结果分析与自然语言摘要生成

3.2.6: 调用 LLM 分析测试执行结果，生成自然语言报告摘要和质量评分。
依赖 LLM Provider 就绪（2.1），当前返回模拟数据占位。
"""

import json
import logging
from typing import Any, Optional

logger = logging.getLogger(__name__)


class ReportAnalyzer:
    """测试报告分析器

    功能:
        - 分析执行结果生成自然语言摘要
        - 计算质量评分（0-100）
        - 识别失败用例模式
        - 提供改进建议
    """

    def __init__(self, model: str = "deepseek-v4-flash"):
        self.model = model

    async def analyze(
        self,
        total_cases: int,
        passed: int,
        failed: int,
        skipped: int,
        duration: float | None,
        details: list[dict[str, Any]] | None = None,
    ) -> dict[str, Any]:
        """分析测试执行结果，生成报告

        Args:
            total_cases: 总用例数
            passed: 通过数
            failed: 失败数
            skipped: 跳过数
            duration: 执行耗时（秒）
            details: 用例级详细结果列表

        Returns:
            包含分析结果的字典：
                - summary: 自然语言摘要
                - quality_score: 质量评分（0-100）
                - suggestions: 改进建议列表
                - failure_patterns: 失败模式分析
        """
        pass_rate = (passed / total_cases * 100) if total_cases > 0 else 0.0

        # 构建 LLM 分析提示
        analysis_prompt = self._build_analysis_prompt(
            total_cases, passed, failed, skipped, duration, pass_rate, details
        )

        # 尝试调用 LLM（3.2.6: 依赖 2.1 LLM Provider 配置）
        try:
            # 当 LLM Provider 就绪后，此处调用 self._call_llm(analysis_prompt)
            # 当前返回模拟分析结果
            result = self._fallback_analysis(
                total_cases, passed, failed, skipped, duration, pass_rate
            )
        except Exception as e:
            logger.warning(f"LLM 分析失败，使用回退分析: {e}")
            result = self._fallback_analysis(
                total_cases, passed, failed, skipped, duration, pass_rate
            )

        return result

    def _build_analysis_prompt(
        self,
        total_cases: int,
        passed: int,
        failed: int,
        skipped: int,
        duration: float | None,
        pass_rate: float,
        details: list[dict[str, Any]] | None,
    ) -> str:
        """构建 LLM 分析提示词"""
        prompt = (
            f"你是一个专业的测试报告分析助手。请分析以下测试执行结果：\n\n"
            f"## 执行统计\n"
            f"- 总用例数：{total_cases}\n"
            f"- 通过：{passed}\n"
            f"- 失败：{failed}\n"
            f"- 跳过：{skipped}\n"
            f"- 通过率：{pass_rate:.1f}%\n"
        )
        if duration is not None:
            prompt += f"- 总耗时：{duration:.2f} 秒\n"

        if details:
            prompt += "\n## 用例详情\n"
            failed_cases = [d for d in details if d.get("status") == "failed"]
            if failed_cases:
                prompt += "### 失败用例\n"
                for i, case in enumerate(failed_cases[:10], 1):
                    prompt += f"{i}. {case.get('name', '未知')}"
                    if case.get("error"):
                        prompt += f" — 错误：{case['error']}"
                    prompt += "\n"

        prompt += (
            "\n请返回 JSON 格式的分析结果：\n"
            '{\n'
            '  "quality_score": <0-100 质量评分>,\n'
            '  "summary": "<自然语言摘要>",\n'
            '  "suggestions": ["<改进建议1>", "<改进建议2>"],\n'
            '  "failure_patterns": ["<失败模式1>", "<失败模式2>"]\n'
            '}\n'
        )
        return prompt

    def _fallback_analysis(
        self,
        total_cases: int,
        passed: int,
        failed: int,
        skipped: int,
        duration: float | None,
        pass_rate: float,
    ) -> dict[str, Any]:
        """回退分析（LLM 不可用时）"""
        # 质量评分
        if pass_rate >= 95:
            quality_score = 90 + (pass_rate - 95) / 5 * 10
        elif pass_rate >= 80:
            quality_score = 70 + (pass_rate - 80) / 15 * 20
        elif pass_rate >= 60:
            quality_score = 50 + (pass_rate - 60) / 20 * 20
        else:
            quality_score = max(0, pass_rate / 60 * 50)

        quality_score = round(min(100, max(0, quality_score)), 1)

        # 自然语言摘要
        if pass_rate == 100:
            summary = (
                f"测试执行圆满完成！共执行 {total_cases} 个用例，"
                f"全部通过（通过率 100%）。"
            )
        elif pass_rate >= 90:
            summary = (
                f"测试结果良好。共执行 {total_cases} 个用例，"
                f"通过 {passed} 个（通过率 {pass_rate:.1f}%），"
                f"失败 {failed} 个，跳过 {skipped} 个。"
            )
        elif pass_rate >= 70:
            summary = (
                f"测试结果一般。共执行 {total_cases} 个用例，"
                f"通过 {passed} 个（通过率 {pass_rate:.1f}%），"
                f"失败 {failed} 个，跳过 {skipped} 个。"
                f"建议优先修复失败用例。"
            )
        else:
            summary = (
                f"测试结果不理想。共执行 {total_cases} 个用例，"
                f"通过 {passed} 个（通过率 {pass_rate:.1f}%），"
                f"失败 {failed} 个，跳过 {skipped} 个。"
                f"需要重点关注和修复。"
            )

        if duration is not None:
            summary += f" 总耗时 {duration:.2f} 秒。"

        # 改进建议
        suggestions = []
        if failed > 0:
            suggestions.append(f"修复 {failed} 个失败用例")
        if skipped > 0:
            suggestions.append(f"补充 {skipped} 个跳过用例的执行条件")
        if pass_rate < 90:
            suggestions.append("增加自动化测试覆盖率")
        if not suggestions:
            suggestions.append("保持良好的测试质量，继续补充测试场景")

        # 失败模式
        failure_patterns = []
        if failed > 0:
            failure_patterns.append(f"{failed} 个用例执行失败待分析")
        if pass_rate < 80:
            failure_patterns.append("通过率偏低，可能存在系统性质量问题")

        return {
            "quality_score": quality_score,
            "summary": summary,
            "suggestions": suggestions,
            "failure_patterns": failure_patterns if failure_patterns else ["无显著失败模式"],
        }
