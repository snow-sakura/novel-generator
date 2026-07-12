"""AI 配图 API (F11) — 生成/获取/删除配图"""
import json
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.novel import Novel
from app.llm.provider import get_llm_provider, get_provider_config_status
from app.services.illustration import generate_illustration
from app.services.chapter_utils import get_chapter_text

router = APIRouter(prefix="/api/v3")


class IllustrationRequest(BaseModel):
    novel_id: int
    chapter_index: int = 0
    style: str = "写实插画"


@router.post("/illustrations/generate")
async def create_illustration(req: IllustrationRequest, db: Session = Depends(get_db)):
    """为指定章节生成配图"""
    novel = db.query(Novel).filter(Novel.id == req.novel_id).first()
    if not novel:
        raise HTTPException(status_code=404, detail="小说不存在")

    config_status = get_provider_config_status()
    if not config_status["configured"]:
        # fallback: 无 LLM 时使用默认提示
        prompt = f"Chapter {req.chapter_index + 1} illustration in {req.style} style"
        illustration = {
            "chapter_index": req.chapter_index,
            "prompt": prompt,
            "url": f"https://image.pollinations.ai/prompt/{prompt}",
            "generated_at": "2025-01-01T00:00:00",
        }
    else:
        llm = get_llm_provider(None)
        chapter_text = get_chapter_text(novel.content or "", req.chapter_index)
        illustration = await generate_illustration(llm, chapter_text, req.chapter_index, req.style)

    # 保存到 DB
    illustrations = json.loads(novel.illustrations) if novel.illustrations and novel.illustrations != "[]" else []
    # 替换同章节旧图
    illustrations = [i for i in illustrations if i.get("chapter_index") != req.chapter_index]
    illustrations.append(illustration)
    novel.illustrations = json.dumps(illustrations, ensure_ascii=False)
    db.commit()

    return illustration


@router.get("/illustrations/{novel_id}")
async def list_illustrations(novel_id: int, db: Session = Depends(get_db)):
    """获取小说的所有配图"""
    novel = db.query(Novel).filter(Novel.id == novel_id).first()
    if not novel:
        raise HTTPException(status_code=404, detail="小说不存在")
    return json.loads(novel.illustrations) if novel.illustrations and novel.illustrations != "[]" else []


@router.delete("/illustrations/{novel_id}/{chapter_index}")
async def delete_illustration(novel_id: int, chapter_index: int, db: Session = Depends(get_db)):
    """删除某章的配图"""
    novel = db.query(Novel).filter(Novel.id == novel_id).first()
    if not novel:
        raise HTTPException(status_code=404, detail="小说不存在")
    illustrations = json.loads(novel.illustrations) if novel.illustrations and novel.illustrations != "[]" else []
    illustrations = [i for i in illustrations if i.get("chapter_index") != chapter_index]
    novel.illustrations = json.dumps(illustrations, ensure_ascii=False)
    db.commit()
    return {"ok": True}
