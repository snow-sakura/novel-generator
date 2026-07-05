"""小说生成管线：要素解析 → 大纲规划 → 逐章生成 → 文件存储"""
import json
import os
import re
import time
from datetime import datetime
from typing import AsyncGenerator, Optional

from app.database import SessionLocal
from app.models.novel import Novel
from app.llm.provider import LLMProvider
from app.services.prompts import (
    SYSTEM_PROMPT_PARSE,
    SYSTEM_PROMPT_OUTLINE,
    SYSTEM_PROMPT_CHAPTER,
    SYSTEM_PROMPT_TITLE,
)

NOVEL_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "novel")


def _log(msg: str):
    ts = datetime.now().strftime("%H:%M:%S.%f")[:12]
    print(f"  [{ts}] [生成管线] {msg}", flush=True)


def _ensure_novel_folder(title: str) -> str:
    """创建 novel/小说名/ 文件夹"""
    safe_title = re.sub(r'[\\/:*?"<>|]', "", title).strip() or "未命名小说"
    folder = os.path.join(NOVEL_DIR, safe_title)
    os.makedirs(folder, exist_ok=True)
    return folder


class GeneratorService:
    def __init__(self, llm: LLMProvider):
        self.llm = llm

    async def generate(
        self,
        seed_text: str,
        gender: str = "男频",
        genre: str = "都市脑洞",
        style: str = "轻松搞笑",
        word_count: int = 3000,
        per_chapter_min: int = 800,
        per_chapter_max: int = 2500,
        model_config: Optional[dict] = None,
    ) -> AsyncGenerator[dict, None]:
        start_time = time.time()
        novel_id = None
        novel_folder = None
        outline_data = None

        try:
            _log(f"开始生成 | {gender}/{genre}/{style} | 目标{word_count}字 | 每章{per_chapter_min}-{per_chapter_max}字")
            yield {"event": "log", "data": f"📝 开始生成 {gender}·{genre}·{style} 小说，目标{word_count}字..."}

            # ---- Step 1: 要素解析 ----
            yield {"event": "log", "data": "📝 正在分析故事要素..."}
            yield {"event": "parse", "data": "正在分析故事要素..."}
            story_elements = await self._parse_elements(seed_text)
            yield {"event": "log", "data": "✅ 要素分析完成"}
            yield {"event": "parse_done", "data": story_elements}

            # ---- Step 2: 大纲规划（含实时思考打印） ----
            yield {"event": "log", "data": "📐 正在规划章节大纲..."}
            yield {"event": "outline", "data": "正在思考章节结构..."}

            # 计算章节数
            avg_chapter_words = (per_chapter_min + per_chapter_max) // 2
            chapter_count = max(2, word_count // avg_chapter_words)

            _log(f"大纲规划 | 目标{word_count}字 | 每章{per_chapter_min}-{per_chapter_max}字 | 预计{chapter_count}章")
            yield {"event": "log", "data": f"📐 规划章节：目标{word_count}字，每章{per_chapter_min}-{per_chapter_max}字，预计{chapter_count}章"}

            chapters = await self._generate_outline(
                story_elements, gender, genre, style, word_count,
                per_chapter_min, per_chapter_max, chapter_count,
            )
            outline_data = chapters

            # 打印每章大纲概要（实时思考）
            for i, ch in enumerate(chapters):
                _log(f"  大纲 第{i+1}章: {ch.get('title', '?')} — {ch.get('summary', '')[:50]}...")
                yield {"event": "log", "data": f"  📋 第{i+1}章《{ch.get('title', '?')}》: {ch.get('summary', '')[:60]}..."}
                yield {"event": "outline_thinking", "data": {"index": i, "title": ch.get("title", ""), "summary": ch.get("summary", "")}}

            yield {"event": "log", "data": f"✅ 大纲规划完成：共 {len(chapters)} 章"}
            yield {"event": "outline_done", "data": chapters}

            # ---- Step 3: 逐章生成 ----
            yield {"event": "log", "data": f"✍️ 开始逐章生成（共 {len(chapters)} 章）..."}

            full_content_parts = []
            previous_summary = seed_text
            # 每章目标字数
            per_chapter_target = word_count // len(chapters)

            for i, chapter in enumerate(chapters):
                title = chapter.get("title", f"第{i+1}章")
                summary = chapter.get("summary", "")

                _log(f"  生成第{i+1}/{len(chapters)}章: 《{title}》 | 目标字数:{per_chapter_target}")
                yield {"event": "log", "data": f"  📖 第{i+1}章《{title}》开始生成（目标{per_chapter_target}字）..."}
                yield {"event": "chapter_start", "data": {"title": title, "index": i}}

                chapter_prompt = SYSTEM_PROMPT_CHAPTER.format(
                    gender=gender, genre=genre, style=style,
                    chapter_title=title, chapter_summary=summary,
                    previous_summary=previous_summary,
                    target_words=per_chapter_target,
                )

                chapter_content = ""
                async for chunk in self.llm.generate_stream(chapter_prompt):
                    chapter_content += chunk
                    yield {"event": "content", "data": chunk}

                chapter_content = _strip_leading_title(chapter_content, title)
                full_content_parts.append(f"## {title}\n\n{chapter_content.strip()}")
                previous_summary = f"上一章《{title}》概要：{chapter_content[:200]}..."

                actual_words = len(chapter_content)
                _log(f"  第{i+1}章完成: 《{title}》 | 实际字数:{actual_words}")
                yield {"event": "log", "data": f"  ✅ 第{i+1}章完成（{actual_words}字）"}
                yield {"event": "chapter_end", "data": {"title": title, "word_count": actual_words}}

            # ---- 合并全文 ----
            full_content = "\n\n".join(full_content_parts)
            yield {"event": "title", "data": "正在生成标题..."}
            yield {"event": "log", "data": "🏷️ 正在生成标题..."}
            final_title = await self._generate_title(full_content, gender, genre)

            actual_count = len(full_content)
            time_cost = time.time() - start_time
            _log(f"全部完成！标题:《{final_title}》 | 总字数:{actual_count} | 耗时:{time_cost:.1f}s")
            yield {"event": "log", "data": f"🎉 全部完成！标题《{final_title}》，总字数{actual_count}，耗时{time_cost:.1f}s"}

            # ---- 存储数据库 ----
            novel_id = self._save_to_db(
                title=final_title, seed_text=seed_text, gender=gender, genre=genre,
                style=style, word_count=word_count, per_chapter_min=per_chapter_min,
                per_chapter_max=per_chapter_max, actual_count=actual_count,
                content=full_content, chapters=json.dumps(chapters, ensure_ascii=False),
                outline=json.dumps({"chapters": chapters, "elements": story_elements}, ensure_ascii=False),
                model_used=f"{self.llm.__class__.__name__}",
                model_config=json.dumps(model_config or {}, ensure_ascii=False),
                time_cost=time_cost,
            )

            # ---- 导出到 novel/文件夹 ----
            novel_folder = _ensure_novel_folder(final_title)
            self._save_chapter_files(novel_folder, final_title, full_content_parts, chapters)
            self._save_outline_mindmap(novel_folder, final_title, chapters, story_elements, gender, genre, style)
            _log(f"文件已保存至: {novel_folder}")
            yield {"event": "log", "data": f"📁 文件已保存至 novel/{final_title}/"}

            yield {
                "event": "complete",
                "data": {
                    "novel_id": novel_id, "title": final_title,
                    "total_words": actual_count, "time_cost": round(time_cost, 2),
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
            return {"character": "未知角色", "time": "未知时间", "place": "未知地点", "cause": seed_text, "process": "待展开", "result": "待定"}

    async def _generate_outline(self, story_elements: dict, gender: str, genre: str, style: str, word_count: int,
                                 per_chapter_min: int, per_chapter_max: int, chapter_count: int) -> list:
        elements_str = json.dumps(story_elements, ensure_ascii=False, indent=2)
        chapter_words = (per_chapter_min + per_chapter_max) // 2
        prompt = SYSTEM_PROMPT_OUTLINE.format(
            gender=gender, genre=genre, style=style,
            word_count=word_count, chapter_words=chapter_words,
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
            return [{"title": f"第{i+1}章", "summary": "内容待展开"} for i in range(chapter_count)]

    async def _generate_title(self, content: str, gender: str, genre: str) -> str:
        preview = content[:500]
        prompt = f"{gender}频道{genre}题材小说开头：\n{preview}\n\n请为这篇小说起一个5-15字的吸引人标题："
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

    def _save_chapter_files(self, folder: str, title: str, content_parts: list, chapters: list):
        """逐章保存 TXT + 保存全文 TXT"""
        full_txt_lines = [f"《{title}》\n", "=" * 30 + "\n\n"]
        for i, (part, ch) in enumerate(zip(content_parts, chapters)):
            ch_title = ch.get("title", f"第{i+1}章")
            # 提取正文（去掉 "## 标题" 前缀）
            clean_text = re.sub(r"^## .+?\n\n", "", part, count=1).strip()
            chapter_filename = f"第{i+1}章 {ch_title}.txt"
            chapter_path = os.path.join(folder, chapter_filename)
            try:
                with open(chapter_path, "w", encoding="utf-8") as f:
                    f.write(f"《{title}》\n{ch_title}\n\n{clean_text}\n")
            except Exception as e:
                _log(f"  保存章节文件失败: {chapter_path} — {e}")
            # 收集全文
            full_txt_lines.append(f"## {ch_title}\n\n{clean_text}\n\n")

        # 保存全文
        full_path = os.path.join(folder, f"{title}.txt")
        try:
            with open(full_path, "w", encoding="utf-8") as f:
                f.write("".join(full_txt_lines))
        except Exception as e:
            _log(f"  保存全文失败: {full_path} — {e}")

    def _save_outline_mindmap(self, folder: str, title: str, chapters: list, elements: dict,
                               gender: str, genre: str, style: str):
        """保存大纲为思维导图格式"""
        lines = []
        lines.append(f"# 《{title}》创作大纲\n")
        lines.append(f"> {gender} · {genre} · {style}\n\n")
        lines.append("---\n\n")
        lines.append("## 故事要素\n\n")
        for key, val in elements.items():
            lines.append(f"- **{key}**: {val}\n")
        lines.append("\n## 章节大纲\n\n")
        for i, ch in enumerate(chapters):
            lines.append(f"### 第{i+1}章 {ch.get('title', '')}\n")
            lines.append(f"{ch.get('summary', '')}\n\n")

        # 思维导图缩进格式
        lines.append("\n---\n## 思维导图（缩进格式）\n\n")
        lines.append(f"- 《{title}》\n")
        for i, ch in enumerate(chapters):
            lines.append(f"  - 第{i+1}章 {ch.get('title', '')}\n")
            summary = ch.get('summary', '')
            if len(summary) > 30:
                summary = summary[:30] + "..."
            lines.append(f"    - {summary}\n")

        path = os.path.join(folder, "创作大纲.mm.md")
        try:
            with open(path, "w", encoding="utf-8") as f:
                f.write("".join(lines))
        except Exception as e:
            _log(f"  保存大纲失败: {path} — {e}")


def _strip_leading_title(content: str, title: str) -> str:
    lines = content.strip().split("\n")
    if lines:
        first = lines[0].strip()
        if re.match(r"^#{1,3}\s+", first):
            if title in first or re.search(r"第[一二三四五六七八九十\d]+章", first):
                lines = lines[1:]
    return "\n".join(lines).strip()
