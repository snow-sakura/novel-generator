"""小说统计分析服务 (F13) — 词频、角色出场、基础统计"""
import re
import json
from collections import Counter

import jieba


# 中文停用词（高频虚词、标点）
STOP_WORDS = {
    "的", "了", "在", "是", "我", "有", "和", "就", "不", "人", "都", "一",
    "一个", "上", "也", "很", "到", "说", "要", "去", "你", "会", "着",
    "没有", "看", "好", "自己", "这", "他", "她", "它", "们", "那", "什么",
    "怎么", "因为", "所以", "但是", "如果", "虽然", "可以", "这个", "那个",
    "把", "被", "让", "给", "对", "从", "在", "与", "而", "或", "及",
    "之", "其", "中", "等", "还", "又", "再", "才", "刚", "已", "将",
    "没", "吗", "啊", "呢", "吧", "嗯", "哦", "哈", "呀",
}

# 标点和空白
PUNCTUATION = set("，。！？、；：""''（）【】《》—…·,.:;!?'\"()[]{}-\n\r\t ")


def _clean_text(text: str) -> str:
    """去除标点、Markdown 标记和多余空白"""
    # 移除 Markdown 标题行
    text = re.sub(r"^#+\s*.*$", "", text, flags=re.MULTILINE)
    for p in PUNCTUATION:
        text = text.replace(p, " ")
    text = re.sub(r"\s+", " ", text)
    return text.strip()


def _extract_chapters(content: str) -> list[dict]:
    """从 content 中提取章节列表"""
    if not content:
        return []
    parts = [p for p in re.split(r"(?=## )", content) if p.strip()] if "##" in content else [content]
    result = []
    for i, block in enumerate(parts):
        title_match = re.match(r"^## (.+)", block)
        title = title_match.group(1).strip() if title_match else f"第{i + 1}章"
        body = re.sub(r"^## .+\n+", "", block).strip() if title_match else block.strip()
        result.append({"index": i, "title": title, "body": body})
    return result


def analyze_word_frequency(content: str, top_n: int = 50) -> list[dict]:
    """词频统计，返回 [{word, count}, ...]"""
    text = _clean_text(content)
    if not text:
        return []
    words = jieba.lcut(text)
    filtered = [w for w in words if len(w) >= 2 and w not in STOP_WORDS and not w.startswith("#")]
    counter = Counter(filtered)
    return [{"word": w, "count": c} for w, c in counter.most_common(top_n)]


def analyze_char_appearances(content: str, char_names: list[str]) -> list[dict]:
    """角色出场统计，返回 [{name, per_chapter: [count], total}]"""
    chapters = _extract_chapters(content)
    if not char_names:
        return []
    result = []
    for name in char_names:
        per_chapter = []
        total = 0
        for ch in chapters:
            count = ch["body"].count(name)
            per_chapter.append(count)
            total += count
        result.append({"name": name, "per_chapter": per_chapter, "total": total})
    return result


def analyze_basic_stats(content: str, chapters: list) -> dict:
    """基础统计：总字数、每章字数、阅读时间"""
    ch_data = _extract_chapters(content)
    chapter_word_counts = []
    for ch in ch_data:
        # 中文字数 = len()，英文按空格分词
        text = ch["body"]
        cn_chars = len(re.findall(r"[\u4e00-\u9fff]", text))
        en_words = len(re.findall(r"[a-zA-Z]+", text))
        chapter_word_counts.append(cn_chars + en_words)

    total_words = sum(chapter_word_counts)
    # 阅读时间：中文 400 字/分钟，英文 200 词/分钟
    reading_time_min = max(1, round(total_words / 400))

    return {
        "total_words": total_words,
        "chapter_count": len(ch_data),
        "chapter_word_counts": chapter_word_counts,
        "reading_time_min": reading_time_min,
        "chapter_titles": [ch["title"] for ch in ch_data],
    }


def full_analysis(content: str, char_names: list[str] | None = None) -> dict:
    """完整分析：词频 + 角色出场 + 基础统计"""
    return {
        "word_frequency": analyze_word_frequency(content),
        "char_appearances": analyze_char_appearances(content, char_names or []),
        "basic_stats": analyze_basic_stats(content, []),
    }
