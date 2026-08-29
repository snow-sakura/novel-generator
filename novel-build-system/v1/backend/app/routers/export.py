"""小说导出 API（整本 / 逐章 / 大纲 / 全量压缩包）"""

import json
import logging
import os
import re
import zipfile
from io import BytesIO
from urllib.parse import quote

logger = logging.getLogger(__name__)

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import PlainTextResponse, StreamingResponse
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.novel import Novel
from app.services.export import export_markdown, export_txt, export_pdf
from app.services.xmind import generate_xmind

router = APIRouter(prefix="/api/v1")


def _safe_filename(title: str, ext: str) -> str:
    safe = re.sub(r'[\\/:*?"<>|]', "", title).strip() or "未命名小说"
    return quote(f"{safe}.{ext}")


@router.get("/novels/{novel_id}/export")
async def export_novel(
    novel_id: int, format: str = "markdown", db: Session = Depends(get_db)
):
    """导出小说全文（markdown / txt / pdf）"""
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
            headers={
                "Content-Disposition": f"attachment; filename*=UTF-8''{_safe_filename(title, 'md')}"
            },
        )
    elif format == "txt":
        text = export_txt(title, content)
        return PlainTextResponse(
            text,
            media_type="text/plain; charset=utf-8",
            headers={
                "Content-Disposition": f"attachment; filename*=UTF-8''{_safe_filename(title, 'txt')}"
            },
        )
    elif format == "pdf":
        pdf_bytes = export_pdf(title, content)
        return StreamingResponse(
            iter([pdf_bytes]),
            media_type="application/pdf",
            headers={
                "Content-Disposition": f"attachment; filename*=UTF-8''{_safe_filename(title, 'pdf')}"
            },
        )
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
            ch_title = ch.get("title", f"第{i + 1}章")
            # 找到对应内容块
            ch_content = ""
            for block in chapter_blocks:
                if ch_title in block[:100]:
                    ch_content = block.strip()
                    break
            if not ch_content:
                ch_content = f"## {ch_title}\n\n（内容未找到）"
            filename = f"第{i + 1}章 {ch_title}.txt"
            safe_fn = re.sub(r'[\\/:*?"<>|]', "", filename)
            zf.writestr(
                safe_fn, f"《{title}》\n{ch_title}\n\n{ch_content}\n".encode("utf-8")
            )

    zip_buffer.seek(0)
    safe_title = re.sub(r'[\\/:*?"<>|]', "", title) or "未命名小说"
    return StreamingResponse(
        iter([zip_buffer.getvalue()]),
        media_type="application/zip",
        headers={
            "Content-Disposition": f"attachment; filename*=UTF-8''{quote(f'{safe_title}_章节合集.zip')}"
        },
    )


@router.get("/novels/{novel_id}/export/outline")
async def export_outline(
    novel_id: int, format: str = "markdown", db: Session = Depends(get_db)
):
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
    if not chapters and novel.chapters:
        # 如果 outline 中没有章节列表，回退到 novel.chapters 字段
        try:
            chapters = json.loads(novel.chapters)
        except json.JSONDecodeError:
            pass

    if format == "xmind":
        xmind_bytes = generate_xmind(title, outline)
        safe_title = re.sub(r'[\\/:*?"<>|]', "", title).strip() or "未命名小说"
        return StreamingResponse(
            iter([xmind_bytes]),
            media_type="application/x-xmind",
            headers={
                "Content-Disposition": f"attachment; filename*=UTF-8''{quote(f'{safe_title}_大纲.xmind')}"
            },
        )

    # 默认 markdown — 完整大纲
    lines = [
        f"# 《{title}》完整创作大纲\n",
        f"> {novel.gender} · {novel.genre} · {novel.style}\n\n",
        "---\n",
    ]

    outline_labels = {
        "strategy": "1. 战略层（顶层设计）",
        "core_idea": "1.1 核心立意",
        "high_concept": "高概念设定",
        "unique_selling_point": "独特卖点",
        "theme": "1.2 思想主题",
        "core_question": "探讨的核心问题",
        "values": "价值观输出",
        "ending": "1.3 结局预判",
        "type": "结局类型",
        "final_scene": "最终场景画面",
        "characters": "2. 人物层（角色体系）",
        "protagonist": "2.1 主角",
        "desire": "核心欲望",
        "flaw": "核心缺陷",
        "traits": "性格特质",
        "arc": "成长弧线",
        "supporting": "2.2 配角",
        "antagonist": "2.3 反派",
        "motive": "反派动机",
        "threat": "压迫感",
        "value_opposition": "价值对立",
        "relationships": "2.4 人物关系网",
        "world": "3. 设定层（世界观）",
        "time_space": "3.1 时空背景",
        "era": "时代",
        "locations": "场景",
        "rules": "3.2 规则体系",
        "world_rules": "世界规则",
        "power_system": "力量体系",
        "social_structure": "社会结构",
        "factions": "3.3 势力格局",
        "description": "描述",
        "alignment": "立场",
        "plot_structure": "4. 结构层（情节设计）",
        "three_acts": "4.1 三幕式",
        "act1": "第一幕·建置",
        "act2": "第二幕·对抗",
        "act3": "第三幕·结局",
        "beat_sheet": "4.2 节拍表",
        "beat": "节拍",
        "chapter_range": "章节范围",
        "golden_three": "4.3 黄金三章",
        "hook": "钩子",
        "function": "功能定位",
        "rhythm": "5. 节奏层（情绪控制）",
        "satisfaction_points": "爽点布局",
        "emotional_peaks": "泪点/痛点",
        "pace_curve": "节奏曲线",
        "style_tone": "6. 风格层（文笔与基调）",
        "perspective": "叙事视角",
        "language": "语言风格",
        "atmosphere": "氛围基调",
        "chapters": "7. 章节细纲",
        "summary": "概要",
        "cliffhanger": "悬念",
        "word_count_estimate": "字数预估",
        "role": "作用",
    }

    def render_dict(d, depth=1):
        buf = []
        for k, v in d.items():
            label_text = outline_labels.get(k, k)
            prefix = "#" * (depth + 1)
            if isinstance(v, dict):
                buf.append(f"\n{prefix} {label_text}\n\n")
                buf.extend(render_dict(v, depth + 1))
            elif isinstance(v, list):
                buf.append(f"\n{prefix} {label_text}\n\n")
                for item in v:
                    if isinstance(item, dict):
                        item_title = (
                            item.get("title")
                            or item.get("name")
                            or item.get("beat")
                            or ""
                        )
                        if item_title:
                            buf.append(f"**{item_title}**\n\n")
                        for ik, iv in item.items():
                            if ik in ("title", "name"):
                                continue
                            il = outline_labels.get(ik, ik)
                            buf.append(f"- **{il}**: {iv}\n")
                        buf.append("\n")
                    elif item:
                        buf.append(f"- {item}\n")
            elif isinstance(v, str) and v.strip():
                buf.append(f"- **{label_text}**: {v}\n")
        return buf

    elements = outline.get("elements", {})
    for section in (
        "strategy",
        "characters",
        "world",
        "plot_structure",
        "rhythm",
        "style_tone",
    ):
        if section in elements:
            lines.extend(render_dict({section: elements[section]}))
        elif section in outline:
            lines.extend(render_dict({section: outline[section]}))

    # 章节细纲单独处理
    if chapters:
        lines.append("\n## 7. 章节细纲\n\n")
        for i, ch in enumerate(chapters):
            lines.append(f"### 第{i + 1}章 {ch.get('title', '')}\n\n")
            lines.append(f"{ch.get('summary', '')}\n\n")
            for f in ("hook", "cliffhanger", "function", "word_count_estimate"):
                if ch.get(f):
                    fl = outline_labels.get(f, f)
                    lines.append(f"- **{fl}**: {ch[f]}\n")
            lines.append("\n")

    text = "".join(lines)
    return PlainTextResponse(
        text,
        media_type="text/markdown; charset=utf-8",
        headers={
            "Content-Disposition": f"attachment; filename*=UTF-8''{_safe_filename(title, '大纲.md')}"
        },
    )


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
    if not chapters and novel.chapters:
        try:
            chapters = json.loads(novel.chapters)
        except json.JSONDecodeError:
            pass

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
            ch_title = ch.get("title", f"第{i + 1}章")
            ch_content = ""
            for block in chapter_blocks:
                if ch_title in block[:100]:
                    ch_content = block.strip()
                    break
            if not ch_content:
                ch_content = f"## {ch_title}\n\n（内容未找到）"
            fn = f"第{i + 1}章 {ch_title}.txt"
            safe_fn = re.sub(r'[\\/:*?"<>|]', "", fn)
            zf.writestr(
                f"章节/{safe_fn}",
                f"《{title}》\n{ch_title}\n\n{ch_content}\n".encode("utf-8"),
            )

        # 4. 大纲 XMind
        try:
            xmind_bytes = generate_xmind(title, outline)
            zf.writestr(f"{safe_title} 大纲.xmind", xmind_bytes)
        except Exception as e:
            logger.warning("export_package: XMind 生成失败: %s", e)

    zip_buffer.seek(0)
    return StreamingResponse(
        iter([zip_buffer.getvalue()]),
        media_type="application/zip",
        headers={
            "Content-Disposition": f"attachment; filename*=UTF-8''{quote(safe_title)}.zip"
        },
    )
