"""金句 API (F3) — 提取/管理小说金句"""
import json
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.novel import Novel
from app.services.quotes import extract_quotes, get_quote_stats

router = APIRouter(prefix="/api/v3")


@router.get("/quotes/{novel_id}")
async def list_quotes(novel_id: int, db: Session = Depends(get_db)):
    """获取小说的所有金句，按章节组织"""
    novel = db.query(Novel).filter(Novel.id == novel_id).first()
    if not novel:
        raise HTTPException(status_code=404, detail="小说不存在")
    quotes = extract_quotes(novel.content or "")
    stats = get_quote_stats(novel.content or "")
    return {
        "novel_id": novel_id,
        "novel_title": novel.title,
        "stats": stats,
        "chapters": quotes,
    }
