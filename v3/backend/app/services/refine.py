"""段落润色服务 — 支持重写/扩写/精简，SSE 流式返回"""
import json
from typing import AsyncGenerator, Optional

from app.llm.provider import LLMProvider


REFINE_PROMPTS = {
    "rewrite": """你是一位专业的小说编辑。请重新撰写以下段落，保持核心内容不变，但使用不同的表达方式使其更生动。

原文：
{original_content}

上下文（前一段落）：
{context}

要求：
- 保持原文的核心情节和信息不变
- 使用不同的句式和词汇重新表达
- 保持{style}风格
- 叙事视角：{pov}，节奏：{pacing}，风格强度：{style_intensity}
- 字数与原文相近（±20%）
- 输出 Markdown 格式，不要包含标题""",

    "expand": """你是一位专业的小说编辑。请扩写以下段落，增加更多细节描写，使其更加丰富饱满。

原文：
{original_content}

上下文（前一段落）：
{context}

要求：
- 在保持原文核心情节的基础上，增加环境描写、心理活动、对话细节
- 扩展后字数约为原文的 1.5-2 倍
- 保持{style}风格
- 叙事视角：{pov}，节奏：{pacing}，风格强度：{style_intensity}
- 细节要具体、有画面感
- 输出 Markdown 格式，不要包含标题""",

    "insert_quote": """你是一位擅长提炼金句的小说作家。根据以下段落和上下文，创作一句富有哲理、能引发共鸣的金句。

原文：
{original_content}

上下文（前一段落）：
{context}

要求：
- 金句必须与当前情节密切相关，深化主题或触动情感
- 语言优美、简洁有力，15-30 字为佳
- 使用比喻、对比、排比等修辞手法增强文学性
- 输出格式：> *金句内容*
- 只输出金句本身，不要额外内容
- 保持{style}风格""",

    "compress": """你是一位专业的小说编辑。请精简以下段落，压缩冗余内容，保留核心情节。

原文：
{original_content}

上下文（前一段落）：
{context}

要求：
- 删除冗余描写，保留核心情节和关键信息
- 精简后字数约为原文的 50-70%
- 保持{style}风格
- 叙事视角：{pov}，节奏：{pacing}，风格强度：{style_intensity}
- 节奏紧凑，语言精炼
- 输出 Markdown 格式，不要包含标题""",
}


class RefineService:
    def __init__(self, llm: LLMProvider):
        self.llm = llm

    async def refine_stream(
        self,
        action: str,
        original_content: str,
        context: str = "",
        style: str = "轻松搞笑",
        pov: str = "第三人称有限",
        pacing: str = "标准型",
        style_intensity: str = "中度",
    ) -> AsyncGenerator[str, None]:
        """流式润色段落"""
        prompt_tpl = REFINE_PROMPTS.get(action, REFINE_PROMPTS["rewrite"])
        prompt = prompt_tpl.format(
            original_content=original_content,
            context=context or "（无前文）",
            style=style,
            pov=pov,
            pacing=pacing,
            style_intensity=style_intensity,
        )

        async for chunk in self.llm.generate_stream(prompt):
            yield chunk
