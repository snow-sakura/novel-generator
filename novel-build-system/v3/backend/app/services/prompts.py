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

{theme_context}

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

{theme_context}

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

{theme_context}

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
{theme_block}
{emotion_block}
{golden_quote_block}
{aesthetic_block}
{bible_block}

当前章节：{chapter_title}
本章概要：{chapter_summary}
前情提要：{previous_summary}

【🔴 字数硬性要求 — 必须遵守】本章必须严格控制在 {per_chapter_min}-{per_chapter_max} 字区间内（目标约 {target_words} 字）。少于 {per_chapter_min} 字或多于 {per_chapter_max} 字都视为不合格，需要调整段落密度或补充/精简描写以确保字数达标。如果本章字数不足 {per_chapter_min} 字，整章将被判定不合格并退回重新生成。请务必在写作过程中注意字数，每个场景完成后检查累计字数。

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

# ── F2 情感曲线规划 prompt ──

EMOTION_CURVE_PROMPT = """根据以下小说设定，规划全书的情感曲线（起承转合）。

【设定】
题材：{genre}，风格：{style}，主题：{theme}
故事要素：{story_elements}
章节数：{chapter_count} 章

输出严格 JSON 数组，不要对象包裹，不要额外文字。示例格式如下，注意外层是方括号[]不是花括号{{}}：

[{{"chapter": 1, "phase": "起", "emotion": "平静", "intensity": 2, "label": "日常描写"}}, {{"chapter": 2, "phase": "承", "emotion": "期待", "intensity": 3, "label": "剧情展开"}}]

共 {chapter_count} 个元素，每章一个。每章需指定：
- phase：起/承/转/合
- emotion：具体情绪词
- intensity：1-5 整数
- label：简短的剧情情绪标签（2-6字）

阶段与可选情绪：
- "起"（引入）：平静、好奇、温暖
- "承"（发展）：期待、愉悦、温馨、热血
- "转"（冲突）：紧张、悲伤、愤怒、绝望、震撼
- "合"（结局）：感动、释然、希望、幸福、激动

要求：
- 起承转合四个阶段按章节比例分配（大致 20% / 40% / 30% / 10%）
- 情绪变化要平滑自然，避免相邻章节情绪跳跃过大
- 强度随冲突升级递增，在"转"阶段达到峰值，结局回落

只输出 JSON 数组，不要任何其他文字或 markdown 包裹。"""

# ── F7 结局类型 ──

ENDING_BLOCKS = {
    "好结局": (
        "\n【结局要求】这是最后一章，请写出一个圆满、温暖的结局。\n"
        "- 核心矛盾得到圆满解决\n"
        "- 主角达成主要目标，获得成长和收获\n"
        "- 反派得到应有下场，正义得到伸张\n"
        "- 给读者以希望和满足感，令人回味\n"
        "- 如有情感线，应有圆满归宿\n"
    ),
    "坏结局": (
        "\n【结局要求】这是最后一章，请写出一个悲剧、令人唏嘘的结局。\n"
        "- 核心矛盾以惨烈方式终结\n"
        "- 主角付出巨大代价，或未能达成目标\n"
        "- 悲剧感强烈，令人扼腕叹息\n"
        "- 可以开放式地留下遗憾，但整体氛围是沉痛的\n"
        "- 让读者感受到命运的无奈或人性的复杂\n"
    ),
    "开放式": (
        "\n【结局要求】这是最后一章，请写出一个开放式的结局。\n"
        "- 核心矛盾得到阶段性解决，但留有悬念\n"
        "- 主角面临选择或转折，但结果未明确交代\n"
        "- 给读者留下想象空间，不同读者可能有不同理解\n"
        "- 语言含蓄、富有余韵\n"
        "- 不要给出明确的大团圆或悲剧结局\n"
    ),
}

# ── F4 美学风格渲染 ──

AESTHETIC_BLOCKS = {
    "关闭": "",
    "轻度": (
        "\n【美学指引】\n"
        "- 适度使用比喻、拟人等修辞，点缀即可\n"
        "- 尝试长短句交替，但以流畅为优先\n"
        "- 关键场景适当增加画面感描写\n"
    ),
    "中度": (
        "\n【美学要求】\n"
        "- 适当使用隐喻、拟人等修辞手法，增强文字表现力\n"
        "- 长短句交替，读起来有节奏韵律感\n"
        "- 场景描写如电影镜头般具象，让读者产生画面感\n"
        "- 在叙事流畅的前提下提升语言美感\n"
    ),
    "重度": (
        "\n【美学强化】\n"
        "- 大量运用隐喻、拟人、通感等修辞，文字富有诗意\n"
        "- 精心设计长短句节奏，读起来有音乐般的韵律感\n"
        "- 每个场景都有电影镜头般的画面感和沉浸感\n"
        "- 允许为美学效果适当牺牲叙事效率，追求文学质感\n"
    ),
}

# ── F5 意义提炼（文末解读） ──

INTERPRETATION_PROMPT = """你是一位文学评论家。根据以下整篇小说内容，写一段200-300字的「故事解读」，帮助读者理解故事的深层含义。

【小说内容】
{content}

【要求】
1. **主题提炼**（1-2句）：这篇故事在讲什么，核心主题是什么
2. **人物弧光**（1-2句）：主角经历了怎样的成长/变化
3. **现实映射**（1-2句）：故事和我们现实生活的关联，读者能从中获得什么启示

用流畅的中文段落输出，无需标题，直接在「—— 编者按」后写解读内容。"""

# ── F6 跨章节一致性 ──

EXTRACT_BIBLE_PROMPT = """根据本章内容提取设定档案更新。要求输出简洁、结构化的 JSON，不要长句。

【当前档案】
{current_bible}

【本章内容】
{chapter_content}

输出 JSON（只输出 JSON，无额外文字）：
{{
  "characters": [
    {{
      "name": "角色名（只写名字，2-4字）",
      "role": "主角/配角/反派",
      "traits": "2-5个关键词，逗号分隔（如：聪明、固执、善良）",
      "relationships": "与其他角色的关系（一句话，10字内）",
      "arc": "成长弧光（一句话，15字内）"
    }}
  ],
  "locations": [{{"name": "地点名", "description": "一句话描述（15字内）"}}],
  "world_rules": ["规则一句话（15字内）"],
  "key_items": [{{"name": "物品名", "description": "一句话描述（15字内）"}}],
  "timeline": [{{"chapter": 章号, "events": "本章关键事件（20字内）"}}]
}

关键约束：
- name 只写角色名，不要带"角色"、"人物"等多余词
- traits 用逗号分隔的关键词，不要成段描述
- arcs/relationships/description 保持简短，15字以内
- 保留已有条目，仅新增或更新本章新出现的内容
- 如果无新内容，输出 {{}}
- 输出纯 JSON，无额外解释文字"""


# ── F9 写作助手：续写 ──

ASSIST_CONTINUE_PROMPT = """你是一位小说续写助手。根据下文提供的小说上下文，续写接下来的内容。

【当前上下文】
{context}

【续写要求】
1. 保持与上文一致的风格、视角和语气
2. 自然延续情节发展，不要生硬转折
3. 文字流畅，每段 100-200 字
4. 续写约 {target_words} 字
5. 输出纯文本，不要标题或标记

{instruction_block}
请续写："""


SYSTEM_PROMPT_TITLE = """【强制约束】本题材为{genre}。标题必须严格贴合{genre}题材的风格和用户种子句内容。
{theme_context}

为这篇{gender}频道{genre}题材的小说起一个5-15字的网文风格标题。标题应在贴合题材和种子句的前提下，暗示或反映核心主题。直接输出标题，不要多余内容。"""


# ── F11 AI 配图提示词提取 ──

ILLUSTRATION_PROMPT = """你是一位小说配图提示词工程师。根据以下小说章节内容，生成一段英文的图片生成提示词（image generation prompt）。

【章节内容】
{chapter_text}

【要求】
1. 提取本章中最具视觉冲击力的场景（1个）
2. 描述画面构图、人物姿态、光线、色调、氛围
3. 风格：写实插画风格，电影感画面
4. 输出纯英文，50-100词
5. 直接输出提示词，不要解释

提示词："""

# ── F8 角色对话生成 ──

DIALOGUE_PROMPT = """你是一位小说角色对话编剧。根据以下角色设定和场景要求，写一段自然生动的角色对话。

【角色设定】
{character_profiles}

【对话场景】
{scenario}

【写作要求】
1. 每个角色说话前标注角色名，格式：`角色名：对话内容`
2. 对话必须符合各角色的性格、身份和关系
3. 通过对话展现角色之间的冲突、默契或情感张力
4. 适当加入动作描写（用括号表示）和场景氛围描写
5. 对话要自然，符合中文口语习惯
6. 长度约 300-800 字
7. 可以有一个简短的开场场景描写

请直接输出对话内容："""
