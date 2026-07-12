"""AI 配图服务 (F11) — 视觉描述提取 + 图片生成"""
from datetime import datetime
from typing import Optional

from app.llm.provider import LLMProvider
from app.services.prompts import ILLUSTRATION_PROMPT

# 免费图片生成 API（无需 API key）
POLLINATIONS_URL = "https://image.pollinations.ai/prompt/{prompt}"


async def _extract_prompt(llm: LLMProvider, chapter_text: str) -> str:
    """用 LLM 从章节文本提取视觉提示词"""
    text = chapter_text[:2000]
    prompt = ILLUSTRATION_PROMPT.replace("{chapter_text}", text)
    result = ""
    try:
        async for chunk in llm.generate_stream(prompt):
            result += chunk
    except Exception:
        return ""
    return result.strip() or ""


async def _generate_image_url(prompt: str) -> Optional[str]:
    """通过 Pollinations 免费 API 生成图片，返回图片 URL"""
    if not prompt:
        return None
    import urllib.parse
    encoded = urllib.parse.quote(prompt[:500])
    return POLLINATIONS_URL.format(prompt=encoded)


async def generate_illustration(
    llm: LLMProvider,
    chapter_text: str,
    chapter_index: int,
    style: str = "写实插画",
) -> dict:
    """为章节生成配图，返回 {chapter_index, prompt, url, generated_at}"""
    prompt = await _extract_prompt(llm, chapter_text)
    if not prompt:
        prompt = f"A scene from a {style} novel chapter {chapter_index + 1}"
    url = await _generate_image_url(prompt)
    return {
        "chapter_index": chapter_index,
        "prompt": prompt,
        "url": url or "",
        "generated_at": datetime.now().isoformat(),
    }
