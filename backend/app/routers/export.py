"""小说导出 API（整本 / 逐章 / 大纲 / 全量压缩包）"""
import json
import os
import re
import zipfile
from io import BytesIO
from urllib.parse import quote

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import PlainTextResponse, StreamingResponse
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.novel import Novel
from app.services.export import export_markdown, export_txt, export_pdf
from app.services.xmind import generate_xmind

router = APIRouter(prefix="/api/v1")


def _safe_filename(title: str, ext: str) -> str:
    safe = re.sub(r'[\\/:*?"<>|]', "", title)
    safe = safe.strip() or "未命名小说"
    return f"{quote(safe)}.{ext}"


@router.get("/novels/{novel_id}/export")
async def export_novel(novel_id: int, format: str = "markdown", db: Session = Depends(get_db)):
    """导出小说全文（markdown / txt / pdf）"""
    novel = db.query(Novel).filter(Novel.id == novel_id).first()
    if not novel:
        raise HTTPException(status_code=404, detail="小说不存在")

    title = novel.title or "未命名小说"
    content = novel.content or ""

    if format == "markdown":
        text = export_markdown(title, content)
        return PlainTextResponse(text, media_type="text/markdown; charset=utf-8",
            headers={"Content-Disposition": f"attachment; filename*=UTF-8''{_safe_filename(title, 'md')}"})
    elif format == "txt":
        text = export_txt(title, content)
        return PlainTextResponse(text, media_type="text/plain; charset=utf-8",
            headers={"Content-Disposition": f"attachment; filename*=UTF-8''{_safe_filename(title, 'txt')}"})
    elif format == "pdf":
        pdf_bytes = export_pdf(title, content)
        return StreamingResponse(iter([pdf_bytes]), media_type="application/pdf",
            headers={"Content-Disposition": f"attachment; filename*=UTF-8''{_safe_filename(title, 'pdf')}"})
    else:
        raise HTTPException(status_code=400, detail="不支持的导出格式")


@router.get("/novels/{novel_id}/export/chapters")
async def export_chapters_zip(novel_id: int, db: Session = Depends(get_db)):
    """导出所有章节为单独的 TXT 文件，打包为 ZIP"""
    novel = db.query(Novel).filter(Novel.id == novel_id).first()
    if not novel:
        raise HTTPException(status_code=404, detail="小说不存在")

    title = novel.title or "未命名小说"
    content = novel.content or ""
    chapters_raw = novel.chapters or "[]"
    try:
        chapters = json.loads(chapters_raw)
    except json.JSONDecodeError:
        chapters = []

    # 按 ## 拆分内容
    chapter_blocks = re.split(r"\n(?=## )", content) if content else []
    zip_buffer = BytesIO()
    with zipfile.ZipFile(zip_buffer, "w", zipfile.ZIP_DEFLATED) as zf:
        for i, ch in enumerate(chapters):
            ch_title = ch.get("title", f"第{i+1}章")
            # 找到对应内容块
            ch_content = ""
            for block in chapter_blocks:
                if ch_title in block[:100]:
                    ch_content = block.strip()
                    break
            if not ch_content:
                ch_content = f"## {ch_title}\n\n（内容未找到）"
            filename = f"第{i+1}章 {ch_title}.txt"
            safe_fn = re.sub(r'[\\/:*?"<>|]', "", filename)
            zf.writestr(safe_fn, f"《{title}》\n{ch_title}\n\n{ch_content}\n".encode("utf-8"))

    zip_buffer.seek(0)
    safe_title = re.sub(r'[\\/:*?"<>|]', "", title) or "未命名小说"
    return StreamingResponse(
        iter([zip_buffer.getvalue()]),
        media_type="application/zip",
        headers={"Content-Disposition": f"attachment; filename*=UTF-8''{quote(safe_title)}_章节合集.zip"},
    )


@router.get("/novels/{novel_id}/export/outline")
async def export_outline(novel_id: int, format: str = "markdown", db: Session = Depends(get_db)):
    """导出创作大纲（支持 markdown / xmind 格式）"""
    novel = db.query(Novel).filter(Novel.id == novel_id).first()
    if not novel:
        raise HTTPException(status_code=404, detail="小说不存在")

    title = novel.title or "未命名小说"
    outline_raw = novel.outline or "{}"
    try:
        outline = json.loads(outline_raw)
    except json.JSONDecodeError:
        outline = {}

    elements = outline.get("elements", {})
    chapters = outline.get("chapters", [])

    if format == "xmind":
        xmind_bytes = generate_xmind(title, chapters)
        safe_title = re.sub(r'[\\/:*?"<>|]', "", title).strip() or "未命名小说"
        return StreamingResponse(
            iter([xmind_bytes]),
            media_type="application/x-xmind",
            headers={"Content-Disposition": f"attachment; filename*=UTF-8''{quote(safe_title)}_大纲.xmind"},
        )

    # 默认 markdown
    lines = [
        f"# 《{title}》创作大纲\n",
        f"> {novel.gender} · {novel.genre} · {novel.style}\n\n",
        "---\n\n## 故事要素\n\n",
    ]
    for key, val in elements.items():
        lines.append(f"- **{key}**: {val}\n")
    lines.append("\n## 章节大纲\n\n")
    for i, ch in enumerate(chapters):
        lines.append(f"### 第{i+1}章 {ch.get('title', '')}\n")
        lines.append(f"{ch.get('summary', '')}\n\n")
    lines.append("\n---\n## 思维导图（缩进格式）\n\n")
    lines.append(f"- 《{title}》\n")
    for i, ch in enumerate(chapters):
        lines.append(f"  - 第{i+1}章 {ch.get('title', '')}\n")
        s = ch.get("summary", "")
        lines.append(f"    - {s[:40]}{'...' if len(s) > 40 else ''}\n")

    text = "".join(lines)
    return PlainTextResponse(text, media_type="text/markdown; charset=utf-8",
        headers={"Content-Disposition": f"attachment; filename*=UTF-8''{_safe_filename(title, '大纲')}.md"})


@router.get("/novels/{novel_id}/export/package")
async def export_package(novel_id: int, db: Session = Depends(get_db)):
    """导出全部内容为 ZIP 压缩包（MD + TXT + 章节 TXT + XMind 大纲）"""
    novel = db.query(Novel).filter(Novel.id == novel_id).first()
    if not novel:
        raise HTTPException(status_code=404, detail="小说不存在")

    title = novel.title or "未命名小说"
    content = novel.content or ""
    safe_title = re.sub(r'[\\/:*?"<>|]', "", title).strip() or "未命名小说"

    outline_raw = novel.outline or "{}"
    try:
        outline = json.loads(outline_raw)
    except json.JSONDecodeError:
        outline = {}
    chapters = outline.get("chapters", [])

    zip_buffer = BytesIO()
    with zipfile.ZipFile(zip_buffer, "w", zipfile.ZIP_DEFLATED) as zf:
        # 1. 全文 Markdown
        md_bytes = export_markdown(title, content).encode("utf-8")
        zf.writestr(f"{safe_title}.md", md_bytes)

        # 2. 全文 TXT
        txt_bytes = export_txt(title, content).encode("utf-8")
        zf.writestr(f"{safe_title}.txt", txt_bytes)

        # 3. 逐章 TXT
        chapter_blocks = re.split(r"\n(?=## )", content) if content else []
        for i, ch in enumerate(chapters):
            ch_title = ch.get("title", f"第{i+1}章")
            ch_content = ""
            for block in chapter_blocks:
                if ch_title in block[:100]:
                    ch_content = block.strip()
                    break
            if not ch_content:
                ch_content = f"## {ch_title}\n\n（内容未找到）"
            fn = f"第{i+1}章 {ch_title}.txt"
            safe_fn = re.sub(r'[\\/:*?"<>|]', "", fn)
            zf.writestr(f"章节/{safe_fn}", f"《{title}》\n{ch_title}\n\n{ch_content}\n".encode("utf-8"))

        # 4. 大纲 XMind
        try:
            xmind_bytes = generate_xmind(title, chapters)
            zf.writestr(f"{safe_title} 大纲.xmind", xmind_bytes)
        except Exception:
            pass

    zip_buffer.seek(0)
    return StreamingResponse(
        iter([zip_buffer.getvalue()]),
        media_type="application/zip",
        headers={"Content-Disposition": f"attachment; filename*=UTF-8''{quote(safe_title)}.zip"},
    )
