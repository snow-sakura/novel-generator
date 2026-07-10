"""AI 对话式生成 — SSE 流式接口"""
import json
from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from app.database import SessionLocal
from app.models.generation_record import GenerationRecord
from app.llm.provider import get_llm_provider, get_provider_config_status
from app.services.chat_service import ChatService

router = APIRouter(prefix="/api/v3")


class ChatGenerateRequest(BaseModel):
    message: str


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

    # 创建生成记录
    db = SessionLocal()
    record = GenerationRecord(
        params=json.dumps({"seed_text": req.message}, ensure_ascii=False),
        status="in_progress",
        seed_text=req.message,
    )
    db.add(record)
    db.commit()
    record_id = record.id
    db.close()

    async def event_stream():
        try:
            async for event in service.generate(req.message, record_id=record_id):
                yield f"event: {event['event']}\ndata: {json.dumps(event['data'], ensure_ascii=False)}\n\n"
        except Exception as e:
            yield f"event: error\ndata: {json.dumps({'message': str(e)}, ensure_ascii=False)}\n\n"

    return StreamingResponse(event_stream(), media_type="text/event-stream")
