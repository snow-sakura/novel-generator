"""文件操作服务 — 小说文件存储、大纲导出、XMind 生成"""
import os
import re
from datetime import datetime
from typing import Optional

from app.services.xmind import generate_xmind


NOVEL_DIR = os.path.join(
    os.path.dirname(os.path.dirname(os.path.dirname(__file__))),
    "..", "..", "docs", "novel", "v3",
)


def _log(msg: str):
    ts = datetime.now().strftime("%H:%M:%S.%f")[:12]
    print(f"  [{ts}] [文件服务] {msg}", flush=True)


def ensure_novel_folder(title: str) -> str:
    """确保小说文件夹存在，返回路径"""
    safe_title = re.sub(r'[\\/:*?"<>|]', "", title).strip() or "未命名小说"
    folder = os.path.join(NOVEL_DIR, safe_title)
    os.makedirs(folder, exist_ok=True)
    return folder


def save_single_chapter_file(folder: str, title: str, index: int, content: str, chapters: list):
    """保存单章为独立 TXT 文件"""
    ch_title = chapters[index].get("title", f"第{index+1}章")
    clean_text = re.sub(r"^## .+?\n\n", "", f"## {title}\n\n{content}", count=1).strip()
    chapter_path = os.path.join(folder, f"第{index+1}章 {ch_title}.txt")
    try:
        with open(chapter_path, "w", encoding="utf-8") as f:
            f.write(f"{ch_title}\n\n{clean_text}\n")
    except Exception as e:
        _log(f"  保存章节文件失败: {chapter_path} — {e}")


def save_full_txt(folder: str, title: str, content_parts: list):
    """保存全书为单一 TXT 文件"""
    full_path = os.path.join(folder, f"{title}.txt")
    try:
        with open(full_path, "w", encoding="utf-8") as f:
            f.write(f"《{title}》\n{'=' * 30}\n\n")
            for part in content_parts:
                clean_text = re.sub(r"^## .+?\n\n", "", part, count=1).strip()
                f.write(f"{clean_text}\n\n")
    except Exception as e:
        _log(f"  保存全文失败: {full_path} — {e}")


# ── LABEL_MAP（中英字段名映射，大纲导出用） ──

LABEL_MAP = {
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
}

ITEM_LABEL_MAP = {
    "hook": "钩子", "function": "功能", "summary": "概要",
    "cliffhanger": "悬念", "word_count_estimate": "字数预估",
    "description": "描述", "alignment": "立场",
    "role": "作用", "relationship": "关系",
    "chapter_range": "章节范围", "content": "内容",
    "motive": "动机", "threat": "压迫感",
    "beat": "节拍",
}


def save_outline_mindmap(folder: str, title: str, chapters: list, elements: dict,
                         gender: str, genre: str, style: str, full_outline: Optional[dict] = None):
    """保存大纲 Markdown + XMind 文件"""
    safe_title = re.sub(r'[\\/:*?"<>|]', "", title).strip() or "未命名小说"
    outline = full_outline or {}

    def _dict_section(prefix_level, d, indent=0):
        prefix = "#" * (3 + indent)
        for k, v in d.items():
            label_text = LABEL_MAP.get(k, k)
            if isinstance(v, dict):
                lines.append(f"{prefix} {label_text}\n\n")
                _dict_section(prefix_level, v, indent + 1)
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
                            iv_label = ITEM_LABEL_MAP.get(ik, ik)
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
        xmind_path_str = os.path.join(folder, f"{safe_title} 大纲.xmind")
        _log(f"  保存大纲 XMind 失败: {xmind_path_str} — {e}")
