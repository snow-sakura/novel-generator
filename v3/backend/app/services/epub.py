"""EPUB 电子书生成器（无外部依赖）"""
import re
import uuid
from datetime import datetime
from io import BytesIO
from xml.sax.saxutils import escape
from zipfile import ZipFile, ZIP_DEFLATED


def _escape(text: str) -> str:
    return escape(text or "")


def _clean_text(text: str) -> str:
    """移除 Markdown 标记，保留纯文本"""
    text = re.sub(r"^###\s*", "", text, flags=re.MULTILINE)
    text = re.sub(r"^##\s*", "", text, flags=re.MULTILINE)
    text = re.sub(r"^#\s*", "", text, flags=re.MULTILINE)
    text = re.sub(r"\*\*(.+?)\*\*", r"\1", text)
    text = re.sub(r"\*(.+?)\*", r"\1", text)
    text = re.sub(r"^>\s*", "", text, flags=re.MULTILINE)
    text = re.sub(r"^[-*]\s+", "", text, flags=re.MULTILINE)
    text = re.sub(r"!\[.*?\]\(.*?\)", "", text)
    text = re.sub(r"\[(.+?)\]\(.*?\)", r"\1", text)
    return text.strip()


def _html_paragraphs(text: str) -> str:
    """将 Markdown 文本转为 XHTML 段落"""
    blocks = re.split(r"\n\n+", text)
    html_parts = []
    for block in blocks:
        block = block.strip()
        if not block:
            continue
        # 标题
        if re.match(r"^#{1,3}\s", block):
            level = len(re.match(r"^(#{1,3})\s", block).group(1))
            content = re.sub(r"^#{1,3}\s*", "", block).strip()
            html_parts.append(f"<h{level}>{_escape(content)}</h{level}>")
        elif block.startswith("> "):
            content = re.sub(r"^>\s*", "", block, flags=re.MULTILINE)
            html_parts.append(f"<blockquote><p>{_escape(content)}</p></blockquote>")
        elif block.startswith("***") or block.startswith("---"):
            html_parts.append("<hr/>")
        else:
            # 处理行内格式
            line = _escape(block)
            line = re.sub(r"\*\*(.+?)\*\*", r"<strong>\1</strong>", line)
            line = re.sub(r"\*(.+?)\*", r"<em>\1</em>", line)
            html_parts.append(f"<p>{line}</p>")
    return "\n".join(html_parts)


CSS = """\
@namespace epub "http://www.idpf.org/2007/ops";
body {
  font-family: "Noto Serif CJK SC", "Source Han Serif SC", "SimSun", serif;
  line-height: 1.8;
  margin: 0;
  padding: 0 1em;
  color: #333;
}
h1 { text-align: center; font-size: 1.6em; margin: 2em 0 1em; }
h2 { text-align: left; font-size: 1.3em; margin: 1.5em 0 0.8em; }
h3 { font-size: 1.1em; margin: 1.2em 0 0.6em; }
p { text-indent: 2em; margin: 0.5em 0; }
blockquote {
  margin: 1em 1.5em;
  padding: 0.5em 1em;
  border-left: 3px solid #ccc;
  color: #666;
  font-style: italic;
}
hr { margin: 1.5em 0; border: none; border-top: 1px solid #ddd; }
.cover-page { text-align: center; padding-top: 30vh; }
.cover-page h1 { font-size: 2em; margin-bottom: 0.5em; }
.cover-page .subtitle { font-size: 1em; color: #666; }
"""


def generate_epub(title: str, content: str, chapters: list[dict],
                  gender: str = "", genre: str = "", style: str = "",
                  author: str = "AI Novel Generator") -> bytes:
    """生成 EPUB 文件，返回 bytes"""
    uid = str(uuid.uuid4())
    now = datetime.now().strftime("%Y-%m-%dT%H:%M:%SZ")
    safe_title = re.sub(r'[\\/:*?"<>|]', "", title).strip() or "未命名小说"

    # 拆分章节
    chapter_blocks = re.split(r"\n(?=## )", content) if content else []
    parsed_chapters = []
    for i, block in enumerate(chapter_blocks):
        block = block.strip()
        if not block:
            continue
        title_match = re.match(r"^##\s*(.+)", block)
        ch_title = title_match.group(1).strip() if title_match else f"第{i+1}章"
        ch_content = re.sub(r"^##\s*.+\n*", "", block).strip()
        parsed_chapters.append({"title": ch_title, "content": ch_content})

    # 如果按 ## 拆分失败，回退到 chapters 参数
    if not parsed_chapters:
        for i, ch in enumerate(chapters):
            parsed_chapters.append({"title": ch.get("title", f"第{i+1}章"), "content": ""})

    buf = BytesIO()
    with ZipFile(buf, "w", ZIP_DEFLATED) as zf:
        # mimetype（必须无压缩）
        zf.writestr("mimetype", "application/epub+zip", compress_type=ZIP_STORED)

        # META-INF/container.xml
        container_xml = f"""<?xml version="1.0" encoding="UTF-8"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
  <rootfiles>
    <rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/>
  </rootfiles>
</container>"""
        zf.writestr("META-INF/container.xml", container_xml.encode("utf-8"))

        # OEBPS/style.css
        zf.writestr("OEBPS/style.css", CSS.encode("utf-8"))

        # 构建 content.opf
        manifest_items = []
        spine_items = []

        def add_item(id_, href, media_type):
            manifest_items.append(f"""    <item id="{id_}" href="{href}" media-type="{media_type}"/>""")
            spine_items.append(f"""    <itemref idref="{id_}"/>""")

        add_item("cover", "cover.xhtml", "application/xhtml+xml")
        add_item("nav", "nav.xhtml", "application/xhtml+xml")
        add_item("css", "style.css", "text/css")

        # 封面页
        cover_html = f"""<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml">
<head><title>{_escape(safe_title)}</title>
<link rel="stylesheet" type="text/css" href="style.css"/></head>
<body>
<div class="cover-page">
<h1>{_escape(safe_title)}</h1>
<p class="subtitle">{_escape(gender)} · {_escape(genre)} · {_escape(style)}</p>
<p class="subtitle">—— {_escape(author)} ——</p>
</div>
</body>
</html>"""
        zf.writestr("OEBPS/cover.xhtml", cover_html.encode("utf-8"))

        # 导航页 (EPUB3 toc)
        nav_items = []
        for i, ch in enumerate(parsed_chapters):
            ch_id = f"ch-{i+1:03d}"
            nav_items.append(f"""    <li><a href="{ch_id}.xhtml">{_escape(ch['title'])}</a></li>""")

        nav_html = f"""<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml"
      xmlns:epub="http://www.idpf.org/2007/ops">
<head><title>目录</title>
<link rel="stylesheet" type="text/css" href="style.css"/></head>
<body>
<h1>目录</h1>
<nav epub:type="toc">
<ol>
{chr(10).join(nav_items)}
</ol>
</nav>
</body>
</html>"""
        zf.writestr("OEBPS/nav.xhtml", nav_html.encode("utf-8"))

        # 章节
        for i, ch in enumerate(parsed_chapters):
            ch_id = f"ch-{i+1:03d}"
            add_item(ch_id, f"{ch_id}.xhtml", "application/xhtml+xml")
            body_html = _html_paragraphs(ch["content"])
            ch_xhtml = f"""<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml">
<head><title>{_escape(ch['title'])}</title>
<link rel="stylesheet" type="text/css" href="style.css"/></head>
<body>
<h2>{_escape(ch['title'])}</h2>
{body_html}
</body>
</html>"""
            zf.writestr(f"OEBPS/{ch_id}.xhtml", ch_xhtml.encode("utf-8"))

        # content.opf
        opf = f"""<?xml version="1.0" encoding="UTF-8"?>
<package xmlns="http://www.idpf.org/2007/opf" version="3.0"
         unique-identifier="book-id">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
    <dc:identifier id="book-id">{uid}</dc:identifier>
    <dc:title>{_escape(safe_title)}</dc:title>
    <dc:creator>{_escape(author)}</dc:creator>
    <dc:language>zh-CN</dc:language>
    <dc:date>{now}</dc:date>
    <meta property="dcterms:modified">{now}</meta>
  </metadata>
  <manifest>
{chr(10).join(manifest_items)}
  </manifest>
  <spine>
{chr(10).join(spine_items)}
  </spine>
  <guide>
    <reference type="cover" href="cover.xhtml"/>
    <reference type="toc" href="nav.xhtml"/>
  </guide>
</package>"""
        zf.writestr("OEBPS/content.opf", opf.encode("utf-8"))

    buf.seek(0)
    return buf.getvalue()


# mimetype 必须无压缩
ZIP_STORED = 0
