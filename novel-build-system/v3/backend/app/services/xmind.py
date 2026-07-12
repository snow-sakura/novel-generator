"""XMind 思维导图文件生成器 — 支持多层树形结构"""
import io
import zipfile
from xml.sax.saxutils import escape

FIELD_LABELS = {
    "strategy": "1. 战略层",
    "core_idea": "1.1 核心立意",
    "high_concept": "高概念设定",
    "unique_selling_point": "独特卖点",
    "tone": "故事基调",
    "theme": "1.2 思想主题",
    "core_question": "探讨的核心问题",
    "values": "价值观输出",
    "ending": "1.3 结局预判",
    "type": "类型",
    "final_scene": "最终场景画面",
    "characters": "2. 人物层",
    "protagonist": "2.1 主角",
    "name": "姓名",
    "age": "年龄",
    "identity": "身份",
    "initial_state": "初始状态",
    "desire": "核心欲望",
    "flaw": "核心缺陷",
    "traits": "性格特质",
    "arc": "成长弧线",
    "supporting": "2.2 配角",
    "love_interest": "情感线对象",
    "antagonist": "2.3 反派",
    "motive": "反派动机",
    "threat": "压迫感",
    "value_opposition": "价值对立",
    "conflict_point": "冲突点",
    "relationships": "人物关系网",
    "world": "3. 设定层",
    "time_space": "3.1 时空背景",
    "era": "时代背景",
    "locations": "地理场景",
    "core_conflict_source": "核心冲突根源",
    "rules": "3.2 规则体系",
    "world_rules": "世界规则",
    "power_system": "力量体系",
    "social_structure": "社会结构",
    "factions": "3.3 势力格局",
    "description": "描述",
    "alignment": "立场",
    "devices": "设定与伏笔",
    "power_rules": "力量/金手指规则",
    "key_items": "核心道具/关键线索",
    "foreshadowing": "伏笔清单",
    "item": "伏笔内容",
    "planned_reveal": "计划揭晓",
    "plot_structure": "4. 结构层",
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
    "rhythm": "5. 节奏层",
    "satisfaction_points": "爽点布局",
    "emotional_peaks": "泪点/痛点",
    "pace_curve": "节奏曲线",
    "style_tone": "6. 风格层",
    "perspective": "叙事视角",
    "language": "语言风格",
    "atmosphere": "氛围基调",
    "chapters": "7. 章节细纲",
    "summary": "概要",
    "cliffhanger": "悬念",
    "word_count_estimate": "字数预估",
    "role": "作用",
    "locations": "场景",
    "era": "时代",
}


def label(key, fallback=None):
    return FIELD_LABELS.get(key, fallback or key)


def _make_topic(topic_id, title, children_xml="", extra_attrs=""):
    title_esc = escape(title)
    attrs = f' id="{topic_id}"'
    if extra_attrs:
        attrs += f' {extra_attrs}'
    if children_xml:
        return (
            f'<topic{attrs}>\n'
            f'  <title>{title_esc}</title>\n'
            f'  <children>\n'
            f'    <topics type="attached">\n'
            f'{children_xml}\n'
            f'    </topics>\n'
            f'  </children>\n'
            f'</topic>\n'
        )
    return (
        f'<topic{attrs}>\n'
        f'  <title>{title_esc}</title>\n'
        f'</topic>\n'
    )


_counter = [0]


def _next_id(prefix="n"):
    _counter[0] += 1
    return f"{prefix}-{_counter[0]}"


def _value_to_topics(key, value, parent_id):
    """将 outline dict 的值转换为 XMind topics"""
    if value is None:
        return ""
    if isinstance(value, str):
        return _make_topic(_next_id(), label(key, key) + ": " + value.strip())
    if isinstance(value, (int, float)):
        return _make_topic(_next_id(), label(key, key) + ": " + str(value))
    if isinstance(value, list):
        children = ""
        for i, item in enumerate(value):
            if isinstance(item, dict):
                item_title = item.get("title") or item.get("name") or item.get("beat") or f"#{i+1}"
                sub = ""
                for k, v in item.items():
                    if k in ("title", "name"):
                        continue
                    sub += _value_to_topics(k, v, _next_id())
                children += _make_topic(_next_id(), label(key, key) + " — " + item_title, sub)
            else:
                children += _make_topic(_next_id(), label(key, key) + f" #{i+1}", str(item))
        return children
    if isinstance(value, dict):
        children = ""
        for k, v in value.items():
            children += _value_to_topics(k, v, _next_id())
        return _make_topic(_next_id(), label(key, key), children)


def _tree_to_topics(tree_nodes, parent_id="root"):
    """将 TreeNode 数组转换为 XMind 节点 XML（泛化递归）
    tree_nodes: [{title, children?}]
    """
    xml = ""
    for node in tree_nodes:
        title = node.get("title", "")
        children = node.get("children")
        if children:
            sub = _tree_to_topics(children, _next_id())
            xml += _make_topic(_next_id(), title, sub)
        else:
            xml += _make_topic(_next_id(), title)
    return xml


def _outline_to_topics(outline, root_title):
    """将完整 outline dict 转换为 XMind 节点 XML"""
    # 优先走 _tree 字段
    tree = outline.get("_tree")
    if tree:
        root_children = _tree_to_topics(tree)
        if root_children:
            return _make_topic("root", root_title, root_children, 'structure-class="org.xmind.ui.logic.right"')
        return ""

    # 旧 flat dict 兼容
    topics = ""
    elements = outline.get("elements", {})
    for key in ("strategy", "characters", "world", "plot_structure", "rhythm", "style_tone"):
        if key in elements:
            topics += _value_to_topics(key, elements[key], _next_id())
    if "chapters" in outline:
        topics += _value_to_topics("chapters", outline["chapters"], _next_id())
    if not topics:
        return ""
    return _make_topic("root", root_title, topics, 'structure-class="org.xmind.ui.logic.right"')


def _chapters_to_topics(title, chapters):
    """旧格式兼容：章节列表 → 简单树"""
    topics_xml = ""
    for i, ch in enumerate(chapters):
        ch_title = escape(ch.get("title", f"第{i+1}章"))
        summary = escape(ch.get("summary", "")[:80])
        topics_xml += _make_topic(f"ch-{i}", ch_title,
            _make_topic(f"sum-{i}", summary))
    return _make_topic("root", title, topics_xml, 'structure-class="org.xmind.ui.logic.right"')


def generate_xmind(title, chapters_or_outline):
    """生成 XMind 8 兼容格式的多层思维导图

    参数:
        title: 小说标题（根节点）
        chapters_or_outline: 章节列表 [{title, summary}] 或完整大纲 dict
    """
    _counter[0] = 0

    if isinstance(chapters_or_outline, dict) and "chapters" in chapters_or_outline:
        root_xml = _outline_to_topics(chapters_or_outline, title)
    elif isinstance(chapters_or_outline, list):
        root_xml = _chapters_to_topics(title, chapters_or_outline)
    else:
        root_xml = _make_topic("root", title, extra_attrs='structure-class="org.xmind.ui.logic.right"')

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

        content = (
            '<?xml version="1.0" encoding="UTF-8" standalone="no"?>\n'
            '<xmap-content xmlns="urn:xmind:xmap:xmlns:content:2.0"'
            ' xmlns:fo="http://www.w3.org/1999/XSL/Format"'
            ' xmlns:svg="http://www.w3.org/2000/svg">\n'
            f'  <sheet id="sheet1">\n'
            f"    {root_xml}\n"
            f"  </sheet>\n"
            f"</xmap-content>\n"
        )
        zf.writestr("content.xml", content.encode("utf-8"))

        styles = (
            '<?xml version="1.0" encoding="UTF-8" standalone="no"?>\n'
            '<stylesheet xmlns="urn:xmind:xmind:style:2011">\n'
            '  <theme id="default">\n'
            '    <topic-spacing>12</topic-spacing>\n'
            '    <line-style>\n'
            '      <line-color>#4A90D9</line-color>\n'
            '      <line-width>1.5</line-width>\n'
            '      <line-class>org.xmind.ui.style.CurvedLine</line-class>\n'
            '    </line-style>\n'
            '    <central-topic>\n'
            '      <shape-class>org.xmind.ui.style.rounded-rect</shape-class>\n'
            '    </central-topic>\n'
            '  </theme>\n'
            '</stylesheet>\n'
        )
        zf.writestr("styles.xml", styles.encode("utf-8"))

    return buf.getvalue()
