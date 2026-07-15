"""模型分级配置表 — 定义 L1~L5 模型的分级、定价、场景映射 (2026-07 最新版)

根据架构文档的模型分级策略，提供统一的模型选择、成本计算和场景匹配功能。
CostOptimizer Agent 依赖此模块进行成本分析和优化建议。

分级策略（2026年7月更新）:
    L1 — DeepSeek-V4-Flash:    常规任务（需求分析、用例生成、报告编写），预计占比 70%
    L2 — DeepSeek-V4-Pro:      推理审计（质量审计、辩论、缺陷分析），预计占比 15%
    L3 — GLM-5:                 结构化输出（测试计划、架构设计），预计占比 8%
    L4 — Qwen3-Max:             复杂决策（架构评审、重大缺陷判定），预计占比 5%
    L5 — Kimi K2.5:             长文档分析（需求文档审查、日志分析），预计占比 2%

参考来源:
    - DeepSeek V4: https://api-docs.deepseek.com (2026-04-24 发布)
    - GLM-5: https://bigmodel.cn (2026-02 发布)
    - Qwen3 Max: https://help.aliyun.com (2026 旗舰)
    - Kimi K2.5: https://kimi.moonshot.cn (2026-01-27 发布)
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Optional


@dataclass(frozen=True)
class ModelTierConfig:
    """单个模型层级配置"""

    tier: str                          # L1 / L2 / L3 / L4 / L5
    provider_name: str                 # Provider 标识（deepseek-v4-flash / deepseek-v4-pro / glm-5 / qwen3-max / kimi-k2.5）
    display_name: str                  # 显示名
    model_id: str                      # 实际 API 模型 ID
    input_price_per_m: float           # 输入价格（¥/M tokens）
    output_price_per_m: float          # 输出价格（¥/M tokens）
    max_tokens: int                    # 最大输出 Token 数
    suitable_scenarios: list[str] = field(default_factory=list)  # 适用场景列表
    weight: float = 0.0                # 使用占比权重（0-1）


# ==================== 模型分级定义 ====================

L1_DEEPSEEK_V4_FLASH = ModelTierConfig(
    tier="L1",
    provider_name="deepseek-v4-flash",
    display_name="DeepSeek-V4-Flash",
    model_id="deepseek-v4-flash",
    input_price_per_m=1.0,
    output_price_per_m=2.0,
    max_tokens=384000,
    suitable_scenarios=["需求分析", "用例生成", "报告编写", "测试场景设计", "成本分析"],
    weight=0.70,
)

L2_DEEPSEEK_V4_PRO = ModelTierConfig(
    tier="L2",
    provider_name="deepseek-v4-pro",
    display_name="DeepSeek-V4-Pro",
    model_id="deepseek-v4-pro",
    input_price_per_m=12.0,
    output_price_per_m=24.0,
    max_tokens=384000,
    suitable_scenarios=["质量审计", "多轮辩论", "缺陷分析", "根因分析", "一致性校验"],
    weight=0.15,
)

L3_GLM5 = ModelTierConfig(
    tier="L3",
    provider_name="glm-5",
    display_name="GLM-5",
    model_id="glm-5",
    input_price_per_m=7.0,
    output_price_per_m=22.0,
    max_tokens=33000,
    suitable_scenarios=["测试计划生成", "架构设计", "结构化数据提取", "模板填充"],
    weight=0.08,
)

L4_QWEN3_MAX = ModelTierConfig(
    tier="L4",
    provider_name="qwen3-max",
    display_name="Qwen3-Max",
    model_id="qwen3-max",
    input_price_per_m=2.5,
    output_price_per_m=10.0,
    max_tokens=32000,
    suitable_scenarios=["架构评审", "重大缺陷判定", "仲裁决策", "最终质量评分"],
    weight=0.05,
)

L5_KIMI_K25 = ModelTierConfig(
    tier="L5",
    provider_name="kimi-k2.5",
    display_name="Kimi K2.5",
    model_id="kimi-k2.5",
    input_price_per_m=6.5,
    output_price_per_m=28.0,
    max_tokens=32000,
    suitable_scenarios=["长文档分析", "需求文档审查", "日志分析", "多模态理解"],
    weight=0.02,
)


# ==================== 注册表 ====================

ALL_TIERS: list[ModelTierConfig] = [
    L1_DEEPSEEK_V4_FLASH,
    L2_DEEPSEEK_V4_PRO,
    L3_GLM5,
    L4_QWEN3_MAX,
    L5_KIMI_K25,
]

TIER_BY_PROVIDER: dict[str, ModelTierConfig] = {
    cfg.provider_name: cfg for cfg in ALL_TIERS
}

TIER_BY_SCENARIO: dict[str, ModelTierConfig] = {}
for cfg in ALL_TIERS:
    for scenario in cfg.suitable_scenarios:
        TIER_BY_SCENARIO[scenario] = cfg

# L1 作为默认模型
DEFAULT_TIER = L1_DEEPSEEK_V4_FLASH


# ==================== 工具函数 ====================


def get_tier(provider_name: str) -> ModelTierConfig:
    """根据 provider 名称获取层级配置

    Args:
        provider_name: Provider 标识（如 "deepseek-v4-flash", "qwen3-max"）

    Returns:
        ModelTierConfig 对象，未找到时返回 L1 默认
    """
    return TIER_BY_PROVIDER.get(provider_name, DEFAULT_TIER)


def select_model_for_scenario(scenario: str) -> ModelTierConfig:
    """根据场景推荐最合适的模型层级

    Args:
        scenario: 场景名称（如 "需求分析", "质量审计"）

    Returns:
        推荐使用的 ModelTierConfig
    """
    return TIER_BY_SCENARIO.get(scenario, DEFAULT_TIER)


def calculate_cost(
    provider_name: str,
    prompt_tokens: int,
    completion_tokens: int,
) -> float:
    """计算指定模型的调用成本（人民币）

    Args:
        provider_name: Provider 标识
        prompt_tokens: 输入 Token 数
        completion_tokens: 输出 Token 数

    Returns:
        总成本（元）
    """
    tier = get_tier(provider_name)
    input_cost = (prompt_tokens / 1_000_000) * tier.input_price_per_m
    output_cost = (completion_tokens / 1_000_000) * tier.output_price_per_m
    return round(input_cost + output_cost, 6)


def estimate_cost(
    provider_name: str,
    estimated_prompt_chars: int = 1000,
    estimated_completion_chars: int = 500,
) -> float:
    """估算成本（基于中文字符数，1 字 ≈ 1.5 tokens）

    Args:
        provider_name: Provider 标识
        estimated_prompt_chars: 预估输入字符数
        estimated_completion_chars: 预估输出字符数

    Returns:
        预估成本（元）
    """
    prompt_tokens = int(estimated_prompt_chars * 1.5)
    completion_tokens = int(estimated_completion_chars * 1.5)
    return calculate_cost(provider_name, prompt_tokens, completion_tokens)


def get_all_tiers() -> list[dict]:
    """获取所有层级的配置摘要（用于前端展示）

    Returns:
        层级配置列表
    """
    return [
        {
            "tier": cfg.tier,
            "provider": cfg.provider_name,
            "name": cfg.display_name,
            "input_price": cfg.input_price_per_m,
            "output_price": cfg.output_price_per_m,
            "max_tokens": cfg.max_tokens,
            "scenarios": cfg.suitable_scenarios,
            "weight": cfg.weight,
        }
        for cfg in ALL_TIERS
    ]
