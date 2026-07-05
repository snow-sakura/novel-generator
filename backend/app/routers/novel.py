"""小说 CRUD API"""
import json
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import desc

from app.database import get_db
from app.models.novel import Novel

router = APIRouter(prefix="/api/v1")


@router.get("/novels")
async def list_novels(page: int = 1, size: int = 10, db: Session = Depends(get_db)):
    total = db.query(Novel).count()
    items = db.query(Novel).order_by(desc(Novel.created_at)).offset((page - 1) * size).limit(size).all()
    return {
        "total": total, "page": page, "size": size,
        "items": [
            {
                "id": n.id, "title": n.title, "gender": n.gender,
                "genre": n.genre, "style": n.style,
                "word_count": n.word_count, "actual_count": n.actual_count,
                "model_used": n.model_used, "created_at": n.created_at.isoformat() if n.created_at else "",
            }
            for n in items
        ],
    }


@router.get("/novels/{novel_id}")
async def get_novel(novel_id: int, db: Session = Depends(get_db)):
    novel = db.query(Novel).filter(Novel.id == novel_id).first()
    if not novel:
        raise HTTPException(status_code=404, detail="小说不存在")
    return {
        "id": novel.id, "title": novel.title, "seed_text": novel.seed_text,
        "gender": novel.gender, "genre": novel.genre, "style": novel.style,
        "word_count": novel.word_count, "per_chapter_min": novel.per_chapter_min,
        "per_chapter_max": novel.per_chapter_max, "actual_count": novel.actual_count,
        "content": novel.content,
        "chapters": json.loads(novel.chapters) if novel.chapters else [],
        "outline": json.loads(novel.outline) if novel.outline else {},
        "model_used": novel.model_used,
        "model_config": json.loads(novel.model_config) if novel.model_config else {},
        "time_cost": novel.time_cost,
        "created_at": novel.created_at.isoformat() if novel.created_at else "",
    }


@router.delete("/novels/{novel_id}", status_code=204)
async def delete_novel(novel_id: int, db: Session = Depends(get_db)):
    novel = db.query(Novel).filter(Novel.id == novel_id).first()
    if not novel:
        raise HTTPException(status_code=404, detail="小说不存在")
    db.delete(novel)
    db.commit()
