"""小说生成管线 — 协调各服务模块完成全流程"""
import asyncio
import json
import os
import re
import time
from datetime import datetime
from typing import AsyncGenerator, Optional

from app.llm.provider import LLMProvider
from app.database import SessionLocal
from app.services.prompts import (
    SYSTEM_PROMPT_PARSE,
    SYSTEM_PROMPT_CHAPTER,
    SYSTEM_PROMPT_TITLE,
    SYSTEM_PROMPT_L1_STRATEGY,
    SYSTEM_PROMPT_L2_CHARACTERS,
    SYSTEM_PROMPT_L3_WORLD,
    SYSTEM_PROMPT_L4_STRUCTURE,
    SYSTEM_PROMPT_L5_CHAPTERS,
    AESTHETIC_BLOCKS,
    ENDING_BLOCKS,
    DIALOGUE_PROMPT,
    ASSIST_CONTINUE_PROMPT,
)
# ├── 解耦后的服务模块 ──────────────────────────────────────
from app.services.llm_utils import call_llm, timeout_iterate, safe_format, extract_json
from app.services.db_service import (
    save_novel,
    update_novel_content,
    update_novel_outline,
    finalize_novel,
    mark_novel_failed,
    update_record_progress,
    update_record_error,
    update_record_complete,
    update_novel_index,
)
from app.services.file_service import (
    ensure_novel_folder,
    save_single_chapter_file,
    save_full_txt,
    save_outline_mindmap,
)
from app.services.outline_service import (
    parse_elements,
    generate_outline_5layer,
    generate_emotion_curve,
    generate_title,
    generate_interpretation,
    generate_opening,
    _dict_to_tree,
)
from app.services.bible_service import (
    seed_bible_from_outline,
    build_bible_block,
    extract_bible_update,
    merge_bible,
)


def _log(msg: str):
    ts = datetime.now().strftime("%H:%M:%S.%f")[:12]
    print(f"  [{ts}] [生成管线] {msg}", flush=True)


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
        # V3 继承参数
        pov: str = "第三人称有限",
        pacing: str = "标准型",
        style_intensity: str = "中度",
        enable_suspense: bool = True,
        enable_twist: bool = True,
        # V3 新增参数
        theme: str = "",
        aesthetic_intensity: str = "中度",
        # F7 对比模式：已选开头文本
        opening_text: Optional[str] = None,
        # F7 结局类型
        ending_type: str = "",
        novel_length: str = "short",
    ) -> AsyncGenerator[dict, None]:
        start_time = time.time()
        novel_id = None
        novel_folder = None
        outline_data = None

        # 构建主题上下文
        theme_context = (
            f"\n【核心主题】「{theme}」。全篇必须围绕此主题展开，结尾回扣主题点题。\n"
            if theme else ""
        )
        _theme_base = (
            f"\n【核心主题】「{theme}」"
            if theme else ""
        )
        _theme_last = (
            f"\n【结尾主题点题】这是全书最后一章，请在结尾处通过主角的感悟/对话/行动或故事结局画面，明确回扣核心主题「{theme}」，让读者清晰感受到主题的升华。\n"
            if theme else ""
        )

        # ── 预检 ──
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

        _db = SessionLocal()
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

            # ── Step 1: 要素解析 ──
            if start_from_chapter == 0:
                self._current_step = "parsing"
                yield {"event": "parse", "data": "正在分析故事要素..."}
                yield self._make_log("📝 正在分析故事要素...")

                formatted_parse = safe_format(parse_prompt, theme_context=theme_context)
                story_elements = await parse_elements(self.llm, seed_text, gender, genre, style, formatted_parse)

                yield self._make_log("✅ 要素分析完成")
                yield {"event": "parse_done", "data": story_elements}

                # ── Step 2: 大纲规划 ──
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
                async for ev in generate_outline_5layer(
                    self.llm, story_elements, gender, genre, style,
                    chapter_count=chapter_count,
                    per_chapter_min=per_chapter_min,
                    per_chapter_max=per_chapter_max,
                    outline_prompts=outline_prompts,
                    enable_suspense=enable_suspense,
                    enable_twist=enable_twist,
                    theme_context=theme_context,
                    make_log=self._make_log,
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
                assert continuation is not None  # 继续模式必须有 continuation
                story_elements = continuation.get("elements", {})
                chapters = continuation.get("chapters", [])
                full_outline = continuation.get("outline", {"chapters": chapters, "elements": story_elements})
                outline_data = full_outline
                chapter_count = len(chapters)
                yield self._make_log(f"📐 继续生成：已有 {start_from_chapter}/{chapter_count} 章，跳过解析和大纲")
                if isinstance(outline_data, dict):
                    _outline_layers = []
                    _layer_names = ['strategy', 'characters', 'world']
                    for name in _layer_names:
                        ld = outline_data.get(name)
                        if ld and isinstance(ld, dict) and len(ld) > 0:
                            _outline_layers.append({"type": name, "data": ld})
                    _structure_data = {}
                    for k in ('plot_structure', 'rhythm', 'style_tone'):
                        v = outline_data.get(k)
                        if v and isinstance(v, dict):
                            _structure_data[k] = v
                    if _structure_data:
                        _outline_layers.append({"type": "structure", "data": _structure_data})
                    for item in _outline_layers:
                        yield {"event": "outline_thinking", "data": item}
                    yield {"event": "outline_done", "data": {
                        "chapters": chapters,
                        "outline": outline_data,
                        "tree": outline_data.get('_tree', {}),
                    }}

            # ── F2: 情感曲线 ──
            emotion_curve = None
            if isinstance(outline_data, dict):
                emotion_curve = outline_data.get("emotion_curve")
            if not emotion_curve and continuation:
                emotion_curve = continuation.get("emotion_curve")
            if not emotion_curve and start_from_chapter == 0 and chapters:
                yield self._make_log("📊 正在规划情感曲线...")
                yield {"event": "log", "data": {"step": "outlining", "type": "info", "text": "📊 规划情感曲线（起承转合）..."}}
                emotion_curve = await generate_emotion_curve(
                    self.llm, story_elements, gender, genre, style, theme, len(chapters),
                )
                if emotion_curve:
                    _log(f"📊 情感曲线规划完成：{len(emotion_curve)}章")
                    yield self._make_log(f"  ✅ 情感曲线完成（{len(emotion_curve)}章）")
                    yield {"event": "emotion_curve", "data": emotion_curve}
                    if isinstance(outline_data, dict):
                        outline_data["emotion_curve"] = emotion_curve

            # F6: 从大纲种子设定档案
            character_bible = seed_bible_from_outline(outline_data, story_elements, gender, genre, style)
            if character_bible:
                _log(f"📖 初始设定档案就绪：{len(character_bible.get('characters', []))} 角色, {len(character_bible.get('locations', []))} 地点")

            # ── 提前创建 novel 记录 ──
            tmp_title = "生成中..."
            if not novel_id:
                outline_for_db = dict(outline_data) if isinstance(outline_data, dict) else {}
                outline_for_db.setdefault("chapters", chapters)
                outline_for_db.setdefault("elements", story_elements)
                novel_id = save_novel(
                    db=_db,
                    title=tmp_title, seed_text=seed_text, gender=gender, genre=genre,
                    style=style, word_count=word_count, per_chapter_min=per_chapter_min,
                    per_chapter_max=per_chapter_max, actual_count=0,
                    content="", chapters=json.dumps(chapters, ensure_ascii=False),
                    outline=json.dumps(outline_for_db, ensure_ascii=False),
                    model_used=f"{self.llm.__class__.__name__}",
                    model_config=json.dumps(model_config or {}, ensure_ascii=False),
                    time_cost=0, theme=theme,
                    emotion_curve=json.dumps(emotion_curve, ensure_ascii=False) if emotion_curve else "",
                    aesthetic_intensity=aesthetic_intensity,
                    character_bible=json.dumps(character_bible, ensure_ascii=False) if character_bible else "{}",
                )
            else:
                update_novel_outline(novel_id, chapters, story_elements, tree_fn=_dict_to_tree, db=_db)

            # ── Step 3: 逐章生成 ──
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
            per_chapter_target = max(per_chapter_min, min(per_chapter_max, per_chapter_target))

            # 先保存大纲和思维导图 scaffold
            novel_folder = ensure_novel_folder(tmp_title)
            save_outline_mindmap(
                novel_folder, f"{'生成中' if start_from_chapter == 0 else '继续生成'}",
                chapters, story_elements, gender, genre, style,
                full_outline=outline_data if isinstance(outline_data, dict) else None,
            )

            chapter_states = []

            # F7: 如果提供了 opening_text，用作第一章
            if opening_text and start_from_chapter == 0:
                _log("📖 使用已选开头作为第一章")
                yield self._make_log("  📖 使用已选开头作为第一章")

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

                # 构建章节 prompt
                novel_context = f'\n【🔴 题材约束】本小说为"{genre}"题材，风格为"{style}"。你必须严格遵守：禁止出现任何其他题材的元素；人物只能使用大纲中已定义的角色；世界观必须严格限定在"{genre}"题材的框架内。\n'
                if outline_data:
                    high_concept = (
                        outline_data.get("strategy", {})
                        .get("core_idea", {})
                        .get("high_concept", "")
                    )
                    if high_concept:
                        novel_context += f"【小说定位】{high_concept}\n"
                    seed_reference = outline_data.get("elements", {}).get("inciting_incident", "")
                    if seed_reference:
                        novel_context += f"【原始种子】{seed_reference}\n"

                tension_lines = []
                if enable_suspense:
                    tension_lines.append("- 悬念：已启用。每章结尾必须留有悬念/钩子（Cliffhanger），让读者忍不住点击下一章")
                if enable_twist:
                    tension_lines.append("- 反转：已启用。故事中期或结尾需安排至少一次意外反转，全篇不超过2次")
                tension_block = (
                    "\n【叙事张力】\n" + "\n".join(tension_lines) + "\n"
                    if tension_lines else ""
                )

                is_last = (i == len(chapters) - 1)
                ending_block = ENDING_BLOCKS.get(ending_type, "") if is_last else ""
                theme_block = (
                    _theme_base + _theme_last + ending_block + "\n本章内容必须围绕主题展开，避免偏离主线。\n"
                    if is_last and _theme_base
                    else (_theme_base + ending_block + "\n本章内容必须围绕主题展开，避免偏离主线。\n" if _theme_base else ending_block)
                )

                # F2: 本章情感标签
                emotion_info = None
                if emotion_curve and i < len(emotion_curve):
                    emotion_info = emotion_curve[i]
                emotion_block = (
                    f"\n【本章情感基调】{emotion_info['phase']}·{emotion_info['emotion']}（强度{emotion_info['intensity']}/5）\n"
                    f"情绪标签：{emotion_info.get('label', '')}\n"
                    f"请在写作中体现上述情绪色彩，通过环境描写、对话语气和情节推进来传递「{emotion_info['emotion']}」的情感氛围。\n"
                    if emotion_info else ""
                )

                # F3: 金句块
                suggested_quotes = max(1, round(per_chapter_target * 1.5 / 2000))
                golden_quote_block = (
                    "\n【金句要求】\n"
                    f"请在以下三个位置插入金句（推荐{suggested_quotes}句）：章节结尾处、情感高潮处、主角领悟转折时刻。\n"
                    "金句用 `> *金句内容*` 格式（blockquote + 斜体），单独成段。\n"
                )

                # F4: 美学风格块
                aesthetic_block = AESTHETIC_BLOCKS.get(aesthetic_intensity, AESTHETIC_BLOCKS["中度"])

                # F6: 设定档案引用块
                bible_block = build_bible_block(character_bible, i)

                chapter_prompt = chapter_prompt_tpl.format(
                    gender=gender, genre=genre, style=style,
                    chapter_title=title,
                    chapter_summary=summary + novel_context,
                    previous_summary=previous_summary,
                    target_words=per_chapter_target,
                    per_chapter_min=per_chapter_min, per_chapter_max=per_chapter_max,
                    pov=pov, pacing=pacing, style_intensity=style_intensity,
                    tension_block=tension_block,
                    theme_block=theme_block,
                    emotion_block=emotion_block,
                    golden_quote_block=golden_quote_block,
                    aesthetic_block=aesthetic_block,
                    bible_block=bible_block,
                )

                # F7: 使用已选开头作为第一章
                if opening_text and i == 0:
                    chapter_content = opening_text.strip()
                    full_content_parts.append(f"## {title}\n\n{chapter_content}")
                    previous_summary = f"上一章《{title}》概要：{chapter_content[:200]}..."
                    actual_words = len(chapter_content)
                    end_ts = datetime.now().isoformat()
                    if chapter_states:
                        chapter_states[-1]["status"] = "completed"
                        chapter_states[-1]["end_time"] = end_ts
                    _log(f"  第1章使用已选开头: {actual_words}字")
                    yield self._make_log(f"  ✅ 第1章使用已选开头（{actual_words}字）")
                    yield {"event": "content", "data": chapter_content}
                    yield {"event": "chapter_end", "data": {"title": title, "word_count": actual_words, "end_time": end_ts}}
                    full_so_far = "\n\n".join(full_content_parts)
                    update_novel_content(novel_id, full_so_far, chapters, db=_db)
                    save_single_chapter_file(novel_folder, title, 0, chapter_content, chapters)
                    if record_id:
                        update_record_progress(record_id, 1, len(chapters), full_so_far, chapter_states=chapter_states, db=_db)
                    continue

                # 分段生成
                chapter_content = ""
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
                                async for chunk in timeout_iterate(
                                    self.llm.generate_stream(seg_prompt),
                                    timeout=120, first_chunk_timeout=180,
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
                    for _attempt in range(2):
                        try:
                            async for chunk in timeout_iterate(
                                self.llm.generate_stream(chapter_prompt),
                                timeout=120, first_chunk_timeout=180,
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

                # ── 字数强制执行 ──
                actual_words = len(chapter_content)
                max_wc_retries = 3
                wc_retry = 0
                while actual_words < per_chapter_min and wc_retry < max_wc_retries:
                    needed = per_chapter_min - actual_words
                    yield self._make_log(f"  📏 第{i+1}章仅{actual_words}字，不足{per_chapter_min}字，补写约{needed}字...")
                    continue_prompt = (
                        f"\n\n🔴 本章当前共 {actual_words} 字，未达到最低 {per_chapter_min} 字要求。\n"
                        f"请从以下位置**继续写作**约 {needed} 字，保持风格和视角完全一致，不要重复已有内容：\n\n"
                        f"{chapter_content[-300:]}"
                    )
                    extra = ""
                    for _attempt in range(2):
                        try:
                            async for chunk in timeout_iterate(
                                self.llm.generate_stream(continue_prompt),
                                timeout=60, first_chunk_timeout=30,
                            ):
                                extra += chunk
                                yield {"event": "content", "data": chunk}
                            if extra.strip():
                                break
                        except Exception as e:
                            _log(f"⚠️ 第{i+1}章字数补全异常: {e}（第{_attempt+1}次）")
                        if _attempt == 0:
                            await asyncio.sleep(1)
                    if extra.strip():
                        chapter_content += "\n\n" + extra.strip()
                        actual_words = len(chapter_content)
                    wc_retry += 1

                if actual_words < per_chapter_min:
                    _log(f"⚠️ 第{i+1}章强制补全后仍不足{per_chapter_min}字（{actual_words}字）")

                # ── 字数超上限强制摘尾 ──
                cap = int(per_chapter_max * 1.2)
                if actual_words > cap:
                    _log(f"⚠️ 第{i+1}章字数{actual_words}超过上限{per_chapter_max}（上限120%={cap}），摘尾至{per_chapter_max}字")
                    yield self._make_log(f"  ⚠️ 第{i+1}章超出字数上限，自动裁减至{per_chapter_max}字")
                    trimmed = chapter_content[:per_chapter_max]
                    last_para_end = trimmed.rfind("\n\n")
                    if last_para_end > per_chapter_min:
                        trimmed = trimmed[:last_para_end]
                    elif per_chapter_max < len(chapter_content):
                        trimmed = chapter_content[:per_chapter_max]
                    chapter_content = trimmed
                    actual_words = len(chapter_content)
                    _log(f"  📏 裁剪后实际字数: {actual_words}")
                elif actual_words > per_chapter_max:
                    _log(f"⚠️ 第{i+1}章字数{actual_words}略超上限{per_chapter_max}（未超过120%）")

                full_content_parts.append(f"## {title}\n\n{chapter_content.strip()}")
                previous_summary = f"上一章《{title}》概要：{chapter_content[:200]}..."
                end_ts = datetime.now().isoformat()
                if chapter_states:
                    chapter_states[-1]["status"] = "completed"
                    chapter_states[-1]["end_time"] = end_ts

                _log(f"  第{i+1}章完成: 《{title}》 | 实际字数:{actual_words}")
                yield self._make_log(f"  ✅ 第{i+1}章完成（{actual_words}字）")

                # F6: 从本章提取设定档案更新
                try:
                    update = await extract_bible_update(self.llm, character_bible, chapter_content, i + 1)
                    if update:
                        character_bible = merge_bible(character_bible, update)
                except Exception as e:
                    _log(f"⚠️ 设定档案提取失败（可选）: {e}")
                yield {"event": "chapter_end", "data": {"title": title, "word_count": actual_words, "end_time": end_ts}}

                # 逐章持久化
                full_so_far = "\n\n".join(full_content_parts)
                update_novel_content(novel_id, full_so_far, chapters, db=_db)
                save_single_chapter_file(novel_folder, title, i, chapter_content, chapters)
                if record_id:
                    update_record_progress(record_id, i + 1, len(chapters), full_so_far, chapter_states=chapter_states, db=_db)

            # ── Step 4: 生成标题 ──
            self._current_step = "titling"
            full_content = "\n\n".join(full_content_parts)
            yield {"event": "title", "data": "正在生成标题..."}
            yield self._make_log("🏷️ 正在生成标题...")
            final_title = await generate_title(self.llm, full_content, gender, genre, title_prompt, theme_context=theme_context)
            yield self._make_log(f"🏷️ 标题生成完成：{final_title}")

            # F5: 生成文末解读
            interpretation = ""
            try:
                yield self._make_log("📖 正在生成故事解读...")
                interpretation = await generate_interpretation(self.llm, full_content, theme)
                if interpretation:
                    yield {"event": "interpretation", "data": {"interpretation": interpretation}}
                    yield self._make_log("📖 故事解读完成")
            except Exception as e:
                _log(f"⚠️ 故事解读生成失败（可选步骤）: {e}")

            actual_count = len(full_content)
            time_cost = time.time() - start_time

            # ── 最终持久化 ──
            outline_for_final = dict(outline_data) if isinstance(outline_data, dict) else {}
            outline_for_final.setdefault("chapters", chapters)
            outline_for_final.setdefault("elements", story_elements)
            finalize_novel(novel_id, final_title, full_content, chapters, story_elements,
                           seed_text, gender, genre, style, word_count,
                           per_chapter_min, per_chapter_max, actual_count,
                           model_config, time_cost, full_outline=outline_for_final,
                           theme=theme,
                           emotion_curve=json.dumps(emotion_curve, ensure_ascii=False) if emotion_curve else "",
                           aesthetic_intensity=aesthetic_intensity,
                           interpretation=interpretation,
                           character_bible=json.dumps(character_bible, ensure_ascii=False) if character_bible else "{}",
                           db=_db)
            save_full_txt(novel_folder, final_title, full_content_parts)

            # 重命名 doc 文件夹
            old_folder = novel_folder
            novel_folder = ensure_novel_folder(final_title)
            if old_folder != novel_folder and os.path.exists(old_folder):
                try:
                    os.renames(old_folder, novel_folder)
                except Exception:
                    pass
            save_outline_mindmap(novel_folder, final_title, chapters, story_elements, gender, genre, style,
                                 full_outline=outline_for_final)
            for fname in os.listdir(novel_folder):
                if fname.startswith("生成中") and (fname.endswith(".xmind") or fname.endswith(".md")):
                    try:
                        os.remove(os.path.join(novel_folder, fname))
                    except Exception:
                        pass

            _log(f"全部完成！标题:《{final_title}》 | 总字数:{actual_count} | 耗时:{time_cost:.1f}s")
            yield self._make_log(f"🎉 全部完成！标题《{final_title}》，总字数{actual_count}，耗时{time_cost:.1f}s")
            yield self._make_log(f"📁 文件已保存至 docs/novel/v3/{final_title}/")

            yield {
                "event": "complete",
                "data": {
                    "novel_id": novel_id, "title": final_title,
                    "total_words": actual_count, "time_cost": round(time_cost, 2),
                },
            }
            if record_id:
                update_record_complete(record_id, novel_id, chapter_states=chapter_states, db=_db)

            _db.close()
            update_novel_index(
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
                theme=theme,
                emotion_curve=json.dumps(emotion_curve, ensure_ascii=False) if emotion_curve else "",
            )

        except Exception as e:
            _log(f"❌ 生成失败: {str(e)}")
            yield {"event": "error", "data": {"message": str(e), "step": self._current_step}}
            if record_id:
                cs = locals().get('chapter_states')
                update_record_error(record_id, str(e), self._current_step, chapter_states=cs, db=_db)
            if novel_id:
                mark_novel_failed(novel_id, str(e), db=_db)
            _db.close()

    # ── 辅助方法（保留薄包装，方便外部调用） ──

    async def _generate_opening(self, seed_text: str, gender: str, genre: str, style: str,
                                 pacing: str, pov: str, style_intensity: str,
                                 theme: str, target_words: int = 500) -> str:
        return await generate_opening(self.llm, seed_text, gender, genre, style,
                                       pacing, pov, style_intensity, theme, target_words)

    async def generate_dialogue(self, characters: list, scenario: str) -> str:
        """生成角色对话（F8）"""
        profiles = []
        for c in characters:
            parts = [f"名字：{c.get('name', '未知')}"]
            if c.get("role"): parts.append(f"角色定位：{c['role']}")
            if c.get("traits"): parts.append(f"性格特征：{c['traits']}")
            if c.get("description"): parts.append(f"描述：{c['description']}")
            if c.get("relationships"): parts.append(f"关系：{c['relationships']}")
            if c.get("arc"): parts.append(f"成长弧光：{c['arc']}")
            profiles.append("\n".join(parts))
        char_str = "\n\n---\n\n".join(profiles)
        prompt = DIALOGUE_PROMPT.replace("{character_profiles}", char_str).replace("{scenario}", scenario)
        result = await call_llm(self.llm, prompt, timeout=90)
        return result.strip()

    async def generate_continuation(self, context: str, instruction: str = "", target_words: int = 300) -> AsyncGenerator[str, None]:
        """续写：从上下文末尾继续生成（F9）"""
        instruction_block = f"\n【用户要求】{instruction}\n" if instruction else ""
        prompt = ASSIST_CONTINUE_PROMPT.replace("{context}", context[-3000:])
        prompt = prompt.replace("{target_words}", str(target_words))
        prompt = prompt.replace("{instruction_block}", instruction_block)
        async for chunk in timeout_iterate(self.llm.generate_stream(prompt), timeout=60, first_chunk_timeout=30):
            yield chunk


def _strip_leading_title(content: str, title: str) -> str:
    lines = content.strip().split("\n")
    if lines:
        first = lines[0].strip()
        if re.match(r"^#{1,3}\s+", first):
            if title in first or re.search(r"第[一二三四五六七八九十\d]+章", first):
                lines = lines[1:]
    return "\n".join(lines).strip()
