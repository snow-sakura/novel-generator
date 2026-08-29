"""AI 对话式生成 — SSE 流式接口"""

import json
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.database import get_db, SessionLocal
from app.models.generation_record import GenerationRecord
from app.llm.provider import get_llm_provider, get_provider_config_status
from app.services.chat_service import ChatService

router = APIRouter(prefix="/api/v3")


class ChatGenerateRequest(BaseModel):
    message: str


def _mark_record_failed(record_id: int, error_msg: str):
    """将记录标记为 failed（独立 session，不依赖请求生命周期）"""
    db = SessionLocal()
    try:
        record = (
            db.query(GenerationRecord).filter(GenerationRecord.id == record_id).first()
        )
        if record and record.status == "in_progress":
            record.status = "failed"
            record.error_message = error_msg
            from datetime import datetime

            record.updated_at = datetime.now()
            db.commit()
    except Exception:
        pass
    finally:
        db.close()


@router.post("/chat/generate")
async def chat_generate(req: ChatGenerateRequest, db: Session = Depends(get_db)):
    """AI 对话生成 — 输入一句话，自动完成全流程生成"""
    if not req.message.strip():
        raise HTTPException(status_code=400, detail="消息不能为空")

    config_status = get_provider_config_status()
    if not config_status["configured"]:

        async def error_stream():
            yield f"event: error\ndata: {json.dumps({'message': config_status['error']}, ensure_ascii=False)}\n\n"

        return StreamingResponse(error_stream(), media_type="text/event-stream")

    llm = get_llm_provider(None)
    service = ChatService(llm)

    # 创建生成记录（使用独立 session 避免请求关闭后 session 不可用）
    init_db = SessionLocal()
    try:
        record = GenerationRecord(
            params=json.dumps({"seed_text": req.message}, ensure_ascii=False),
            status="in_progress",
            seed_text=req.message,
        )
        init_db.add(record)
        init_db.commit()
        record_id = record.id
    finally:
        init_db.close()

    async def event_stream():
        try:
            async for event in service.generate(req.message, record_id=record_id):
                yield f"event: {event['event']}\ndata: {json.dumps(event['data'], ensure_ascii=False)}\n\n"
        except Exception as e:
            _mark_record_failed(record_id, str(e))
            yield f"event: error\ndata: {json.dumps({'message': str(e)}, ensure_ascii=False)}\n\n"

    return StreamingResponse(event_stream(), media_type="text/event-stream")
