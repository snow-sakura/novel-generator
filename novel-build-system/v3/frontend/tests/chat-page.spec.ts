/**
 * 对话页面 E2E 测试
 * 测试消息输入、发送按钮、Enter/Shift+Enter 行为、
 * 消息显示、空状态
 */
import { test, expect } from '@playwright/test'

test.describe('对话页面', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/chat')
    await page.waitForLoadState('networkidle')
  })

  // ── 页面加载 ──

  test.describe('页面加载', () => {
    test('对话页面正确加载', async ({ page }) => {
      await expect(page.getByText('AI 对话创作')).toBeVisible()
    })

    test('消息输入框存在且可聚焦', async ({ page }) => {
      const textarea = page.locator('textarea[placeholder="描述你的故事灵感..."]')
      await expect(textarea).toBeVisible()
      await expect(textarea).toBeEnabled()
    })

    test('发送按钮存在', async ({ page }) => {
      const sendBtn = page.getByRole('button', { name: '发送' })
      await expect(sendBtn).toBeVisible()
    })

    test('返回按钮存在', async ({ page }) => {
      const backBtn = page.getByRole('button', { name: /返回/ })
      await expect(backBtn).toBeVisible()
    })

    test('新对话按钮存在', async ({ page }) => {
      const newChatBtn = page.getByRole('button', { name: /新对话/ })
      await expect(newChatBtn).toBeVisible()
    })
  })

  // ── 空状态 ──

  test.describe('空状态', () => {
    test('初始状态显示引导文字', async ({ page }) => {
      await expect(page.getByText('输入故事灵感开始对话')).toBeVisible()
      await expect(page.getByText('AI 将引导你完成小说创作')).toBeVisible()
    })

    test('发送按钮在无输入时禁用', async ({ page }) => {
      const sendBtn = page.getByRole('button', { name: '发送' })
      await expect(sendBtn).toBeDisabled()
    })
  })

  // ── 消息输入 ──

  test.describe('消息输入', () => {
    test('可以在输入框中输入文字', async ({ page }) => {
      const textarea = page.locator('textarea[placeholder="描述你的故事灵感..."]')
      await textarea.fill('我想写一个科幻故事')

      await expect(textarea).toHaveValue('我想写一个科幻故事')
    })

    test('输入文字后发送按钮变为可用', async ({ page }) => {
      const textarea = page.locator('textarea[placeholder="描述你的故事灵感..."]')
      await textarea.fill('测试消息')

      const sendBtn = page.getByRole('button', { name: '发送' })
      await expect(sendBtn).toBeEnabled()
    })

    test('清空输入后发送按钮恢复禁用', async ({ page }) => {
      const textarea = page.locator('textarea[placeholder="描述你的故事灵感..."]')
      await textarea.fill('测试消息')
      await textarea.fill('')

      const sendBtn = page.getByRole('button', { name: '发送' })
      await expect(sendBtn).toBeDisabled()
    })
  })

  // ── Enter 发送 ──

  test.describe('Enter 键发送消息', () => {
    test('按 Enter 键发送消息', async ({ page }) => {
      const textarea = page.locator('textarea[placeholder="描述你的故事灵感..."]')
      await textarea.fill('这是一条测试消息')
      await textarea.press('Enter')

      // 消息应该出现在聊天区域（user 消息气泡）
      await expect(page.locator('.rounded-tr-md').filter({ hasText: '这是一条测试消息' })).toBeVisible()
    })

    test('发送后输入框被清空', async ({ page }) => {
      const textarea = page.locator('textarea[placeholder="描述你的故事灵感..."]')
      await textarea.fill('发送后清空测试')
      await textarea.press('Enter')

      await expect(textarea).toHaveValue('')
    })
  })

  // ── Shift+Enter 换行 ──

  test.describe('Shift+Enter 换行', () => {
    test('按 Shift+Enter 插入换行而非发送', async ({ page }) => {
      const textarea = page.locator('textarea[placeholder="描述你的故事灵感..."]')
      await textarea.fill('第一行')
      await textarea.press('Shift+Enter')
      await textarea.type('第二行')

      const value = await textarea.inputValue()
      expect(value).toContain('第一行')
      expect(value).toContain('第二行')

      // 消息不应被发送（空状态引导文字仍可见）
      await expect(page.getByText('输入故事灵感开始对话')).toBeVisible()
    })
  })

  // ── 点击发送按钮 ──

  test.describe('点击发送按钮', () => {
    test('点击发送按钮发送消息', async ({ page }) => {
      const textarea = page.locator('textarea[placeholder="描述你的故事灵感..."]')
      await textarea.fill('按钮发送测试')

      const sendBtn = page.getByRole('button', { name: '发送' })
      await sendBtn.click()

      // 消息应该出现
      await expect(page.locator('.rounded-tr-md').filter({ hasText: '按钮发送测试' })).toBeVisible()
    })
  })

  // ── 提示文字 ──

  test.describe('提示文字', () => {
    test('显示 Enter/Shift+Enter 提示', async ({ page }) => {
      await expect(page.getByText('Enter 发送 · Shift+Enter 换行')).toBeVisible()
    })
  })
})
