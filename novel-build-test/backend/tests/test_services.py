"""AISQA 服务层单元测试 — 4.3.2: Agent 工作流 / 4.3.3: 知识库向量

测试策略:
  这些测试验证服务层的核心逻辑（运行时不依赖外部基础设施）。
"""

import pytest

# ==================== 报告分析器 ====================


class TestReportAnalyzer:
    """3.2.6: 报告分析器 — 验证回退分析逻辑"""

    @pytest.mark.asyncio
    async def test_fallback_analysis(self):
        """无 LLM 时回退分析应返回结构化结果"""
        from app.services.report_analyzer import ReportAnalyzer

        analyzer = ReportAnalyzer()
        pass_rate = 80.0
        result = analyzer._fallback_analysis(
            total_cases=10,
            passed=8,
            failed=1,
            skipped=1,
            duration=45.0,
            pass_rate=pass_rate,
        )
        assert result is not None
        assert isinstance(result, dict)
        assert "quality_score" in result
        assert "summary" in result

    @pytest.mark.asyncio
    async def test_fallback_all_passed(self):
        """全部通过时质量评分为 100"""
        from app.services.report_analyzer import ReportAnalyzer

        analyzer = ReportAnalyzer()
        result = analyzer._fallback_analysis(
            total_cases=10,
            passed=10,
            failed=0,
            skipped=0,
            duration=30.0,
            pass_rate=100.0,
        )
        assert result["quality_score"] == 100

    @pytest.mark.asyncio
    async def test_analyze_prompt_building(self):
        """验证 LLM 提示词构建不报错"""
        from app.services.report_analyzer import ReportAnalyzer

        analyzer = ReportAnalyzer()
        prompt = analyzer._build_analysis_prompt(
            total_cases=10,
            passed=8,
            failed=1,
            skipped=1,
            duration=45.0,
            pass_rate=80.0,
            details=None,
        )
        assert isinstance(prompt, str)
        assert "测试报告分析助手" in prompt or "分析" in prompt


# ==================== 模型分级配置 ====================


class TestModelTier:
    """2.1.3: 模型分级配置表 — 验证分级逻辑"""

    def test_default_tier_is_v4_flash(self):
        """默认模型应为 DeepSeek-V4-Flash"""
        from app.services.model_tier import DEFAULT_TIER

        assert DEFAULT_TIER.provider_name == "deepseek-v4-flash"

    def test_get_tier_by_provider(self):
        """按 provider 名称查找层级"""
        from app.services.model_tier import get_tier

        tier = get_tier("deepseek-v4-flash")
        assert tier.tier == "L1"

        tier = get_tier("glm-5")
        assert tier.tier == "L3"

        tier = get_tier("nonexistent")
        assert tier.tier == "L1"

    def test_select_model_for_scenario(self):
        """按场景推荐模型"""
        from app.services.model_tier import select_model_for_scenario

        tier = select_model_for_scenario("需求分析")
        assert tier.provider_name == "deepseek-v4-flash"

        tier = select_model_for_scenario("质量审计")
        assert tier.provider_name == "deepseek-v4-pro"

    def test_calculate_cost(self):
        """成本计算"""
        from app.services.model_tier import calculate_cost

        cost = calculate_cost("deepseek-v4-flash", 100_000, 50_000)
        assert cost > 0
        # deepseek-v4-flash: (100000/1000000)*1.0 + (50000/1000000)*2.0 = 0.2
        assert abs(cost - 0.2) < 0.001

    def test_get_all_tiers(self):
        """获取所有层级摘要"""
        from app.services.model_tier import get_all_tiers

        tiers = get_all_tiers()
        assert len(tiers) >= 5
        names = [t["name"] for t in tiers]
        assert "DeepSeek-V4-Flash" in names
        assert "DeepSeek-V4-Pro" in names
        assert "GLM-5" in names
        assert "Qwen3-Max" in names
        assert "Kimi K2.5" in names


# ==================== LLM Provider ====================


class TestLLMProvider:
    """2.1.2: Provider 工厂 — 验证模型名称和配置"""

    def test_model_registry_keys(self):
        """_MODEL_REGISTRY 应包含所有 5 个模型"""
        from app.services.llm import _MODEL_REGISTRY

        assert "deepseek-v4-flash" in _MODEL_REGISTRY
        assert "deepseek-v4-pro" in _MODEL_REGISTRY
        assert "qwen3-max" in _MODEL_REGISTRY
        assert "glm-5" in _MODEL_REGISTRY
        assert "kimi-k2.5" in _MODEL_REGISTRY

    def test_get_provider_no_key(self):
        """无 API Key 时应返回 None"""
        from app.services.llm import get_provider

        provider = get_provider("deepseek-v4-flash")
        assert provider is None

    def test_get_provider_unknown(self):
        """未知模型应返回 None"""
        from app.services.llm import get_provider

        provider = get_provider("nonexistent-model")
        assert provider is None


# ==================== 异步执行器 ====================


class TestExecutor:
    """3.1.6: 异步执行器 — 验证工具函数"""

    def test_get_execution_logs_empty(self):
        """未开始的执行应返回空列表"""
        from app.services.executor import get_execution_logs

        logs = get_execution_logs(99999)
        assert logs == []

    def test_get_execution_status_not_found(self):
        """不存在的执行应返回 not_found"""
        from app.services.executor import get_execution_status

        status = get_execution_status(99999)
        assert status == "not_found"


# ==================== 辩论引擎 ====================


class TestDebateEngine:
    """2.3: 辩论引擎 — 验证执行流程"""

    @pytest.mark.asyncio
    async def test_debate_requires_params(self):
        """缺少辩论参数应返回 failed"""
        from app.agents.debate_engine import DebateEngine

        engine = DebateEngine()
        result = await engine.execute({"topic": "", "pro_side": "", "con_side": ""})
        assert result.status == "failed"
