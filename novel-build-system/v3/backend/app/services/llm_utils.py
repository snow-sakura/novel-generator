"""LLM 调用工具 — 超时保护、流式迭代、JSON 提取"""
import asyncio
import json
from datetime import datetime
from typing import Any, AsyncGenerator, AsyncIterator, Optional

from app.llm.provider import LLMProvider


def _log(msg: str):
    ts = datetime.now().strftime("%H:%M:%S.%f")[:12]
    print(f"  [{ts}] [LLM工具] {msg}", flush=True)


async def timeout_iterate(agen: Any, timeout: int = 120,
                           first_chunk_timeout: int = 60,
                           heartbeat_interval: int = 30) -> AsyncGenerator[str, None]:
    """逐块迭代异步生成器，含首块保活心跳和超时保护"""
    ait = agen.__aiter__()
    is_first = True
    while True:
        try:
            t = first_chunk_timeout if is_first else timeout
            if is_first:
                elapsed = 0
                while elapsed < t:
                    try:
                        chunk = await asyncio.wait_for(ait.__anext__(), timeout=min(heartbeat_interval, t - elapsed))
                        is_first = False
                        yield chunk
                        break
                    except asyncio.TimeoutError:
                        elapsed += heartbeat_interval
                        yield ""
                if is_first:
                    _log(f"⚠️ 流式迭代超时（首块 {first_chunk_timeout}s）")
                    break
            else:
                chunk = await asyncio.wait_for(ait.__anext__(), timeout=t)
                yield chunk
        except StopAsyncIteration:
            break
        except asyncio.TimeoutError:
            if not is_first:
                _log(f"⚠️ 流式迭代超时（后续 {timeout}s）")
            break
        except Exception as e:
            _log(f"⚠️ 流式迭代异常: {e}")
            break


async def call_llm(llm: LLMProvider, prompt: str, system_prompt: str = "",
                   timeout: int = 120) -> str:
    """流式调用 LLM 并收集完整结果，超时/失败后自动重试一次"""
    for attempt in range(2):
        result = ""
        async def _collect():
            nonlocal result
            async for chunk in timeout_iterate(
                llm.generate_stream(prompt, system_prompt),
                timeout=timeout,
                first_chunk_timeout=180,
            ):
                result += chunk
        try:
            await _collect()
            if result:
                return result
            _log(f"⚠️ LLM 返回空结果（第{attempt+1}次）")
        except asyncio.TimeoutError:
            _log(f"⚠️ LLM 调用超时（{timeout}s，第{attempt+1}次）")
        except Exception as e:
            _log(f"⚠️ LLM 调用异常: {e}（第{attempt+1}次）")
        if attempt == 0:
            _log("🔄 重试一次...")
            await asyncio.sleep(1)
    return ""


def extract_json(raw: str):
    """从 LLM 输出中提取并解析 JSON（支持 dict 和 list）"""
    stripped = raw.strip()
    if "[" in stripped:
        try:
            start = stripped.index("[")
            end = stripped.rindex("]") + 1
            return json.loads(stripped[start:end])
        except (ValueError, json.JSONDecodeError):
            pass
    if "{" in stripped:
        try:
            start = stripped.index("{")
            end = stripped.rindex("}") + 1
            return json.loads(stripped[start:end])
        except (ValueError, json.JSONDecodeError):
            pass
    return {}


def safe_format(template: str, **kwargs) -> str:
    """仅替换 {key} 占位符，不影响 JSON 结构中的 { }"""
    for key, val in kwargs.items():
        template = template.replace(f"{{{key}}}", str(val))
    return template
