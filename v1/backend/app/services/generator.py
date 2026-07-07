"""小说生成管线：CrewAI 多智能体编配 + 流式逐章生成"""
import asyncio
import json
import os
import re
import time
from datetime import datetime
from typing import AsyncGenerator, AsyncIterator, Optional

from app.database import SessionLocal
from app.models.novel import Novel
from app.models.generation_record import GenerationRecord
from app.llm.provider import LLMProvider
from app.services.prompts import (
    SYSTEM_PROMPT_PARSE,
    SYSTEM_PROMPT_L1_STRATEGY,
    SYSTEM_PROMPT_L2_CHARACTERS,
    SYSTEM_PROMPT_L3_WORLD,
    SYSTEM_PROMPT_L4_STRUCTURE,
    SYSTEM_PROMPT_L5_CHAPTERS,
    SYSTEM_PROMPT_CHAPTER,
    SYSTEM_PROMPT_TITLE,
)
from app.services.xmind import generate_xmind
from app.services.agents import (
    create_parser_agent,
    create_outliner_agent,
    create_writer_agent,
    create_titler_agent,
)

NOVEL_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "..", "doc", "novel", "v1")
NOVEL_INDEX_PATH = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "..", "novels_index.json")


def _log(msg: str):
    ts = datetime.now().strftime("%H:%M:%S.%f")[:12]
    print(f"  [{ts}] [生成管线] {msg}", flush=True)


async def _timeout_iterate(agen: AsyncIterator, timeout: int = 120, first_chunk_timeout: int = 60) -> AsyncGenerator[str, None]:
    """逐块迭代异步生成器，首块用较短超时，后续块用较长超时"""
    ait = agen.__aiter__()
    is_first = True
    while True:
        try:
            t = first_chunk_timeout if is_first else timeout
            chunk = await asyncio.wait_for(ait.__anext__(), timeout=t)
            is_first = False
            yield chunk
        except StopAsyncIteration:
            break
        except asyncio.TimeoutError:
            stage = "首块" if is_first else "后续"
            _log(f"⚠️ 流式迭代超时（{stage} {t}s）")
            break
        except Exception as e:
            _log(f"⚠️ 流式迭代异常: {e}")
            break


def _ensure_novel_folder(title: str) -> str:
    safe_title = re.sub(r'[\\/:*?"<>|]', "", title).strip() or "未命名小说"
    folder = os.path.join(NOVEL_DIR, safe_title)
    os.makedirs(folder, exist_ok=True)
    return folder


STEP_LABELS = {
    "parsing": "要素分析",
    "outlining": "大纲规划",
    "writing": "逐章生成",
    "titling": "生成标题",
}


class GeneratorService:
    def __init__(self, llm: LLMProvider):
        self.llm = llm
        self._current_step = "parsing"

    def _make_log(self, text: str, type: str = "info"):
        return {"event": "log", "data": {"step": self._current_step, "type": type, "text": text}}

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
        continuation: Optional[dict] = None,
    ) -> AsyncGenerator[dict, None]:
        start_time = time.time()
        novel_id = None
        novel_folder = None
        outline_data = None

        # ── 预检：LLM 配置是否有效 ──
        validate_err = self.llm.validate()
        if validate_err:
            yield self._make_log(f"❌ LLM 配置错误: {validate_err}", type="error")
            yield {"event": "error", "data": {"message": f"LLM 配置错误: {validate_err}"}}
            return

        existing_content = ""
        existing_parts = []
        start_from_chapter = 0
        if continuation:
            existing_content = continuation.get("content", "")
            existing_parts = continuation.get("parts", [])
            start_from_chapter = continuation.get("start_from", 0)
            novel_id = continuation.get("novel_id")

        # CrewAI 智能体初始化（仅用于角色/目标/背景定义，实际 LLM 调用走自己的 Provider）
        parser_agent = create_parser_agent()
        outliner_agent = create_outliner_agent()
        writer_agent = create_writer_agent()
        titler_agent = create_titler_agent()

        try:
            if record_id:
                yield {"event": "record_id", "data": record_id}

            self._current_step = "parsing"
            yield self._make_log(f"📝 开始生成 {gender}·{genre}·{style} 小说，目标{word_count}字..."
                   + (f"（接续第{start_from_chapter+1}章）" if start_from_chapter > 0 else ""))

            if custom_prompts:
                _log(f"使用自定义提示词覆盖: {list(custom_prompts.keys())}")

            parse_prompt = (custom_prompts or {}).get("parse") or SYSTEM_PROMPT_PARSE
            outline_prompts = {
                "strategy": (custom_prompts or {}).get("outline_l1") or SYSTEM_PROMPT_L1_STRATEGY,
                "characters": (custom_prompts or {}).get("outline_l2") or SYSTEM_PROMPT_L2_CHARACTERS,
                "world": (custom_prompts or {}).get("outline_l3") or SYSTEM_PROMPT_L3_WORLD,
                "structure": (custom_prompts or {}).get("outline_l4") or SYSTEM_PROMPT_L4_STRUCTURE,
                "chapters": (custom_prompts or {}).get("outline_l5") or SYSTEM_PROMPT_L5_CHAPTERS,
            }
            chapter_prompt_tpl = (custom_prompts or {}).get("chapter") or SYSTEM_PROMPT_CHAPTER
            title_prompt = (custom_prompts or {}).get("title") or SYSTEM_PROMPT_TITLE

            # ── Step 1: 要素解析（ParserAgent） ──
            if start_from_chapter == 0:
                self._current_step = "parsing"
                yield {"event": "parse", "data": "正在分析故事要素..."}
                yield self._make_log("📝 正在分析故事要素...")

                story_elements = await self._parse_elements(seed_text, parse_prompt)

                yield self._make_log("✅ 要素分析完成")
                yield {"event": "parse_done", "data": story_elements}

                # ── Step 2: 大纲规划（OutlinerAgent） ──
                self._current_step = "outlining"
                yield {"event": "outline", "data": "正在构建大纲结构..."}
                yield self._make_log("📐 正在规划章节大纲...")

                if chapter_count is None:
                    avg_chapter_words = (per_chapter_min + per_chapter_max) // 2
                    chapter_count = max(2, word_count // avg_chapter_words)
                chapter_count = max(1, min(200, chapter_count))

                yield self._make_log(
                    f"📐 规划章节：目标{word_count}字，每章{per_chapter_min}-{per_chapter_max}字，预计{chapter_count}章"
                )

                full_outline = None
                chapters = []
                async for ev in self._generate_outline_5layer(
                    story_elements, gender, genre, style,
                    chapter_count, per_chapter_min, per_chapter_max,
                    outline_prompts=outline_prompts,
                ):
                    if ev["event"] == "_outline_result":
                        full_outline = ev["data"]
                        chapters = full_outline.get("chapters", [])
                    else:
                        yield ev
                if chapters:
                    for i, ch in enumerate(chapters):
                        _log(f"  大纲 第{i+1}章: {ch.get('title', '?')}")
                        yield self._make_log(f"  📋 第{i+1}章《{ch.get('title', '?')}》: {ch.get('summary', '')[:60]}...")
                        yield {"event": "outline_thinking", "data": {"type": "chapter", "index": i, "title": ch.get("title", ""), "summary": ch.get("summary", "")}}
                outline_data = full_outline or {}
            else:
                story_elements = continuation.get("elements", {})
                chapters = continuation.get("chapters", [])
                full_outline = continuation.get("outline", {"chapters": chapters, "elements": story_elements})
                outline_data = full_outline
                chapter_count = len(chapters)
                yield self._make_log(f"📐 继续生成：已有 {start_from_chapter}/{chapter_count} 章，跳过解析和大纲")

            # ── 提前创建 novel 记录 ──
            tmp_title = "生成中..."
            if not novel_id:
                outline_for_db = dict(outline_data) if isinstance(outline_data, dict) else {}
                outline_for_db.setdefault("chapters", chapters)
                outline_for_db.setdefault("elements", story_elements)
                novel_id = self._save_to_db(
                    title=tmp_title, seed_text=seed_text, gender=gender, genre=genre,
                    style=style, word_count=word_count, per_chapter_min=per_chapter_min,
                    per_chapter_max=per_chapter_max, actual_count=0,
                    content="", chapters=json.dumps(chapters, ensure_ascii=False),
                    outline=json.dumps(outline_for_db, ensure_ascii=False),
                    model_used=f"{self.llm.__class__.__name__}",
                    model_config=json.dumps(model_config or {}, ensure_ascii=False),
                    time_cost=0,
                )
            else:
                self._update_novel_outline(novel_id, chapters, story_elements)

            # ── Step 3: 逐章生成（WriterAgent） ──
            self._current_step = "writing"
            yield self._make_log(f"✍️ 开始逐章生成（共 {len(chapters)} 章）..."
                   + (f"，从第{start_from_chapter+1}章继续" if start_from_chapter > 0 else ""))

            full_content_parts = list(existing_parts)
            previous_summary = seed_text
            if existing_parts:
                last_part = existing_parts[-1]
                last_clean = re.sub(r"^## .+?\n\n", "", last_part, count=1).strip()
                previous_summary = f"上一章概要：{last_clean[:200]}..."

            per_chapter_target = word_count // len(chapters) if len(chapters) > 0 else 2000

            # 先保存大纲和思维导图 scaffold
            novel_folder = _ensure_novel_folder(tmp_title)
            self._save_outline_mindmap(
                novel_folder, f"{'生成中' if start_from_chapter == 0 else '继续生成'}",
                chapters, story_elements, gender, genre, style,
                full_outline=outline_data if isinstance(outline_data, dict) else None,
            )

            chapter_states = []

            for i, chapter in enumerate(chapters):
                if i < start_from_chapter:
                    continue

                title = chapter.get("title", f"第{i+1}章")
                summary = chapter.get("summary", "")

                now_ts = datetime.now().isoformat()
                chapter_states.append({
                    "index": i, "title": title,
                    "status": "generating", "start_time": now_ts,
                })

                _log(f"  生成第{i+1}/{len(chapters)}章: 《{title}》 | 目标字数:{per_chapter_target}")
                yield self._make_log(f"  📖 第{i+1}章《{title}》开始生成...")
                yield {"event": "chapter_start", "data": {"title": title, "index": i, "start_time": now_ts}}

                # 构建章节 prompt，始终包含题材约束，前3章额外附带高概念
                novel_context = f'\n【题材约束】本小说为"{genre}"题材，必须严格遵守该题材的世界观和规则，不得混入其他题材元素。\n'
                if i < 3 and outline_data:
                    high_concept = (
                        outline_data.get("strategy", {})
                        .get("core_idea", {})
                        .get("high_concept", "")
                    )
                    if high_concept:
                        novel_context += f"【小说定位】{high_concept}\n"

                chapter_prompt = chapter_prompt_tpl.format(
                    gender=gender, genre=genre, style=style,
                    chapter_title=title,
                    chapter_summary=summary + novel_context,
                    previous_summary=previous_summary,
                    target_words=per_chapter_target,
                )

                # 分段生成：长章节拆成多个短段，每段独立调用 LLM 降低超时风险
                chapter_content = ""

                # 场景列表：优先使用章节细纲中的 scenes，否则按字数自动切分
                scenes = chapter.get("scenes", [])
                if not scenes:
                    if per_chapter_target >= 1000:
                        scenes = ["开篇", "发展", "高潮/转折", "收尾"]
                    else:
                        scenes = []

                if scenes:
                    segment_target = max(300, per_chapter_target // len(scenes))
                    for si, scene_desc in enumerate(scenes):
                        seg_prompt = chapter_prompt + (
                            f"\n\n【当前场景 {si+1}/{len(scenes)}】{scene_desc}"
                            f"\n本节目标约 {segment_target} 字。"
                        )
                        seg_text = ""
                        for _attempt in range(2):
                            try:
                                async for chunk in _timeout_iterate(
                                    self.llm.generate_stream(seg_prompt),
                                    timeout=120, first_chunk_timeout=90,
                                ):
                                    seg_text += chunk
                                    yield {"event": "content", "data": chunk}
                                if seg_text.strip():
                                    break
                            except Exception as e:
                                _log(f"⚠️ 第{i+1}章·场景{si+1}异常: {e}（第{_attempt+1}次）")
                            if _attempt == 0:
                                await asyncio.sleep(1)
                        chapter_content += seg_text
                        if si < len(scenes) - 1 and not chapter_content.endswith("\n\n***\n\n"):
                            chapter_content += "\n\n***\n\n"
                            yield {"event": "content", "data": "\n\n***\n\n"}
                else:
                    # 直接生成（短章节）
                    for _attempt in range(2):
                        try:
                            async for chunk in _timeout_iterate(
                                self.llm.generate_stream(chapter_prompt),
                                timeout=120, first_chunk_timeout=90,
                            ):
                                chapter_content += chunk
                                yield {"event": "content", "data": chunk}
                            if chapter_content:
                                break
                        except Exception as e:
                            _log(f"⚠️ 第{i+1}章流式异常: {e}（第{_attempt+1}次）")
                        if _attempt == 0:
                            yield self._make_log(f"  🔄 第{i+1}章重试...")
                            await asyncio.sleep(1)

                full_content_parts.append(f"## {title}\n\n{chapter_content.strip()}")
                previous_summary = f"上一章《{title}》概要：{chapter_content[:200]}..."

                actual_words = len(chapter_content)
                end_ts = datetime.now().isoformat()
                if chapter_states:
                    chapter_states[-1]["status"] = "completed"
                    chapter_states[-1]["end_time"] = end_ts

                _log(f"  第{i+1}章完成: 《{title}》 | 实际字数:{actual_words}")
                yield self._make_log(f"  ✅ 第{i+1}章完成（{actual_words}字）")
                yield {"event": "chapter_end", "data": {"title": title, "word_count": actual_words, "end_time": end_ts}}

                # 逐章持久化
                full_so_far = "\n\n".join(full_content_parts)
                self._update_novel_content(novel_id, full_so_far, chapters)
                self._save_single_chapter_file(novel_folder, title, i, chapter_content, chapters)
                if record_id:
                    self._update_record_progress(record_id, i + 1, len(chapters), full_so_far, chapter_states=chapter_states)

            # ── Step 4: 生成标题（TitlerAgent） ──
            self._current_step = "titling"
            full_content = "\n\n".join(full_content_parts)
            yield {"event": "title", "data": "正在生成标题..."}
            yield self._make_log("🏷️ 正在生成标题...")
            final_title = await self._generate_title(full_content, gender, genre, title_prompt)
            yield self._make_log(f"🏷️ 标题生成完成：{final_title}")

            actual_count = len(full_content)
            time_cost = time.time() - start_time

            # ── 最终持久化 ──
            outline_for_final = dict(outline_data) if isinstance(outline_data, dict) else {}
            outline_for_final.setdefault("chapters", chapters)
            outline_for_final.setdefault("elements", story_elements)
            self._finalize_novel(novel_id, final_title, full_content, chapters, story_elements,
                                 seed_text, gender, genre, style, word_count,
                                 per_chapter_min, per_chapter_max, actual_count,
                                 model_config, time_cost, full_outline=outline_for_final)
            self._save_full_txt(novel_folder, final_title, full_content_parts)

            # 重命名 doc 文件夹
            old_folder = novel_folder
            novel_folder = _ensure_novel_folder(final_title)
            if old_folder != novel_folder and os.path.exists(old_folder):
                try:
                    os.renames(old_folder, novel_folder)
                except Exception:
                    pass
            self._save_outline_mindmap(novel_folder, final_title, chapters, story_elements, gender, genre, style,
                                       full_outline=outline_for_final)
            for fname in os.listdir(novel_folder):
                if fname.startswith("生成中") and (fname.endswith(".xmind") or fname.endswith(".md")):
                    try:
                        os.remove(os.path.join(novel_folder, fname))
                    except Exception:
                        pass

            _log(f"全部完成！标题:《{final_title}》 | 总字数:{actual_count} | 耗时:{time_cost:.1f}s")
            yield self._make_log(f"🎉 全部完成！标题《{final_title}》，总字数{actual_count}，耗时{time_cost:.1f}s")
            yield self._make_log(f"📁 文件已保存至 doc/novel/{final_title}/")

            yield {
                "event": "complete",
                "data": {
                    "novel_id": novel_id, "title": final_title,
                    "total_words": actual_count, "time_cost": round(time_cost, 2),
                },
            }
            if record_id:
                self._update_record_complete(record_id, novel_id, chapter_states=chapter_states)

            self._update_novel_index(
                title=final_title, seed_text=seed_text,
                gender=gender, genre=genre, style=style,
                word_count=word_count,
                per_chapter_min=per_chapter_min, per_chapter_max=per_chapter_max,
                actual_count=actual_count, content=full_content,
                chapters=chapters, outline=outline_for_final,
                model_used=f"{self.llm.__class__.__name__}",
                model_config=model_config, time_cost=time_cost,
                record_id=record_id, record_status="completed",
                completed_chapters=len(chapters), total_chapters=len(chapters),
            )

        except Exception as e:
            _log(f"❌ 生成失败: {str(e)}")
            yield {"event": "error", "data": {"message": str(e), "step": self._current_step}}
            if record_id:
                cs = locals().get('chapter_states')
                self._update_record_error(record_id, str(e), self._current_step, chapter_states=cs)
            if novel_id:
                self._mark_novel_failed(novel_id, str(e))

    # ── 数据库操作 ──

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
        db = SessionLocal()
        try:
            novel = db.query(Novel).filter(Novel.id == novel_id).first()
            if novel:
                novel.outline = json.dumps({"chapters": chapters, "elements": elements}, ensure_ascii=False)
                db.commit()
        finally:
            db.close()

    def _finalize_novel(self, novel_id, title, content, chapters, elements,
                         seed_text, gender, genre, style, word_count,
                         per_chapter_min, per_chapter_max, actual_count,
                         model_config, time_cost, full_outline=None):
        db = SessionLocal()
        try:
            novel = db.query(Novel).filter(Novel.id == novel_id).first()
            if novel:
                novel.title = title
                novel.content = content
                novel.actual_count = actual_count
                novel.chapters = json.dumps(chapters, ensure_ascii=False)
                outline_dict = dict(full_outline) if full_outline else {}
                outline_dict.setdefault("chapters", chapters)
                outline_dict.setdefault("elements", elements)
                novel.outline = json.dumps(outline_dict, ensure_ascii=False)
                novel.time_cost = time_cost
                novel.updated_at = datetime.now() if hasattr(novel, 'updated_at') else novel.created_at
                db.commit()
        finally:
            db.close()

    def _update_novel_index(self, title, seed_text, gender, genre, style,
                             word_count, per_chapter_min, per_chapter_max,
                             actual_count, content, chapters, outline,
                             model_used, model_config, time_cost,
                             record_id=None, record_status="completed",
                             completed_chapters=0, total_chapters=0):
        entry = {
            "title": title, "seed_text": seed_text,
            "gender": gender, "genre": genre, "style": style,
            "word_count": word_count,
            "per_chapter_min": per_chapter_min, "per_chapter_max": per_chapter_max,
            "actual_count": actual_count, "content": content,
            "chapters": chapters, "outline": outline,
            "model_used": model_used, "model_config": model_config or {},
            "time_cost": time_cost, "created_at": datetime.now().isoformat(),
        }
        if record_id:
            entry["generation_record"] = {
                "params": {"seed_text": seed_text, "gender": gender, "genre": genre, "style": style,
                           "word_count": word_count, "per_chapter_min": per_chapter_min,
                           "per_chapter_max": per_chapter_max},
                "completed_chapters": completed_chapters, "total_chapters": total_chapters,
                "status": record_status,
            }
        index = {"version": 1, "updated_at": datetime.now().isoformat(), "novels": []}
        if os.path.exists(NOVEL_INDEX_PATH):
            try:
                with open(NOVEL_INDEX_PATH, "r", encoding="utf-8") as f:
                    existing = json.load(f)
                    if isinstance(existing, dict) and "novels" in existing:
                        index = existing
            except (json.JSONDecodeError, Exception):
                pass
        index["updated_at"] = datetime.now().isoformat()
        replaced = False
        for i, n in enumerate(index["novels"]):
            if n.get("title") == title:
                index["novels"][i] = entry
                replaced = True
                break
        if not replaced:
            index["novels"].append(entry)
        try:
            with open(NOVEL_INDEX_PATH, "w", encoding="utf-8") as f:
                json.dump(index, f, ensure_ascii=False, indent=2)
        except Exception as e:
            _log(f"  写入 novels_index.json 失败: {e}")

    def _mark_novel_failed(self, novel_id, error):
        db = SessionLocal()
        try:
            novel = db.query(Novel).filter(Novel.id == novel_id).first()
            if novel:
                novel.title = novel.title + " [生成中断]" if novel.title != "生成中..." else "生成中断"
                db.commit()
        finally:
            db.close()

    # ── 文件操作 ──

    def _save_single_chapter_file(self, folder, title, index, content, chapters):
        ch_title = chapters[index].get("title", f"第{index+1}章")
        clean_text = re.sub(r"^## .+?\n\n", "", f"## {title}\n\n{content}", count=1).strip()
        chapter_path = os.path.join(folder, f"第{index+1}章 {ch_title}.txt")
        try:
            with open(chapter_path, "w", encoding="utf-8") as f:
                f.write(f"{ch_title}\n\n{clean_text}\n")
        except Exception as e:
            _log(f"  保存章节文件失败: {chapter_path} — {e}")

    def _save_full_txt(self, folder, title, content_parts):
        full_path = os.path.join(folder, f"{title}.txt")
        try:
            with open(full_path, "w", encoding="utf-8") as f:
                f.write(f"《{title}》\n{'=' * 30}\n\n")
                for part in content_parts:
                    clean_text = re.sub(r"^## .+?\n\n", "", part, count=1).strip()
                    f.write(f"{clean_text}\n\n")
        except Exception as e:
            _log(f"  保存全文失败: {full_path} — {e}")

    def _save_outline_mindmap(self, folder, title, chapters, elements, gender, genre, style, full_outline=None):
        safe_title = re.sub(r'[\\/:*?"<>|]', "", title).strip() or "未命名小说"
        outline = full_outline or {}

        def _section(t, body):
            lines.append(f"\n## {t}\n\n{body}\n\n")

        def _dict_section(t, d, indent=0):
            prefix = "#" * (3 + indent)
            for k, v in d.items():
                label_text = {
                    "strategy": "战略层", "characters": "人物层", "world": "设定层",
                    "plot_structure": "结构层", "rhythm": "节奏层", "style_tone": "风格层",
                    "chapters": "章节细纲", "core_idea": "核心立意", "theme": "思想主题",
                    "ending": "结局预判", "protagonist": "主角", "supporting": "配角",
                    "antagonist": "反派", "relationships": "人物关系", "time_space": "时空背景",
                    "rules": "规则体系", "factions": "势力格局", "three_acts": "三幕式",
                    "beat_sheet": "节拍表", "golden_three": "黄金三章",
                    "satisfaction_points": "爽点布局", "emotional_peaks": "泪点/痛点",
                    "pace_curve": "节奏曲线", "perspective": "叙事视角",
                    "language": "语言风格", "atmosphere": "氛围基调",
                    "high_concept": "高概念设定", "unique_selling_point": "独特卖点",
                    "core_question": "核心问题", "values": "价值观",
                    "type": "结局类型", "final_scene": "最终场景",
                    "desire": "核心欲望", "flaw": "核心缺陷", "traits": "性格特质",
                    "arc": "成长弧线", "motive": "动机", "threat": "压迫感",
                    "value_opposition": "价值对立", "era": "时代", "locations": "场景",
                    "world_rules": "世界规则", "power_system": "力量体系",
                    "social_structure": "社会结构", "act1": "第一幕·建置",
                    "act2": "第二幕·对抗", "act3": "第三幕·结局",
                    "narrative_style": "叙事风格",
                }.get(k, k)
                if isinstance(v, dict):
                    lines.append(f"{prefix} {label_text}\n\n")
                    _dict_section(label_text, v, indent + 1)
                elif isinstance(v, list):
                    lines.append(f"{prefix} {label_text}\n\n")
                    for item in v:
                        if isinstance(item, dict):
                            item_title = item.get("title") or item.get("name") or item.get("beat") or ""
                            if item_title:
                                lines.append(f"{'#' * (4 + indent)} {item_title}\n\n")
                            for ik, iv in item.items():
                                if ik in ("title", "name"):
                                    continue
                                iv_label = {"hook": "钩子", "function": "功能", "summary": "概要",
                                            "cliffhanger": "悬念", "word_count_estimate": "字数预估",
                                            "description": "描述", "alignment": "立场",
                                            "role": "作用", "relationship": "关系",
                                            "chapter_range": "章节范围", "content": "内容",
                                            "motive": "动机", "threat": "压迫感",
                                            "beat": "节拍",
                                           }.get(ik, ik)
                                lines.append(f"- **{iv_label}**: {iv}\n")
                            lines.append("\n")
                        else:
                            lines.append(f"- {item}\n")
                elif isinstance(v, str) and v.strip():
                    lines.append(f"- **{label_text}**: {v}\n")

        lines = [f"# 《{title}》完整创作大纲\n", f"> {gender} · {genre} · {style}\n\n", "---\n"]
        for key in ("strategy", "characters", "world", "plot_structure", "rhythm", "style_tone"):
            if key in outline:
                _dict_section("", {key: outline[key]})
        lines.append("\n## 章节细纲\n\n")
        for i, ch in enumerate(chapters):
            lines.append(f"### 第{i+1}章 {ch.get('title', '')}\n\n{ch.get('summary', '')}\n\n")
            if ch.get("hook"):
                lines.append(f"- **钩子**: {ch['hook']}\n")
            if ch.get("cliffhanger"):
                lines.append(f"- **悬念**: {ch['cliffhanger']}\n")
            if ch.get("function"):
                lines.append(f"- **定位**: {ch['function']}\n")
            if ch.get("word_count_estimate"):
                lines.append(f"- **字数**: {ch['word_count_estimate']}\n")
            lines.append("\n")
        md_path = os.path.join(folder, f"{safe_title} 大纲.md")
        try:
            with open(md_path, "w", encoding="utf-8") as f:
                f.write("".join(lines))
        except Exception as e:
            _log(f"  保存大纲 Markdown 失败: {md_path} — {e}")
        try:
            xmind_outline = outline if outline else {"chapters": chapters, "elements": elements}
            xmind_bytes = generate_xmind(title, xmind_outline)
            xmind_path = os.path.join(folder, f"{safe_title} 大纲.xmind")
            with open(xmind_path, "wb") as f:
                f.write(xmind_bytes)
        except Exception as e:
            _log(f"  保存大纲 XMind 失败: {xmind_path} — {e}")

    # ── 生成记录辅助 ──

    def _update_record_progress(self, record_id, completed, total, content, chapter_states=None):
        db = SessionLocal()
        try:
            rec = db.query(GenerationRecord).filter(GenerationRecord.id == record_id).first()
            if rec:
                rec.completed_chapters = completed
                rec.total_chapters = total
                rec.content_sofar = content[-50000:]
                if chapter_states:
                    rec.chapter_states = json.dumps(chapter_states, ensure_ascii=False)
                rec.updated_at = datetime.now()
                db.commit()
        finally:
            db.close()

    def _update_record_error(self, record_id, error, failed_step=None, chapter_states=None):
        db = SessionLocal()
        try:
            rec = db.query(GenerationRecord).filter(GenerationRecord.id == record_id).first()
            if rec:
                rec.status = "failed"
                rec.error_message = f"[{failed_step or 'unknown'}] {error}"
                if chapter_states:
                    rec.chapter_states = json.dumps(chapter_states, ensure_ascii=False)
                rec.updated_at = datetime.now()
                db.commit()
        finally:
            db.close()

    def _update_record_complete(self, record_id, novel_id, chapter_states=None):
        db = SessionLocal()
        try:
            rec = db.query(GenerationRecord).filter(GenerationRecord.id == record_id).first()
            if rec:
                rec.status = "completed"
                rec.novel_id = novel_id
                if chapter_states:
                    rec.chapter_states = json.dumps(chapter_states, ensure_ascii=False)
                rec.updated_at = datetime.now()
                db.commit()
        finally:
            db.close()

    # ── LLM 调用（含超时保护 + 自动重试） ──

    async def _call_llm(self, prompt: str, system_prompt: str = "", timeout: int = 120) -> str:
        """流式调用 LLM 并收集完整结果，超时/失败后自动重试一次"""
        for attempt in range(2):
            result = ""
            async def _collect():
                nonlocal result
                async for chunk in _timeout_iterate(
                    self.llm.generate_stream(prompt, system_prompt),
                    timeout=timeout,
                    first_chunk_timeout=90,
                ):
                    result += chunk
            try:
                await asyncio.wait_for(_collect(), timeout=timeout + 5)
                if result:
                    return result
                _log(f"⚠️ LLM 返回空结果（第{attempt+1}次）")
            except asyncio.TimeoutError:
                _log(f"⚠️ LLM 调用超时（{timeout}s，第{attempt+1}次）")
            except Exception as e:
                _log(f"⚠️ LLM 调用异常: {e}（第{attempt+1}次）")
            if attempt == 0:
                _log("🔄 重试一次...")
                await asyncio.sleep(1)
        return result

    async def _parse_elements(self, seed_text: str, prompt_tpl: str = SYSTEM_PROMPT_PARSE) -> dict:
        result = await self._call_llm(seed_text, prompt_tpl)
        try:
            start = result.index("{")
            end = result.rindex("}") + 1
            return json.loads(result[start:end])
        except (ValueError, json.JSONDecodeError):
            return {"protagonist": "未知角色", "time_era": "未知时间", "locations": "未知地点",
                    "conflict_type": "未知", "inciting_incident": seed_text,
                    "development": "待展开", "resolution_tendency": "正剧", "world_tone": "写实"}

    @staticmethod
    def _safe_format(template: str, **kwargs) -> str:
        """仅替换 {key} 占位符，不影响 JSON 结构中的 { }"""
        for key, val in kwargs.items():
            template = template.replace(f"{{{key}}}", str(val))
        return template

    @staticmethod
    def _extract_json(raw: str) -> dict:
        """从 LLM 输出中提取并解析 JSON"""
        try:
            start = raw.index("{")
            end = raw.rindex("}") + 1
            return json.loads(raw[start:end])
        except (ValueError, json.JSONDecodeError):
            return {}

    async def _generate_outline_5layer(self, story_elements, gender, genre, style,
                                        chapter_count, per_chapter_min, per_chapter_max,
                                        outline_prompts=None) -> AsyncGenerator[dict, None]:
        """五层独立大纲生成器：每层一次微型 LLM 调用，串行 yield 事件"""
        elements_str = json.dumps(story_elements, ensure_ascii=False, indent=2)
        layer_configs = [
            ("strategy", SYSTEM_PROMPT_L1_STRATEGY, {}),
            ("characters", SYSTEM_PROMPT_L2_CHARACTERS, {}),
            ("world", SYSTEM_PROMPT_L3_WORLD, {}),
            ("structure", SYSTEM_PROMPT_L4_STRUCTURE, {}),
            ("chapters", SYSTEM_PROMPT_L5_CHAPTERS, {}),
        ]
        if outline_prompts:
            for i, (name, _, _) in enumerate(layer_configs):
                if name in outline_prompts:
                    layer_configs[i] = (name, outline_prompts[name], layer_configs[i][2])

        LAYER_LABELS = {
            "strategy": "战略层", "characters": "人物层", "world": "世界观层",
            "structure": "情节+节奏+风格层", "chapters": "章节细纲层",
        }
        LAYER_OUTPUT_KEYS = {
            "strategy": "strategy", "characters": "characters", "world": "world",
            "structure": ("plot_structure", "rhythm", "style_tone"),
            "chapters": "chapters",
        }
        total = len(layer_configs)
        layers = {}

        for idx, (name, tpl, _) in enumerate(layer_configs):
            label = LAYER_LABELS.get(name, name)
            yield self._make_log(f"📐 大纲第{idx+1}/{total}层：生成{label}...")
            yield {"event": "outline_thinking", "data": {"type": "_progress", "step": idx + 1, "total": total, "label": label}}

            # 构建上下文摘要（前序各层紧凑 JSON，每层截断 500 chars）
            summaries = {}
            for k, v in layers.items():
                if v:
                    compact = json.dumps(v, ensure_ascii=False, separators=(",", ":"))
                    summaries[k] = compact[:500]
            previous_layers = json.dumps(summaries, ensure_ascii=False)[:3000]

            prompt = self._safe_format(
                tpl,
                gender=gender, genre=genre, style=style,
                story_elements=elements_str if not summaries else "",
                previous_layers=previous_layers,
                chapter_count=str(chapter_count),
                per_chapter_min=str(per_chapter_min), per_chapter_max=str(per_chapter_max),
            )

            raw = await self._call_llm(prompt, timeout=120)
            parsed = self._extract_json(raw)
            if not parsed:
                _log(f"⚠️ {label}层为空，跳过")
                yield self._make_log(f"  ⚠️ {label}生成失败，跳过", type="warning")
            else:
                preview = json.dumps(parsed, ensure_ascii=False, indent=2)[:800]
                _log(f"  ✅ {label}: {preview}")
                yield {"event": "outline_thinking", "data": {"type": name, "data": parsed}}
                yield self._make_log(f"  ✅ {label}完成")

            # 将解析结果按输出 key 映射到 layers dict
            keys = LAYER_OUTPUT_KEYS.get(name, name)
            if isinstance(keys, tuple):
                for k in keys:
                    layers[k] = parsed.get(k, {}) if parsed else {}
            else:
                layers[keys] = parsed if parsed else {}

            # 归一化 chapters 格式：LLM 有时输出 {"chapters": [...]} 需要展平
            if name == "chapters":
                ch = layers.get("chapters", [])
                if isinstance(ch, dict) and "chapters" in ch:
                    layers["chapters"] = ch["chapters"]

        # 确保所有 6 层存在
        for key in ("strategy", "characters", "world", "plot_structure", "rhythm", "style_tone", "chapters"):
            layers.setdefault(key, {} if key != "chapters" else self._fallback_chapters(chapter_count))
        layers.setdefault("elements", story_elements)

        yield self._make_log(f"✅ 大纲规划完成（{total}层）")
        yield {"event": "outline_done", "data": {"chapters": layers.get("chapters", []), "outline": layers}}
        yield {"event": "_outline_result", "data": layers}

    def _fallback_outline(self, story_elements, chapter_count):
        chapters = self._fallback_chapters(chapter_count)
        return {
            "strategy": {"core_idea": {"high_concept": "待完善", "unique_selling_point": "待完善"},
                         "theme": {"core_question": "待完善", "values": "待完善"},
                         "ending": {"type": "正剧", "final_scene": "待完善"}},
            "characters": {"protagonist": {"name": "", "identity": "", "desire": "", "flaw": "", "traits": "", "arc": ""},
                           "supporting": [], "antagonist": {"name": "", "motive": "", "threat": "", "value_opposition": ""},
                           "relationships": ""},
            "world": {"time_space": {"era": "", "locations": ""},
                      "rules": {"world_rules": "", "power_system": "", "social_structure": ""},
                      "factions": []},
            "plot_structure": {"three_acts": {"act1": "", "act2": "", "act3": ""},
                               "beat_sheet": [], "golden_three": []},
            "rhythm": {"satisfaction_points": [], "emotional_peaks": [], "pace_curve": ""},
            "style_tone": {"perspective": "", "language": "", "atmosphere": ""},
            "chapters": chapters, "elements": story_elements,
        }

    def _fallback_chapters(self, count):
        return [{"title": f"第{i+1}章", "summary": "内容待展开", "hook": "", "cliffhanger": "",
                 "function": "", "word_count_estimate": 2000} for i in range(count)]

    async def _generate_title(self, content, gender, genre, prompt_tpl=SYSTEM_PROMPT_TITLE) -> str:
        preview = content[:500]
        prompt = f"{gender}频道{genre}题材小说开头：\n{preview}\n\n请为这篇小说起一个5-15字的吸引人标题："
        result = await self._call_llm(prompt, prompt_tpl)
        return result.strip() or "未命名小说"


def _strip_leading_title(content: str, title: str) -> str:
    lines = content.strip().split("\n")
    if lines:
        first = lines[0].strip()
        if re.match(r"^#{1,3}\s+", first):
            if title in first or re.search(r"第[一二三四五六七八九十\d]+章", first):
                lines = lines[1:]
    return "\n".join(lines).strip()
