"""数据库操作服务 — 封装所有 Novel / GenerationRecord / ChapterContent 的存取

会话管理策略（统一解决 v2 中 SessionLocal() 散落各处的泄漏风险）：
  - 所有函数接受可选的 `db: Session` 参数
  - 传入 db → 复用该会话（不关闭），适合 Depends(get_db) 或长生命周期上下文
  - 不传 db → 内部创建/关闭（向后兼容）
  - 调用方在长流程（如 generate SSE）中应创建单一会话并逐次传入
"""

import json
import logging
import os
import re
from datetime import datetime
from typing import Optional

logger = logging.getLogger(__name__)

from sqlalchemy.orm import Session

from app.database import SessionLocal
from app.models.novel import Novel
from app.models.generation_record import GenerationRecord
from app.models.chapter_content import ChapterContent


NOVEL_INDEX_PATH = os.path.join(
    os.path.dirname(os.path.dirname(os.path.dirname(__file__))),
    "..",
    "novels_index.json",
)


def _log(msg: str):
    ts = datetime.now().strftime("%H:%M:%S.%f")[:12]
    print(f"  [{ts}] [DB服务] {msg}", flush=True)


def _resolve(db: Optional[Session] = None) -> tuple[Session, bool]:
    """返回 (session, should_close)"""
    if db is not None:
        return db, False
    return SessionLocal(), True


# ── Novel CRUD ──


def save_novel(db: Optional[Session] = None, **kwargs) -> int:
    """创建 Novel 记录，返回 novel_id"""
    _db, sc = _resolve(db)
    try:
        novel = Novel(**kwargs)
        _db.add(novel)
        _db.commit()
        _db.refresh(novel)
        return novel.id
    finally:
        if sc:
            _db.close()


def update_novel_content(
    novel_id: int, content: str, chapters: list, db: Optional[Session] = None
):
    """更新小说内容，同时同步到 chapter_contents 表"""
    _db, sc = _resolve(db)
    try:
        novel = _db.query(Novel).filter(Novel.id == novel_id).first()
        if not novel:
            return
        blocks = [b.strip() for b in re.split(r"\n(?=## )", content) if b and b.strip()]
        for idx, block in enumerate(blocks):
            title_match = re.match(r"## (.+)", block)
            title = (
                title_match.group(1).strip()
                if title_match
                else (
                    chapters[idx].get("title", f"第{idx + 1}章")
                    if idx < len(chapters)
                    else f"第{idx + 1}章"
                )
            )
            clean_content = re.sub(r"^## .+?\n?", "", block, count=1).strip()
            existing = (
                _db.query(ChapterContent)
                .filter(
                    ChapterContent.novel_id == novel_id,
                    ChapterContent.chapter_index == idx,
                )
                .first()
            )
            if existing:
                existing.content = clean_content
                existing.title = title
                existing.word_count = len(clean_content)
            else:
                ch = ChapterContent(
                    novel_id=novel_id,
                    chapter_index=idx,
                    title=title,
                    content=clean_content,
                    word_count=len(clean_content),
                )
                _db.add(ch)
        novel.chapters = json.dumps(chapters, ensure_ascii=False)
        novel.actual_count = len(content)
        novel.updated_at = datetime.now()
        _db.commit()
    finally:
        if sc:
            _db.close()


def update_novel_outline(
    novel_id: int,
    chapters: list,
    elements: dict,
    tree_fn=None,
    db: Optional[Session] = None,
):
    """更新小说大纲数据"""
    _db, sc = _resolve(db)
    try:
        novel = _db.query(Novel).filter(Novel.id == novel_id).first()
        if novel:
            outline_dict = {"chapters": chapters, "elements": elements}
            if tree_fn:
                try:
                    tree = tree_fn(outline_dict)
                    outline_dict["_tree"] = tree
                except Exception as e:
                    logger.warning("update_novel_outline: 生成大纲思维导图失败: %s", e)
            novel.outline = json.dumps(outline_dict, ensure_ascii=False)
            _db.commit()
    finally:
        if sc:
            _db.close()


def finalize_novel(
    novel_id,
    title,
    content,
    chapters,
    elements,
    seed_text,
    gender,
    genre,
    style,
    word_count,
    per_chapter_min,
    per_chapter_max,
    actual_count,
    model_config,
    time_cost,
    full_outline=None,
    theme="",
    emotion_curve="",
    aesthetic_intensity="中度",
    interpretation="",
    character_bible="{}",
    db: Optional[Session] = None,
):
    """完成小说 — 更新所有字段为最终值"""
    _db, sc = _resolve(db)
    try:
        novel = _db.query(Novel).filter(Novel.id == novel_id).first()
        if novel:
            db_chapters = (
                _db.query(ChapterContent)
                .filter(ChapterContent.novel_id == novel_id)
                .order_by(ChapterContent.chapter_index)
                .all()
            )
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
            novel.updated_at = (
                datetime.now() if hasattr(novel, "updated_at") else novel.created_at
            )
            _db.commit()
    finally:
        if sc:
            _db.close()


def mark_novel_failed(novel_id, error, db: Optional[Session] = None):
    """标记小说为失败状态"""
    _db, sc = _resolve(db)
    try:
        novel = _db.query(Novel).filter(Novel.id == novel_id).first()
        if novel:
            novel.title = (
                novel.title + " [生成中断]"
                if novel.title != "生成中..."
                else "生成中断"
            )
            _db.commit()
    finally:
        if sc:
            _db.close()


# ── novels_index.json ──


def update_novel_index(
    title,
    seed_text,
    gender,
    genre,
    style,
    word_count,
    per_chapter_min,
    per_chapter_max,
    actual_count,
    content,
    chapters,
    outline,
    model_used,
    model_config,
    time_cost,
    record_id=None,
    record_status="completed",
    completed_chapters=0,
    total_chapters=0,
    theme="",
    emotion_curve="",
):
    """同步更新 novels_index.json（跨设备 DB 同步用，不使用 DB 会话）"""
    entry = {
        "title": title,
        "seed_text": seed_text,
        "gender": gender,
        "genre": genre,
        "style": style,
        "word_count": word_count,
        "per_chapter_min": per_chapter_min,
        "per_chapter_max": per_chapter_max,
        "actual_count": actual_count,
        "content": content,
        "chapters": chapters,
        "outline": outline,
        "model_used": model_used,
        "model_config": model_config or {},
        "time_cost": time_cost,
        "created_at": datetime.now().isoformat(),
        "theme": theme,
        "emotion_curve": emotion_curve,
    }
    if record_id:
        entry["generation_record"] = {
            "params": {
                "seed_text": seed_text,
                "gender": gender,
                "genre": genre,
                "style": style,
                "word_count": word_count,
                "per_chapter_min": per_chapter_min,
                "per_chapter_max": per_chapter_max,
            },
            "completed_chapters": completed_chapters,
            "total_chapters": total_chapters,
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


# ── GenerationRecord ──


def update_record_progress(
    record_id,
    completed,
    total,
    content,
    chapter_states=None,
    db: Optional[Session] = None,
):
    """更新生成记录进度"""
    _db, sc = _resolve(db)
    try:
        rec = (
            _db.query(GenerationRecord).filter(GenerationRecord.id == record_id).first()
        )
        if rec:
            rec.completed_chapters = completed
            rec.total_chapters = total
            rec.content_sofar = content[-200000:] if content else ""
            if chapter_states:
                rec.chapter_states = json.dumps(chapter_states, ensure_ascii=False)
            rec.updated_at = datetime.now()
            _db.commit()
    finally:
        if sc:
            _db.close()


def update_record_error(
    record_id,
    error,
    failed_step=None,
    chapter_states=None,
    db: Optional[Session] = None,
):
    """标记生成记录为失败"""
    _db, sc = _resolve(db)
    try:
        rec = (
            _db.query(GenerationRecord).filter(GenerationRecord.id == record_id).first()
        )
        if rec:
            rec.status = "failed"
            rec.error_message = f"[{failed_step or 'unknown'}] {error}"
            if chapter_states:
                rec.chapter_states = json.dumps(chapter_states, ensure_ascii=False)
            rec.updated_at = datetime.now()
            _db.commit()
    finally:
        if sc:
            _db.close()


def update_record_complete(
    record_id, novel_id, chapter_states=None, db: Optional[Session] = None
):
    """标记生成记录为完成"""
    _db, sc = _resolve(db)
    try:
        rec = (
            _db.query(GenerationRecord).filter(GenerationRecord.id == record_id).first()
        )
        if rec:
            rec.status = "completed"
            rec.novel_id = novel_id
            if chapter_states:
                rec.chapter_states = json.dumps(chapter_states, ensure_ascii=False)
            rec.updated_at = datetime.now()
            _db.commit()
    finally:
        if sc:
            _db.close()
