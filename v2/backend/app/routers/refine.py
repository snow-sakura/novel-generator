"""段落润色 API — SSE 流式返回润色内容"""
import json
from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field

from app.database import SessionLocal
from app.models.novel import Novel
from app.models.generation_record import GenerationRecord
from app.models.paragraph_version import ParagraphVersion
from app.llm.provider import get_llm_provider, get_provider_config_status
from app.services.refine import RefineService

router = APIRouter(prefix="/api/v2", tags=["refine"])


class RefineRequest(BaseModel):
    novel_id: int = Field(..., description="小说 ID")
    chapter_index: int = Field(..., description="章节索引（从 0 开始）")
    paragraph_index: int = Field(..., description="段落索引（从 0 开始）")
    action: str = Field(..., description="操作类型：rewrite/expand/compress")
    original_content: str = Field(..., description="原始段落内容")
    context: str = Field(default="", description="上下文（前一段落）")
    style: str = Field(default="轻松搞笑", description="小说风格")
    pov: str = Field(default="第三人称有限", description="叙事视角")
    pacing: str = Field(default="标准型", description="节奏模式")
    style_intensity: str = Field(default="中度", description="风格强度")
    llm_config: dict = Field(default=None, description="自定义模型配置")


@router.post("/refine")
async def refine_paragraph(req: RefineRequest):
    """SSE 流式润色段落"""
    if req.action not in ("rewrite", "expand", "compress"):
        raise HTTPException(status_code=400, detail="action 必须是 rewrite/expand/compress")

    # 验证小说或生成记录存在
    db = SessionLocal()
    try:
        # novel_id 可能是 GenerationRecord.id（前端传递的 record_id）
        novel = db.query(Novel).filter(Novel.id == req.novel_id).first()
        if not novel:
            # 尝试查询 GenerationRecord
            record = db.query(GenerationRecord).filter(
                GenerationRecord.id == req.novel_id
            ).first()
            if not record:
                raise HTTPException(
                    status_code=404,
                    detail=f"小说/记录不存在 (id={req.novel_id})"
                )
            # 如果 record 有关联 novel，使用 novel 的风格参数
            if record.novel_id:
                novel = db.query(Novel).filter(Novel.id == record.novel_id).first()
        if not novel:
            raise HTTPException(status_code=404, detail="小说不存在")
    finally:
        db.close()

    # 读取 novel 的风格参数作为默认值
    if not req.style and novel and novel.style:
        req.style = novel.style

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
                pov=req.pov,
                pacing=req.pacing,
                style_intensity=req.style_intensity,
            ):
                result += chunk
                yield f"event: content\ndata: {json.dumps({'text': chunk}, ensure_ascii=False)}\n\n"

            if not result.strip():
                yield f"event: error\ndata: {json.dumps({'message': '润色结果为空，请重试'}, ensure_ascii=False)}\n\n"
                return

            # 保存润色版本到数据库
            db = SessionLocal()
            try:
                existing = db.query(ParagraphVersion).filter(
                    ParagraphVersion.novel_id == req.novel_id,
                    ParagraphVersion.chapter_index == req.chapter_index,
                    ParagraphVersion.paragraph_index == req.paragraph_index,
                ).order_by(ParagraphVersion.version.desc()).first()

                new_version = (existing.version + 1) if existing else 1
                if new_version > 3:
                    new_version = 1

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

                yield f"event: complete\ndata: {json.dumps({'version': new_version, 'total_versions': 3}, ensure_ascii=False)}\n\n"
            finally:
                db.close()

        except Exception as e:
            yield f"event: error\ndata: {json.dumps({'message': str(e)}, ensure_ascii=False)}\n\n"

    return StreamingResponse(event_stream(), media_type="text/event-stream")


@router.get("/refine/versions")
async def get_paragraph_versions(
    novel_id: int = Query(..., description="小说/记录 ID"),
    chapter_index: int = Query(..., description="章节索引"),
    paragraph_index: int = Query(..., description="段落索引"),
):
    """获取段落的历史版本（最多 3 版）"""
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
