"""金句提取服务 (F3) — 从小说内容中解析金句"""

import re
from typing import Optional

from app.services.chapter_utils import extract_chapters


def extract_quotes_from_text(text: str) -> list[dict]:
    """
    从文本中提取金句。
    金句格式: > *金句内容*  或  > 金句内容
    也匹配普通 > 引用格式
    """
    quotes = []
    pattern = re.compile(r">\s*\*?([^*]+)\*?")
    for match in pattern.finditer(text):
        quote_text = match.group(1).strip()
        if quote_text and len(quote_text) >= 6:
            quotes.append(
                {
                    "text": quote_text,
                    "position": match.start(),
                }
            )
    return quotes


def extract_quotes(content: str) -> list[dict]:
    """
    从完整小说内容中提取所有金句，按章节组织。
    返回: [{chapter_index, chapter_title, quotes: [{text, index}]}]
    """
    chapters = extract_chapters(content)
    result = []
    global_idx = 0
    for ch in chapters:
        chapter_quotes = extract_quotes_from_text(ch["body"])
        enriched = []
        for q in chapter_quotes:
            enriched.append(
                {
                    "id": global_idx,
                    "text": q["text"],
                }
            )
            global_idx += 1
        if enriched:
            result.append(
                {
                    "chapter_index": ch["index"],
                    "chapter_title": ch["title"],
                    "quotes": enriched,
                }
            )
    return result


def get_quote_stats(content: str) -> dict:
    """金句统计信息"""
    all_quotes = extract_quotes(content)
    total = sum(len(ch["quotes"]) for ch in all_quotes)
    chapters_with_quotes = len(all_quotes)
    total_chapters = len(extract_chapters(content))
    return {
        "total_quotes": total,
        "chapters_with_quotes": chapters_with_quotes,
        "total_chapters": total_chapters,
        "coverage": f"{chapters_with_quotes}/{total_chapters}",
    }
