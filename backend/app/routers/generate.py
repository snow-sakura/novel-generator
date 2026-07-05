"""生成小说 API（SSE 流式接口）"""
import json
from fastapi import APIRouter
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from app.llm.provider import get_llm_provider, get_provider_config_status
from app.services.generator import GeneratorService
from app.services.prompts import GENRES, STYLES

router = APIRouter(prefix="/api/v1")


class GenerateRequest(BaseModel):
    seed_text: str
    genre: str = "玄幻"
    style: str = "简洁直白"
    word_count: int = 3000


@router.post("/generate")
async def generate_novel(req: GenerateRequest):
    """SSE 流式生成小说"""
    # 校验参数
    if not req.seed_text.strip():
        return {"error": "seed_text 不能为空"}
    if req.genre not in GENRES:
        return {"error": f"不支持的题材，可选：{', '.join(GENRES)}"}
    if req.style not in STYLES:
        return {"error": f"不支持的风格，可选：{', '.join(STYLES)}"}
    if req.word_count < 500:
        req.word_count = 500
    elif req.word_count > 50000:
        req.word_count = 50000

    # 预检 Provider 配置
    config_status = get_provider_config_status()
    if not config_status["configured"]:
        async def error_stream():
            yield f"event: error\ndata: {json.dumps({'message': config_status['error'], 'type': 'config'}, ensure_ascii=False)}\n\n"
        return StreamingResponse(error_stream(), media_type="text/event-stream")

    llm = get_llm_provider()
    service = GeneratorService(llm)

    async def event_stream():
        async for event in service.generate(
            seed_text=req.seed_text,
            genre=req.genre,
            style=req.style,
            word_count=req.word_count,
        ):
            yield f"event: {event['event']}\ndata: {json.dumps(event['data'], ensure_ascii=False)}\n\n"

    return StreamingResponse(event_stream(), media_type="text/event-stream")


@router.get("/config/check")
async def check_config():
    """检查模型配置状态"""
    return get_provider_config_status()
