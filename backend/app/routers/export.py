"""小说导出 API"""
import re
from urllib.parse import quote

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import PlainTextResponse, StreamingResponse
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.novel import Novel
from app.services.export import export_markdown, export_txt, export_pdf

router = APIRouter(prefix="/api/v1")


def _safe_filename(title: str, ext: str) -> str:
    """生成安全的文件名（去除特殊字符 + URL 编码）"""
    safe = re.sub(r'[\\/:*?"<>|]', "", title)
    safe = safe.strip() or "未命名小说"
    return f"{quote(safe)}.{ext}"


@router.get("/novels/{novel_id}/export")
async def export_novel(novel_id: int, format: str = "markdown", db: Session = Depends(get_db)):
    """导出小说（markdown / txt / pdf）"""
    novel = db.query(Novel).filter(Novel.id == novel_id).first()
    if not novel:
        raise HTTPException(status_code=404, detail="小说不存在")

    title = novel.title or "未命名小说"
    content = novel.content or ""

    if format == "markdown":
        text = export_markdown(title, content)
        return PlainTextResponse(
            text,
            media_type="text/markdown; charset=utf-8",
            headers={"Content-Disposition": f"attachment; filename*=UTF-8''{_safe_filename(title, 'md')}"},
        )
    elif format == "txt":
        text = export_txt(title, content)
        return PlainTextResponse(
            text,
            media_type="text/plain; charset=utf-8",
            headers={"Content-Disposition": f"attachment; filename*=UTF-8''{_safe_filename(title, 'txt')}"},
        )
    elif format == "pdf":
        pdf_bytes = export_pdf(title, content)
        return StreamingResponse(
            iter([pdf_bytes]),
            media_type="application/pdf",
            headers={"Content-Disposition": f"attachment; filename*=UTF-8''{_safe_filename(title, 'pdf')}"},
        )
    else:
        raise HTTPException(status_code=400, detail="不支持的导出格式，可选：markdown / txt / pdf")
