"""段落润色 API — SSE 流式返回润色内容"""
import json
from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from app.database import SessionLocal
from app.models.novel import Novel
from app.models.paragraph_version import ParagraphVersion
from app.llm.provider import get_llm_provider, get_provider_config_status
from app.services.refine import RefineService

router = APIRouter(prefix="/api/v2", tags=["refine"])


class RefineRequest(BaseModel):
    novel_id: int
    chapter_index: int
    paragraph_index: int
    action: str                  # rewrite/expand/compress
    original_content: str
    context: str = ""
    style: str = "轻松搞笑"
    llm_config: dict = None


@router.post("/refine")
async def refine_paragraph(req: RefineRequest):
    """SSE 流式润色段落"""
    if req.action not in ("rewrite", "expand", "compress"):
        raise HTTPException(status_code=400, detail="action 必须是 rewrite/expand/compress")

    # 验证小说存在
    db = SessionLocal()
    try:
        novel = db.query(Novel).filter(Novel.id == req.novel_id).first()
        if not novel:
            raise HTTPException(status_code=404, detail="小说不存在")
    finally:
        db.close()

    config_status = get_provider_config_status()
    if not config_status["configured"] and not req.llm_config:
        async def error_stream():
            yield f"event: error\ndata: {json.dumps({'message': config_status['error']}, ensure_ascii=False)}\n\n"
        return StreamingResponse(error_stream(), media_type="text/event-stream")

    llm = get_llm_provider(req.llm_config)
    service = RefineService(llm)

    async def event_stream():
        result = ""
        try:
            async for chunk in service.refine_stream(
                action=req.action,
                original_content=req.original_content,
                context=req.context,
                style=req.style,
            ):
                result += chunk
                yield f"event: content\ndata: {json.dumps({'text': chunk}, ensure_ascii=False)}\n\n"

            # 保存润色版本到数据库
            db = SessionLocal()
            try:
                # 获取当前版本号
                existing = db.query(ParagraphVersion).filter(
                    ParagraphVersion.novel_id == req.novel_id,
                    ParagraphVersion.chapter_index == req.chapter_index,
                    ParagraphVersion.paragraph_index == req.paragraph_index,
                ).order_by(ParagraphVersion.version.desc()).first()

                new_version = (existing.version + 1) if existing else 1
                if new_version > 3:
                    new_version = 1  # 循环覆盖

                version = ParagraphVersion(
                    novel_id=req.novel_id,
                    chapter_index=req.chapter_index,
                    paragraph_index=req.paragraph_index,
                    action=req.action,
                    content=result,
                    version=new_version,
                )
                db.add(version)
                db.commit()

                yield f"event: complete\ndata: {json.dumps({'version': new_version, 'total_versions': min(new_version, 3)}, ensure_ascii=False)}\n\n"
            finally:
                db.close()

        except Exception as e:
            yield f"event: error\ndata: {json.dumps({'message': str(e)}, ensure_ascii=False)}\n\n"

    return StreamingResponse(event_stream(), media_type="text/event-stream")


@router.get("/refine/versions")
async def get_paragraph_versions(
    novel_id: int,
    chapter_index: int,
    paragraph_index: int,
):
    """获取段落的历史版本"""
    db = SessionLocal()
    try:
        versions = db.query(ParagraphVersion).filter(
            ParagraphVersion.novel_id == novel_id,
            ParagraphVersion.chapter_index == chapter_index,
            ParagraphVersion.paragraph_index == paragraph_index,
        ).order_by(ParagraphVersion.version.desc()).limit(3).all()

        return {
            "versions": [
                {
                    "id": v.id,
                    "action": v.action,
                    "content": v.content,
                    "version": v.version,
                    "created_at": v.created_at.isoformat() if v.created_at else "",
                }
                for v in versions
            ]
        }
    finally:
        db.close()
