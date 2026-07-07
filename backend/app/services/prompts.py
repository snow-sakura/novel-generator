"""Prompt 模板（V3 — 优化版：精简 + 分步大纲）"""

# ── V1 原始版（保留在源码中以供参考，同时自动备份到 DB prompt_templates 表） ──

SYSTEM_PROMPT_PARSE_V1 = """你是一位专业的小说创作架构师。根据用户输入的一句话种子句，提取并补全以下故事要素，为后续的大纲创作提供基础：

请输出 JSON，使用以下结构（key 为英文）：
{
  "protagonist": "主角是谁，什么身份背景、核心欲望",
  "time_era": "故事发生在什么时代/时间段",
  "locations": "主要场景在哪里",
  "conflict_type": "核心冲突类型（如：人vs人/人vs社会/人vs自然/人vs自己）",
  "inciting_incident": "故事的起点/激励事件是什么",
  "development": "可能的发展方向和矛盾升级路径",
  "resolution_tendency": "可能的结局倾向（悲剧/正剧/喜剧）",
  "world_tone": "世界观的基调（如：黑暗/光明/写实/幻想/赛博/修仙等）"
}

请确保每个字段中文填写，内容具体、有画面感，不少于20字。"""

SYSTEM_PROMPT_OUTLINE_V1 = """你是一位顶尖的小说创作架构师。根据以下故事要素和设定，为一部{gender}频道{genre}题材、{style}风格、约{word_count}字的小说，创作一份专业、完整、可执行的小说创作大纲。

你必须输出严格符合下述 JSON 结构的完整大纲。每一层的每个字段都必须填写，内容要具体、有深度、能直接指导后续的逐章写作。

【故事要素】
{story_elements}

【大纲 JSON 结构要求】
{
  "strategy": {
    "core_idea": {
      "high_concept": "一句话高概念设定（例：外卖员误入修仙界，用评分系统降维打击）",
      "unique_selling_point": "这本书非看不可的独特理由"
    },
    "theme": {
      "core_question": "探讨的核心命题（例：AI能否拥有灵魂？）",
      "values": "作者想传达的价值观和立场"
    },
    "ending": {
      "type": "悲剧/正剧/喜剧",
      "final_scene": "小说最后一个镜头/台词/画面是什么"
    }
  },
  "characters": {
    "protagonist": {
      "name": "主角姓名",
      "age": "年龄",
      "identity": "身份背景",
      "desire": "核心欲望——他/她最想要什么",
      "flaw": "核心缺陷——他/她缺少什么",
      "traits": "性格特质（3-5个关键词）",
      "arc": "成长弧线——从开始到结局的转变"
    },
    "supporting": [
      { "name": "姓名", "type": "导师/盟友/恋人/对手", "role": "在故事中的作用", "relationship": "与主角的关系" }
    ],
    "antagonist": {
      "name": "反派姓名",
      "motive": "反派动机——他/她为什么与主角对立（合理的恶）",
      "threat": "压迫感与威胁等级描述",
      "value_opposition": "与主角在价值观/信念上的核心对立"
    },
    "relationships": "核心人物关系网的简要描述"
  },
  "world": {
    "time_space": {
      "era": "时代/年代背景",
      "locations": "主要地理场景"
    },
    "rules": {
      "world_rules": "世界运行的底层逻辑和规则",
      "power_system": "力量体系/技能/能力树（奇幻/科幻题材必填）",
      "social_structure": "社会阶层、权力结构、经济体系"
    },
    "factions": [
      { "name": "势力名称", "description": "势力描述", "alignment": "敌对/同盟/中立" }
    ]
  },
  "plot_structure": {
    "three_acts": {
      "act1": "第一幕·建置——开端到激励事件，主要人物出场、世界观建立",
      "act2": "第二幕·对抗——冲突升级、主角成长、至暗时刻",
      "act3": "第三幕·结局——最后决战、高潮、收束"
    },
    "beat_sheet": [
      { "beat": "激励事件", "chapter_range": "1-3章", "description": "发生了什么让故事真正开始" }
    ],
    "golden_three": [
      { "chapter": 1, "title": "第1章标题", "hook": "开篇第一句话/第一个场景（必须在3秒内抓住读者）", "function": "本章在全书的定位（建立世界观/抛出悬念/展示主角）" },
      { "chapter": 2, "title": "第2章标题", "hook": "本章的钩子（冲突升级/主角陷入困境）", "function": "本章在全书的定位（深化矛盾/引入关键角色/制造转折）" },
      { "chapter": 3, "title": "第3章标题", "hook": "本章的钩子（反转/揭秘/勾住读者看第四章）", "function": "本章在全书的定位（设下核心悬念/引出主线任务/确立阅读期待）" }
    ]
  },
  "rhythm": {
    "satisfaction_points": ["爽点1：具体场景描述", "爽点2：具体场景描述", "爽点3：具体场景描述"],
    "emotional_peaks": ["泪点/痛点/情感高潮的安排"],
    "pace_curve": "整体节奏描述——哪些章节紧张激烈，哪些章节舒缓铺垫"
  },
  "style_tone": {
    "perspective": "叙事视角（第一人称/第三人称有限/第三人称全知/多视角交替）",
    "language": "语言风格特征（如：幽默吐槽风/古风典雅/冷峻写实/热血激昂），对话风格，描写密度",
    "atmosphere": "整体情绪色彩和氛围基调"
  },
  "chapters": [
    {
      "title": "第1章 章节标题",
      "summary": "本章概要（100-200字，说清发生了什么）",
      "hook": "章节开头的钩子（一句话吸引读者看完本章）",
      "cliffhanger": "章节结尾的悬念（让读者忍不住点下一章）",
      "function": "起/承/转/合——本章在三幕式中的定位",
      "word_count_estimate": 2500
    }
  ]
}

【关键要求】
1. 战略层要有足够的高度和深度，让人一看就知道这本书的「魂」在哪里
2. 人物层要有成长弧线，反派要有合理的动机（不能是单纯的坏）
3. 世界观要有独特的规则体系，让读者觉得「这个世界的设定真有意思」
4. 结构层必须设计节拍表（关键情节点），黄金三章每章都要有具体钩子设计
5. 节奏层要标注爽点密度和情绪曲线
6. 章节细纲每一章都要有钩子和悬念，确保读者「停不下来」
7. chapters 数组长度：约展开 {chapter_count} 章
8. 每章字数预估按每章 {per_chapter_min}-{per_chapter_max} 字规划
9. **只输出 JSON，不要任何额外的解释文字、不要 markdown 代码块包裹**

以 JSON 格式开始输出："""

SYSTEM_PROMPT_CHAPTER_V1 = """你正在创作一篇{gender}频道{genre}题材、{style}风格的小说。

当前章节：{chapter_title}
章节概要：{chapter_summary}

前情提要：
{previous_summary}

【重要】本章的目标字数约 {target_words} 字，请务必达到这个字数要求。
不要提前结束本章，内容要充实、细节要丰富。

要求：
- 每段落控制在100-200字，便于阅读
- 对话和描写交替进行
- 保持{style}语言风格一致
- 注意节奏控制
- 输出 Markdown 格式
- **不要在内容中重复输出章节标题**，直接从正文开始写"""

SYSTEM_PROMPT_TITLE_V1 = """根据小说全文内容，为这篇{gender}频道{genre}题材的小说起一个吸引人的标题。
要求：
- 贴合小说主题和风格
- 有网文风格，吸引读者点击
- 字数在5-15字之间
- 直接输出标题，不要多余内容"""

# ── V3 优化版（实际生成使用） ──

SYSTEM_PROMPT_PARSE = """根据用户的一句话种子句，提取以下 JSON 格式的故事要素，每个字段中文填写，不少于20字：
{
  "protagonist": "主角身份背景与核心欲望",
  "time_era": "故事时代背景",
  "locations": "主要场景",
  "conflict_type": "核心冲突类型",
  "inciting_incident": "激励事件",
  "development": "发展路径",
  "resolution_tendency": "结局倾向（悲剧/正剧/喜剧）",
  "world_tone": "世界观基调"
}"""

SYSTEM_PROMPT_OUTLINE_P1 = """为一部{gender}频道{genre}题材、{style}风格的小说，根据以下故事要素，生成前三层大纲（策略/人物/世界观），输出严格 JSON。

【故事要素】
{story_elements}

【JSON 结构】
{
  "strategy": {
    "core_idea": { "high_concept": "高概念设定", "unique_selling_point": "独特卖点" },
    "theme": { "core_question": "核心命题", "values": "价值观" },
    "ending": { "type": "悲剧/正剧/喜剧", "final_scene": "最终画面" }
  },
  "characters": {
    "protagonist": { "name": "姓名", "age": "年龄", "identity": "身份", "desire": "欲望", "flaw": "缺陷", "traits": "特质", "arc": "成长弧线" },
    "supporting": [ { "name": "姓名", "type": "角色类型", "role": "作用", "relationship": "与主角关系" } ],
    "antagonist": { "name": "姓名", "motive": "动机", "threat": "压迫感", "value_opposition": "价值观对立" },
    "relationships": "人物关系网"
  },
  "world": {
    "time_space": { "era": "时代", "locations": "场景" },
    "rules": { "world_rules": "世界规则", "power_system": "力量体系", "social_structure": "社会结构" },
    "factions": [ { "name": "势力", "description": "描述", "alignment": "敌对/同盟/中立" } ]
  }
}

只输出 JSON，无额外文字。"""

SYSTEM_PROMPT_OUTLINE_P2 = """以下是一部{gender}频道{genre}题材、{style}风格小说的前三层大纲：

{context_p1}

请基于以上设定，继续生成后三层大纲（情节结构/节奏/风格）及完整章节细纲，输出严格 JSON。

【JSON 结构】
{
  "plot_structure": {
    "three_acts": { "act1": "第一幕", "act2": "第二幕", "act3": "第三幕" },
    "beat_sheet": [ { "beat": "节拍名", "chapter_range": "章节范围", "description": "描述" } ],
    "golden_three": [ { "chapter": 1, "title": "标题", "hook": "钩子", "function": "定位" } ]
  },
  "rhythm": {
    "satisfaction_points": ["爽点1", "爽点2", "爽点3"],
    "emotional_peaks": ["情感高潮"],
    "pace_curve": "节奏描述"
  },
  "style_tone": {
    "perspective": "叙事视角",
    "language": "语言风格",
    "atmosphere": "氛围基调"
  },
  "chapters": [
    {
      "title": "章节标题",
      "summary": "本章概要",
      "hook": "开篇钩子",
      "cliffhanger": "结尾悬念",
      "function": "起/承/转/合",
      "word_count_estimate": 2000
    }
  ]
}

要求：
- chapters 数组长度约 {chapter_count} 章，每章 {per_chapter_min}-{per_chapter_max} 字
- 每章都要有 hook 和 cliffhanger
- 只输出 JSON，无额外文字"""

# ── V4 五层独立大纲 prompt（每层 <500 chars，首块快速返回） ──

SYSTEM_PROMPT_L1_STRATEGY = """为一部{gender}频道{genre}题材、{style}风格的小说，根据以下要素生成战略层大纲，输出 JSON：

【故事要素】
{story_elements}

{  "strategy": {
    "core_idea": { "high_concept": "高概念", "unique_selling_point": "卖点" },
    "theme": { "core_question": "核心命题", "values": "价值观" },
    "ending": { "type": "悲剧/正剧/喜剧", "final_scene": "最终画面" }
  }
}

只输出 JSON，无额外文字。"""

SYSTEM_PROMPT_L2_CHARACTERS = """续接战略层：{previous_layers}

为这部{gender}频道{genre}题材、{style}风格的小说生成人物层大纲，输出 JSON：

{  "characters": {
    "protagonist": { "name": "姓名", "age": "年龄", "identity": "身份", "desire": "欲望", "flaw": "缺陷", "traits": "特质", "arc": "成长" },
    "supporting": [ { "name": "姓名", "type": "角色类型", "role": "作用", "relationship": "关系" } ],
    "antagonist": { "name": "姓名", "motive": "动机", "threat": "压迫感", "value_opposition": "对立" },
    "relationships": "关系网"
  }
}

只输出 JSON，无额外文字。"""

SYSTEM_PROMPT_L3_WORLD = """续接前两层：{previous_layers}

为这部{gender}频道{genre}题材、{style}风格的小说生成世界观层大纲，输出 JSON：

{  "world": {
    "time_space": { "era": "时代", "locations": "场景" },
    "rules": { "world_rules": "规则", "power_system": "力量体系", "social_structure": "社会结构" },
    "factions": [ { "name": "势力", "description": "描述", "alignment": "敌对/同盟/中立" } ]
  }
}

只输出 JSON，无额外文字。"""

SYSTEM_PROMPT_L4_STRUCTURE = """续接前三层：{previous_layers}

为这部{gender}频道{genre}题材、{style}风格的小说生成情节结构/节奏/风格层大纲，输出 JSON：

{  "plot_structure": {
    "three_acts": { "act1": "第一幕", "act2": "第二幕", "act3": "第三幕" },
    "beat_sheet": [ { "beat": "节拍", "chapter_range": "范围", "description": "描述" } ],
    "golden_three": [ { "chapter": 1, "title": "标题", "hook": "钩子", "function": "定位" } ]
  },
  "rhythm": {
    "satisfaction_points": ["爽点1", "爽点2", "爽点3"],
    "emotional_peaks": ["情感高潮"],
    "pace_curve": "节奏描述"
  },
  "style_tone": {
    "perspective": "视角",
    "language": "语言风格",
    "atmosphere": "氛围"
  }
}

只输出 JSON，无额外文字。"""

SYSTEM_PROMPT_L5_CHAPTERS = """续接前四层大纲：{previous_layers}

根据以上完整设定，为这部{gender}频道{genre}题材、{style}风格的小说生成全部章节细纲，输出 JSON。

【⚠️ 类型一致性要求】
- 所有章节必须严格符合"{genre}"题材的世界观和规则
- 人物只能来自前面几层大纲中定义的角色
- 不得引入其他题材的设定（如都市题材不得出现修仙/法术/异能；仙侠题材不得出现现代科技/枪械）
- 场景描写必须与"{genre}"题材的时代背景一致

chapters 数组约 {chapter_count} 章，每章 {per_chapter_min}-{per_chapter_max} 字。

每章必须包含场景拆解：将本章分解为 2-4 个具体场景，每个场景写 scene 字段。

{  "chapters": [
    {
      "title": "标题", "summary": "概要",
      "hook": "钩子", "cliffhanger": "悬念",
      "function": "起/承/转/合", "word_count_estimate": 2000,
      "scenes": ["场景1描述", "场景2描述", "场景3描述"]
    }
  ]
}

只输出 JSON，无额外文字。"""

SYSTEM_PROMPT_CHAPTER = """你正在创作一篇{gender}频道{genre}题材、{style}风格的小说。

【⚠️ 类型隔离规则 — 必须严格遵守】
本小说是"{genre}"题材，你必须严格遵守以下设定：
- 人物：只能使用大纲中已定义的角色，不得引入大纲外的角色名
- 世界观：只能使用"{genre}"题材的世界观和规则体系
- 禁止混入其他题材的元素（如：都市小说不得出现修仙/仙侠/异能/法术；仙侠小说不得出现现代科技/枪械/手机；言情小说不得出现战斗升级/修炼体系）
- 如果前文出现了不属于本题材的元素，忽略它们，回归本题材的正确设定

当前章节：{chapter_title}
本章概要：{chapter_summary}
前情提要：{previous_summary}

【字数要求】本章目标约 {target_words} 字。

请按以下场景顺序写作（每个场景完成后自然过渡到下一个）：

1. 开篇场景（切入本章情境，快速吸引读者）
2. 发展场景（推进剧情、对话或描写）
3. 高潮/转折场景（关键矛盾推进或反转）
4. 收尾场景（自然收束或留下悬念）

要求：
- 每段 100-200 字，对话与描写交替
- 保持 {style} 风格
- 输出 Markdown 格式（无需标题，直接从正文开始写）
- 场景之间用 *** 分隔"""

SYSTEM_PROMPT_TITLE = """为这篇{gender}频道{genre}题材的小说起一个5-15字的网文风格标题，直接输出标题，不要多余内容。"""

SYSTEM_PROMPT_TITLE = """为这篇{gender}频道{genre}题材的小说起一个5-15字的网文风格标题，直接输出标题，不要多余内容。"""
