"""
test-lab 测试数据 seed API

仅在 LLM_PROVIDER=mock 模式下可用。
提供测试数据准备端点，避免 test-lab 直接操作数据库。
"""

import json
import os
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.database import get_db, SessionLocal
from app.models.novel import Novel
from app.models.generation_record import GenerationRecord
from app.models.model_config import ModelConfig

router = APIRouter(prefix="/api/v3/test", tags=["test"])


def _ensure_mock_mode():
    """确保仅在 mock 模式下可用"""
    if os.environ.get("LLM_PROVIDER") != "mock":
        raise HTTPException(status_code=403, detail="仅在 mock 模式下可用")


# ── 请求模型 ─────────────────────────────────────────────


class SeedNovelRequest(BaseModel):
    title: str = "测试小说"
    seed_text: str = "一个平凡少年意外获得上古传承。"
    gender: str = "男频"
    genre: str = "都市脑洞"
    style: str = "轻松搞笑"
    word_count: int = 3000
    actual_count: int = 0
    content: str = ""
    chapters: str = "[]"
    outline: str = "{}"
    model_used: str = ""
    model_cfg: str = "{}"
    time_cost: float = 0
    theme: str = ""
    emotion_curve: str = ""
    aesthetic_intensity: str = "中度"
    interpretation: str = ""
    character_bible: str = "{}"
    illustrations: str = "[]"


class SeedRecordRequest(BaseModel):
    novel_id: int = 0
    status: str = "completed"


class SeedRecordUpdateRequest(BaseModel):
    status: str = "in_progress"


# ── Novel 种子端点 ──────────────────────────────────────


@router.post("/seed-novel")
def seed_novel(req: SeedNovelRequest, db: Session = Depends(get_db)):
    """创建测试小说，返回 novel_id"""
    _ensure_mock_mode()
    novel = Novel(
        title=req.title,
        seed_text=req.seed_text,
        gender=req.gender,
        genre=req.genre,
        style=req.style,
        word_count=req.word_count,
        actual_count=req.actual_count,
        content=req.content,
        chapters=req.chapters,
        outline=req.outline,
        model_used=req.model_used,
        model_config=req.model_cfg,
        time_cost=req.time_cost,
        theme=req.theme,
        emotion_curve=req.emotion_curve,
        aesthetic_intensity=req.aesthetic_intensity,
        interpretation=req.interpretation,
        character_bible=req.character_bible,
        illustrations=req.illustrations,
    )
    db.add(novel)
    db.commit()
    db.refresh(novel)
    return {"id": novel.id, "title": novel.title, "created_at": novel.created_at.isoformat() if novel.created_at else None}


# ── 生成记录种子端点 ────────────────────────────────────


@router.post("/seed-record")
def seed_record(req: SeedRecordRequest, db: Session = Depends(get_db)):
    """创建测试生成记录，返回 record_id"""
    _ensure_mock_mode()
    record = GenerationRecord(
        novel_id=req.novel_id,
        status=req.status,
        params=json.dumps({"seed_text": "test", "gender": "男频", "genre": "都市脑洞"}),
        created_at=datetime.now(),
    )
    db.add(record)
    db.commit()
    db.refresh(record)
    return {"id": record.id, "status": record.status}


# ── 数据清理 ────────────────────────────────────────────


class SetMockModeRequest(BaseModel):
    mode: str = Field("default", description="mock 模式: default|error|slow|empty")


@router.post("/mock-mode")
def set_mock_mode(req: SetMockModeRequest):
    """运行时切换 MockLLMProvider 的响应模式（无需重启进程）"""
    _ensure_mock_mode()
    from app.llm.mock_provider import set_mock_mode
    set_mock_mode(req.mode)
    return {"mode": req.mode}


@router.delete("/cleanup")
def cleanup_test_data(db: Session = Depends(get_db)):
    """清理所有通过 seed API 创建的测试数据"""
    _ensure_mock_mode()
    # 删除所有测试记录
    count_records = db.query(GenerationRecord).delete()
    # 删除测试小说
    count_novels = db.query(Novel).delete()
    db.commit()
    return {
        "deleted_records": count_records,
        "deleted_novels": count_novels,
    }
