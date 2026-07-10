"""导出服务：Markdown / TXT / PDF"""
import io
from xml.sax.saxutils import escape as xml_escape
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer
from reportlab.lib.units import mm

try:
    from reportlab.pdfbase import pdfmetrics
    from reportlab.pdfbase.cidfonts import UnicodeCIDFont
    pdfmetrics.registerFont(UnicodeCIDFont('STSong-Light'))
    CN_FONT = 'STSong-Light'
except Exception:
    CN_FONT = 'Helvetica'


def export_markdown(title: str, content: str) -> str:
    """导出为 Markdown 格式"""
    return f"# {title}\n\n{content}"


def export_txt(title: str, content: str) -> str:
    """导出为纯文本格式（去除 Markdown 标记）"""
    import re
    text = content
    text = re.sub(r"^#+\s*", "", text, flags=re.MULTILINE)
    text = re.sub(r"\*\*(.*?)\*\*", r"\1", text)
    text = re.sub(r"\*(.*?)\*", r"\1", text)
    text = re.sub(r"!\[.*?\]\(.*?\)", "", text)
    text = re.sub(r"\[(.*?)\]\(.*?\)", r"\1", text)
    return f"{title}\n{'=' * len(title)}\n\n{text}"


def export_pdf(title: str, content: str) -> bytes:
    """导出为 PDF 格式"""
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=A4)
    styles = getSampleStyleSheet()

    title_style = ParagraphStyle(
        "NovelTitle",
        parent=styles["Title"],
        fontName=CN_FONT,
        fontSize=18,
        spaceAfter=20,
    )
    chapter_style = ParagraphStyle(
        "ChapterTitle",
        parent=styles["Heading2"],
        fontName=CN_FONT,
        fontSize=14,
        spaceBefore=12,
        spaceAfter=6,
    )
    body_style = ParagraphStyle(
        "NovelBody",
        parent=styles["Normal"],
        fontName=CN_FONT,
        fontSize=11,
        leading=18,
        spaceAfter=6,
    )

    elements = []
    elements.append(Paragraph(title, title_style))
    elements.append(Spacer(1, 10 * mm))

    for line in content.split("\n"):
        line = line.strip()
        if not line:
            continue
        if line.startswith("## "):
            elements.append(Paragraph(xml_escape(line[3:]), chapter_style))
        elif line.startswith("# "):
            elements.append(Paragraph(xml_escape(line[2:]), chapter_style))
        else:
            elements.append(Paragraph(xml_escape(line), body_style))

    doc.build(elements)
    buffer.seek(0)
    return buffer.getvalue()
