"""小说统计分析 API (F13)"""
import json
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.novel import Novel
from app.services.analysis import full_analysis

router = APIRouter(prefix="/api/v3")


@router.post("/analysis/{novel_id}")
async def analyze_novel(novel_id: int, db: Session = Depends(get_db)):
    """对小说进行完整统计分析"""
    novel = db.query(Novel).filter(Novel.id == novel_id).first()
    if not novel:
        raise HTTPException(status_code=404, detail="小说不存在")

    # 从 bible 提取角色名（过滤长句垃圾数据）
    char_names = []
    if novel.character_bible and novel.character_bible != "{}":
        try:
            bible = json.loads(novel.character_bible)
            char_names = [
                c.get("name", "") for c in bible.get("characters", [])
                if c.get("name") and len(c["name"]) <= 6
            ]
        except (json.JSONDecodeError, TypeError):
            pass

    # 情感曲线
    emotion_curve = []
    if novel.emotion_curve and novel.emotion_curve != "[]":
        try:
            emotion_curve = json.loads(novel.emotion_curve)
        except (json.JSONDecodeError, TypeError):
            pass

    analysis = full_analysis(novel.content or "", char_names)
    analysis["emotion_curve"] = emotion_curve

    return analysis
