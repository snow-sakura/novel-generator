"""
番茄小说题材/风格/国产模型数据
实时来源：番茄小说官网 https://fanqienovel.com
"""

# ========== 频道归类（第一选择） ==========
GENDERS = ["男频", "女频"]

# ========== 男频分类（19个，来源：番茄小说） ==========
MALE_CATEGORIES = [
    "西方奇幻", "东方仙侠", "科幻末世", "都市日常", "都市修真",
    "都市高武", "历史古代", "战神赘婿", "都市种田", "传统玄幻",
    "历史脑洞", "悬疑脑洞", "都市脑洞", "玄幻脑洞", "悬疑灵异",
    "抗战谍战", "游戏体育", "动漫衍生", "男频衍生",
]

# ========== 女频分类（18个，来源：番茄小说） ==========
FEMALE_CATEGORIES = [
    "古风世情", "科幻末世", "游戏体育", "女频衍生", "玄幻言情",
    "种田", "年代", "现言脑洞", "宫斗宅斗", "悬疑脑洞",
    "古言脑洞", "快穿", "青春甜宠", "星光璀璨", "女频悬疑",
    "职场婚恋", "豪门总裁", "民国言情",
]

def get_categories_by_gender(gender: str) -> list:
    """根据频道获取分类列表"""
    if gender == "男频":
        return MALE_CATEGORIES[:]
    return FEMALE_CATEGORIES[:]

# ========== 风格标签（番茄小说常见风格） ==========
STYLES = [
    "轻松搞笑", "热血激昂", "甜宠温馨", "悬疑烧脑", "暗黑压抑",
    "写实厚重", "文艺唯美", "快节奏爽文", "慢热细腻", "沙雕欢乐",
    "治愈温暖", "史诗宏大", "脑洞大开", "硬核技术流", "古风典雅",
]

# ========== V3 保留：视角选项 ==========
POV_OPTIONS = [
    {"value": "第一人称", "label": "第一人称", "desc": "以「我」的视角叙述，代入感强"},
    {"value": "第三人称有限", "label": "第三人称有限", "desc": "跟随主角视角，兼顾客观与代入"},
    {"value": "上帝视角", "label": "上帝视角", "desc": "全知视角，可切换多角色视角"},
]

# ========== V3 保留：节奏模式 ==========
PACING_OPTIONS = [
    {"value": "紧凑型", "label": "紧凑型", "desc": "对话多、描述少、推进快"},
    {"value": "标准型", "label": "标准型", "desc": "均衡叙事，张弛有度"},
    {"value": "舒缓型", "label": "舒缓型", "desc": "环境描写细腻、心理活动丰富"},
]

# ========== V3 新增：主题列表 ==========
THEMES = ['救赎', '成长', '选择', '正义', '爱情', '自由', '牺牲', '希望', '孤独']

# ========== V3 保留：风格强度 ==========
STYLE_INTENSITY_OPTIONS = [
    {"value": "轻度", "label": "轻度", "desc": "偶尔体现风格特征"},
    {"value": "中度", "label": "中度", "desc": "适度体现，默认推荐"},
    {"value": "重度", "label": "重度", "desc": "通篇强化风格表现"},
]

# ========== 模型配置列表（OpenAI 兼容接口） ==========
CHINESE_MODELS = [
    {
        "id": "opencode-mimo",
        "provider": "opencode-mimo",
        "label": "DeepSeek Free (免费，推荐)",
        "base_url": "https://opencode.ai/zen/v1",
        "models": [
            {"id": "deepseek-v4-flash-free", "label": "DeepSeek V4 Flash Free (推荐)"},
            # {"id": "mimo-v2.5-free", "label": "MiMo V2.5 Free"},
        ],
        "need_key": False,
    },
    {
        "id": "deepseek",
        "provider": "deepseek",
        "label": "DeepSeek (深度求索)",
        "base_url": "https://api.deepseek.com/v1",
        "models": [
            {"id": "deepseek-v4-flash", "label": "DeepSeek V4 Flash (快速)"},
            {"id": "deepseek-v4-pro", "label": "DeepSeek V4 Pro (旗舰)"},
        ],
        "need_key": True,
    },
    {
        "id": "qwen",
        "provider": "qwen",
        "label": "通义千问 (阿里云)",
        "base_url": "https://dashscope.aliyuncs.com/compatible-mode/v1",
        "models": [
            {"id": "qwen3.7-max", "label": "Qwen 3.7 Max (最新旗舰)"},
            {"id": "qwen3.6-plus", "label": "Qwen 3.6 Plus (均衡)"},
            {"id": "qwen3.6-flash", "label": "Qwen 3.6 Flash (快速)"},
        ],
        "need_key": True,
    },
    {
        "id": "glm",
        "provider": "glm",
        "label": "智谱AI GLM",
        "base_url": "https://open.bigmodel.cn/api/paas/v4",
        "models": [
            {"id": "glm-5.2", "label": "GLM-5.2 (最新旗舰)"},
            {"id": "glm-4.7-flash", "label": "GLM-4.7-Flash (免费)"},
        ],
        "need_key": True,
    },
    {
        "id": "kimi",
        "provider": "kimi",
        "label": "Kimi (月之暗面)",
        "base_url": "https://api.moonshot.cn/v1",
        "models": [
            {"id": "kimi-k2.5", "label": "Kimi K2.5 (最新)"},
        ],
        "need_key": True,
    },
    {
        "id": "doubao",
        "provider": "doubao",
        "label": "豆包 (火山引擎)",
        "base_url": "https://ark.cn-beijing.volces.com/api/v3",
        "models": [
            {"id": "doubao-pro-256k", "label": "豆包 Pro 256K"},
            {"id": "doubao-lite-128k", "label": "豆包 Lite 128K"},
        ],
        "need_key": True,
    },
    {
        "id": "ernie",
        "provider": "ernie",
        "label": "文心一言 (百度)",
        "base_url": "https://qianfan.baidubce.com/v2",
        "models": [
            {"id": "ernie-4.5", "label": "文心 4.5 (最新旗舰)"},
        ],
        "need_key": True,
    },
    {
        "id": "minimax",
        "provider": "minimax",
        "label": "MiniMax (稀宇科技)",
        "base_url": "https://api.minimax.chat/v1",
        "models": [
            {"id": "minimax-m2.5", "label": "MiniMax M2.5"},
        ],
        "need_key": True,
    },
    {
        "id": "baichuan",
        "provider": "baichuan",
        "label": "百川智能",
        "base_url": "https://api.baichuan-ai.com/v1",
        "models": [
            {"id": "Baichuan4", "label": "百川4"},
        ],
        "need_key": True,
    },
    {
        "id": "hunyuan",
        "provider": "hunyuan",
        "label": "腾讯混元",
        "base_url": "https://api.hunyuan.cloud.tencent.com/v1",
        "models": [
            {"id": "hunyuan-large", "label": "混元 Large"},
            {"id": "hunyuan-standard", "label": "混元 Standard"},
        ],
        "need_key": True,
    },
    {
        "id": "yi",
        "provider": "yi",
        "label": "零一万物 Yi",
        "base_url": "https://api.lingyiwanwu.com/v1",
        "models": [
            {"id": "yi-large", "label": "Yi Large"},
            {"id": "yi-lightning", "label": "Yi Lightning"},
        ],
        "need_key": True,
    },
    {
        "id": "siliconflow",
        "provider": "siliconflow",
        "label": "硅基流动 (SiliconFlow)",
        "base_url": "https://api.siliconflow.cn/v1",
        "models": [
            {"id": "deepseek-ai/DeepSeek-V4", "label": "DeepSeek V4 (硅基)"},
            {"id": "Qwen/Qwen3.6-Plus", "label": "Qwen 3.6 Plus (硅基)"},
        ],
        "need_key": True,
    },
]

# ========== 默认提示词模板 ==========
DEFAULT_PROMPTS = {
    "parse": (
        "你是一位专业的小说创作助手。根据用户输入的一句话，"
        "提取并补全以下故事六要素，以 JSON 格式输出，key 使用英文：\n"
        "character（人物身份背景）, time（时代时间段）, place（主要场景）, "
        "cause（起点）, process（发展方向）, result（结局倾向）"
    ),
    "outline": (
        '根据以下故事要素，规划一篇{gender}频道{genre}题材的{style}风格小说大纲。\n'
        '目标总字数{word_count}字，按每章{chapter_words}字分配章节。\n'
        '要求每章给出标题和100字概要，注意黄金三章的开篇吸引力，'
        '起承转合完整，结尾收束有力。\n以JSON数组格式输出，每项含title和summary。'
    ),
    "chapter": (
        "你正在创作{gender}频道{genre}题材、{style}风格的小说。\n"
        "当前章节：{chapter_title}\n章节概要：{chapter_summary}\n"
        "前情提要：{previous_summary}\n\n"
        "【重要】本章目标字数约{target_words}字，请务必达到。\n"
        "不要提前结束，内容要充实，细节要丰富。\n"
        "要求：- 每段100-200字 - 对话与描写交替 - 保持{style}风格统一\n"
        "- 注意节奏起伏 - 输出Markdown格式 - 不要在内容中重复输出章节标题"
    ),
    "title": (
        "根据小说全文，为这篇{gender}频道{genre}题材的小说起一个吸引人的标题。\n"
        "要求：贴合主题、有网文吸引力、5-15字。\n直接输出标题，不要多余内容。"
    ),
}
