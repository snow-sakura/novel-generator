"""设定档案服务 — 跨章节角色/地点/世界观一致性管理"""
import json
from datetime import datetime

from app.services.prompts import EXTRACT_BIBLE_PROMPT
from app.llm.provider import LLMProvider
from app.services.llm_utils import call_llm


def _log(msg: str):
    ts = datetime.now().strftime("%H:%M:%S.%f")[:12]
    print(f"  [{ts}] [圣经服务] {msg}", flush=True)


def seed_bible_from_outline(outline_data: dict, story_elements: dict,
                            gender: str = "", genre: str = "", style: str = "") -> dict:
    """从大纲的 L2+L3 层种子初始设定档案"""
    bible = {"characters": [], "locations": [], "world_rules": [], "key_items": [], "timeline": []}
    if not outline_data and not story_elements:
        return bible
    data = dict(outline_data or {})
    elements = dict(story_elements or {})

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
        rules = world.get("rules", {})
        if isinstance(rules, dict):
            for k, v in rules.items():
                if isinstance(v, str) and v.strip():
                    bible["world_rules"].append(f"{k}: {v}")
        for f in world.get("factions", []):
            if isinstance(f, dict) and f.get("name"):
                bible["world_rules"].append(f"势力【{f['name']}】: {f.get('description', '')}")
    elif isinstance(world, str) and world.strip():
        for line in world.split("\n"):
            line = line.strip().lstrip("- ").lstrip("* ")
            if line and len(line) > 3:
                bible["world_rules"].append(line)

    has_real_chars = any(
        len(c.get("name", "")) <= 6 and c.get("name", "").strip()
        for c in bible["characters"]
    )
    if not has_real_chars:
        protagonist = elements.get("protagonist", elements.get("主角", ""))
        if isinstance(protagonist, str) and protagonist.strip():
            raw = protagonist.strip()
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
            if not any(c["name"] == raw for c in bible["characters"]) and len(raw) <= 8:
                bible["characters"].insert(0, {"name": raw, "role": "主角", "traits": "", "relationships": "", "arc": ""})

        supporter = elements.get("supporter", elements.get("配角", ""))
        if isinstance(supporter, str) and supporter.strip():
            if not any(c["name"] == supporter for c in bible["characters"]):
                bible["characters"].append({"name": supporter, "role": "配角", "traits": "", "relationships": "", "arc": ""})

    setting = elements.get("setting", elements.get("世界观", ""))
    if isinstance(setting, str) and setting.strip():
        bible["world_rules"].append(f"世界观：{setting.strip()}")
    return bible


def build_bible_block(bible: dict, chapter_index: int) -> str:
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


async def extract_bible_update(llm: LLMProvider, current_bible: dict, chapter_content: str, chapter_num: int) -> dict:
    """从本章内容提取设定更新"""
    preview = chapter_content[:3000]
    current_json = json.dumps(current_bible, ensure_ascii=False)
    prompt = EXTRACT_BIBLE_PROMPT.replace("{current_bible}", current_json)
    prompt = prompt.replace("{chapter_content}", preview)
    result = await call_llm(llm, prompt, "", timeout=60)
    try:
        return json.loads(result.strip())
    except (json.JSONDecodeError, ValueError):
        return {}


def merge_bible(current: dict, update: dict) -> dict:
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
            if not any(t.get("chapter") == ch for t in merged.get("timeline", [])):
                merged.setdefault("timeline", []).append(entry)
    return merged
