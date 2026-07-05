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

# ========== 国产模型配置列表（OpenAI 兼容） ==========
CHINESE_MODELS = [
    {
        "provider": "deepseek",
        "label": "DeepSeek (深度求索)",
        "base_url": "https://api.deepseek.com/v1",
        "models": [
            {"id": "deepseek-chat", "label": "DeepSeek V3 (通用)"},
            {"id": "deepseek-reasoner", "label": "DeepSeek R1 (推理)"},
        ],
        "need_key": True,
    },
    {
        "provider": "qwen",
        "label": "通义千问 (阿里云)",
        "base_url": "https://dashscope.aliyuncs.com/compatible-mode/v1",
        "models": [
            {"id": "qwen-max", "label": "Qwen Max (旗舰)"},
            {"id": "qwen-plus", "label": "Qwen Plus (均衡)"},
            {"id": "qwen-turbo", "label": "Qwen Turbo (快速)"},
        ],
        "need_key": True,
    },
    {
        "provider": "glm",
        "label": "智谱AI GLM",
        "base_url": "https://open.bigmodel.cn/api/paas/v4",
        "models": [
            {"id": "glm-4-plus", "label": "GLM-4-Plus (旗舰)"},
            {"id": "glm-4-flash", "label": "GLM-4-Flash (免费)"},
            {"id": "glm-4-air", "label": "GLM-4-Air (轻量)"},
        ],
        "need_key": True,
    },
    {
        "provider": "kimi",
        "label": "Kimi (月之暗面)",
        "base_url": "https://api.moonshot.cn/v1",
        "models": [
            {"id": "moonshot-v1-128k", "label": "Kimi 128K (长上下文)"},
            {"id": "moonshot-v1-8k", "label": "Kimi 8K (标准)"},
        ],
        "need_key": True,
    },
    {
        "provider": "doubao",
        "label": "豆包 (火山引擎)",
        "base_url": "https://ark.cn-beijing.volces.com/api/v3",
        "models": [
            {"id": "doubao-pro-32k", "label": "豆包 Pro 32K"},
            {"id": "doubao-lite-32k", "label": "豆包 Lite 32K"},
        ],
        "need_key": True,
    },
    {
        "provider": "ernie",
        "label": "文心一言 (百度)",
        "base_url": "https://qianfan.baidubce.com/v2",
        "models": [
            {"id": "ernie-4.0", "label": "文心 4.0 (旗舰)"},
            {"id": "ernie-3.5", "label": "文心 3.5 (均衡)"},
        ],
        "need_key": True,
    },
    {
        "provider": "minimax",
        "label": "MiniMax (稀宇科技)",
        "base_url": "https://api.minimax.chat/v1",
        "models": [
            {"id": "minimax-m2.5", "label": "MiniMax M2.5"},
        ],
        "need_key": True,
    },
    {
        "provider": "baichuan",
        "label": "百川智能",
        "base_url": "https://api.baichuan-ai.com/v1",
        "models": [
            {"id": "Baichuan4", "label": "百川4"},
            {"id": "Baichuan3-Turbo", "label": "百川3 Turbo"},
        ],
        "need_key": True,
    },
    {
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
        "provider": "siliconflow",
        "label": "硅基流动 (SiliconFlow)",
        "base_url": "https://api.siliconflow.cn/v1",
        "models": [
            {"id": "deepseek-ai/DeepSeek-V3", "label": "DeepSeek V3 (硅基)"},
            {"id": "Qwen/Qwen2.5-72B", "label": "Qwen 2.5 72B (硅基)"},
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
