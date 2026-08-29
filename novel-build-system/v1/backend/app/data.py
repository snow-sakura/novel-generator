"""
番茄小说题材/风格/国产模型数据
实时来源：番茄小说官网 https://fanqienovel.com
"""

from app.config import settings

# ========== 频道归类（第一选择） ==========
GENDERS = ["男频", "女频", "无频"]

# ========== 男频分类（综合番茄/起点/飞卢/七猫） ==========
MALE_CATEGORIES = [
    # 玄幻奇幻
    "东方玄幻",
    "异世大陆",
    "高武世界",
    "西方奇幻",
    "异界大陆",
    "远古神话",
    # 仙侠修真
    "修真文明",
    "幻想修仙",
    "古典仙侠",
    "现代修真",
    "修真风云",
    # 都市
    "都市生活",
    "都市异能",
    "都市修真",
    "都市重生",
    "商战职场",
    "娱乐明星",
    "体育竞技",
    # 历史
    "架空历史",
    "两宋元明",
    "秦汉三国",
    "清史民国",
    "历史演义",
    # 军事
    "军事战争",
    "抗战谍战",
    "军旅生涯",
    # 游戏
    "电子竞技",
    "游戏异界",
    "游戏系统",
    # 科幻
    "时空穿梭",
    "末世危机",
    "未来世界",
    "星际文明",
    "超级科技",
    # 武侠
    "传统武侠",
    "武侠幻想",
    "武侠同人",
    # 悬疑
    "悬疑推理",
    "诡秘灵异",
    "探险盗墓",
    # 同人
    "动漫同人",
    "影视同人",
    "游戏同人",
    "小说同人",
    # 其他
    "同人衍生",
    "衍生同人",
    "短篇小说",
]

# ========== 女频分类（综合番茄/起点/晋江/七猫） ==========
FEMALE_CATEGORIES = [
    # 古代言情
    "古代言情",
    "架空历史",
    "宫斗宅斗",
    "穿越奇情",
    "古风奇幻",
    "女尊王朝",
    # 现代言情
    "现代言情",
    "都市生活",
    "豪门世家",
    "青春校园",
    "婚恋情缘",
    "职场爱情",
    # 浪漫言情
    "浪漫言情",
    "甜宠小说",
    "青春甜宠",
    "纯爱唯美",
    # 幻想言情
    "玄幻言情",
    "奇幻言情",
    "仙侠奇缘",
    "异能超术",
    "末世危情",
    # 悬疑言情
    "悬疑推理",
    "灵异怪谈",
    "悬疑脑洞",
    # 历史言情
    "民国言情",
    "穿越重生",
    # 其他
    "快穿系统",
    "时空穿梭",
    "种田经商",
    "星光璀璨",
    "女频衍生",
    "短篇小说",
]


def get_categories_by_gender(gender: str) -> list:
    """根据频道获取分类列表"""
    if gender == "男频":
        return MALE_CATEGORIES[:]
    return FEMALE_CATEGORIES[:]


# ========== 风格标签（综合各平台常见风格） ==========
STYLES = [
    # 节奏类
    "快节奏爽文",
    "慢热细腻",
    "轻松搞笑",
    "热血激昂",
    "紧张刺激",
    "舒缓治愈",
    # 情感类
    "甜宠温馨",
    "虐心催泪",
    "浪漫唯美",
    "轻松甜蜜",
    "苦尽甘来",
    # 氛围类
    "暗黑压抑",
    "阳光积极",
    "悬疑烧脑",
    "温馨治愈",
    "悲惨世界",
    # 文风类
    "写实厚重",
    "文艺唯美",
    "诙谐幽默",
    "严肃深沉",
    "清新自然",
    # 题材风格
    "脑洞大开",
    "硬核技术流",
    "古风典雅",
    "现代简约",
    "科幻硬核",
    "奇幻瑰丽",
    # 网文特色
    "打脸装逼",
    "扮猪吃虎",
    "重生复仇",
    "系统流",
    "无敌文",
    "后宫文",
    "种田文",
    "宫斗文",
]

# ========== 模型配置列表（OpenAI 兼容接口） ==========
# 动态构建：从 .env 读取所有已配置的 provider，再加上国产模型列表


def _build_env_providers() -> list:
    """从 .env 配置构建所有已配置的 provider 列表"""
    providers = []
    current_provider = settings.llm_provider

    # OpenAI 兼容接口（AMD Radeon 等）- 仅在配置了 key 或 base_url 时添加
    if settings.openai_api_key or settings.openai_base_url:
        # 根据 base_url 自动推断名称
        if "amd" in (settings.openai_base_url or "").lower():
            default_label = "AMD Radeon"
        else:
            default_label = settings.llm_provider_label or "OpenAI 兼容"

        # 如果当前 provider 是 openai，显示为"当前 .env 配置"
        if current_provider == "openai":
            label = "当前 .env 配置 ({})".format(
                settings.llm_provider_label or default_label
            )
        else:
            label = default_label

        providers.append(
            {
                "provider": "openai",
                "label": label,
                "base_url": settings.openai_base_url,
                "models": [
                    {
                        "id": settings.openai_model or "gpt-4o-mini",
                        "label": settings.openai_model or "gpt-4o-mini",
                    }
                ],
                "need_key": not bool(settings.openai_api_key),
            }
        )

    # Anthropic
    if settings.anthropic_api_key:
        if current_provider == "anthropic":
            label = "当前 .env 配置 ({})".format(
                settings.llm_provider_label or "Anthropic (Claude)"
            )
        else:
            label = "Anthropic (Claude)"

        providers.append(
            {
                "provider": "anthropic",
                "label": label,
                "base_url": "",
                "models": [
                    {
                        "id": settings.anthropic_model or "claude-sonnet-4-20250514",
                        "label": settings.anthropic_model or "Claude Sonnet",
                    }
                ],
                "need_key": not bool(settings.anthropic_api_key),
            }
        )

    # Ollama（本地）
    if settings.ollama_base_url:
        if current_provider == "ollama":
            label = "当前 .env 配置 ({})".format(
                settings.llm_provider_label or "Ollama (本地)"
            )
        else:
            label = "Ollama (本地)"

        providers.append(
            {
                "provider": "ollama",
                "label": label,
                "base_url": settings.ollama_base_url,
                "models": [
                    {
                        "id": settings.ollama_model or "qwen2.5:7b",
                        "label": settings.ollama_model or "qwen2.5:7b",
                    }
                ],
                "need_key": False,
            }
        )

    # OpenCode Zen
    if settings.opencode_api_key or settings.opencode_base_url:
        if current_provider == "opencode":
            label = "当前 .env 配置 ({})".format(
                settings.llm_provider_label or "OpenCode Zen"
            )
        else:
            label = "OpenCode Zen (免费)"

        providers.append(
            {
                "provider": "opencode",
                "label": label,
                "base_url": settings.opencode_base_url or "https://opencode.ai/zen/v1",
                "models": [
                    {"id": "mimo-v2.5-free", "label": "MiMo-V2.5 Free (小米)"},
                    {"id": "deepseek-v4-flash-free", "label": "DeepSeek V4 Flash Free"},
                    {"id": "hy3-free", "label": "HY3 Free"},
                    {"id": "nemotron-3-ultra-free", "label": "Nemotron 3 Ultra Free"},
                ],
                "need_key": not bool(settings.opencode_api_key),
            }
        )

    return providers


# 国产模型列表（需 API Key）
_CHINESE_MODELS_RAW = [
    {
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
        "provider": "kimi",
        "label": "Kimi (月之暗面)",
        "base_url": "https://api.moonshot.cn/v1",
        "models": [
            {"id": "kimi-k2.5", "label": "Kimi K2.5 (最新)"},
        ],
        "need_key": True,
    },
    {
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
        "provider": "ernie",
        "label": "文心一言 (百度)",
        "base_url": "https://qianfan.baidubce.com/v2",
        "models": [
            {"id": "ernie-4.5", "label": "文心 4.5 (最新旗舰)"},
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
            {"id": "deepseek-ai/DeepSeek-V4", "label": "DeepSeek V4 (硅基)"},
            {"id": "Qwen/Qwen3.6-Plus", "label": "Qwen 3.6 Plus (硅基)"},
        ],
        "need_key": True,
    },
]


# 合并：.env 配置的 provider + 国产模型列表
CHINESE_MODELS = _build_env_providers() + _CHINESE_MODELS_RAW

# ========== 默认提示词模板 ==========
DEFAULT_PROMPTS = {
    "parse": (
        "你是一位专业的小说创作助手。根据用户输入的一句话，"
        "提取并补全以下故事六要素，以 JSON 格式输出，key 使用英文：\n"
        "character（人物身份背景）, time（时代时间段）, place（主要场景）, "
        "cause（起点）, process（发展方向）, result（结局倾向）"
    ),
    "outline": (
        "根据以下故事要素，规划一篇{gender}频道{genre}题材的{style}风格小说大纲。\n"
        "目标总字数{word_count}字，按每章{chapter_words}字分配章节。\n"
        "要求每章给出标题和100字概要，注意黄金三章的开篇吸引力，"
        "起承转合完整，结尾收束有力。\n以JSON数组格式输出，每项含title和summary。"
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
