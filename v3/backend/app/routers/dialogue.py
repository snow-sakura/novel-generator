"""角色对话生成 API (F8) — SSE 流式接口"""
import json
from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from app.llm.provider import get_llm_provider, get_provider_config_status
from app.services.generator import GeneratorService

router = APIRouter(prefix="/api/v3")


class CharacterProfile(BaseModel):
    name: str = ""
    role: str = ""
    traits: str = ""
    description: str = ""
    relationships: str = ""
    arc: str = ""


class DialogueRequest(BaseModel):
    characters: list[CharacterProfile] = []
    scenario: str = ""


@router.post("/dialogue/generate")
async def generate_dialogue(req: DialogueRequest):
    """SSE 流式生成角色对话"""
    if len(req.characters) < 2:
        return {"error": "至少需要 2 个角色"}
    if not req.scenario.strip():
        return {"error": "对话场景不能为空"}

    config_status = get_provider_config_status()
    if not config_status["configured"]:
        async def error_stream():
            yield f"event: error\ndata: {json.dumps({'message': config_status['error']}, ensure_ascii=False)}\n\n"
        return StreamingResponse(error_stream(), media_type="text/event-stream")

    llm = get_llm_provider(None)
    service = GeneratorService(llm)

    chars = [c.model_dump() for c in req.characters]

    async def event_stream():
        try:
            yield f"event: log\ndata: {json.dumps({'type': 'info', 'text': '🎭 正在生成角色对话...'}, ensure_ascii=False)}\n\n"

            text = await service.generate_dialogue(chars, req.scenario)

            # 按行流式输出
            lines = text.split("\n")
            for i, line in enumerate(lines):
                yield f"event: dialogue_content\ndata: {json.dumps({'text': line + ('\n' if i < len(lines) - 1 else '')}, ensure_ascii=False)}\n\n"

            yield f"event: dialogue_done\ndata: {json.dumps({'ok': True}, ensure_ascii=False)}\n\n"
        except Exception as e:
            yield f"event: error\ndata: {json.dumps({'message': str(e)}, ensure_ascii=False)}\n\n"

    return StreamingResponse(event_stream(), media_type="text/event-stream")
