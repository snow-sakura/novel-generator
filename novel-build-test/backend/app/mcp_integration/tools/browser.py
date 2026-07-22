"""Playwright 浏览器自动化工具

4.1.2: 注册 browser_navigate / click / screenshot / snapshot 等工具，
供 MCP ToolRegistry 统一管理，支持 Agent 在测试执行中操控浏览器。
"""

import logging
from typing import Any

logger = logging.getLogger(__name__)

# 全局浏览器实例（按需延迟初始化）
_browser = None
_context = None
_page = None


async def _ensure_page() -> Any:
    """延迟初始化 Playwright 页面对象。"""
    global _browser, _context, _page
    try:
        from playwright.async_api import async_playwright
    except ImportError:
        raise ImportError("playwright 未安装。请执行: pip install playwright && playwright install chromium")

    if _page is None:
        playwright = await async_playwright().start()
        _browser = await playwright.chromium.launch(headless=True)
        _context = await _browser.new_context(
            viewport={"width": 1280, "height": 720},
            user_agent=(
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                "AppleWebKit/537.36 (KHTML, like Gecko) "
                "Chrome/120.0.0.0 Safari/537.36"
            ),
        )
        _page = await _context.new_page()
        logger.info("Playwright 浏览器已启动（headless）")
    return _page


async def browser_navigate(url: str, **kwargs) -> dict:
    """导航到指定 URL。

    Args:
        url: 目标网页地址

    Returns:
        包含页面标题和当前 URL 的字典
    """
    page = await _ensure_page()
    try:
        response = await page.goto(url, wait_until="networkidle", timeout=30000)
        title = await page.title()
        return {
            "success": True,
            "title": title,
            "url": page.url,
            "status_code": response.status if response else None,
        }
    except Exception as e:
        logger.error(f"导航失败: {e}")
        return {"success": False, "error": str(e)}


async def browser_click(selector: str, **kwargs) -> dict:
    """点击页面元素。

    Args:
        selector: CSS 选择器

    Returns:
        操作结果
    """
    page = await _ensure_page()
    try:
        await page.click(selector, timeout=10000)
        return {"success": True, "selector": selector}
    except Exception as e:
        logger.error(f"点击失败 {selector}: {e}")
        return {"success": False, "error": str(e), "selector": selector}


async def browser_type(selector: str, text: str, **kwargs) -> dict:
    """在输入框中键入文本。

    Args:
        selector: CSS 选择器
        text: 要输入的文本

    Returns:
        操作结果
    """
    page = await _ensure_page()
    try:
        await page.fill(selector, text, timeout=10000)
        return {"success": True, "selector": selector, "text": text}
    except Exception as e:
        logger.error(f"输入失败 {selector}: {e}")
        return {"success": False, "error": str(e), "selector": selector}


async def browser_screenshot(**kwargs) -> dict:
    """截取当前页面截图。

    Returns:
        包含 base64 编码截图的字典
    """
    page = await _ensure_page()
    try:
        import base64

        screenshot_bytes = await page.screenshot(full_page=True)
        screenshot_b64 = base64.b64encode(screenshot_bytes).decode("utf-8")
        return {
            "success": True,
            "screenshot_base64": screenshot_b64,
            "size_bytes": len(screenshot_bytes),
        }
    except Exception as e:
        logger.error(f"截图失败: {e}")
        return {"success": False, "error": str(e)}


async def browser_snapshot(**kwargs) -> dict:
    """获取当前页面 DOM 快照。

    Returns:
        包含页面 HTML 内容的字典
    """
    page = await _ensure_page()
    try:
        content = await page.content()
        title = await page.title()
        return {
            "success": True,
            "title": title,
            "url": page.url,
            "html_length": len(content),
            "html_preview": content[:2000],
        }
    except Exception as e:
        logger.error(f"快照失败: {e}")
        return {"success": False, "error": str(e)}


async def browser_evaluate(script: str, **kwargs) -> dict:
    """在页面中执行 JavaScript。

    Args:
        script: JavaScript 代码

    Returns:
        执行结果
    """
    page = await _ensure_page()
    try:
        result = await page.evaluate(script)
        return {"success": True, "result": result}
    except Exception as e:
        logger.error(f"JS 执行失败: {e}")
        return {"success": False, "error": str(e)}


async def browser_close(**kwargs) -> dict:
    """关闭浏览器实例，释放资源。"""
    global _browser, _context, _page
    try:
        if _page:
            await _page.close()
        if _context:
            await _context.close()
        if _browser:
            await _browser.close()
        _page = None
        _context = None
        _browser = None
        logger.info("Playwright 浏览器已关闭")
        return {"success": True}
    except Exception as e:
        logger.error(f"关闭浏览器失败: {e}")
        return {"success": False, "error": str(e)}


# ===== 工具注册定义 =====

BROWSER_TOOLS = [
    {
        "name": "browser_navigate",
        "func": browser_navigate,
        "description": "导航到指定 URL，等待页面加载完成后返回标题和 URL",
        "schema": {
            "type": "object",
            "properties": {
                "url": {"type": "string", "description": "目标网页地址"},
            },
            "required": ["url"],
        },
    },
    {
        "name": "browser_click",
        "func": browser_click,
        "description": "点击页面中匹配 CSS 选择器的元素",
        "schema": {
            "type": "object",
            "properties": {
                "selector": {"type": "string", "description": "CSS 选择器"},
            },
            "required": ["selector"],
        },
    },
    {
        "name": "browser_type",
        "func": browser_type,
        "description": "在匹配 CSS 选择器的输入框中键入文本",
        "schema": {
            "type": "object",
            "properties": {
                "selector": {"type": "string", "description": "CSS 选择器"},
                "text": {"type": "string", "description": "要输入的文本"},
            },
            "required": ["selector", "text"],
        },
    },
    {
        "name": "browser_screenshot",
        "func": browser_screenshot,
        "description": "截取当前页面的全页截图，返回 base64 编码的图片",
        "schema": {"type": "object", "properties": {}},
    },
    {
        "name": "browser_snapshot",
        "func": browser_snapshot,
        "description": "获取当前页面的 DOM 快照（HTML 内容预览）",
        "schema": {"type": "object", "properties": {}},
    },
    {
        "name": "browser_evaluate",
        "func": browser_evaluate,
        "description": "在当前页面中执行 JavaScript 代码",
        "schema": {
            "type": "object",
            "properties": {
                "script": {"type": "string", "description": "JavaScript 代码"},
            },
            "required": ["script"],
        },
    },
    {
        "name": "browser_close",
        "func": browser_close,
        "description": "关闭浏览器实例，释放系统资源",
        "schema": {"type": "object", "properties": {}},
    },
]
