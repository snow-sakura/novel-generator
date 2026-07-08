"""小说 CRUD API"""
import json
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import desc

from app.database import get_db
from app.models.novel import Novel
from app.models.generation_record import GenerationRecord

router = APIRouter(prefix="/api/v2")


@router.get("/novels")
async def list_novels(page: int = 1, size: int = 10,
                       status: str = Query(None, description="筛选状态: completed/failed/all"),
                       db: Session = Depends(get_db)):
    query = db.query(Novel)
    if status == "completed":
        # 只显示有 completed 生成记录的小说（用子查询避免重复）
        completed_ids = db.query(GenerationRecord.novel_id).filter(
            GenerationRecord.status == "completed").distinct().subquery()
        query = query.filter(Novel.id.in_(db.query(completed_ids.c.novel_id)))
    total = query.count()
    items = query.order_by(desc(Novel.created_at)).offset((page - 1) * size).limit(size).all()
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

    # 查找最近的生成记录
    from app.models.generation_record import GenerationRecord
    latest_record = db.query(GenerationRecord).filter(
        GenerationRecord.novel_id == novel_id
    ).order_by(GenerationRecord.created_at.desc()).first()

    # 遮蔽 model_config 中的 api_key，防止泄露
    model_cfg = json.loads(novel.model_config) if novel.model_config else {}
    if isinstance(model_cfg, dict) and model_cfg.get("api_key"):
        raw_key = model_cfg["api_key"]
        model_cfg["api_key"] = raw_key[:8] + "****" + raw_key[-4:] if len(raw_key) > 12 else "****"

    outline = json.loads(novel.outline) if novel.outline else {}
    if isinstance(outline, dict) and "_tree" not in outline:
        try:
            from app.services.generator import GeneratorService
            tree = GeneratorService._dict_to_tree(outline)
            if tree:
                outline["_tree"] = tree
        except Exception:
            pass

    return {
        "id": novel.id, "title": novel.title, "seed_text": novel.seed_text,
        "gender": novel.gender, "genre": novel.genre, "style": novel.style,
        "word_count": novel.word_count, "per_chapter_min": novel.per_chapter_min,
        "per_chapter_max": novel.per_chapter_max, "actual_count": novel.actual_count,
        "content": novel.content,
        "chapters": json.loads(novel.chapters) if novel.chapters else [],
        "outline": outline,
        "model_used": novel.model_used,
        "model_config": model_cfg,
        "time_cost": novel.time_cost,
        "created_at": novel.created_at.isoformat() if novel.created_at else "",
        "generation_status": latest_record.status if latest_record else "unknown",
        "latest_record_id": latest_record.id if latest_record else None,
    }


@router.delete("/novels/{novel_id}", status_code=204)
async def delete_novel(novel_id: int, db: Session = Depends(get_db)):
    novel = db.query(Novel).filter(Novel.id == novel_id).first()
    if not novel:
        raise HTTPException(status_code=404, detail="小说不存在")
    db.delete(novel)
    db.commit()
