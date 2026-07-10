"""TTS 语音合成服务 (F12)"""
import asyncio
import json
import os
import re
from pathlib import Path

EDGE_TTS_AVAILABLE = False
try:
    import edge_tts
    EDGE_TTS_AVAILABLE = True
except ImportError:
    pass


TTS_DIR_NAME = "audio"

SUPPORTED_VOICES = [
    {"name": "晓晓 (女声 亲切)", "id": "zh-CN-XiaoxiaoNeural"},
    {"name": "晓萱 (女声 温柔)", "id": "zh-CN-XiaoyiNeural"},
    {"name": "云健 (男声 成熟)", "id": "zh-CN-YunjianNeural"},
    {"name": "云希 (男声 阳光)", "id": "zh-CN-YunxiNeural"},
    {"name": "云扬 (男声 活力)", "id": "zh-CN-YunyangNeural"},
    {"name": "晓辰 (女声 知性)", "id": "zh-HK-HiuGaaiNeural"},
    {"name": "晓琳 (女声 粤语)", "id": "zh-HK-HiuMaanNeural"},
    {"name": "晓涵 (女声 台湾)", "id": "zh-TW-HsiaoChenNeural"},
    {"name": "晓琳 (女声 台湾)", "id": "zh-TW-HsiaoYuNeural"},
    {"name": "晓妮 (女声 可爱)", "id": "zh-CN-XiaoniNeural"},
    {"name": "晓秋 (女声 自然)", "id": "zh-CN-XiaoqiuNeural"},
    {"name": "云夏 (男声 低沉)", "id": "zh-CN-YunxiaNeural"},
]


def get_novel_dir(novel_title: str) -> str:
    PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    novel_dir = os.path.join(PROJECT_ROOT, "..", "docs", "novel", "v3", novel_title)
    return novel_dir


def get_audio_dir(novel_title: str) -> str:
    d = os.path.join(get_novel_dir(novel_title), TTS_DIR_NAME)
    os.makedirs(d, exist_ok=True)
    return d


def get_audio_path(novel_title: str, chapter_index: int) -> str:
    return os.path.join(get_audio_dir(novel_title), f"chapter_{chapter_index:03d}.mp3")


def _extract_chapters(content: str) -> list[dict]:
    if not content:
        return []
    parts = [p for p in re.split(r"(?=## )", content) if p.strip()]
    result = []
    for i, block in enumerate(parts):
        title_match = re.match(r"^## (.+)", block)
        title = title_match.group(1).strip() if title_match else f"第{i + 1}章"
        body = re.sub(r"^## .+\n+", "", block).strip() if title_match else block.strip()
        result.append({"index": i, "title": title, "body": body})
    return result


async def generate_tts_audio(
    text: str,
    voice_id: str = "zh-CN-XiaoxiaoNeural",
    rate: str = "+0%",
    pitch: str = "+0Hz",
) -> bytes:
    if not EDGE_TTS_AVAILABLE:
        raise RuntimeError("edge-tts 未安装，请运行: pip install edge-tts")
    communicate = edge_tts.Communicate(text, voice=voice_id, rate=rate, pitch=pitch)
    audio_data = b""
    async for chunk in communicate.stream():
        if chunk["type"] == "audio":
            audio_data += chunk["data"]
    return audio_data


async def generate_chapter_audio(
    novel_title: str,
    chapter_text: str,
    chapter_index: int,
    voice_id: str = "zh-CN-XiaoxiaoNeural",
    rate: str = "+0%",
    pitch: str = "+0Hz",
) -> str:
    audio_path = get_audio_path(novel_title, chapter_index)
    if os.path.exists(audio_path):
        return audio_path
    audio_data = await generate_tts_audio(chapter_text, voice_id, rate, pitch)
    with open(audio_path, "wb") as f:
        f.write(audio_data)
    return audio_path


async def generate_novel_tts(
    novel_title: str,
    content: str,
    voice_id: str = "zh-CN-XiaoxiaoNeural",
    rate: str = "+0%",
    pitch: str = "+0Hz",
    chapter_indices: list[int] | None = None,
) -> dict[int, str]:
    chapters = _extract_chapters(content)
    results = {}
    for ch in chapters:
        if chapter_indices is not None and ch["index"] not in chapter_indices:
            continue
        path = await generate_chapter_audio(novel_title, ch["body"], ch["index"], voice_id, rate, pitch)
        results[ch["index"]] = path
    return results


def get_audio_status(novel_title: str, content: str) -> list[dict]:
    chapters = _extract_chapters(content)
    result = []
    for ch in chapters:
        path = get_audio_path(novel_title, ch["index"])
        exists = os.path.exists(path)
        result.append({
            "chapter_index": ch["index"],
            "title": ch["title"],
            "generated": exists,
            "file_size": os.path.getsize(path) if exists else 0,
        })
    return result


def delete_chapter_audio(novel_title: str, chapter_index: int) -> bool:
    path = get_audio_path(novel_title, chapter_index)
    if os.path.exists(path):
        os.remove(path)
        return True
    return False
