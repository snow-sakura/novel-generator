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

SYSTEM_PROMPT_PARSE = """你必须严格基于用户指定的题材框架来理解种子句，不得偏离到其他题材。

根据用户的一句话种子句，提取以下 JSON 格式的故事要素，每个字段中文填写，不少于20字：
{
  "protagonist": "主角身份背景与核心欲望（必须符合本题材设定）",
  "time_era": "故事时代背景（与本题材一致）",
  "locations": "主要场景（本题材的典型场景）",
  "conflict_type": "核心冲突类型（符合本题材特征）",
  "inciting_incident": "激励事件",
  "development": "发展路径（不超出本题材范畴）",
  "resolution_tendency": "结局倾向（悲剧/正剧/喜剧）",
  "world_tone": "世界观基调"
}

⚠️ 你提取的所有要素必须严格限定在用户指定的题材和风格内。如果种子句涉及其他题材元素，请将其转换为本题材的等价设定。"""

SYSTEM_PROMPT_OUTLINE_P1 = """【⚠️ 强制约束】本题材为"{genre}"，风格为"{style}"。所有大纲内容必须严格限定在"{genre}"题材的世界观和规则体系内，不得引入其他题材的设定（如都市题材不得出现修仙/法术/异能；仙侠题材不得出现现代科技/枪械）。以下故事要素已按本题材提取，请基于此生成。

为一部{gender}频道{genre}题材、{style}风格的小说，根据以下故事要素，生成前三层大纲（策略/人物/世界观），输出严格 JSON。

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

SYSTEM_PROMPT_OUTLINE_P2 = """【⚠️ 强制约束】本题材为"{genre}"，风格为"{style}"。以下大纲的所有内容（情节结构/节奏/风格/章节细纲）必须严格限定在"{genre}"题材的框架内，不得混入其他题材元素。

以下是一部{gender}频道{genre}题材、{style}风格小说的前三层大纲：

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

SYSTEM_PROMPT_L1_STRATEGY = """【⚠️ 强制约束】本题材为"{genre}"，风格为"{style}"。所有战略层内容必须严格限定在"{genre}"题材范围内。

为一部{gender}频道{genre}题材、{style}风格的小说，根据以下要素生成战略层大纲，输出 JSON：

【故事要素】
{story_elements}

{  "strategy": {
    "core_idea": { "high_concept": "一句话高概念设定", "unique_selling_point": "非看不可的独特卖点" },
    "tone": "故事基调（如：热血爽文、黑暗沉重、轻松甜宠、沙雕搞笑）",
    "theme": { "core_question": "探讨的核心命题", "values": "传达的价值观" },
    "ending": { "type": "悲剧/正剧/喜剧", "final_scene": "最后一个镜头/台词/画面" }
  }
}

只输出 JSON，无额外文字。"""

SYSTEM_PROMPT_L2_CHARACTERS = """续接战略层：{previous_layers}

【⚠️ 强制约束】本题材为"{genre}"，风格为"{style}"。所有角色设定必须符合"{genre}"题材的特征（如都市题材的角色不应有修仙能力，仙侠题材的角色不应使用现代科技）。

为这部{gender}频道{genre}题材、{style}风格的小说生成人物层大纲，输出 JSON：

{  "characters": {
    "protagonist": { "name": "姓名", "age": "年龄", "identity": "身份背景", "initial_state": "初始状态（出场时的身份、性格、能力水平）", "desire": "核心欲望——他最想要什么", "flaw": "核心缺陷——性格上的致命弱点", "traits": "性格特质（3-5个关键词）", "arc": "成长弧线——从开始到结局的转变" },
    "supporting": [ { "name": "姓名", "type": "导师/盟友/恋人/对手", "role": "在故事中的作用", "relationship": "与主角的关系", "love_interest": "是否为情感线对象（是/否）" } ],
    "antagonist": { "name": "姓名", "motive": "反派动机——他为什么与主角对立", "threat": "压迫感与威胁等级", "value_opposition": "价值观/信念上的核心对立", "conflict_point": "与主角的具体冲突点（利益冲突还是理念冲突？对立事件是什么）" },
    "relationships": "核心人物关系网简要描述"
  }
}

只输出 JSON，无额外文字。"""

SYSTEM_PROMPT_L3_WORLD = """续接前两层：{previous_layers}

【⚠️ 强制约束】本题材为"{genre}"，风格为"{style}"。世界观设定（时代/场景/规则/力量体系/社会结构）必须严格符合"{genre}"题材的特征，不得混入其他题材的元素。

为这部{gender}频道{genre}题材、{style}风格的小说生成世界观层大纲，输出 JSON：

{  "world": {
    "time_space": { "era": "时代/朝代背景", "locations": "主要地理场景", "core_conflict_source": "核心冲突根源（如：种族矛盾、资源匮乏、阶级固化、科技反噬）" },
    "rules": { "world_rules": "世界运行的底层逻辑和规则", "power_system": "力量体系/技能/能力树", "social_structure": "社会阶层、权力结构、经济体系" },
    "factions": [ { "name": "势力名称", "description": "势力描述", "alignment": "敌对/同盟/中立" } ],
    "devices": {
      "power_rules": "力量体系/金手指的具体规则、限制和代价（如果是奇幻/科幻题材，升级的逻辑是什么）",
      "key_items": "核心道具/关键线索（如：一枚玉佩、一张藏宝图、一个失落的记忆片段——对主线推进有决定性作用）"
    },
    "foreshadowing": [
      { "item": "伏笔内容描述", "planned_reveal": "计划揭晓的章节范围或时机" }
    ]
  }
}

只输出 JSON，无额外文字。"""

SYSTEM_PROMPT_L4_STRUCTURE = """续接前三层：{previous_layers}

【⚠️ 强制约束】本题材为"{genre}"，风格为"{style}"。情节结构、节奏和风格层必须严格基于"{genre}"题材的特点来设计（如悬疑题材需要埋设伏笔，言情题材注重感情线推进）。

为这部{gender}频道{genre}题材、{style}风格的小说生成情节结构/节奏/风格层大纲，输出 JSON：

{  "plot_structure": {
    "three_acts": {
      "act1": "第一幕·建置（约占25%）——日常状态→激励事件→初步反应。建立世界，主角在平凡生活中的挣扎，天降系统/突逢巨变/遇到贵人打破平静，主角被迫踏入未知",
      "act2": "第二幕·对抗（约占50%）——踏上征途→中期转折→绝地反击。主角离开舒适区结识伙伴，看似接近目标实则落入陷阱（伪胜利/伪失败），在谷底找到真正的力量",
      "act3": "第三幕·结局（约占25%）——最终危机→高潮战斗→结局收尾。反派势力全面压境，核心矛盾爆发，主角运用成长后的能力解决问题，新世界达成平衡状态"
    },
    "beat_sheet": [ { "beat": "节拍名称（如：激励事件/中点转折/至暗时刻）", "chapter_range": "所处章节范围", "description": "具体发生了什么" } ],
    "golden_three": [ { "chapter": 1, "title": "第1章标题", "hook": "开篇钩子（必须在3秒内抓住读者）", "function": "本章在全书的定位" } ]
  },
  "rhythm": {
    "satisfaction_points": ["爽点1：具体场景描述", "爽点2：具体场景描述", "爽点3：具体场景描述"],
    "emotional_peaks": ["泪点/痛点/情感高潮的安排"],
    "pace_curve": "整体节奏描述——哪些章节紧张激烈、推进快，哪些章节舒缓铺垫、蓄势待发"
  },
  "style_tone": {
    "perspective": "叙事视角（第一人称/第三人称有限/上帝视角）",
    "language": "语言风格特征（如：幽默吐槽风/古风典雅/冷峻写实/热血激昂），对话风格，描写密度",
    "atmosphere": "整体情绪色彩和氛围基调"
  }
}

只输出 JSON，无额外文字。"""

SYSTEM_PROMPT_L5_CHAPTERS = """【⚠️ 强制约束】本题材为"{genre}"，风格为"{style}"。以下每一条都必须严格遵守。

续接前四层大纲：{previous_layers}

根据以上完整设定，为这部{gender}频道{genre}题材、{style}风格的小说生成全部章节细纲，输出 JSON。

【⚠️ 类型一致性要求 — 必须遵守】
- 所有章节必须严格符合"{genre}"题材的世界观和规则
- 人物只能来自前面几层大纲中定义的角色
- 不得引入其他题材的设定（如都市题材不得出现修仙/法术/异能；仙侠题材不得出现现代科技/枪械）
- 场景描写必须与"{genre}"题材的时代背景一致
- 如果前文任何地方出现了与"{genre}"题材不符的内容，忽略它们，回归本题材的正确设定

chapters 数组约 {chapter_count} 章，每章 {per_chapter_min}-{per_chapter_max} 字。

每章必须包含场景拆解：将本章分解为 2-4 个具体场景，每个场景写 scene 字段。

{enhanced_cliffhanger_requirement}
{twist_requirement}

{  "chapters": [
    {
      "title": "章节标题", "summary": "本章概要（100-200字，说清发生了什么）",
      "hook": "开篇钩子（一句话吸引读者看完本章）", "cliffhanger": "结尾悬念（让读者忍不住点下一章）",
      "function": "起/承/转/合——本章在三幕式中的定位", "word_count_estimate": 2500,
      "scenes": ["场景1具体描述", "场景2具体描述", "场景3具体描述"]
    }
  ]
}

只输出 JSON，无额外文字。"""

SYSTEM_PROMPT_CHAPTER = """【🔴 硬性约束 — 置于最前】本题材为"{genre}"，风格为"{style}"。你必须严格遵守：
- 人物：只能使用大纲中已定义的角色，不得引入大纲外的角色名
- 世界观：只能使用"{genre}"题材的世界观和规则体系
- 禁止出现任何其他题材的元素（都市题材不得出现修仙/仙侠/异能/法术；仙侠题材不得出现现代科技/枪械/手机；言情题材不得出现战斗升级/修炼体系）
- 场景、对话、冲突必须全部围绕"{genre}"题材展开
- 如果前文出现了不属于本题材的元素，忽略它们，强制回归本题材的正确设定
- 风格必须保持"{style}"风格的一致性

你正在创作一篇{gender}频道{genre}题材、{style}风格的小说。

【叙事视角】{pov}
- 第一人称：全程使用「我」叙述，代入感强，只能写「我」看到和感受到的
- 第三人称有限：跟随主角视角，使用「他/她」叙述，只能写主角知道的信息
- 上帝视角：全知视角，可切换多角色视角，但需保持叙述一致性

【节奏模式】{pacing}
- 紧凑型：对话多、描述少、推进快，段落短小精悍，节奏紧张
- 标准型：均衡叙事，张弛有度，对话与描写交替
- 舒缓型：环境描写细腻、心理活动丰富，段落较长，节奏舒缓

【风格强度】{style_intensity}
- 轻度：偶尔体现{style}风格特征，不影响正常叙事
- 中度：适度体现{style}风格，为叙事增色（默认推荐）
- 重度：通篇强化{style}风格表现，文字极具风格化

{tension_block}

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

SYSTEM_PROMPT_TITLE = """【强制约束】本题材为{genre}。标题必须严格贴合{genre}题材的风格和用户种子句内容。

为这篇{gender}频道{genre}题材的小说起一个5-15字的网文风格标题，直接输出标题，不要多余内容。"""
