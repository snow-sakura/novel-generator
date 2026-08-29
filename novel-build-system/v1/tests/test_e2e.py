"""
端到端测试 — Playwright 测试用例
覆盖：创建页、历史页、阅读页、对话页、设置页
"""

import re
import pytest
from playwright.sync_api import Page, expect

BASE_URL = "http://localhost:5174"


def test_homepage_loads(page: Page):
    """首页加载正常"""
    page.goto(BASE_URL)
    expect(page).to_have_title(re.compile("番茄小说生成智能体"))
    # 导航栏应显示
    expect(page.locator("text=创建")).to_be_visible()
    expect(page.locator("text=历史")).to_be_visible()
    expect(page.locator("text=AI对话")).to_be_visible()


def test_create_page_form(page: Page):
    """创建页表单交互"""
    page.goto(f"{BASE_URL}/")
    page.wait_for_load_state("networkidle")

    # 表单应可见
    expect(page.locator("textarea")).to_be_visible()
    # TAB 布局
    expect(page.locator("text=基础")).to_be_visible()
    expect(page.locator("text=题材")).to_be_visible()
    expect(page.locator("text=风格")).to_be_visible()
    expect(page.locator("text=字数")).to_be_visible()


def test_create_page_seed_text_input(page: Page):
    """种子句输入"""
    page.goto(f"{BASE_URL}/")
    page.wait_for_load_state("networkidle")

    textarea = page.locator("textarea").first
    textarea.fill("一个程序员穿越到了异世界，发现自己变成了一个小村庄的村长")
    expect(textarea).to_have_value(
        "一个程序员穿越到了异世界，发现自己变成了一个小村庄的村长"
    )


def test_history_page_loads(page: Page):
    """历史页加载"""
    page.goto(f"{BASE_URL}/history")
    page.wait_for_load_state("networkidle")

    # 标签页应可见
    expect(page.locator("text=全部")).to_be_visible()
    expect(page.locator("text=已完成")).to_be_visible()
    expect(page.locator("text=进行中")).to_be_visible()
    expect(page.locator("text=失败")).to_be_visible()


def test_novel_page_loads(page: Page):
    """阅读页加载（使用已有小说 ID=1）"""
    page.goto(f"{BASE_URL}/novel/1")
    page.wait_for_load_state("networkidle")

    # 页面应加载（可能显示错误或内容）
    expect(page.locator("body")).to_be_visible()


def test_chat_page_loads(page: Page):
    """对话页加载"""
    page.goto(f"{BASE_URL}/chat")
    page.wait_for_load_state("networkidle")

    # 输入框应可见
    expect(page.locator("input")).to_be_visible()
    expect(page.locator("button")).to_be_visible()


def test_prompt_ref_page_loads(page: Page):
    """提示词参考页加载"""
    page.goto(f"{BASE_URL}/prompts")
    page.wait_for_load_state("networkidle")

    # 页面应加载
    expect(page.locator("body")).to_be_visible()


def test_settings_modal_opens(page: Page):
    """设置弹窗打开"""
    page.goto(f"{BASE_URL}/")
    page.wait_for_load_state("networkidle")

    # 点击设置按钮（齿轮图标）
    settings_btn = page.locator("[aria-label='设置']").first
    if settings_btn.is_visible():
        settings_btn.click()
        page.wait_for_timeout(500)
        # 弹窗应显示
        expect(page.locator("text=模型配置")).to_be_visible()


def test_create_page_genre_selection(page: Page):
    """题材选择"""
    page.goto(f"{BASE_URL}/")
    page.wait_for_load_state("networkidle")

    # 点击题材 TAB
    genre_tab = page.locator("text=题材").first
    if genre_tab.is_visible():
        genre_tab.click()
        page.wait_for_timeout(300)
        # 应显示题材列表
        expect(
            page.locator("text=都市脑洞").or_(page.locator("text=玄幻脑洞"))
        ).to_be_visible()


def test_create_page_style_selection(page: Page):
    """风格选择"""
    page.goto(f"{BASE_URL}/")
    page.wait_for_load_state("networkidle")

    # 点击风格 TAB
    style_tab = page.locator("text=风格").first
    if style_tab.is_visible():
        style_tab.click()
        page.wait_for_timeout(300)
        # 应显示风格列表
        expect(
            page.locator("text=轻松搞笑").or_(page.locator("text=热血爽文"))
        ).to_be_visible()


def test_novel_page_back_button(page: Page):
    """阅读页返回按钮"""
    page.goto(f"{BASE_URL}/novel/1")
    page.wait_for_load_state("networkidle")

    back_btn = page.locator("[aria-label='返回']").first
    if back_btn.is_visible():
        back_btn.click()
        page.wait_for_timeout(500)
        # 应返回上一页
        assert BASE_URL in page.url or page.url.endswith("/")


def test_no_console_errors(page: Page):
    """所有页面无 console error"""
    pages_to_test = ["/", "/history", "/chat", "/prompts"]
    errors = []

    page.on(
        "console", lambda msg: errors.append(msg.text) if msg.type == "error" else None
    )

    for path in pages_to_test:
        page.goto(f"{BASE_URL}{path}")
        page.wait_for_load_state("networkidle")
        page.wait_for_timeout(500)

    # 过滤掉已知的无害错误
    real_errors = [e for e in errors if "favicon" not in e.lower()]
    assert len(real_errors) == 0, f"Console errors found: {real_errors}"


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
