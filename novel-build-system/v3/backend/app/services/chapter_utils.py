import re


def extract_chapters(content: str) -> list[dict]:
    """将正文 content 按章节拆分，返回 [{index, title, body}]"""
    if not content:
        return []
    parts = [p for p in re.split(r"(?=## )", content) if p.strip()]
    result = []
    for i, block in enumerate(parts):
        title_match = re.match(r"^## (.+)", block)
        title = title_match.group(1).strip() if title_match else f"第{i + 1}章"
        body = re.sub(r"^## .+\n+", "", block).strip() if title_match else block.strip()
        result.append({"index": i, "title": title, "body": body})
    return result


def get_chapter_text(content: str, chapter_index: int) -> str:
    """获取指定章节的正文文本"""
    chapters = extract_chapters(content)
    if chapter_index < len(chapters):
        return chapters[chapter_index]["body"]
    return ""
