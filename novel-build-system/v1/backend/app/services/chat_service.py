"""AI 对话生成服务 — 将小说生成管线包装为对话式交互"""

import json
import re
from typing import AsyncGenerator

from app.llm.provider import LLMProvider
from app.services.generator import GeneratorService


class ChatService:
    def __init__(self, llm: LLMProvider):
        self.llm = llm
        self.generator = GeneratorService(llm)

    async def generate(
        self,
        message: str,
        gender: str = "男频",
        genre: str = "都市脑洞",
        style: str = "轻松搞笑",
        word_count: int = 3000,
        chapter_count: int = None,
        per_chapter_min: int = 800,
        per_chapter_max: int = 2500,
        record_id: int = None,
    ) -> AsyncGenerator[dict, None]:
        """对话式生成：复用核心管线，将生成步骤透传为聊天事件

        前端在 ChatOptionSelector 中已选择频道/题材/风格/章节数/每章字数，
        后端仅在这些参数缺失时用意图分析兜底推断。
        """
        try:
            if record_id:
                yield {"event": "record_id", "data": record_id}

            # 仅当用户未在选项器中选择时，才用 LLM 推断参数
            if not (gender and genre and style and word_count):
                intent = await self._analyze_intent(message)
                if intent.get("gender"):
                    gender = intent["gender"]
                if intent.get("genre"):
                    genre = intent["genre"]
                if intent.get("style"):
                    style = intent["style"]
                if intent.get("word_count"):
                    word_count = intent["word_count"]

            if chapter_count is None:
                chapter_count = max(2, word_count // 2000)

            # 透传 generator 的全部事件，结构与主生成管线完全一致
            async for event in self.generator.generate(
                seed_text=message,
                gender=gender,
                genre=genre,
                style=style,
                word_count=word_count,
                chapter_count=chapter_count,
                per_chapter_min=per_chapter_min,
                per_chapter_max=per_chapter_max,
                record_id=record_id,
            ):
                yield event

        except Exception as e:
            yield {"event": "error", "data": {"message": str(e)}}

    async def _analyze_intent(self, message: str) -> dict:
        """分析用户消息，推断频道/题材/风格/字数"""
        prompt = f"""分析以下用户输入，推断最合适的小说创作参数。

用户输入：{message}

请只输出 JSON，包含：
- gender: "男频" 或 "女频"
- genre: 最匹配的题材（如都市脑洞、玄幻脑洞、古代言情、现代言情...）
- style: 最匹配的风格（如轻松搞笑、热血燃系、悬疑烧脑...）
- word_count: 预估需要的小说字数（500-500000）
- elements: 从输入中提取的故事要素
  - protagonist: 主角描述
  - time_era: 时代背景
  - locations: 场景
  - conflict_type: 冲突类型
  - inciting_incident: 激励事件
  - world_tone: 世界观基调

JSON："""
        result = ""
        async for chunk in self.llm.generate_stream(prompt):
            result += chunk
        try:
            start = result.index("{")
            end = result.rindex("}") + 1
            return json.loads(result[start:end])
        except (ValueError, json.JSONDecodeError):
            return {
                "gender": "男频",
                "genre": "都市脑洞",
                "style": "轻松搞笑",
                "word_count": 3000,
                "elements": {},
            }
