"""XMind 思维导图文件生成器"""
import io
import zipfile
from xml.sax.saxutils import escape


def generate_xmind(title: str, chapters: list) -> bytes:
    """生成 XMind 8 兼容格式的思维导图文件内容

    参数:
        title: 小说标题（根节点）
        chapters: [{ title, summary }, ...] 章节列表
    """
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED) as zf:
        meta = (
            '<?xml version="1.0" encoding="UTF-8" standalone="no"?>\n'
            '<meta xmlns="urn:xmind:xmind:meta:2011">\n'
            f"  <creator>番茄小说生成智能体</creator>\n"
            f"  <title>{escape(title)}</title>\n"
            "  <version>8.0</version>\n"
            "</meta>\n"
        )
        zf.writestr("meta.xml", meta.encode("utf-8"))

        manifest = (
            '<?xml version="1.0" encoding="UTF-8" standalone="no"?>\n'
            '<manifest xmlns="urn:xmind:xmind:manifest:2011">\n'
            '  <file-entry full-path="content.xml" media-type="text/xml"/>\n'
            '  <file-entry full-path="meta.xml" media-type="text/xml"/>\n'
            '</manifest>\n'
        )
        zf.writestr("META-INF/manifest.xml", manifest.encode("utf-8"))

        topics_xml = ""
        for i, ch in enumerate(chapters):
            ch_title = escape(ch.get("title", f"第{i+1}章"))
            summary = escape(ch.get("summary", "")[:80])
            topics_xml += (
                f'<topic id="ch-{i}" style="font-weight:bold">\n'
                f"  <title>{ch_title}</title>\n"
                f'  <children positions="merged">\n'
                f"    <topic id=\"summary-{i}\">\n"
                f"      <title>{summary}</title>\n"
                f"    </topic>\n"
                f"  </children>\n"
                f"</topic>\n"
            )

        content = (
            '<?xml version="1.0" encoding="UTF-8" standalone="no"?>\n'
            '<xmap-content xmlns="urn:xmind:xmap:xmlns:content:2.0"'
            ' xmlns:fo="http://www.w3.org/1999/XSL/Format"'
            ' xmlns:svg="http://www.w3.org/2000/svg">\n'
            f'  <sheet id="sheet1" theme="default-theme">\n'
            f"    <topic id=\"root\">\n"
            f"      <title>{escape(title)}</title>\n"
            f"      <children positions=\"merged\">\n"
            f"        {topics_xml}\n"
            f"      </children>\n"
            f"    </topic>\n"
            f"  </sheet>\n"
            f"</xmap-content>\n"
        )
        zf.writestr("content.xml", content.encode("utf-8"))

    return buf.getvalue()
