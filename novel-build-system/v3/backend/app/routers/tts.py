"""TTS 语音合成 API (F12)"""

import os
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import FileResponse, JSONResponse
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.novel import Novel
from app.services.tts import (
    generate_chapter_audio,
    generate_novel_tts,
    get_audio_status,
    delete_chapter_audio,
    get_audio_path,
    SUPPORTED_VOICES,
)
from app.services.chapter_utils import extract_chapters

router = APIRouter(prefix="/api/v3")


class TTSGenerateRequest(BaseModel):
    novel_id: int
    chapter_index: int = 0
    voice_id: str = "zh-CN-XiaoxiaoNeural"
    rate: str = "+0%"
    pitch: str = "+0Hz"


class TTSGenerateAllRequest(BaseModel):
    novel_id: int
    voice_id: str = "zh-CN-XiaoxiaoNeural"
    rate: str = "+0%"
    pitch: str = "+0Hz"


def _get_novel_title(db: Session, novel_id: int) -> tuple[str, str]:
    novel = db.query(Novel).filter(Novel.id == novel_id).first()
    if not novel:
        raise HTTPException(status_code=404, detail="小说不存在")
    safe_title = novel.title.strip().replace("/", "_").replace("\\", "_")
    if not safe_title:
        safe_title = f"novel_{novel_id}"
    return safe_title, novel.content or ""


@router.get("/tts/voices")
async def list_voices():
    return SUPPORTED_VOICES


@router.post("/tts/generate")
async def generate_tts(req: TTSGenerateRequest, db: Session = Depends(get_db)):
    title, content = _get_novel_title(db, req.novel_id)
    chapters = extract_chapters(content)
    if req.chapter_index < 0 or req.chapter_index >= len(chapters):
        raise HTTPException(status_code=400, detail="章节索引超出范围")
    chapter_text = chapters[req.chapter_index]["body"]
    audio_path = await generate_chapter_audio(
        title, chapter_text, req.chapter_index, req.voice_id, req.rate, req.pitch
    )
    return {
        "novel_id": req.novel_id,
        "chapter_index": req.chapter_index,
        "audio_path": audio_path,
        "duration_sec": 0,
    }


@router.post("/tts/generate_all")
async def generate_all_tts(req: TTSGenerateAllRequest, db: Session = Depends(get_db)):
    title, content = _get_novel_title(db, req.novel_id)
    results = await generate_novel_tts(
        title, content, req.voice_id, req.rate, req.pitch
    )
    return {
        "novel_id": req.novel_id,
        "generated": len(results),
        "chapters": [
            {"chapter_index": k, "audio_path": v} for k, v in sorted(results.items())
        ],
    }


@router.get("/tts/audio/{novel_id}/{chapter_index}")
async def stream_audio(
    novel_id: int, chapter_index: int, db: Session = Depends(get_db)
):
    title, _ = _get_novel_title(db, novel_id)
    audio_path = get_audio_path(title, chapter_index)
    if not os.path.exists(audio_path):
        raise HTTPException(status_code=404, detail="音频文件未找到，请先生成 TTS")
    return FileResponse(
        audio_path, media_type="audio/mpeg", filename=f"chapter_{chapter_index:03d}.mp3"
    )


@router.get("/tts/status/{novel_id}")
async def tts_status(novel_id: int, db: Session = Depends(get_db)):
    title, content = _get_novel_title(db, novel_id)
    status = get_audio_status(title, content)
    return {"novel_id": novel_id, "total_chapters": len(status), "chapters": status}


@router.delete("/tts/{novel_id}/{chapter_index}")
async def delete_tts(novel_id: int, chapter_index: int, db: Session = Depends(get_db)):
    title, _ = _get_novel_title(db, novel_id)
    deleted = delete_chapter_audio(title, chapter_index)
    return {"ok": deleted}
