"""小说生成管线：要素解析 → 大纲规划 → 逐章生成 → 文件存储"""
import json
import os
import re
import time
from datetime import datetime
from typing import AsyncGenerator, Optional

from app.database import SessionLocal
from app.models.novel import Novel
from app.models.generation_record import GenerationRecord
from app.llm.provider import LLMProvider
from app.services.prompts import (
    SYSTEM_PROMPT_PARSE,
    SYSTEM_PROMPT_OUTLINE,
    SYSTEM_PROMPT_CHAPTER,
    SYSTEM_PROMPT_TITLE,
)
from app.services.xmind import generate_xmind

NOVEL_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "..", "doc", "novel")


def _log(msg: str):
    ts = datetime.now().strftime("%H:%M:%S.%f")[:12]
    print(f"  [{ts}] [生成管线] {msg}", flush=True)


def _ensure_novel_folder(title: str) -> str:
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
        chapter_count: Optional[int] = None,
        per_chapter_min: int = 800,
        per_chapter_max: int = 2500,
        model_config: Optional[dict] = None,
        custom_prompts: Optional[dict] = None,
        record_id: Optional[int] = None,
        # 继续生成参数
        continuation: Optional[dict] = None,
    ) -> AsyncGenerator[dict, None]:
        """生成小说全流程

        关键设计：逐章保存到 DB + 逐章保存文件，
        确保任何一步失败都不会丢失已生成的内容。
        """
        start_time = time.time()
        novel_id = None
        novel_folder = None
        outline_data = None

        # 继续模式下，从 continuation 中提取已有状态
        existing_content = ""
        existing_parts = []
        start_from_chapter = 0
        if continuation:
            existing_content = continuation.get("content", "")
            existing_parts = continuation.get("parts", [])
            start_from_chapter = continuation.get("start_from", 0)
            novel_id = continuation.get("novel_id")

        try:
            if record_id:
                yield {"event": "record_id", "data": record_id}

            yield {"event": "log", "data": f"📝 开始生成 {gender}·{genre}·{style} 小说，目标{word_count}字..."
                   + (f"（接续第{start_from_chapter + 1}章）" if start_from_chapter > 0 else "")}

            if custom_prompts:
                _log(f"使用自定义提示词覆盖: {list(custom_prompts.keys())}")

            parse_prompt = (custom_prompts or {}).get("parse") or SYSTEM_PROMPT_PARSE
            outline_prompt = (custom_prompts or {}).get("outline") or SYSTEM_PROMPT_OUTLINE
            chapter_prompt_tpl = (custom_prompts or {}).get("chapter") or SYSTEM_PROMPT_CHAPTER
            title_prompt = (custom_prompts or {}).get("title") or SYSTEM_PROMPT_TITLE

            # ---- Step 1: 要素解析 ----
            if start_from_chapter == 0:
                yield {"event": "log", "data": "📝 正在分析故事要素..."}
                yield {"event": "parse", "data": "正在分析故事要素..."}
                story_elements = await self._parse_elements(seed_text, parse_prompt)
                yield {"event": "log", "data": "✅ 要素分析完成"}
                yield {"event": "parse_done", "data": story_elements}

                # ---- Step 2: 大纲规划 ----
                yield {"event": "log", "data": "📐 正在规划章节大纲..."}
                yield {"event": "outline", "data": "正在思考章节结构..."}

                if chapter_count is None:
                    avg_chapter_words = (per_chapter_min + per_chapter_max) // 2
                    chapter_count = max(2, word_count // avg_chapter_words)
                chapter_count = max(1, min(200, chapter_count))

                yield {"event": "log", "data": f"📐 规划章节：目标{word_count}字，每章{per_chapter_min}-{per_chapter_max}字，预计{chapter_count}章"}

                chapters = await self._generate_outline(
                    story_elements, gender, genre, style, word_count,
                    per_chapter_min, per_chapter_max, chapter_count,
                    prompt_tpl=outline_prompt,
                )
                outline_data = chapters

                for i, ch in enumerate(chapters):
                    _log(f"  大纲 第{i+1}章: {ch.get('title', '?')} — {ch.get('summary', '')[:50]}...")
                    yield {"event": "log", "data": f"  📋 第{i+1}章《{ch.get('title', '?')}》: {ch.get('summary', '')[:60]}..."}
                    yield {"event": "outline_thinking", "data": {"index": i, "title": ch.get("title", ""), "summary": ch.get("summary", "")}}

                yield {"event": "log", "data": f"✅ 大纲规划完成：共 {len(chapters)} 章"}
                yield {"event": "outline_done", "data": chapters}
            else:
                # 继续模式：从 continuation 中加载大纲
                story_elements = continuation.get("elements", {})
                chapters = continuation.get("chapters", [])
                chapter_count = len(chapters)
                yield {"event": "log", "data": f"📐 继续生成：已有 {start_from_chapter}/{chapter_count} 章，跳过解析和大纲"}

            # ---- 提前创建 novel 记录（空内容） ----
            tmp_title = "生成中..."
            if not novel_id:
                novel_id = self._save_to_db(
                    title=tmp_title, seed_text=seed_text, gender=gender, genre=genre,
                    style=style, word_count=word_count, per_chapter_min=per_chapter_min,
                    per_chapter_max=per_chapter_max, actual_count=0,
                    content="", chapters=json.dumps(chapters, ensure_ascii=False),
                    outline=json.dumps({"chapters": chapters, "elements": story_elements}, ensure_ascii=False),
                    model_used=f"{self.llm.__class__.__name__}",
                    model_config=json.dumps(model_config or {}, ensure_ascii=False),
                    time_cost=0,
                )
            else:
                # 继续模式：使用已有 novel_id，更新大纲
                self._update_novel_outline(novel_id, chapters, story_elements)

            # ---- Step 3: 逐章生成（逐章持久化） ----
            yield {"event": "log", "data": f"✍️ 开始逐章生成（共 {len(chapters)} 章）..."
                   + (f"，从第{start_from_chapter + 1}章继续" if start_from_chapter > 0 else "")}

            full_content_parts = list(existing_parts)
            previous_summary = seed_text
            if existing_parts:
                # 从已有最后一段恢复 previous_summary
                last_part = existing_parts[-1]
                last_clean = re.sub(r"^## .+?\n\n", "", last_part, count=1).strip()
                previous_summary = f"上一章概要：{last_clean[:200]}..."

            per_chapter_target = word_count // len(chapters)

            # 先保存大纲和思维导图到 doc/（立即写入，即使后续失败）
            novel_folder = _ensure_novel_folder(tmp_title)
            self._save_outline_mindmap(novel_folder, f"{'生成中' if start_from_chapter == 0 else '继续生成'}",
                                       chapters, story_elements, gender, genre, style)

            chapter_states = []  # 每章状态跟踪

            for i, chapter in enumerate(chapters):
                # 跳过已完成的章节
                if i < start_from_chapter:
                    continue

                title = chapter.get("title", f"第{i+1}章")
                summary = chapter.get("summary", "")

                # 记录当前章节"生成中"状态
                now_ts = datetime.now().isoformat()
                chapter_states.append({
                    "index": i,
                    "title": title,
                    "status": "generating",
                    "start_time": now_ts,
                })

                _log(f"  生成第{i+1}/{len(chapters)}章: 《{title}》 | 目标字数:{per_chapter_target}")
                yield {"event": "log", "data": f"  📖 第{i+1}章《{title}》开始生成..."}
                yield {"event": "chapter_start", "data": {"title": title, "index": i, "start_time": now_ts}}

                chapter_prompt = chapter_prompt_tpl.format(
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
                # 记录当前章节"已完成"状态
                end_ts = datetime.now().isoformat()
                if chapter_states:
                    chapter_states[-1]["status"] = "completed"
                    chapter_states[-1]["end_time"] = end_ts

                _log(f"  第{i+1}章完成: 《{title}》 | 实际字数:{actual_words}")
                yield {"event": "log", "data": f"  ✅ 第{i+1}章完成（{actual_words}字）"}
                yield {"event": "chapter_end", "data": {"title": title, "word_count": actual_words, "end_time": end_ts}}

                # === 逐章持久化 ===
                full_so_far = "\n\n".join(full_content_parts)

                # 1. 更新 DB
                self._update_novel_content(novel_id, full_so_far, chapters)
                # 2. 保存章节 TXT 文件
                self._save_single_chapter_file(novel_folder, title, i, chapter_content, chapters)
                # 3. 更新生成记录（含每章状态）
                if record_id:
                    self._update_record_progress(record_id, i + 1, len(chapters), full_so_far,
                                                 chapter_states=chapter_states)

            # ---- 合并全文 ----
            full_content = "\n\n".join(full_content_parts)
            yield {"event": "title", "data": "正在生成标题..."}
            yield {"event": "log", "data": "🏷️ 正在生成标题..."}
            final_title = await self._generate_title(full_content, gender, genre, title_prompt)

            actual_count = len(full_content)
            time_cost = time.time() - start_time

            # ---- 最终更新 DB（标题 + 完整内容） ----
            self._finalize_novel(novel_id, final_title, full_content, chapters, story_elements,
                                 seed_text, gender, genre, style, word_count,
                                 per_chapter_min, per_chapter_max, actual_count,
                                 model_config, time_cost)
            # ---- 最终文件保存 ----
            self._save_full_txt(novel_folder, final_title, full_content_parts)

            # 重命名 doc 文件夹
            old_folder = novel_folder
            novel_folder = _ensure_novel_folder(final_title)
            if old_folder != novel_folder and os.path.exists(old_folder):
                try:
                    os.renames(old_folder, novel_folder)
                except Exception:
                    pass
            # 用最终标题重新保存大纲 MD + XMind
            self._save_outline_mindmap(novel_folder, final_title, chapters, story_elements, gender, genre, style)
            # 删除残留的「生成中」临时文件
            for fname in os.listdir(novel_folder):
                if fname.startswith("生成中") and (fname.endswith(".xmind") or fname.endswith(".md")):
                    try:
                        os.remove(os.path.join(novel_folder, fname))
                    except Exception:
                        pass

            _log(f"全部完成！标题:《{final_title}》 | 总字数:{actual_count} | 耗时:{time_cost:.1f}s")
            yield {"event": "log", "data": f"🎉 全部完成！标题《{final_title}》，总字数{actual_count}，耗时{time_cost:.1f}s"}
            yield {"event": "log", "data": f"📁 文件已保存至 doc/{final_title}/"}

            yield {
                "event": "complete",
                "data": {
                    "novel_id": novel_id, "title": final_title,
                    "total_words": actual_count, "time_cost": round(time_cost, 2),
                },
            }
            if record_id:
                self._update_record_complete(record_id, novel_id, chapter_states=chapter_states)

        except Exception as e:
            _log(f"❌ 生成失败: {str(e)}")
            yield {"event": "error", "data": {"message": str(e)}}
            if record_id:
                cs = locals().get('chapter_states')
                self._update_record_error(record_id, str(e), chapter_states=cs)
            # 即使失败，novel 已存在于 DB（带部分内容）
            if novel_id:
                self._mark_novel_failed(novel_id, str(e))

    # ── 数据库持久化方法 ──

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

    def _update_novel_content(self, novel_id: int, content: str, chapters: list):
        """逐章更新小说内容（增量保存）"""
        db = SessionLocal()
        try:
            novel = db.query(Novel).filter(Novel.id == novel_id).first()
            if novel:
                novel.content = content
                novel.chapters = json.dumps(chapters, ensure_ascii=False)
                novel.actual_count = len(content)
                novel.updated_at = datetime.now() if hasattr(novel, 'updated_at') else novel.created_at
                db.commit()
        finally:
            db.close()

    def _update_novel_outline(self, novel_id: int, chapters: list, elements: dict):
        """更新小说大纲"""
        db = SessionLocal()
        try:
            novel = db.query(Novel).filter(Novel.id == novel_id).first()
            if novel:
                novel.outline = json.dumps({"chapters": chapters, "elements": elements}, ensure_ascii=False)
                db.commit()
        finally:
            db.close()

    def _finalize_novel(self, novel_id: int, title: str, content: str, chapters: list, elements: dict,
                         seed_text: str, gender: str, genre: str, style: str,
                         word_count: int, per_chapter_min: int, per_chapter_max: int,
                         actual_count: int, model_config: Optional[dict], time_cost: float):
        """最终完成时更新小说的完整信息"""
        db = SessionLocal()
        try:
            novel = db.query(Novel).filter(Novel.id == novel_id).first()
            if novel:
                novel.title = title
                novel.content = content
                novel.actual_count = actual_count
                novel.chapters = json.dumps(chapters, ensure_ascii=False)
                novel.outline = json.dumps({"chapters": chapters, "elements": elements}, ensure_ascii=False)
                novel.time_cost = time_cost
                novel.updated_at = datetime.now() if hasattr(novel, 'updated_at') else novel.created_at
                db.commit()
        finally:
            db.close()

    def _mark_novel_failed(self, novel_id: int, error: str):
        """标记小说生成为失败状态（保留已生成的部分内容）"""
        db = SessionLocal()
        try:
            novel = db.query(Novel).filter(Novel.id == novel_id).first()
            if novel:
                novel.title = novel.title + " [生成中断]" if novel.title != "生成中..." else "生成中断"
                db.commit()
        finally:
            db.close()

    # ── 文件保存方法（逐章） ──

    def _save_single_chapter_file(self, folder: str, title: str, index: int, content: str, chapters: list):
        """保存单章 TXT 文件"""
        ch_title = chapters[index].get("title", f"第{index+1}章")
        clean_text = re.sub(r"^## .+?\n\n", "", f"## {title}\n\n{content}", count=1).strip()
        chapter_filename = f"第{index+1}章 {ch_title}.txt"
        chapter_path = os.path.join(folder, chapter_filename)
        try:
            with open(chapter_path, "w", encoding="utf-8") as f:
                f.write(f"{ch_title}\n\n{clean_text}\n")
        except Exception as e:
            _log(f"  保存章节文件失败: {chapter_path} — {e}")

    def _save_full_txt(self, folder: str, title: str, content_parts: list):
        """保存全文 TXT"""
        full_path = os.path.join(folder, f"{title}.txt")
        try:
            with open(full_path, "w", encoding="utf-8") as f:
                f.write(f"《{title}》\n{'=' * 30}\n\n")
                for part in content_parts:
                    clean_text = re.sub(r"^## .+?\n\n", "", part, count=1).strip()
                    f.write(f"{clean_text}\n\n")
        except Exception as e:
            _log(f"  保存全文失败: {full_path} — {e}")

    def _save_outline_mindmap(self, folder: str, title: str, chapters: list, elements: dict,
                               gender: str, genre: str, style: str):
        """保存大纲 Markdown + XMind"""
        safe_title = re.sub(r'[\\/:*?"<>|]', "", title).strip() or "未命名小说"

        md_lines = [f"# 《{title}》创作大纲\n", f"> {gender} · {genre} · {style}\n\n", "---\n\n## 故事要素\n\n"]
        for key, val in elements.items():
            md_lines.append(f"- **{key}**: {val}\n")
        md_lines.append("\n## 章节大纲\n\n")
        for i, ch in enumerate(chapters):
            md_lines.append(f"### 第{i+1}章 {ch.get('title', '')}\n")
            md_lines.append(f"{ch.get('summary', '')}\n\n")

        md_path = os.path.join(folder, f"{safe_title} 大纲.md")
        try:
            with open(md_path, "w", encoding="utf-8") as f:
                f.write("".join(md_lines))
            _log(f"  大纲 Markdown 已保存: {md_path}")
        except Exception as e:
            _log(f"  保存大纲 Markdown 失败: {md_path} — {e}")

        try:
            xmind_bytes = generate_xmind(title, chapters)
            xmind_path = os.path.join(folder, f"{safe_title} 大纲.xmind")
            with open(xmind_path, "wb") as f:
                f.write(xmind_bytes)
            _log(f"  大纲 XMind 已保存: {xmind_path}")
        except Exception as e:
            _log(f"  保存大纲 XMind 失败: {xmind_path} — {e}")

    # ── 生成记录辅助方法 ──

    def _save_thinking_log(self, record_id: int, log_entry: str):
        """保存一条生成日志到记录"""
        import json
        db = SessionLocal()
        try:
            rec = db.query(GenerationRecord).filter(GenerationRecord.id == record_id).first()
            if rec:
                logs = json.loads(rec.thinking_logs) if rec.thinking_logs else []
                logs.append(log_entry)
                rec.thinking_logs = json.dumps(logs, ensure_ascii=False)
                db.commit()
        finally:
            db.close()

    def _update_record_progress(self, record_id: int, completed: int, total: int, content: str,
                                 thinking_logs: list = None, chapter_states: list = None):
        db = SessionLocal()
        try:
            rec = db.query(GenerationRecord).filter(GenerationRecord.id == record_id).first()
            if rec:
                rec.completed_chapters = completed
                rec.total_chapters = total
                rec.content_sofar = content[-50000:]
                if thinking_logs:
                    rec.thinking_logs = json.dumps(thinking_logs, ensure_ascii=False)
                if chapter_states:
                    rec.chapter_states = json.dumps(chapter_states, ensure_ascii=False)
                rec.updated_at = datetime.now()
                db.commit()
        finally:
            db.close()

    def _update_record_error(self, record_id: int, error: str, thinking_logs: list = None,
                              chapter_states: list = None):
        db = SessionLocal()
        try:
            rec = db.query(GenerationRecord).filter(GenerationRecord.id == record_id).first()
            if rec:
                rec.status = "failed"
                rec.error_message = error
                if thinking_logs:
                    rec.thinking_logs = json.dumps(thinking_logs, ensure_ascii=False)
                if chapter_states:
                    rec.chapter_states = json.dumps(chapter_states, ensure_ascii=False)
                rec.updated_at = datetime.now()
                db.commit()
        finally:
            db.close()

    def _update_record_complete(self, record_id: int, novel_id: int, thinking_logs: list = None,
                                 chapter_states: list = None):
        db = SessionLocal()
        try:
            rec = db.query(GenerationRecord).filter(GenerationRecord.id == record_id).first()
            if rec:
                rec.status = "completed"
                rec.novel_id = novel_id
                rec.chapter_states = json.dumps(chapter_states, ensure_ascii=False) if chapter_states else rec.chapter_states
                if thinking_logs:
                    rec.thinking_logs = json.dumps(thinking_logs, ensure_ascii=False)
                rec.updated_at = datetime.now()
                db.commit()
        finally:
            db.close()

    # ── LLM 调用方法 ──

    async def _parse_elements(self, seed_text: str, prompt_tpl: str = SYSTEM_PROMPT_PARSE) -> dict:
        result = ""
        async for chunk in self.llm.generate_stream(seed_text, prompt_tpl):
            result += chunk
        try:
            start = result.index("{")
            end = result.rindex("}") + 1
            return json.loads(result[start:end])
        except (ValueError, json.JSONDecodeError):
            return {"character": "未知角色", "time": "未知时间", "place": "未知地点", "cause": seed_text, "process": "待展开", "result": "待定"}

    async def _generate_outline(self, story_elements: dict, gender: str, genre: str, style: str, word_count: int,
                                 per_chapter_min: int, per_chapter_max: int, chapter_count: int,
                                 prompt_tpl: str = SYSTEM_PROMPT_OUTLINE) -> list:
        elements_str = json.dumps(story_elements, ensure_ascii=False, indent=2)
        chapter_words = (per_chapter_min + per_chapter_max) // 2
        prompt = prompt_tpl.format(
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

    async def _generate_title(self, content: str, gender: str, genre: str,
                               prompt_tpl: str = SYSTEM_PROMPT_TITLE) -> str:
        preview = content[:500]
        prompt = f"{gender}频道{genre}题材小说开头：\n{preview}\n\n请为这篇小说起一个5-15字的吸引人标题："
        result = ""
        async for chunk in self.llm.generate_stream(prompt, prompt_tpl):
            result += chunk
        return result.strip() or "未命名小说"


def _strip_leading_title(content: str, title: str) -> str:
    lines = content.strip().split("\n")
    if lines:
        first = lines[0].strip()
        if re.match(r"^#{1,3}\s+", first):
            if title in first or re.search(r"第[一二三四五六七八九十\d]+章", first):
                lines = lines[1:]
    return "\n".join(lines).strip()
