"""AI 对话式生成 — SSE 流式接口（含日志保存 + 异常恢复）"""

import json
from datetime import datetime
from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from app.database import SessionLocal
from app.models.generation_record import GenerationRecord
from app.llm.provider import get_llm_provider, get_provider_config_status
from app.services.chat_service import ChatService
from app.services.generator import _log

router = APIRouter(prefix="/api/v1")


class ChatGenerateRequest(BaseModel):
    message: str
    params: dict = {}


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


def _save_thinking_logs(record_id: int, logs: list):
    """保存思考日志到数据库"""
    if logs and record_id:
        db = SessionLocal()
        try:
            rec = (
                db.query(GenerationRecord)
                .filter(GenerationRecord.id == record_id)
                .first()
            )
            if rec:
                rec.thinking_logs = json.dumps(logs, ensure_ascii=False)
                db.commit()
        finally:
            db.close()


@router.post("/chat/generate")
async def chat_generate(req: ChatGenerateRequest):
    """AI 对话生成 — 输入一句话，自动完成全流程生成"""
    if not req.message.strip():
        return {"error": "消息不能为空"}

    config_status = get_provider_config_status()
    if not config_status["configured"]:

        async def error_stream():
            yield f"event: error\ndata: {json.dumps({'message': config_status['error']}, ensure_ascii=False)}\n\n"

        return StreamingResponse(error_stream(), media_type="text/event-stream")

    llm = get_llm_provider(None)
    service = ChatService(llm)

    p = req.params or {}
    seed_text = p.get("seed_text") or req.message
    gender = p.get("gender") or "男频"
    genre = p.get("genre") or "都市脑洞"
    style = p.get("style") or "轻松搞笑"
    word_count = int(p.get("word_count") or 3000)
    chapter_count = p.get("chapter_count")
    per_chapter_min = int(p.get("per_chapter_min") or 800)
    per_chapter_max = int(p.get("per_chapter_max") or 2500)

    # 创建生成记录
    db = SessionLocal()
    record = GenerationRecord(
        params=json.dumps({"seed_text": seed_text, **p}, ensure_ascii=False),
        status="in_progress",
        seed_text=seed_text,
        created_at=datetime.now(),
        updated_at=datetime.now(),
    )
    db.add(record)
    db.commit()
    record_id = record.id
    db.close()

    async def event_stream():
        thinking_logs = []

        try:
            async for event in service.generate(
                seed_text,
                gender=gender,
                genre=genre,
                style=style,
                word_count=word_count,
                chapter_count=chapter_count,
                per_chapter_min=per_chapter_min,
                per_chapter_max=per_chapter_max,
                record_id=record_id,
            ):
                # 收集日志事件
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
                    _save_thinking_logs(record_id, thinking_logs)

                yield f"event: {event['event']}\ndata: {json.dumps(event['data'], ensure_ascii=False)}\n\n"

        except Exception as e:
            yield f"event: error\ndata: {json.dumps({'message': str(e)}, ensure_ascii=False)}\n\n"
            _log(f"chat_stream 异常: {e}")
            _save_thinking_logs(record_id, thinking_logs)
            _mark_record_failed(record_id, f"连接中断: {e}")
        finally:
            _save_thinking_logs(record_id, thinking_logs)
            _ensure_record_terminal(record_id)

    return StreamingResponse(event_stream(), media_type="text/event-stream")
