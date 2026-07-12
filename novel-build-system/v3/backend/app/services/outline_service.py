"""大纲生成服务 — 五层独立大纲 + 情感曲线 + 标题 + 文末解读"""
import json
from datetime import datetime
from typing import AsyncGenerator, Optional

from app.services.prompts import (
    SYSTEM_PROMPT_L1_STRATEGY,
    SYSTEM_PROMPT_L2_CHARACTERS,
    SYSTEM_PROMPT_L3_WORLD,
    SYSTEM_PROMPT_L4_STRUCTURE,
    SYSTEM_PROMPT_L5_CHAPTERS,
    SYSTEM_PROMPT_TITLE,
    EMOTION_CURVE_PROMPT,
    INTERPRETATION_PROMPT,
)
from app.llm.provider import LLMProvider
from app.services.llm_utils import call_llm, extract_json


def _log(msg: str):
    ts = datetime.now().strftime("%H:%M:%S.%f")[:12]
    print(f"  [{ts}] [大纲服务] {msg}", flush=True)


def _safe_format(template: str, **kwargs) -> str:
    """仅替换 {key} 占位符，不影响 JSON 结构中的 { }"""
    for key, val in kwargs.items():
        template = template.replace(f"{{{key}}}", str(val))
    return template


# ── 要素解析 ──

async def parse_elements(llm: LLMProvider, seed_text: str, gender: str, genre: str,
                          style: str, prompt_tpl: str) -> dict:
    """从种子句中解析六维故事要素"""
    from app.services.prompts import SYSTEM_PROMPT_PARSE
    enriched = f"【用户设定】频道：{gender}，题材：{genre}，风格：{style}\n【种子句】{seed_text}\n\n请严格基于本题材框架解析以下种子句，不得偏离到其他题材。"
    result = await call_llm(llm, enriched, prompt_tpl)
    parsed = extract_json(result)
    if not parsed:
        return {"protagonist": "未知角色", "time_era": "未知时间", "locations": "未知地点",
                "conflict_type": "未知", "inciting_incident": seed_text,
                "development": "待展开", "resolution_tendency": "正剧", "world_tone": "写实"}
    return parsed


# ── 五层大纲生成 ──

LAYER_LABELS = {
    "strategy": "战略层", "characters": "人物层", "world": "世界观层",
    "structure": "情节+节奏+风格层", "chapters": "章节细纲层",
}
LAYER_OUTPUT_KEYS = {
    "strategy": "strategy", "characters": "characters", "world": "world",
    "structure": ("plot_structure", "rhythm", "style_tone"),
    "chapters": "chapters",
}
LAYER_CONFIGS = [
    ("strategy", SYSTEM_PROMPT_L1_STRATEGY, {}),
    ("characters", SYSTEM_PROMPT_L2_CHARACTERS, {}),
    ("world", SYSTEM_PROMPT_L3_WORLD, {}),
    ("structure", SYSTEM_PROMPT_L4_STRUCTURE, {}),
    ("chapters", SYSTEM_PROMPT_L5_CHAPTERS, {}),
]


async def generate_outline_5layer(
    llm: LLMProvider,
    story_elements: dict,
    gender: str, genre: str, style: str,
    chapter_count: int,
    per_chapter_min: int, per_chapter_max: int,
    outline_prompts: Optional[dict] = None,
    enable_suspense: bool = True,
    enable_twist: bool = True,
    theme_context: str = "",
    make_log=None,
) -> AsyncGenerator[dict, None]:
    """五层独立大纲生成器：每层一次微型 LLM 调用，串行 yield 事件"""
    elements_str = json.dumps(story_elements, ensure_ascii=False, indent=2)

    configs = list(LAYER_CONFIGS)
    if outline_prompts:
        for i, (name, _, _) in enumerate(configs):
            if name in outline_prompts:
                configs[i] = (name, outline_prompts[name], configs[i][2])

    total = len(configs)
    layers = {}

    for idx, (name, tpl, _) in enumerate(configs):
        label = LAYER_LABELS.get(name, name)
        if make_log:
            yield make_log(f"📐 大纲第{idx+1}/{total}层：生成{label}...")
        yield {"event": "outline_thinking", "data": {"type": "_progress", "step": idx + 1, "total": total, "label": label}}

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

        prompt = _safe_format(
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

        raw = await call_llm(llm, prompt, timeout=120)
        parsed = extract_json(raw)
        if not parsed:
            _log(f"⚠️ {label}层为空，跳过")
            if make_log:
                yield make_log(f"  ⚠️ {label}生成失败，跳过", type="warning")
        else:
            preview = json.dumps(parsed, ensure_ascii=False, indent=2)[:800]
            _log(f"  ✅ {label}: {preview}")
            yield {"event": "outline_thinking", "data": {"type": name, "data": parsed}}
            if make_log:
                yield make_log(f"  ✅ {label}完成")

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

        if name == "chapters":
            ch = layers.get("chapters", [])
            if isinstance(ch, dict) and "chapters" in ch:
                layers["chapters"] = ch["chapters"]

    for key in ("strategy", "characters", "world", "plot_structure", "rhythm", "style_tone", "chapters"):
        layers.setdefault(key, {} if key != "chapters" else _fallback_chapters(chapter_count))
    layers.setdefault("elements", story_elements)

    tree = _dict_to_tree(layers)
    layers["_tree"] = tree

    if make_log:
        yield make_log(f"✅ 大纲规划完成（{total}层）")
    yield {"event": "outline_done", "data": {"chapters": layers.get("chapters", []), "outline": layers, "tree": tree}}
    yield {"event": "_outline_result", "data": layers}


def _fallback_chapters(count):
    return [{"title": f"第{i+1}章", "summary": "内容待展开", "hook": "", "cliffhanger": "",
             "function": "", "word_count_estimate": 2000} for i in range(count)]


# ── 情感曲线 ──

def _default_emotion_curve(chapter_count: int) -> list:
    """默认情感曲线（LLM 生成失败时使用）"""
    if not chapter_count or chapter_count <= 0:
        return []
    n = chapter_count
    n1 = max(1, round(n * 0.2))
    n2 = max(1, round(n * 0.4))
    n3 = max(1, round(n * 0.3))
    n4 = max(1, n - n1 - n2 - n3)
    emotions_phase = {"起": ["平静", "好奇", "温暖"], "承": ["期待", "愉悦", "温馨", "热血"],
                      "转": ["紧张", "悲伤", "愤怒", "绝望", "震撼"], "合": ["感动", "释然", "希望", "幸福", "激动"]}
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


async def generate_emotion_curve(llm: LLMProvider, story_elements: dict,
                                  gender: str, genre: str, style: str, theme: str,
                                  chapter_count: int) -> list:
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
    raw = await call_llm(llm, prompt, timeout=120)
    parsed = extract_json(raw)
    if not isinstance(parsed, list) or len(parsed) == 0:
        _log(f"⚠️ 情感曲线生成失败或格式错误: {str(parsed)[:200]}，使用默认曲线")
        return _default_emotion_curve(chapter_count)
    result = []
    for item in parsed:
        if isinstance(item, dict) and "chapter" in item and "emotion" in item:
            item.setdefault("phase", "起")
            item.setdefault("intensity", 3)
            item.setdefault("label", "")
            result.append(item)
    return result


# ── 标题生成 ──

async def generate_title(llm: LLMProvider, content: str, gender: str, genre: str,
                          prompt_tpl: str = SYSTEM_PROMPT_TITLE, theme_context: str = "") -> str:
    """为小说生成吸引人的标题"""
    preview = content[:500]
    prompt = f"{gender}频道{genre}题材小说开头：\n{preview}\n\n请为这篇{genre}题材小说起一个5-15字的吸引人标题，必须贴合{genre}题材的典型风格和内容："
    system_prompt = prompt_tpl.replace("{gender}", gender).replace("{genre}", genre)
    result = await call_llm(llm, prompt, system_prompt)
    return result.strip() or "未命名小说"


# ── 文末解读 ──

async def generate_interpretation(llm: LLMProvider, content: str, theme: str) -> str:
    """生成文末解读（F5）"""
    preview = content[:2000]
    if len(content) > 3000:
        preview += "\n\n（中间省略）\n\n" + content[-2000:]
    prompt = INTERPRETATION_PROMPT.replace("{content}", preview)
    if theme:
        prompt += f"\n\n核心主题：「{theme}」，请在解读中突出此主题。"
    result = await call_llm(llm, prompt, "", timeout=60)
    return result.strip() or ""


# ── 多版本开头 ──

async def generate_opening(llm: LLMProvider, seed_text: str, gender: str, genre: str, style: str,
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
    result = await call_llm(llm, prompt, timeout=60)
    return result.strip()


# ── 树结构构建（XMind 用） ──

LABELS_TREE = {
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


def _dict_to_tree(flat, root_title="创作大纲"):
    """将 flat dict（5层 + chapters）转换为 TreeNode 数组"""
    def val_label(k):
        return LABELS_TREE.get(k, k)

    def flatten(k, v, depth=0):
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
                    items.append({"title": f"{label} — {item_title}" if item_title else label,
                                  "children": sub_children} if sub_children else
                                 {"title": f"{label} — {item_title}"} if item_title else None)
                else:
                    items.append({"title": f"{label}: {item}"})
            return [x for x in items if x] or None
        if isinstance(v, dict):
            children = []
            for sk, sv in v.items():
                if sk == k:
                    sub = flatten(sk, sv, depth + 1)
                    if sub is None:
                        continue
                    if isinstance(sub, list):
                        children.extend(sub)
                    elif isinstance(sub, str):
                        children.append({"title": sub})
                    elif isinstance(sub, dict):
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
