"""小说生成管线：要素解析 → 大纲规划 → 逐章生成"""
import json
import time
import sys
from datetime import datetime
from typing import AsyncGenerator

from app.database import SessionLocal
from app.models.novel import Novel
from app.llm.provider import LLMProvider
from app.services.prompts import (
    SYSTEM_PROMPT_PARSE,
    SYSTEM_PROMPT_OUTLINE,
    SYSTEM_PROMPT_CHAPTER,
    SYSTEM_PROMPT_TITLE,
)


def _log(msg: str):
    """打印带时间戳的后端日志到终端"""
    ts = datetime.now().strftime("%H:%M:%S.%f")[:12]
    print(f"  [{ts}] [生成管线] {msg}", flush=True)


class GeneratorService:
    """小说生成服务"""

    def __init__(self, llm: LLMProvider):
        self.llm = llm

    async def generate(
        self,
        seed_text: str,
        genre: str,
        style: str,
        word_count: int,
    ) -> AsyncGenerator[dict, None]:
        """
        三步生成管线，通过 yield 逐阶段返回事件
        事件类型: parse / outline / chapter_start / content / chapter_end / complete / error / log
        """
        start_time = time.time()
        novel_id = None

        try:
            # ---- Step 1: 要素解析 ----
            _log(f"Step 1/3: 开始分析故事要素 | 种子句: {seed_text[:30]}...")
            yield {"event": "log", "data": "📝 正在分析故事要素..."}
            yield {"event": "parse", "data": "正在分析故事要素..."}
            story_elements = await self._parse_elements(seed_text)
            _log(f"Step 1/3: 要素分析完成 | 角色: {story_elements.get('character', '?')[:20]}")
            yield {"event": "log", "data": "✅ 要素分析完成"}
            yield {"event": "parse_done", "data": story_elements}

            # ---- Step 2: 大纲规划 ----
            _log(f"Step 2/3: 开始规划大纲 | 目标字数: {word_count}")
            yield {"event": "log", "data": "📐 正在规划章节大纲..."}
            yield {"event": "outline", "data": "正在规划章节大纲..."}
            chapters = await self._generate_outline(story_elements, genre, style, word_count)
            _log(f"Step 2/3: 大纲规划完成 | 共 {len(chapters)} 章")
            yield {"event": "log", "data": f"✅ 大纲规划完成：共 {len(chapters)} 章"}
            yield {"event": "outline_done", "data": chapters}

            # ---- Step 3: 逐章生成 ----
            _log(f"Step 3/3: 开始逐章生成 | 共 {len(chapters)} 章")
            yield {"event": "log", "data": f"✍️ 开始逐章生成（共 {len(chapters)} 章）..."}

            full_content_parts = []
            previous_summary = seed_text
            per_chapter_words = max(800, word_count // len(chapters))

            for i, chapter in enumerate(chapters):
                title = chapter.get("title", f"第{i+1}章")
                summary = chapter.get("summary", "")

                _log(f"  生成第 {i+1}/{len(chapters)} 章: 《{title}》 | 目标字数: {per_chapter_words}")
                yield {"event": "log", "data": f"  📖 第 {i+1} 章《{title}》开始生成..."}
                yield {"event": "chapter_start", "data": {"title": title, "index": i}}

                chapter_prompt = SYSTEM_PROMPT_CHAPTER.format(
                    genre=genre,
                    style=style,
                    chapter_title=title,
                    chapter_summary=summary,
                    previous_summary=previous_summary,
                    target_words=per_chapter_words,
                )

                chapter_content = ""
                chunk_count = 0
                async for chunk in self.llm.generate_stream(chapter_prompt):
                    chapter_content += chunk
                    chunk_count += 1
                    yield {"event": "content", "data": chunk}

                # 清理 LLM 输出中可能重复的章节标题
                chapter_content = _strip_leading_title(chapter_content, title)

                full_content_parts.append(f"## {title}\n\n{chapter_content.strip()}")
                previous_summary = f"上一章《{title}》内容概要：{chapter_content[:200]}..."

                actual_chapter_words = len(chapter_content)
                _log(f"  第 {i+1} 章完成: 《{title}》 | 实际字数: {actual_chapter_words}")
                yield {"event": "log", "data": f"  ✅ 第 {i+1} 章完成（{actual_chapter_words} 字）"}
                yield {"event": "chapter_end", "data": {"title": title, "word_count": actual_chapter_words}}

            # ---- 合并全文 ----
            full_content = "\n\n".join(full_content_parts)
            _log("全文合并完成，开始生成标题")

            # ---- 生成标题 ----
            yield {"event": "log", "data": "🏷️ 正在生成标题..."}
            yield {"event": "title", "data": "正在生成标题..."}
            title = await self._generate_title(full_content, genre)

            actual_count = len(full_content)
            time_cost = time.time() - start_time
            _log(f"全部完成！标题: 《{title}》 | 总字数: {actual_count} | 耗时: {time_cost:.1f}s")
            yield {"event": "log", "data": f"🎉 全部完成！总字数 {actual_count}，耗时 {time_cost:.1f}s"}

            # ---- 存入数据库 ----
            novel_id = self._save_to_db(
                title=title,
                seed_text=seed_text,
                genre=genre,
                style=style,
                word_count=word_count,
                actual_count=actual_count,
                content=full_content,
                chapters=json.dumps(chapters, ensure_ascii=False),
                model_used=f"{self.llm.__class__.__name__}",
                time_cost=time_cost,
            )

            yield {
                "event": "complete",
                "data": {
                    "novel_id": novel_id,
                    "title": title,
                    "total_words": actual_count,
                    "time_cost": round(time_cost, 2),
                },
            }

        except Exception as e:
            _log(f"❌ 生成失败: {str(e)}")
            yield {"event": "error", "data": {"message": str(e)}}
            if novel_id:
                db = SessionLocal()
                try:
                    novel = db.query(Novel).filter(Novel.id == novel_id).first()
                    if novel:
                        novel.content = f"[生成失败] {str(e)}"
                        db.commit()
                finally:
                    db.close()

    async def _parse_elements(self, seed_text: str) -> dict:
        result = ""
        async for chunk in self.llm.generate_stream(seed_text, SYSTEM_PROMPT_PARSE):
            result += chunk
        try:
            start = result.index("{")
            end = result.rindex("}") + 1
            return json.loads(result[start:end])
        except (ValueError, json.JSONDecodeError):
            return {
                "character": "未知角色",
                "time": "未知时间",
                "place": "未知地点",
                "cause": seed_text,
                "process": "待展开",
                "result": "待定",
            }

    async def _generate_outline(self, story_elements: dict, genre: str, style: str, word_count: int) -> list:
        elements_str = json.dumps(story_elements, ensure_ascii=False, indent=2)
        prompt = SYSTEM_PROMPT_OUTLINE.format(
            genre=genre,
            style=style,
            word_count=word_count,
            story_elements=elements_str,
        )
        result = ""
        async for chunk in self.llm.generate_stream(prompt):
            result += chunk
        try:
            start = result.index("[")
            end = result.rindex("]") + 1
            return json.loads(result[start:end])
        except (ValueError, json.JSONDecodeError):
            chapter_count = max(3, word_count // 1500)
            return [
                {"title": f"第{i+1}章", "summary": "内容待展开"}
                for i in range(chapter_count)
            ]

    async def _generate_title(self, content: str, genre: str) -> str:
        preview = content[:500]
        prompt = f"小说题材：{genre}\n小说开头：{preview}\n\n请为这篇小说起一个吸引人的标题："
        result = ""
        async for chunk in self.llm.generate_stream(prompt, SYSTEM_PROMPT_TITLE):
            result += chunk
        return result.strip() or "未命名小说"

    def _save_to_db(self, **kwargs) -> int:
        db = SessionLocal()
        try:
            novel = Novel(**kwargs)
            db.add(novel)
            db.commit()
            db.refresh(novel)
            return novel.id
        finally:
            db.close()


def _strip_leading_title(content: str, title: str) -> str:
    """清理 LLM 输出中可能重复的章节标题"""
    import re
    lines = content.strip().split("\n")
    # 如果第一行是 markdown 标题且包含章节标题关键词，去掉
    if lines:
        first = lines[0].strip()
        # 匹配 # 或 ## 开头的标题行
        if re.match(r"^#{1,3}\s+", first):
            # 检查是否包含当前章节标题或是"第X章"格式
            if title in first or re.search(r"第[一二三四五六七八九十\d]+章", first):
                lines = lines[1:]
    return "\n".join(lines).strip()
