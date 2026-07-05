"""生成小说 API（SSE 流式接口）"""
import json
from typing import Optional
from fastapi import APIRouter
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from app.llm.provider import get_llm_provider, get_provider_config_status
from app.services.generator import GeneratorService
from app.data import get_categories_by_gender, STYLES, GENDERS, CHINESE_MODELS

router = APIRouter(prefix="/api/v1")


class GenerateRequest(BaseModel):
    seed_text: str
    gender: str = "男频"
    genre: str = "都市脑洞"
    style: str = "轻松搞笑"
    word_count: int = 3000
    per_chapter_min: int = 800
    per_chapter_max: int = 2500
    llm_config: Optional[dict] = None


@router.post("/generate")
async def generate_novel(req: GenerateRequest):
    if not req.seed_text.strip():
        return {"error": "seed_text 不能为空"}
    if req.gender not in GENDERS:
        return {"error": f"不支持的频道，可选：{', '.join(GENDERS)}"}
    valid_categories = get_categories_by_gender(req.gender)
    if req.genre not in valid_categories:
        return {"error": f"{req.gender}不支持该题材，可选：{', '.join(valid_categories)}"}
    if req.style not in STYLES:
        return {"error": f"不支持的风格，可选：{', '.join(STYLES)}"}
    if req.word_count < 500:
        req.word_count = 500
    elif req.word_count > 500000:
        req.word_count = 500000
    if req.per_chapter_min < 200:
        req.per_chapter_min = 200
    if req.per_chapter_max > 20000:
        req.per_chapter_max = 20000
    if req.per_chapter_min > req.per_chapter_max:
        req.per_chapter_min, req.per_chapter_max = req.per_chapter_max, req.per_chapter_min

    config_status = get_provider_config_status()
    if not config_status["configured"] and not req.llm_config:
        async def error_stream():
            yield f"event: error\ndata: {json.dumps({'message': config_status['error'], 'type': 'config'}, ensure_ascii=False)}\n\n"
        return StreamingResponse(error_stream(), media_type="text/event-stream")

    llm = get_llm_provider(req.llm_config)
    service = GeneratorService(llm)

    async def event_stream():
        async for event in service.generate(
            seed_text=req.seed_text, gender=req.gender, genre=req.genre,
            style=req.style, word_count=req.word_count,
            per_chapter_min=req.per_chapter_min, per_chapter_max=req.per_chapter_max,
            model_config=req.llm_config,
        ):
            yield f"event: {event['event']}\ndata: {json.dumps(event['data'], ensure_ascii=False)}\n\n"

    return StreamingResponse(event_stream(), media_type="text/event-stream")


@router.get("/config/check")
async def check_config():
    return get_provider_config_status()


@router.get("/models/list")
async def list_models():
    """返回所有国产模型配置列表"""
    return {"models": CHINESE_MODELS}


@router.get("/genres/list")
async def list_genres(gender: str = "男频"):
    """获取指定频道的题材列表"""
    return {"gender": gender, "genres": get_categories_by_gender(gender), "styles": STYLES}
