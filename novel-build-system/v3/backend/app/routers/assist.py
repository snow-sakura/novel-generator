"""写作助手 API (F9) — 续写 + 智能改写"""

import json
from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from app.llm.provider import get_llm_provider, get_provider_config_status
from app.services.generator import GeneratorService

router = APIRouter(prefix="/api/v3")


class ContinueRequest(BaseModel):
    novel_id: int = 0
    chapter_index: int = 0
    context: str = ""
    instruction: str = ""
    target_words: int = 300


class SmartRewriteRequest(BaseModel):
    novel_id: int = 0
    chapter_index: int = 0
    paragraph_index: int = 0
    content: str = ""
    instruction: str = ""


@router.post("/assist/continue")
async def assist_continue(req: ContinueRequest):
    """SSE 续写：从上下文末尾继续生成"""
    if not req.context.strip():
        raise HTTPException(status_code=400, detail="上下文不能为空")

    config_status = get_provider_config_status()
    if not config_status["configured"]:

        async def error_stream():
            yield f"event: error\ndata: {json.dumps({'message': config_status['error']}, ensure_ascii=False)}\n\n"

        return StreamingResponse(error_stream(), media_type="text/event-stream")

    llm = get_llm_provider(None)
    service = GeneratorService(llm)

    async def event_stream():
        try:
            yield f"event: log\ndata: {json.dumps({'text': '✍️ 正在续写...'}, ensure_ascii=False)}\n\n"
            async for chunk in service.generate_continuation(
                context=req.context,
                instruction=req.instruction,
                target_words=req.target_words,
            ):
                if chunk:
                    yield f"event: content\ndata: {json.dumps({'text': chunk}, ensure_ascii=False)}\n\n"
            yield f"event: complete\ndata: {json.dumps({'ok': True}, ensure_ascii=False)}\n\n"
        except Exception as e:
            yield f"event: error\ndata: {json.dumps({'message': str(e)}, ensure_ascii=False)}\n\n"

    return StreamingResponse(event_stream(), media_type="text/event-stream")


@router.post("/assist/rewrite")
async def assist_rewrite(req: SmartRewriteRequest):
    """SSE 智能改写：按用户指令改写段落"""
    if not req.content.strip():
        raise HTTPException(status_code=400, detail="内容不能为空")
    if len(req.content) > 50000:
        raise HTTPException(status_code=400, detail="内容长度不能超过 50000 字符")
    if not req.instruction.strip():
        raise HTTPException(status_code=400, detail="改写指令不能为空")

    config_status = get_provider_config_status()
    if not config_status["configured"]:

        async def error_stream():
            yield f"event: error\ndata: {json.dumps({'message': config_status['error']}, ensure_ascii=False)}\n\n"

        return StreamingResponse(error_stream(), media_type="text/event-stream")

    llm = get_llm_provider(None)
    service = GeneratorService(llm)

    prompt = f"""请根据以下指令改写这段小说内容。

【原文】
{req.content}

【改写指令】
{req.instruction}

【要求】
1. 严格按指令改写，保留原文的核心信息和风格
2. 输出纯文本，不要标题
3. 保持与原文长度相近

改写结果："""

    async def event_stream():
        try:
            yield f"event: log\ndata: {json.dumps({'text': '🔄 正在改写...'}, ensure_ascii=False)}\n\n"
            async for chunk in service.llm.generate_stream(prompt):
                if chunk:
                    yield f"event: content\ndata: {json.dumps({'text': chunk}, ensure_ascii=False)}\n\n"
            yield f"event: complete\ndata: {json.dumps({'ok': True}, ensure_ascii=False)}\n\n"
        except Exception as e:
            yield f"event: error\ndata: {json.dumps({'message': str(e)}, ensure_ascii=False)}\n\n"

    return StreamingResponse(event_stream(), media_type="text/event-stream")
