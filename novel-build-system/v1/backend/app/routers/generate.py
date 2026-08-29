"""生成小说 API（SSE 流式接口 + 生成记录管理 + 继续生成）"""

import json
import re
from typing import Optional, AsyncIterator
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sqlalchemy import desc

from app.database import get_db, SessionLocal
from app.models.novel import Novel
from app.models.generation_record import GenerationRecord
from app.llm.provider import get_llm_provider, get_provider_config_status
from app.services.generator import GeneratorService, _log
from app.data import get_categories_by_gender, STYLES, GENDERS, CHINESE_MODELS

router = APIRouter(prefix="/api/v1")


class GenerateRequest(BaseModel):
    seed_text: str
    gender: str = "男频"
    genre: str = "都市脑洞"
    style: str = "轻松搞笑"
    word_count: int = 3000
    chapter_count: Optional[int] = None
    per_chapter_min: int = 800
    per_chapter_max: int = 2500
    llm_config: Optional[dict] = None
    custom_prompts: Optional[dict] = None
    record_id: Optional[int] = None  # 用于继续生成


# ── 公共 SSE 流式辅助函数 ──


def _create_stream_response(
    service: GeneratorService,
    record_id: int,
    req: GenerateRequest,
    continuation: Optional[dict] = None,
    pre_events: Optional[list] = None,
) -> StreamingResponse:
    """创建 SSE 流式响应，统一处理日志保存和异常恢复"""

    async def event_stream() -> AsyncIterator[str]:
        thinking_logs = []

        def _save_logs():
            if thinking_logs and record_id:
                db_l = SessionLocal()
                try:
                    rec = (
                        db_l.query(GenerationRecord)
                        .filter(GenerationRecord.id == record_id)
                        .first()
                    )
                    if rec:
                        rec.thinking_logs = json.dumps(
                            thinking_logs, ensure_ascii=False
                        )
                        db_l.commit()
                finally:
                    db_l.close()

        # 发送预置事件（如 continue_from）
        if pre_events:
            for evt in pre_events:
                yield f"event: {evt['event']}\ndata: {json.dumps(evt['data'], ensure_ascii=False)}\n\n"

        try:
            async for event in service.generate(
                seed_text=req.seed_text,
                gender=req.gender,
                genre=req.genre,
                style=req.style,
                word_count=req.word_count,
                chapter_count=req.chapter_count,
                per_chapter_min=req.per_chapter_min,
                per_chapter_max=req.per_chapter_max,
                model_config=req.llm_config,
                custom_prompts=req.custom_prompts,
                record_id=record_id,
                continuation=continuation,
            ):
                if event["event"] == "log":
                    msg = event["data"]
                    if isinstance(msg, dict):
                        msg = msg.get("text", "")
                    thinking_logs.append(
                        {
                            "time": datetime.now().strftime("%H:%M:%S"),
                            "type": "info"
                            if not str(msg).startswith("❌")
                            else "error",
                            "text": str(msg),
                        }
                    )
                # 关键节点保存日志
                if event["event"] in ("chapter_end", "complete", "error"):
                    _save_logs()
                yield f"event: {event['event']}\ndata: {json.dumps(event['data'], ensure_ascii=False)}\n\n"
        except Exception as e:
            yield f"event: error\ndata: {json.dumps({'message': str(e)}, ensure_ascii=False)}\n\n"
            _log(f"event_stream 异常: {e}")
            _save_logs()
            _mark_record_failed(record_id, f"连接中断: {e}")
        finally:
            _save_logs()
            # 确保记录不会卡在 in_progress（但不覆盖 cancelled 状态）
            _ensure_record_terminal(record_id)

    return StreamingResponse(event_stream(), media_type="text/event-stream")


def _mark_record_failed(record_id: int, error_message: str):
    """将记录标记为 failed"""
    db = SessionLocal()
    try:
        rec = (
            db.query(GenerationRecord).filter(GenerationRecord.id == record_id).first()
        )
        if rec and rec.status == "in_progress":
            rec.status = "failed"
            rec.error_message = error_message
            db.commit()
    finally:
        db.close()


def _ensure_record_terminal(record_id: int):
    """确保记录不卡在 in_progress（不覆盖 cancelled）"""
    db = SessionLocal()
    try:
        rec = (
            db.query(GenerationRecord).filter(GenerationRecord.id == record_id).first()
        )
        if rec and rec.status == "in_progress":
            rec.status = "failed"
            rec.error_message = "生成中断（客户端断开）"
            db.commit()
    finally:
        db.close()


# ── 生成 API ──


@router.post("/generate")
async def generate_novel(req: GenerateRequest):
    """SSE 流式生成小说"""
    if not req.seed_text.strip():
        return {"error": "seed_text 不能为空"}
    if req.gender not in GENDERS:
        return {"error": f"不支持的频道，可选：{', '.join(GENDERS)}"}
    valid_categories = get_categories_by_gender(req.gender)
    if req.genre not in valid_categories:
        return {
            "error": f"{req.gender}不支持该题材，可选：{', '.join(valid_categories)}"
        }
    style_parts = req.style.split("+")
    invalid = [s for s in style_parts if s not in STYLES]
    if invalid:
        return {
            "error": f"不支持的风格: {', '.join(invalid)}，可选：{', '.join(STYLES)}"
        }
    if req.word_count < 500:
        req.word_count = 500
    elif req.word_count > 500000:
        req.word_count = 500000
    if req.per_chapter_min < 200:
        req.per_chapter_min = 200
    if req.per_chapter_max > 20000:
        req.per_chapter_max = 20000
    if req.per_chapter_min > req.per_chapter_max:
        req.per_chapter_min, req.per_chapter_max = (
            req.per_chapter_max,
            req.per_chapter_min,
        )

    config_status = get_provider_config_status()
    if not config_status["configured"] and not req.llm_config:

        async def error_stream():
            yield f"event: error\ndata: {json.dumps({'message': config_status['error'], 'type': 'config'}, ensure_ascii=False)}\n\n"

        return StreamingResponse(error_stream(), media_type="text/event-stream")

    # 创建生成记录
    db = SessionLocal()
    record = GenerationRecord(
        params=json.dumps(req.model_dump(exclude={"llm_config"}), ensure_ascii=False),
        status="in_progress",
        seed_text=req.seed_text,
        created_at=datetime.now(),
        updated_at=datetime.now(),
    )
    db.add(record)
    db.commit()
    record_id = record.id
    db.close()

    llm = get_llm_provider(req.llm_config)
    service = GeneratorService(llm)

    return _create_stream_response(service, record_id, req)


@router.post("/generate/continue")
async def continue_generation(record_id: int = Query(...)):
    """根据生成记录继续生成"""
    db = SessionLocal()
    try:
        record = (
            db.query(GenerationRecord).filter(GenerationRecord.id == record_id).first()
        )
        if not record:
            raise HTTPException(status_code=404, detail="记录不存在")
        if record.status not in ("failed", "cancelled"):
            raise HTTPException(
                status_code=400, detail="只有失败或已取消的记录可以继续生成"
            )

        params = json.loads(record.params) if record.params else {}
        req = GenerateRequest(**params)

        # 查找已有的 novel（如果有）
        existing_novel = None
        continuation = None
        if record.novel_id:
            existing_novel = db.query(Novel).filter(Novel.id == record.novel_id).first()

        if (
            existing_novel
            and existing_novel.content
            and not existing_novel.content.startswith("[生成失败]")
        ):
            content = existing_novel.content
            existing_blocks = (
                [b for b in re.split(r"\n(?=## )", content) if b and b.strip()]
                if content
                else []
            )
            outline = (
                json.loads(existing_novel.outline) if existing_novel.outline else {}
            )
            chapters = outline.get("chapters", [])
            elements = outline.get("elements", {})
            completed = len(existing_blocks)

            continuation = {
                "novel_id": existing_novel.id,
                "content": content,
                "parts": existing_blocks,
                "chapters": chapters,
                "elements": elements,
                "start_from": completed,
            }
            _log(
                f"继续生成: novel_id={existing_novel.id}, 已有{completed}/{len(chapters)}章"
            )
            _log(f"  已有内容前30字: {content[:30]}...")

            req.chapter_count = len(chapters)

        new_record = GenerationRecord(
            params=record.params,
            status="in_progress",
            seed_text=record.seed_text,
            created_at=datetime.now(),
            updated_at=datetime.now(),
        )
        db.add(new_record)
        db.commit()
        new_record_id = new_record.id
    finally:
        db.close()

    llm = get_llm_provider(req.llm_config)
    service = GeneratorService(llm)

    pre_events = [{"event": "continue_from", "data": {"original_record_id": record_id}}]
    return _create_stream_response(
        service, new_record_id, req, continuation, pre_events
    )


# ── 生成记录 CRUD ──


@router.get("/records")
async def list_records(page: int = 1, size: int = 20, db: Session = Depends(get_db)):
    """获取生成记录列表（含状态）"""
    total = db.query(GenerationRecord).count()
    items = (
        db.query(GenerationRecord)
        .order_by(desc(GenerationRecord.created_at))
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
                "id": r.id,
                "novel_id": r.novel_id,
                "status": r.status,
                "completed_chapters": r.completed_chapters,
                "total_chapters": r.total_chapters,
                "seed_text": r.seed_text[:100] + "..."
                if len(r.seed_text) > 100
                else r.seed_text,
                "error_message": r.error_message,
                "created_at": r.created_at.isoformat() if r.created_at else "",
                "updated_at": r.updated_at.isoformat() if r.updated_at else "",
            }
            for r in items
        ],
    }


@router.get("/records/{record_id}")
async def get_record(record_id: int, db: Session = Depends(get_db)):
    """获取单条生成记录详情"""
    r = db.query(GenerationRecord).filter(GenerationRecord.id == record_id).first()
    if not r:
        raise HTTPException(status_code=404, detail="记录不存在")
    logs = json.loads(r.thinking_logs) if r.thinking_logs else []
    cs = json.loads(r.chapter_states) if r.chapter_states else []
    return {
        "id": r.id,
        "novel_id": r.novel_id,
        "params": json.loads(r.params) if r.params else {},
        "completed_chapters": r.completed_chapters,
        "total_chapters": r.total_chapters,
        "status": r.status,
        "content_sofar": r.content_sofar,
        "error_message": r.error_message,
        "seed_text": r.seed_text,
        "thinking_logs": logs,
        "chapter_states": cs,
        "created_at": r.created_at.isoformat() if r.created_at else "",
        "updated_at": r.updated_at.isoformat() if r.updated_at else "",
    }


@router.post("/records/{record_id}/cancel")
async def cancel_record(record_id: int, db: Session = Depends(get_db)):
    """手动取消正在生成的记录（前端停止按钮调用）"""
    r = db.query(GenerationRecord).filter(GenerationRecord.id == record_id).first()
    if not r:
        raise HTTPException(status_code=404, detail="记录不存在")
    if r.status not in ("in_progress",):
        raise HTTPException(status_code=400, detail="只有进行中的记录可以取消")
    r.status = "cancelled"
    r.error_message = "用户手动停止"
    r.updated_at = datetime.now()
    db.commit()
    return {"status": "cancelled", "id": record_id}


@router.delete("/records/{record_id}")
async def delete_record(record_id: int, db: Session = Depends(get_db)):
    r = db.query(GenerationRecord).filter(GenerationRecord.id == record_id).first()
    if not r:
        raise HTTPException(status_code=404, detail="记录不存在")
    db.delete(r)
    db.commit()


@router.get("/config/check")
async def check_config():
    return get_provider_config_status()


@router.get("/records/{record_id}/status")
async def get_record_status(record_id: int, db: Session = Depends(get_db)):
    """轻量轮询端点 — 获取记录状态（用于前端轮询）"""
    r = db.query(GenerationRecord).filter(GenerationRecord.id == record_id).first()
    if not r:
        raise HTTPException(status_code=404, detail="记录不存在")
    return {
        "id": r.id,
        "novel_id": r.novel_id,
        "status": r.status,
        "completed_chapters": r.completed_chapters,
        "total_chapters": r.total_chapters,
        "created_at": r.created_at.isoformat() if r.created_at else "",
        "updated_at": r.updated_at.isoformat() if r.updated_at else "",
    }


@router.get("/models/list")
async def list_models():
    """返回所有国产模型配置列表"""
    return {"models": CHINESE_MODELS}


@router.get("/genres/list")
async def list_genres(gender: str = "男频"):
    """获取指定频道的题材列表"""
    return {
        "gender": gender,
        "genres": get_categories_by_gender(gender),
        "styles": STYLES,
    }


# ── 数据清理 ──


@router.post("/cleanup")
async def cleanup_orphaned_data():
    """清理无效数据：孤立的生成中记录、无主的生成记录、失败的小说"""
    db = SessionLocal()
    cleaned = {"orphaned_records": 0, "orphaned_novels": 0, "failed_novels": 0}
    try:
        from datetime import timedelta

        cutoff = datetime.now() - timedelta(minutes=30)
        stale_records = (
            db.query(GenerationRecord)
            .filter(
                GenerationRecord.novel_id.is_(None),
                GenerationRecord.status == "in_progress",
                GenerationRecord.updated_at < cutoff,
            )
            .all()
        )
        cleaned["orphaned_records"] = len(stale_records)
        for rec in stale_records:
            db.delete(rec)

        bad_novels = (
            db.query(Novel)
            .filter((Novel.title == "生成中...") | (Novel.title.like("%生成中断%")))
            .all()
        )
        cleaned["orphaned_novels"] = len(bad_novels)
        for novel in bad_novels:
            db.query(GenerationRecord).filter(
                GenerationRecord.novel_id == novel.id
            ).delete()
            db.delete(novel)

        empty_completed = (
            db.query(GenerationRecord)
            .filter(
                GenerationRecord.status == "completed",
                GenerationRecord.novel_id.is_(None),
            )
            .all()
        )
        cleaned["failed_novels"] += len(empty_completed)
        for rec in empty_completed:
            db.delete(rec)

        db.commit()
    finally:
        db.close()

    _log(f"数据清理完成: {cleaned}")
    return {"status": "ok", "cleaned": cleaned}


@router.post("/records/{record_id}/reset")
async def reset_record_to_failed(record_id: int, db: Session = Depends(get_db)):
    """将卡在 in_progress 的记录重置为 failed（允许用户重新生成）"""
    r = db.query(GenerationRecord).filter(GenerationRecord.id == record_id).first()
    if not r:
        raise HTTPException(status_code=404, detail="记录不存在")
    if r.status != "in_progress":
        raise HTTPException(status_code=400, detail="只有进行中的记录可以重置")
    r.status = "failed"
    r.error_message = "用户手动重置"
    r.updated_at = datetime.now()
    db.commit()
    return {"status": "failed", "id": record_id}
