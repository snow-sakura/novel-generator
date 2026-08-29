"""小说 CRUD API"""

import json
import logging
import re
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Query

logger = logging.getLogger(__name__)
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sqlalchemy import desc, text

from app.database import get_db
from app.models.novel import Novel
from app.models.generation_record import GenerationRecord

router = APIRouter(prefix="/api/v3")


class InsertParagraphRequest(BaseModel):
    novel_id: int
    chapter_index: int
    paragraph_index: int
    content: str


@router.post("/paragraphs/insert")
async def insert_paragraph(req: InsertParagraphRequest, db: Session = Depends(get_db)):
    novel = db.query(Novel).filter(Novel.id == req.novel_id).first()
    if not novel:
        raise HTTPException(status_code=404, detail="小说不存在")
    if not novel.content:
        raise HTTPException(status_code=400, detail="小说内容为空")

    chapters = re.split(r"\n(?=## )", novel.content.strip())
    if req.chapter_index >= len(chapters):
        raise HTTPException(status_code=400, detail="章节索引越界")

    heading, *paragraphs = chapters[req.chapter_index].split("\n\n")
    insert_at = (
        len(paragraphs)
        if req.paragraph_index == -1
        else min(req.paragraph_index + 1, len(paragraphs))
    )
    paragraphs.insert(insert_at, req.content)
    chapters[req.chapter_index] = heading + "\n\n" + "\n\n".join(paragraphs)

    novel.content = "\n\n".join(chapters)
    if hasattr(novel, "updated_at"):
        novel.updated_at = datetime.now()
    db.commit()
    db.refresh(novel)
    return {"ok": True, "paragraph_index": insert_at}


@router.get("/novels")
async def list_novels(
    page: int = 1,
    size: int = 10,
    status: str = Query(None, description="筛选状态: completed/failed/all"),
    db: Session = Depends(get_db),
):
    query = db.query(Novel)
    if status == "completed":
        # 只显示有 completed 生成记录的小说（用子查询避免重复）
        completed_ids = (
            db.query(GenerationRecord.novel_id)
            .filter(GenerationRecord.status == "completed")
            .distinct()
            .subquery()
        )
        query = query.filter(Novel.id.in_(db.query(completed_ids.c.novel_id)))
    total = query.count()
    items = (
        query.order_by(desc(Novel.created_at))
        .offset((page - 1) * size)
        .limit(size)
        .all()
    )
    return {
        "total": total,
        "page": page,
        "size": size,
        "items": [
            {
                "id": n.id,
                "title": n.title,
                "gender": n.gender,
                "genre": n.genre,
                "style": n.style,
                "word_count": n.word_count,
                "actual_count": n.actual_count,
                "model_used": n.model_used,
                "created_at": n.created_at.isoformat() if n.created_at else "",
                "aesthetic_intensity": n.aesthetic_intensity or "中度",
            }
            for n in items
        ],
    }


@router.get("/novels/{novel_id}")
async def get_novel(novel_id: int, db: Session = Depends(get_db)):
    novel = db.query(Novel).filter(Novel.id == novel_id).first()
    if not novel:
        raise HTTPException(status_code=404, detail="小说不存在")

    # 查找最近的生成记录
    from app.models.generation_record import GenerationRecord

    latest_record = (
        db.query(GenerationRecord)
        .filter(GenerationRecord.novel_id == novel_id)
        .order_by(GenerationRecord.created_at.desc())
        .first()
    )

    # 遮蔽 model_config 中的 api_key，防止泄露
    model_cfg = json.loads(novel.model_config) if novel.model_config else {}
    if isinstance(model_cfg, dict) and model_cfg.get("api_key"):
        raw_key = model_cfg["api_key"]
        model_cfg["api_key"] = (
            raw_key[:8] + "****" + raw_key[-4:] if len(raw_key) > 12 else "****"
        )

    outline = json.loads(novel.outline) if novel.outline else {}
    if isinstance(outline, dict) and "_tree" not in outline:
        try:
            from app.services.generator import GeneratorService

            tree = GeneratorService._dict_to_tree(outline)
            if tree:
                outline["_tree"] = tree
        except Exception as e:
            logger.warning(
                "get_novel: 生成大纲思维导图失败 (novel_id=%d): %s", novel_id, e
            )

    return {
        "id": novel.id,
        "title": novel.title,
        "seed_text": novel.seed_text,
        "gender": novel.gender,
        "genre": novel.genre,
        "style": novel.style,
        "word_count": novel.word_count,
        "per_chapter_min": novel.per_chapter_min,
        "per_chapter_max": novel.per_chapter_max,
        "actual_count": novel.actual_count,
        "content": novel.content,
        "chapters": json.loads(novel.chapters) if novel.chapters else [],
        "outline": outline,
        "model_used": novel.model_used,
        "theme": novel.theme or "",
        "emotion_curve": json.loads(novel.emotion_curve) if novel.emotion_curve else [],
        "aesthetic_intensity": novel.aesthetic_intensity or "中度",
        "interpretation": novel.interpretation or "",
        "bible": json.loads(novel.character_bible)
        if novel.character_bible and novel.character_bible != "{}"
        else {},
        "illustrations": json.loads(novel.illustrations)
        if novel.illustrations and novel.illustrations != "[]"
        else [],
        "model_config": model_cfg,
        "time_cost": novel.time_cost,
        "created_at": novel.created_at.isoformat() if novel.created_at else "",
        "generation_status": latest_record.status if latest_record else "unknown",
        "latest_record_id": latest_record.id if latest_record else None,
    }


@router.patch("/novels/{novel_id}/emotion-curve")
async def update_emotion_curve(
    novel_id: int, body: dict, db: Session = Depends(get_db)
):
    novel = db.query(Novel).filter(Novel.id == novel_id).first()
    if not novel:
        raise HTTPException(status_code=404, detail="小说不存在")
    curve = body.get("emotion_curve", [])
    novel.emotion_curve = json.dumps(curve, ensure_ascii=False)
    db.commit()
    return {"ok": True}


@router.get("/novels/{novel_id}/bible")
async def get_character_bible(novel_id: int, db: Session = Depends(get_db)):
    novel = db.query(Novel).filter(Novel.id == novel_id).first()
    if not novel:
        raise HTTPException(status_code=404, detail="小说不存在")
    bible = (
        json.loads(novel.character_bible)
        if novel.character_bible and novel.character_bible != "{}"
        else {}
    )
    return {"bible": bible}


@router.patch("/novels/{novel_id}/bible")
async def update_character_bible(
    novel_id: int, body: dict, db: Session = Depends(get_db)
):
    novel = db.query(Novel).filter(Novel.id == novel_id).first()
    if not novel:
        raise HTTPException(status_code=404, detail="小说不存在")
    bible = body.get("bible", body.get("character_bible", {}))
    novel.character_bible = json.dumps(bible, ensure_ascii=False)
    db.commit()
    return {"ok": True}


@router.delete("/novels/{novel_id}", status_code=204)
async def delete_novel(novel_id: int, db: Session = Depends(get_db)):
    novel = db.query(Novel).filter(Novel.id == novel_id).first()
    if not novel:
        raise HTTPException(status_code=404, detail="小说不存在")
    # 级联删除关联记录
    from app.models.generation_record import GenerationRecord
    from app.models.chapter_content import ChapterContent
    from app.models.paragraph_version import ParagraphVersion

    db.query(ParagraphVersion).filter(ParagraphVersion.novel_id == novel_id).delete(
        synchronize_session=False
    )
    db.query(ChapterContent).filter(ChapterContent.novel_id == novel_id).delete(
        synchronize_session=False
    )
    db.query(GenerationRecord).filter(GenerationRecord.novel_id == novel_id).delete(
        synchronize_session=False
    )
    db.delete(novel)
    db.commit()


@router.get("/novels/{novel_id}/search")
async def search_novel_content(
    novel_id: int, q: str = Query(...), db: Session = Depends(get_db)
):
    """FTS5 全文搜索"""
    novel = db.query(Novel).filter(Novel.id == novel_id).first()
    if not novel:
        raise HTTPException(status_code=404, detail="小说不存在")
    results = db.execute(
        text("""
        SELECT c.id, c.chapter_index, c.title,
               snippet(chapter_contents_fts, 1, '<b>', '</b>', '...', 32) AS snippet
        FROM chapter_contents_fts f
        JOIN chapter_contents c ON f.rowid = c.id
        WHERE chapter_contents_fts MATCH :q AND c.novel_id = :novel_id
        ORDER BY rank
        LIMIT 20
    """),
        {"q": q, "novel_id": novel_id},
    ).fetchall()
    return [{"chapter_index": r[1], "title": r[2], "snippet": r[3]} for r in results]
