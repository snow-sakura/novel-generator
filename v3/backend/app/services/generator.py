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
    EMOTION_CURVE_PROMPT,
    AESTHETIC_BLOCKS,
    ENDING_BLOCKS,
    INTERPRETATION_PROMPT,
    EXTRACT_BIBLE_PROMPT,
    DIALOGUE_PROMPT,
    ASSIST_CONTINUE_PROMPT,
)
from app.services.xmind import generate_xmind
from app.services.agents import (
    create_parser_agent,
    create_outliner_agent,
    create_writer_agent,
    create_titler_agent,
)

NOVEL_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "..", "..", "docs", "novel", "v3")
NOVEL_INDEX_PATH = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "..", "novels_index.json")


def _log(msg: str):
    ts = datetime.now().strftime("%H:%M:%S.%f")[:12]
    print(f"  [{ts}] [生成管线] {msg}", flush=True)


async def _timeout_iterate(agen: AsyncIterator, timeout: int = 120, first_chunk_timeout: int = 60, heartbeat_interval: int = 30) -> AsyncGenerator[str, None]:
    """逐块迭代异步生成器。
    - 首块：每 heartbeat_interval 秒检测一次，超时前持续 yield "" 保活
    - 后续块：单次 timeout 等待
    """
    ait = agen.__aiter__()
    is_first = True
    while True:
        try:
            t = first_chunk_timeout if is_first else timeout
            if is_first:
                elapsed = 0
                while elapsed < t:
                    try:
                        chunk = await asyncio.wait_for(ait.__anext__(), timeout=min(heartbeat_interval, t - elapsed))
                        is_first = False
                        yield chunk
                        break
                    except asyncio.TimeoutError:
                        elapsed += heartbeat_interval
                        yield ""  # 惰性心跳，防止连接断开
                if is_first:
                    _log(f"⚠️ 流式迭代超时（首块 {first_chunk_timeout}s）")
                    break
            else:
                chunk = await asyncio.wait_for(ait.__anext__(), timeout=t)
                yield chunk
        except StopAsyncIteration:
            break
        except asyncio.TimeoutError:
            if not is_first:
                _log(f"⚠️ 流式迭代超时（后续 {timeout}s）")
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

        # 构建主题上下文（用于 _safe_format 的 prompt）
        theme_context = (
            f"\n【核心主题】「{theme}」。全篇必须围绕此主题展开，结尾回扣主题点题。\n"
            if theme else ""
        )
        # 主题块基础模板（用于 str.format 的 chapter prompt）
        _theme_base = (
            f"\n【核心主题】「{theme}」"
            if theme else ""
        )
        _theme_last = (
            f"\n【结尾主题点题】这是全书最后一章，请在结尾处通过主角的感悟/对话/行动或故事结局画面，明确回扣核心主题「{theme}」，让读者清晰感受到主题的升华。\n"
            if theme else ""
        )

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

                formatted_parse = self._safe_format(parse_prompt, theme_context=theme_context)
                story_elements = await self._parse_elements(seed_text, gender, genre, style, formatted_parse)

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
                    enable_suspense=enable_suspense,
                    enable_twist=enable_twist,
                    theme_context=theme_context,
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
                # 恢复 outline_thinking / outline_done 事件，让前端恢复大纲展示
                if isinstance(outline_data, dict):
                    _outline_layers = []
                    _layer_names = ['strategy', 'characters', 'world']
                    for name in _layer_names:
                        ld = outline_data.get(name)
                        if ld and isinstance(ld, dict) and len(ld) > 0:
                            _outline_layers.append({"type": name, "data": ld})
                    # structure 层需合并 plot_structure + rhythm + style_tone
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

            # ── F2: 生成情感曲线（起承转合） ──
            emotion_curve = None
            if isinstance(outline_data, dict):
                emotion_curve = outline_data.get("emotion_curve")
            if not emotion_curve and continuation:
                emotion_curve = continuation.get("emotion_curve")
            if not emotion_curve and start_from_chapter == 0 and chapters:
                yield self._make_log("📊 正在规划情感曲线...")
                yield {"event": "log", "data": {"step": "outlining", "type": "info", "text": "📊 规划情感曲线（起承转合）..."}}
                emotion_curve = await self._generate_emotion_curve(
                    story_elements, gender, genre, style, theme, len(chapters),
                )
                if emotion_curve:
                    _log(f"📊 情感曲线规划完成：{len(emotion_curve)}章")
                    yield self._make_log(f"  ✅ 情感曲线完成（{len(emotion_curve)}章）")
                    yield {"event": "emotion_curve", "data": emotion_curve}
                    if isinstance(outline_data, dict):
                        outline_data["emotion_curve"] = emotion_curve

            # F6: 从大纲种子设定档案
            character_bible = self._seed_bible_from_outline(outline_data, story_elements, gender, genre, style)
            if character_bible:
                _log(f"📖 初始设定档案就绪：{len(character_bible.get('characters', []))} 角色, {len(character_bible.get('locations', []))} 地点")

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
                    time_cost=0, theme=theme,
                    emotion_curve=json.dumps(emotion_curve, ensure_ascii=False) if emotion_curve else "",
                    aesthetic_intensity=aesthetic_intensity,
                    character_bible=json.dumps(character_bible, ensure_ascii=False) if character_bible else "{}",
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
            per_chapter_target = max(per_chapter_min, min(per_chapter_max, per_chapter_target))

            # 先保存大纲和思维导图 scaffold
            novel_folder = _ensure_novel_folder(tmp_title)
            self._save_outline_mindmap(
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

                # 构建章节 prompt，始终包含题材约束 + 核心高概念
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

                # F3: 金句块（密度：每2000字1-2句）
                suggested_quotes = max(1, round(per_chapter_target * 1.5 / 2000))
                golden_quote_block = (
                    "\n【金句要求】\n"
                    f"请在以下三个位置插入金句（推荐{suggested_quotes}句）：章节结尾处、情感高潮处、主角领悟转折时刻。\n"
                    "金句用 `> *金句内容*` 格式（blockquote + 斜体），单独成段。\n"
                )

                # F4: 美学风格块
                aesthetic_block = AESTHETIC_BLOCKS.get(aesthetic_intensity, AESTHETIC_BLOCKS["中度"])

                # F6: 设定档案引用块
                bible_block = self._build_bible_block(character_bible, i)

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
                    # 仍然 yield content 让前端显示
                    yield {"event": "content", "data": chapter_content}
                    yield {"event": "chapter_end", "data": {"title": title, "word_count": actual_words, "end_time": end_ts}}
                    full_so_far = "\n\n".join(full_content_parts)
                    self._update_novel_content(novel_id, full_so_far, chapters)
                    self._save_single_chapter_file(novel_folder, title, 0, chapter_content, chapters)
                    if record_id:
                        self._update_record_progress(record_id, 1, len(chapters), full_so_far, chapter_states=chapter_states)
                    continue

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
                    # 直接生成（短章节）
                    for _attempt in range(2):
                        try:
                            async for chunk in _timeout_iterate(
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

                # ── 字数强制执行：不足 per_chapter_min 则续写 ──
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
                            async for chunk in _timeout_iterate(
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

                # ── 字数超上限强制执行：超出 per_chapter_max * 1.2 则摘尾 ──
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
                    update = await self._extract_bible_update(character_bible, chapter_content, i + 1)
                    if update:
                        character_bible = self._merge_bible(character_bible, update)
                except Exception as e:
                    _log(f"⚠️ 设定档案提取失败（可选）: {e}")
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
            formatted_title = title_prompt.replace("{theme_context}", theme_context)
            final_title = await self._generate_title(full_content, gender, genre, formatted_title)
            yield self._make_log(f"🏷️ 标题生成完成：{final_title}")

            # F5: 生成文末解读（可选，失败不影响主线）
            interpretation = ""
            try:
                yield self._make_log("📖 正在生成故事解读...")
                interpretation = await self._generate_interpretation(full_content, theme)
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
            self._finalize_novel(novel_id, final_title, full_content, chapters, story_elements,
                                 seed_text, gender, genre, style, word_count,
                                 per_chapter_min, per_chapter_max, actual_count,
                                 model_config, time_cost, full_outline=outline_for_final,
                                 theme=theme,
                                 emotion_curve=json.dumps(emotion_curve, ensure_ascii=False) if emotion_curve else "",
                                 aesthetic_intensity=aesthetic_intensity,
                                 interpretation=interpretation,
                                 character_bible=json.dumps(character_bible, ensure_ascii=False) if character_bible else "{}")
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
            yield self._make_log(f"📁 文件已保存至 docs/novel/v3/{final_title}/")

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
                theme=theme,
                emotion_curve=json.dumps(emotion_curve, ensure_ascii=False) if emotion_curve else "",
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
            if not novel:
                return
            from app.models.chapter_content import ChapterContent
            # 将 content 按章节拆分（格式 ## Title\n\ncontent）
            blocks = [b.strip() for b in re.split(r"\n(?=## )", content) if b and b.strip()]
            for idx, block in enumerate(blocks):
                title_match = re.match(r"## (.+)", block)
                title = title_match.group(1).strip() if title_match else (
                    chapters[idx].get("title", f"第{idx+1}章") if idx < len(chapters) else f"第{idx+1}章"
                )
                clean_content = re.sub(r"^## .+?\n?", "", block, count=1).strip()
                existing = db.query(ChapterContent).filter(
                    ChapterContent.novel_id == novel_id,
                    ChapterContent.chapter_index == idx,
                ).first()
                if existing:
                    existing.content = clean_content
                    existing.title = title
                    existing.word_count = len(clean_content)
                else:
                    ch = ChapterContent(
                        novel_id=novel_id, chapter_index=idx,
                        title=title, content=clean_content,
                        word_count=len(clean_content),
                    )
                    db.add(ch)
            novel.chapters = json.dumps(chapters, ensure_ascii=False)
            novel.actual_count = len(content)
            novel.updated_at = datetime.now()
            db.commit()
        finally:
            db.close()

    def _update_novel_outline(self, novel_id: int, chapters: list, elements: dict):
        db = SessionLocal()
        try:
            novel = db.query(Novel).filter(Novel.id == novel_id).first()
            if novel:
                outline_dict = {"chapters": chapters, "elements": elements}
                try:
                    tree = self._dict_to_tree(outline_dict)
                    outline_dict["_tree"] = tree
                except Exception:
                    pass
                novel.outline = json.dumps(outline_dict, ensure_ascii=False)
                db.commit()
        finally:
            db.close()

    def _finalize_novel(self, novel_id, title, content, chapters, elements,
                         seed_text, gender, genre, style, word_count,
                         per_chapter_min, per_chapter_max, actual_count,
                         model_config, time_cost, full_outline=None,
                         theme="", emotion_curve="", aesthetic_intensity="中度",
                         interpretation="", character_bible="{}"):
        db = SessionLocal()
        try:
            novel = db.query(Novel).filter(Novel.id == novel_id).first()
            if novel:
                # 从 chapter_contents 重建完整内容（作为 source of truth）
                from app.models.chapter_content import ChapterContent
                db_chapters = db.query(ChapterContent).filter(
                    ChapterContent.novel_id == novel_id
                ).order_by(ChapterContent.chapter_index).all()
                if db_chapters:
                    rebuilt = "\n\n".join(
                        f"## {ch.title}\n\n{ch.content}" for ch in db_chapters
                    )
                    content = rebuilt
                    actual_count = len(rebuilt)

                novel.title = title
                novel.content = content
                novel.actual_count = actual_count
                novel.chapters = json.dumps(chapters, ensure_ascii=False)
                outline_dict = dict(full_outline) if full_outline else {}
                outline_dict.setdefault("chapters", chapters)
                outline_dict.setdefault("elements", elements)
                novel.outline = json.dumps(outline_dict, ensure_ascii=False)
                novel.time_cost = time_cost
                novel.theme = theme
                novel.emotion_curve = emotion_curve
                novel.aesthetic_intensity = aesthetic_intensity
                novel.interpretation = interpretation
                novel.character_bible = character_bible
                novel.updated_at = datetime.now() if hasattr(novel, 'updated_at') else novel.created_at
                db.commit()
        finally:
            db.close()

    def _update_novel_index(self, title, seed_text, gender, genre, style,
                             word_count, per_chapter_min, per_chapter_max,
                             actual_count, content, chapters, outline,
                             model_used, model_config, time_cost,
                             record_id=None, record_status="completed",
                             completed_chapters=0, total_chapters=0,
                             theme="", emotion_curve=""):
        entry = {
            "title": title, "seed_text": seed_text,
            "gender": gender, "genre": genre, "style": style,
            "word_count": word_count,
            "per_chapter_min": per_chapter_min, "per_chapter_max": per_chapter_max,
            "actual_count": actual_count, "content": content,
            "chapters": chapters, "outline": outline,
            "model_used": model_used, "model_config": model_config or {},
            "time_cost": time_cost, "created_at": datetime.now().isoformat(),
            "theme": theme, "emotion_curve": emotion_curve,
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
                rec.content_sofar = content[-200000:]  # 保留最近内容供前端初始展示
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
                    first_chunk_timeout=180,
                ):
                    result += chunk
            try:
                await _collect()
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

    async def _parse_elements(self, seed_text: str, gender: str = "", genre: str = "", style: str = "", prompt_tpl: str = SYSTEM_PROMPT_PARSE) -> dict:
        # Inject genre/style into the user prompt so the LLM knows what context to parse within
        enriched = f"【用户设定】频道：{gender}，题材：{genre}，风格：{style}\n【种子句】{seed_text}\n\n请严格基于本题材框架解析以下种子句，不得偏离到其他题材。"
        result = await self._call_llm(enriched, prompt_tpl)
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
    def _extract_json(raw: str):
        """从 LLM 输出中提取并解析 JSON（支持 dict 和 list）"""
        stripped = raw.strip()
        # 先尝试 array（`[...]`），因为数组内的 `{...}` 会干扰 dict 提取
        if "[" in stripped:
            try:
                start = stripped.index("[")
                end = stripped.rindex("]") + 1
                return json.loads(stripped[start:end])
            except (ValueError, json.JSONDecodeError):
                pass
        # 再尝试 dict（`{...}`）
        if "{" in stripped:
            try:
                start = stripped.index("{")
                end = stripped.rindex("}") + 1
                return json.loads(stripped[start:end])
            except (ValueError, json.JSONDecodeError):
                pass
        return {}

    async def _generate_outline_5layer(self, story_elements, gender, genre, style,
                                        chapter_count, per_chapter_min, per_chapter_max,
                                        outline_prompts=None,
                                        enable_suspense=True, enable_twist=True,
                                        theme_context: str = "") -> AsyncGenerator[dict, None]:
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

            enhanced_cliffhanger_requirement = (
                "【悬念要求】每章必须设计一个章节结尾悬念（cliffhanger字段），让读者「停不下来」。"
                if enable_suspense else ""
            )
            twist_requirement = (
                "【反转要求】全篇至少安排一次意外反转（不超过2次），在对应章节的scenes中标注反转场景。"
                if enable_twist else ""
            )

            prompt = self._safe_format(
                tpl,
                gender=gender, genre=genre, style=style,
                story_elements=elements_str if not summaries else "",
                previous_layers=previous_layers,
                chapter_count=str(chapter_count),
                per_chapter_min=str(per_chapter_min), per_chapter_max=str(per_chapter_max),
                enhanced_cliffhanger_requirement=enhanced_cliffhanger_requirement,
                twist_requirement=twist_requirement,
                theme_context=theme_context,
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
                    if not layers[k]:
                        if k == "plot_structure":
                            layers[k] = {"three_acts": {"act1": "（生成失败，请重新生成）", "act2": "（生成失败，请重新生成）", "act3": "（生成失败，请重新生成）"}, "beat_sheet": [], "golden_three": []}
                        elif k == "rhythm":
                            layers[k] = {"satisfaction_points": [], "emotional_peaks": [], "pace_curve": "（暂缺）"}
                        elif k == "style_tone":
                            layers[k] = {"perspective": "第三人称有限", "language": "（暂缺）", "atmosphere": "（暂缺）"}
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

        # 构建树结构
        tree = self._dict_to_tree(layers)
        layers["_tree"] = tree

        yield self._make_log(f"✅ 大纲规划完成（{total}层）")
        yield {"event": "outline_done", "data": {"chapters": layers.get("chapters", []), "outline": layers, "tree": tree}}
        yield {"event": "_outline_result", "data": layers}

    @staticmethod
    def _default_emotion_curve(chapter_count: int) -> list:
        if not chapter_count or chapter_count <= 0:
            return []
        n = chapter_count
        phases = []
        phase_splits = [
            ("起", max(1, round(n * 0.2))),
            ("承", max(1, round(n * 0.4))),
            ("转", max(1, round(n * 0.3))),
            ("合", max(1, n - sum(p[1] for p in [
                ("起", max(1, round(n * 0.2))),
                ("承", max(1, round(n * 0.4))),
                ("转", max(1, round(n * 0.3))),
            ]))),
        ]
        # Recalculate splits to avoid double computation
        n1 = max(1, round(n * 0.2))
        n2 = max(1, round(n * 0.4))
        n3 = max(1, round(n * 0.3))
        n4 = max(1, n - n1 - n2 - n3)
        emotions_phase = {"起": ["平静", "好奇", "温暖"], "承": ["期待", "愉悦", "温馨", "热血"], "转": ["紧张", "悲伤", "愤怒", "绝望", "震撼"], "合": ["感动", "释然", "希望", "幸福", "激动"]}
        labels_phase = {"起": "故事导入", "承": "剧情发展", "转": "冲突高潮", "合": "结局收束"}
        result = []
        ch = 1
        for phase, count, base_intensity in [("起", n1, 2), ("承", n2, 3), ("转", n3, 4), ("合", n4, 3)]:
            emotions = emotions_phase.get(phase, ["平静"])
            for j in range(count):
                if ch > n:
                    break
                emotion = emotions[min(j, len(emotions) - 1)]
                intensity = min(5, max(1, base_intensity + (j - count // 2)))
                label = labels_phase.get(phase, "")
                result.append({"chapter": ch, "phase": phase, "emotion": emotion, "intensity": intensity, "label": label})
                ch += 1
        return result

    async def _generate_emotion_curve(self, story_elements, gender, genre, style, theme, chapter_count) -> list:
        """基于故事要素 + 章节数，调用 LLM 规划情感曲线"""
        if not chapter_count or chapter_count <= 0:
            return []
        theme_str = theme or "无"
        elements_str = json.dumps(story_elements, ensure_ascii=False, indent=2)[:1000]
        prompt = EMOTION_CURVE_PROMPT.format(
            genre=genre, style=style, theme=theme_str,
            story_elements=elements_str,
            chapter_count=chapter_count,
        )
        raw = await self._call_llm(prompt, timeout=120)
        parsed = self._extract_json(raw)
        if not isinstance(parsed, list) or len(parsed) == 0:
            _log(f"⚠️ 情感曲线生成失败或格式错误: {str(parsed)[:200]}，使用默认曲线")
            return self._default_emotion_curve(chapter_count)
        # 确保 chapter 字段连续无断裂
        result = []
        for item in parsed:
            if isinstance(item, dict) and "chapter" in item and "emotion" in item:
                item.setdefault("phase", "起")
                item.setdefault("intensity", 3)
                item.setdefault("label", "")
                result.append(item)
        return result

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

    @staticmethod
    def _dict_to_tree(flat, root_title="创作大纲"):
        """将 flat dict（5层 + chapters）转换为 TreeNode 数组
        返回: [TreeNode, ...] 即根节点的 children
        """
        T = lambda t: t  # label helper 直接用

        LABELS = {
            "strategy": "1. 战略层", "core_idea": "核心立意", "high_concept": "高概念设定",
            "unique_selling_point": "独特卖点", "tone": "故事基调",
            "theme": "思想主题", "core_question": "核心问题",
            "values": "价值观", "ending": "结局预判", "type": "结局类型", "final_scene": "最终场景",
            "characters": "2. 人物层", "protagonist": "主角",
            "name": "姓名", "age": "年龄", "identity": "身份", "initial_state": "初始状态",
            "desire": "核心欲望", "flaw": "核心缺陷", "traits": "性格特质", "arc": "成长弧线",
            "supporting": "配角", "love_interest": "情感线对象",
            "antagonist": "反派",
            "motive": "动机", "threat": "压迫感", "value_opposition": "价值对立", "conflict_point": "冲突点",
            "relationships": "人物关系网",
            "world": "3. 设定层", "time_space": "时空背景", "era": "时代", "locations": "场景",
            "core_conflict_source": "核心冲突根源",
            "rules": "规则体系", "world_rules": "世界规则", "power_system": "力量体系",
            "social_structure": "社会结构", "factions": "势力格局", "description": "描述", "alignment": "立场",
            "devices": "设定与伏笔", "power_rules": "力量/金手指规则", "key_items": "核心道具/关键线索",
            "foreshadowing": "伏笔清单", "item": "伏笔内容", "planned_reveal": "计划揭晓",
            "plot_structure": "4. 结构层", "three_acts": "三幕式",
            "act1": "第一幕·建置", "act2": "第二幕·对抗", "act3": "第三幕·结局",
            "beat_sheet": "节拍表", "beat": "节拍", "chapter_range": "章节范围",
            "golden_three": "黄金三章", "hook": "钩子", "function": "功能定位",
            "rhythm": "5. 节奏层", "satisfaction_points": "爽点布局", "emotional_peaks": "泪点/痛点",
            "pace_curve": "节奏曲线",
            "style_tone": "6. 风格层", "perspective": "叙事视角", "language": "语言风格",
            "atmosphere": "氛围基调",
            "chapters": "7. 章节细纲", "summary": "概要", "cliffhanger": "悬念", "word_count_estimate": "字数预估",
            "role": "作用", "locations": "场景",
        }

        def val_label(k):
            return LABELS.get(k, k)

        def flatten(k, v, depth=0):
            """将任意 value 转换为 title string"""
            if v is None:
                return None
            label = val_label(k)
            if isinstance(v, str):
                if not v.strip():
                    return None
                return f"{label}: {v.strip()}"
            if isinstance(v, (int, float)):
                return f"{label}: {v}"
            if isinstance(v, list):
                if not v:
                    return None
                items = []
                for item in v:
                    if isinstance(item, dict):
                        item_title = item.get("title") or item.get("name") or item.get("beat") or ""
                        sub_children = []
                        for sk, sv in item.items():
                            if sk in ("title", "name", "beat"):
                                continue
                            sub = flatten(sk, sv, depth + 1)
                            if sub:
                                sub_children.append({"title": sub})
                        items.append({"title": f"{label} — {item_title}" if item_title else label, "children": sub_children} if sub_children else {"title": f"{label} — {item_title}"} if item_title else None)
                    else:
                        items.append({"title": f"{label}: {item}"})
                return [x for x in items if x] or None
            if isinstance(v, dict):
                children = []
                for sk, sv in v.items():
                    # 跳过与父级同名的子键（如 strategy: {strategy: {...}} 旧数据）
                    if sk == k:
                        sub = flatten(sk, sv, depth + 1)
                        if sub is None:
                            continue
                        if isinstance(sub, list):
                            children.extend(sub)
                        elif isinstance(sub, str):
                            children.append({"title": sub})
                        elif isinstance(sub, dict):
                            # 展开孙子节点，避免重复层
                            if sub.get("children"):
                                children.extend(sub["children"])
                            else:
                                children.append(sub)
                    else:
                        result = flatten(sk, sv, depth + 1)
                        if result is None:
                            continue
                        if isinstance(result, list):
                            children.extend(result)
                        elif isinstance(result, str):
                            children.append({"title": result})
                        elif isinstance(result, dict):
                            children.append(result)
                if not children:
                    return None
                return {"title": label, "children": children}
            return None

        SECTION_ORDER = [
            "strategy", "characters", "world", "plot_structure", "rhythm", "style_tone"
        ]
        children = []
        for sec in SECTION_ORDER:
            if sec in flat and flat[sec]:
                result = flatten(sec, flat[sec])
                if result:
                    if isinstance(result, list):
                        children.extend(result)
                    elif isinstance(result, str):
                        children.append({"title": result})
                    elif isinstance(result, dict):
                        children.append(result)

        if "chapters" in flat and flat["chapters"]:
            chs = flat["chapters"]
            if isinstance(chs, dict) and "chapters" in chs:
                chs = chs["chapters"]
            if isinstance(chs, list) and chs:
                ch_children = []
                for i, ch in enumerate(chs):
                    ch_title = ch.get("title", f"第{i+1}章")
                    ch_sub = []
                    for sk in ("summary", "hook", "cliffhanger", "word_count_estimate", "function"):
                        sv = ch.get(sk)
                        if sv and (isinstance(sv, str) and sv.strip()) or (isinstance(sv, (int, float))):
                            ch_sub.append({"title": flatten(sk, sv)})
                    ch_children.append({
                        "title": f"第{i+1}章《{ch_title}》",
                        "children": ch_sub,
                    })
                children.append({"title": "7. 章节细纲", "children": ch_children})

        return children

    async def _generate_title(self, content, gender, genre, prompt_tpl=SYSTEM_PROMPT_TITLE) -> str:
        preview = content[:500]
        prompt = f"{gender}频道{genre}题材小说开头：\n{preview}\n\n请为这篇{genre}题材小说起一个5-15字的吸引人标题，必须贴合{genre}题材的典型风格和内容："
        # Format the system prompt template with user params (it has {gender}/{genre} placeholders)
        system_prompt = prompt_tpl.replace("{gender}", gender).replace("{genre}", genre)
        result = await self._call_llm(prompt, system_prompt)
        return result.strip() or "未命名小说"

    async def _generate_interpretation(self, content: str, theme: str) -> str:
        preview = content[:2000]
        if len(content) > 3000:
            preview += "\n\n（中间省略）\n\n" + content[-2000:]
        prompt = INTERPRETATION_PROMPT.replace("{content}", preview)
        if theme:
            prompt += f"\n\n核心主题：「{theme}」，请在解读中突出此主题。"
        result = await self._call_llm(prompt, "", timeout=60)
        return result.strip() or ""

    def _seed_bible_from_outline(self, outline_data, story_elements, gender, genre, style):
        """从大纲的 L2+L3 层种子初始设定档案"""
        bible = {"characters": [], "locations": [], "world_rules": [], "key_items": [], "timeline": []}
        if not outline_data and not story_elements:
            return bible
        data = dict(outline_data or {})
        elements = dict(story_elements or {})

        # L2 角色层 (dict mode)
        chars = data.get("characters", data.get("L2", data.get("characters_and_relations", "")))
        if isinstance(chars, dict):
            prot = chars.get("protagonist", {})
            if isinstance(prot, dict) and prot.get("name"):
                bible["characters"].append({
                    "name": prot["name"], "role": "主角",
                    "traits": prot.get("traits", ""),
                    "relationships": prot.get("relationships", ""),
                    "arc": prot.get("arc", ""),
                })
            for sup in chars.get("supporting", []):
                if isinstance(sup, dict) and sup.get("name"):
                    bible["characters"].append({
                        "name": sup["name"], "role": sup.get("type", "配角"),
                        "traits": sup.get("traits", ""),
                        "relationships": sup.get("relationship", ""),
                        "arc": "",
                    })
            antag = chars.get("antagonist", {})
            if isinstance(antag, dict) and antag.get("name"):
                bible["characters"].append({
                    "name": antag["name"], "role": "反派",
                    "traits": antag.get("traits", ""),
                    "relationships": "",
                    "arc": "",
                })
        elif isinstance(chars, str):
            parts = [p.strip() for p in chars.replace("\n", "，").split("，") if p.strip()]
            for p in parts:
                if "：" in p or ":" in p:
                    sep = "：" if "：" in p else ":"
                    name, desc = p.split(sep, 1)
                    bible["characters"].append({"name": name.strip(), "role": "角色", "traits": desc.strip(), "relationships": "", "arc": ""})
                elif p:
                    bible["characters"].append({"name": p, "role": "角色", "traits": "", "relationships": "", "arc": ""})

        # L3 世界观 — 提取 locations
        world = data.get("world", data.get("L3", ""))
        if isinstance(world, dict):
            ts = world.get("time_space", {})
            if isinstance(ts, dict):
                locs_str = ts.get("locations", "")
                if isinstance(locs_str, str) and locs_str.strip():
                    for loc in locs_str.replace("，", "，").split("、"):
                        loc = loc.strip()
                        if loc and len(loc) > 1:
                            bible["locations"].append({"name": loc, "description": ""})
                elif isinstance(locs_str, list):
                    for loc in locs_str:
                        if isinstance(loc, str) and loc.strip():
                            bible["locations"].append({"name": loc.strip(), "description": ""})
            # world_rules
            rules = world.get("rules", {})
            if isinstance(rules, dict):
                for k, v in rules.items():
                    if isinstance(v, str) and v.strip():
                        bible["world_rules"].append(f"{k}: {v}")
            # factions
            for f in world.get("factions", []):
                if isinstance(f, dict) and f.get("name"):
                    bible["world_rules"].append(f"势力【{f['name']}】: {f.get('description', '')}")
        elif isinstance(world, str) and world.strip():
            for line in world.split("\n"):
                line = line.strip().lstrip("- ").lstrip("* ")
                if line and len(line) > 3:
                    bible["world_rules"].append(line)

        # 从 elements 提取主角 — 仅在大纲无角色数据时使用
        has_real_chars = any(
            len(c.get("name", "")) <= 6 and c.get("name", "").strip()
            for c in bible["characters"]
        )
        if not has_real_chars:
            protagonist = elements.get("protagonist", elements.get("主角", ""))
            if isinstance(protagonist, str) and protagonist.strip():
                raw = protagonist.strip()
                # 尝试从末尾的逗号/句号分割，取第一个语义块的前2-6字
                for sep in ['，', ',', '。', '的', '是']:
                    if sep in raw:
                        idx = raw.index(sep)
                        before = raw[:idx].strip()
                        for prefix in ['一位', '一个', '名叫', '名为', '叫', '他是', '她是', '他是名', '她是名']:
                            if before.startswith(prefix):
                                before = before[len(prefix):].strip()
                                break
                        if 2 <= len(before) <= 6:
                            raw = before
                            break
                if len(raw) > 8:
                    raw = raw[:6]
                existing = any(c["name"] == raw for c in bible["characters"])
                if not existing and len(raw) <= 8:
                    bible["characters"].insert(0, {"name": raw, "role": "主角", "traits": "", "relationships": "", "arc": ""})
        if not has_real_chars:
            supporter = elements.get("supporter", elements.get("配角", ""))
            if isinstance(supporter, str) and supporter.strip():
                existing = any(c["name"] == supporter for c in bible["characters"])
                if not existing:
                    bible["characters"].append({"name": supporter, "role": "配角", "traits": "", "relationships": "", "arc": ""})

        # 世界观规则
        setting = elements.get("setting", elements.get("世界观", ""))
        if isinstance(setting, str) and setting.strip():
            bible["world_rules"].append(f"世界观：{setting.strip()}")

        return bible

    def _build_bible_block(self, bible: dict, chapter_index: int) -> str:
        """构建设定档案引用块，注入到章节 prompt"""
        if not bible or all(len(v) == 0 for v in bible.values()):
            return ""
        lines = ["\n【设定档案（跨章节一致性）】"]
        if bible.get("characters"):
            lines.append("\n当前已登场角色：")
            for c in bible["characters"][:8]:
                parts = [c["name"]]
                if c.get("traits"): parts.append(c["traits"])
                if c.get("relationships"): parts.append(c["relationships"])
                lines.append(f"- {'，'.join(parts)}")
        if bible.get("locations"):
            lines.append("\n已有地点：")
            for loc in bible["locations"][:5]:
                lines.append(f"- {loc['name']}：{loc.get('description', '')}")
        if bible.get("world_rules"):
            lines.append("\n世界观规则：")
            for r in bible["world_rules"][:5]:
                lines.append(f"- {r}")
        if bible.get("key_items"):
            lines.append("\n关键物品：")
            for item in bible["key_items"][:5]:
                lines.append(f"- {item['name']}：{item.get('description', '')}")
        if bible.get("timeline"):
            lines.append("\n已有时间线：")
            for t in bible["timeline"][-5:]:
                lines.append(f"- 第{t.get('chapter', '?')}章：{t.get('events', '')}")

        lines.append("\n⚠️ 请严格遵守以上设定，角色行为、世界观、物品能力必须前后一致。如有新增角色/地点/规则，需与已有设定兼容。")
        return "\n".join(lines)

    async def _extract_bible_update(self, current_bible: dict, chapter_content: str, chapter_num: int) -> dict:
        """从本章内容提取设定更新"""
        preview = chapter_content[:3000]
        current_json = json.dumps(current_bible, ensure_ascii=False)
        prompt = EXTRACT_BIBLE_PROMPT.replace("{current_bible}", current_json)
        prompt = prompt.replace("{chapter_content}", preview)
        result = await self._call_llm(prompt, "", timeout=60)
        try:
            return json.loads(result.strip())
        except (json.JSONDecodeError, ValueError):
            return {}

    async def _generate_opening(self, seed_text: str, gender: str, genre: str, style: str,
                                 pacing: str, pov: str, style_intensity: str,
                                 theme: str, target_words: int = 500) -> str:
        """生成一个开头版本（约 300-500 字），用于 F7 对比模式"""
        theme_block = f"\n【核心主题】「{theme}」\n" if theme else ""
        prompt = (
            f"你正在创作一篇{gender}频道{genre}题材、{style}风格的小说开头。\n"
            f"\n【叙事视角】{pov}\n"
            f"【节奏模式】{pacing}\n"
            f"【风格强度】{style_intensity}\n"
            f"{theme_block}"
            f"\n【种子句】{seed_text}\n"
            f"\n请写一个引人入胜的开头（约{target_words}字），要求：\n"
            f"1. 快速切入故事，第一段就要吸引读者\n"
            f"2. 自然引出主角和背景\n"
            f"3. 结尾留下悬念或期待感\n"
            f"4. 保持{style}风格\n"
            f"5. 输出纯文本，不要标题"
        )
        result = await self._call_llm(prompt, timeout=60)
        return result.strip()

    @staticmethod
    def _merge_bible(current: dict, update: dict) -> dict:
        """将提取的更新合并到当前设定档案"""
        merged = {k: list(v) for k, v in current.items()}
        for key in ("characters", "locations", "key_items"):
            for item in update.get(key, []):
                name = item.get("name", "")
                if not name:
                    continue
                existing = None
                for i, ex in enumerate(merged.get(key, [])):
                    if ex.get("name") == name:
                        existing = i
                        break
                if existing is not None:
                    for k, v in item.items():
                        if v and k != "name":
                            merged[key][existing][k] = v
                else:
                    merged.setdefault(key, []).append(item)
        for rule in update.get("world_rules", []):
            if rule and rule not in merged.get("world_rules", []):
                merged.setdefault("world_rules", []).append(rule)
        for entry in update.get("timeline", []):
            ch = entry.get("chapter")
            if ch:
                existing = any(t.get("chapter") == ch for t in merged.get("timeline", []))
                if not existing:
                    merged.setdefault("timeline", []).append(entry)
        return merged

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
        result = await self._call_llm(prompt, timeout=90)
        return result.strip()

    async def generate_continuation(self, context: str, instruction: str = "", target_words: int = 300) -> AsyncGenerator[str, None]:
        """续写：从上下文末尾继续生成（F9）"""
        instruction_block = f"\n【用户要求】{instruction}\n" if instruction else ""
        prompt = ASSIST_CONTINUE_PROMPT.replace("{context}", context[-3000:])
        prompt = prompt.replace("{target_words}", str(target_words))
        prompt = prompt.replace("{instruction_block}", instruction_block)
        async for chunk in _timeout_iterate(self.llm.generate_stream(prompt), timeout=60, first_chunk_timeout=30):
            yield chunk


def _strip_leading_title(content: str, title: str) -> str:
    lines = content.strip().split("\n")
    if lines:
        first = lines[0].strip()
        if re.match(r"^#{1,3}\s+", first):
            if title in first or re.search(r"第[一二三四五六七八九十\d]+章", first):
                lines = lines[1:]
    return "\n".join(lines).strip()
