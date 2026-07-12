"""
MockLLMProvider — 用于 test-lab 测试的 LLM 模拟实现

当 v3 后端以 LLM_PROVIDER=mock 环境变量启动时，
由 get_llm_provider() 工厂方法返回此 Provider。

返回确定性的 JSON 响应，不依赖任何外部 API。
"""

import json
import os
from typing import AsyncGenerator, Optional

from app.llm.provider import LLMProvider


# ── Mock 响应数据 ─────────────────────────────────────────────

MOCK_PARSE_RESPONSE = json.dumps({
    "protagonist": "林逸（普通大学生，意外获得上古传承，渴望变强守护家人）",
    "time_era": "现代都市背景，存在隐藏的修真世界",
    "worldview": "世界观设定：现代都市与修真世界并存，灵气复苏背景",
    "core_conflict": "普通人在灵气复苏时代如何生存成长，对抗邪恶势力",
    "resolution_tendency": "正剧（通过努力和成长最终获得成功）",
    "world_tone": "都市修真，热血冒险，带轻松搞笑元素",
}, ensure_ascii=False)

MOCK_OUTLINE_RESPONSE = json.dumps({
    "strategy": {
        "title": "修真从重构代码开始（暂定）",
        "theme": "普通人的逆袭之路",
        "target_audience": "都市修真爱好者",
    },
    "characters": [
        {"name": "林逸", "role": "主角", "traits": "坚韧不拔、机智幽默"},
        {"name": "苏雨桐", "role": "女主", "traits": "聪慧温柔"},
    ],
    "world": {
        "background": "现代都市修真世界",
        "rules": "灵气复苏，人人皆可修炼",
    },
    "plot_structure": {
        "act1": "获得传承，初入修真",
        "act2": "成长历练，结识伙伴",
        "act3": "最终决战，守护世界",
    },
    "chapters": [
        {"index": 0, "title": "第一章 觉醒", "summary": "主角意外获得上古传承"},
        {"index": 1, "title": "第二章 初试", "summary": "主角开始修炼之路"},
        {"index": 2, "title": "第三章 危机", "summary": "遭遇第一个对手"},
    ],
}, ensure_ascii=False)

MOCK_CHAPTER_RESPONSE = "林逸站在窗前，望着远处灯火辉煌的城市，心情久久不能平静。\n\n一切都发生得太突然了。就在昨天，他还只是一个普通的大二学生，为了期末考试而焦虑。\n\n但此刻，他能清晰地感受到体内那股温热的气流在经脉中缓缓流动——这就是传说中的灵力吗？"

MOCK_TITLE_RESPONSE = json.dumps({
    "title": "修真从重构代码开始",
    "subtitle": "一个程序员的修仙之路",
}, ensure_ascii=False)

MOCK_DIALOGUE_RESPONSE = """【场景：酒馆内，烛光摇曳】

林逸：这个任务太危险了，你确定要参与吗？

苏雨桐：正因为危险，我才不能让你一个人去面对。

林逸：可是...

苏雨桐：别说了，我们是一起的。"""

MOCK_CONTINUATION_RESPONSE = "他深吸一口气，推开了那扇门。门后是一条长长的走廊，两侧墙壁上镶嵌着发光的符文。每一步都伴随着轻微的震动，仿佛整座建筑都在呼吸。"

MOCK_REWRITE_RESPONSE = "这简直太有意思了！他站在窗前，看着灯火辉煌的城市夜景，心情好得不得了。一切来得太突然，昨天还在为考试发愁，今天就成了传说中的修仙者！体内的灵力在经脉中欢快地流动着，像是在跳舞。"

MOCK_CHAT_RESPONSE = "好的！我来为你写一个都市小说的开头：\n\n在繁华的市中心，有一家不起眼的小书店..."

MOCK_ILLUSTRATION_RESPONSE = json.dumps({
    "image_url": "https://example.com/mock-illustration.png",
    "alt_text": "主角站在都市高楼之巅，俯瞰万家灯火",
}, ensure_ascii=False)


# 运行时 mock 模式覆盖（优先级高于环境变量，用于 test-lab 动态切换）
_runtime_mock_mode: str | None = None


def set_mock_mode(mode: str | None):
    """运行时设置 mock 模式，覆盖环境变量 MOCK_LLM_RESPONSE"""
    global _runtime_mock_mode
    _runtime_mock_mode = mode


class MockLLMProvider(LLMProvider):
    """
    模拟 LLM Provider — 返回确定性响应，不依赖外部 API

    支持通过 MOCK_LLM_RESPONSE 环境变量或 set_mock_mode() 运行时选择不同响应模式：
    - "default": 标准 mock 响应
    - "slow": 模拟慢速响应（每个 chunk 延迟）
    - "empty": 模拟空响应
    - "error": 模拟生成错误
    """

    def __init__(self):
        self.response_mode = _runtime_mock_mode or os.environ.get("MOCK_LLM_RESPONSE", "default")

    def validate(self) -> Optional[str]:
        if self.response_mode == "error":
            return "模拟配置错误"
        return None

    async def generate_stream(self, prompt: str, system_prompt: str = "") -> AsyncGenerator[str, None]:
        """根据 prompt 关键词路由到不同的 mock 响应"""
        if self.response_mode == "error":
            yield "模拟生成错误"
            return

        if self.response_mode == "empty":
            return

        # 按 prompt 内容路由响应
        if "要素" in prompt or "提取" in prompt:
            yield MOCK_PARSE_RESPONSE
        elif "大纲" in prompt or "六层" in prompt:
            yield MOCK_OUTLINE_RESPONSE
        elif "情感曲线" in prompt:
            yield json.dumps({"curve": [0.3, 0.5, 0.7, 0.9, 0.6, 0.8, 1.0]})
        elif "章节" in prompt and ("写作" in prompt or "正文" in prompt):
            if self.response_mode == "slow":
                import asyncio
                for chunk in [MOCK_CHAPTER_RESPONSE[:20], MOCK_CHAPTER_RESPONSE[20:40], MOCK_CHAPTER_RESPONSE[40:]]:
                    await asyncio.sleep(0.5)
                    yield chunk
            else:
                yield MOCK_CHAPTER_RESPONSE
        elif "开头" in prompt:
            versions = [
                json.dumps({"version": "v1", "text": "林逸站在窗前，望着远处灯火辉煌的城市，心情久久不能平静。一切都发生得太突然了。就在昨天，他还只是一个普通的大二学生，为了期末考试而焦虑。但此刻，他能清晰地感受到体内那股温热的气流在经脉中缓缓流动——这就是传说中的灵力吗？"}),
                json.dumps({"version": "v2", "text": "夜幕降临，城市的霓虹灯次第亮起。林逸走在回家的路上，脑海里还在想着白天的奇遇。那块古玉究竟藏着什么秘密？为什么偏偏选择了他？一阵冷风吹过，他下意识地裹紧了外套，却没注意到胸前的古玉正微微发光。"}),
                json.dumps({"version": "v3", "text": "如果告诉你，这个世界上真的有修仙者，你会相信吗？林逸以前也不信，直到那天他在旧货市场淘到一块不起眼的古玉。从此，他的生活发生了翻天覆地的变化。考试？不重要了。工作？先放一放。因为有一个全新的世界正在他面前展开。"}),
            ]
            for v in versions:
                yield v
        elif "标题" in prompt:
            yield MOCK_TITLE_RESPONSE
        elif "解读" in prompt:
            yield "本文通过主角的成长历程，展现了现代都市中普通人的不平凡之路。"
        elif "对话" in prompt:
            yield MOCK_DIALOGUE_RESPONSE
        elif "续写" in prompt:
            yield MOCK_CONTINUATION_RESPONSE
        elif "改写" in prompt:
            yield MOCK_REWRITE_RESPONSE
        elif "配图" in prompt or "插画" in prompt:
            yield MOCK_ILLUSTRATION_RESPONSE
        else:
            # 默认回复
            yield MOCK_CHAT_RESPONSE
