/**
 * 历史页面 E2E 测试
 * 测试页面加载、空状态、Tab 切换、刷新行为
 */
import { test, expect } from '@playwright/test'

test.describe('历史页面', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/history')
    await page.waitForLoadState('networkidle')
  })

  // ── 页面加载 ──

  test.describe('页面加载', () => {
    test('历史页面正确加载', async ({ page }) => {
      await expect(page.getByRole('heading', { name: '生成历史' })).toBeVisible()
    })

    test('页面显示 Tab 切换按钮', async ({ page }) => {
      // 小说 tab
      await expect(page.getByRole('button', { name: /小说/ }).first()).toBeVisible()
      // 记录 tab
      await expect(page.getByRole('button', { name: /记录/ }).first()).toBeVisible()
    })
  })

  // ── 空状态 ──

  test.describe('空状态', () => {
    test('默认小说 tab 显示空状态', async ({ page }) => {
      // 确认在小说 tab（默认）
      const novelTab = page.getByRole('button', { name: /小说/ }).first()
      await expect(novelTab).toBeVisible()

      // 空状态提示
      await expect(page.getByText('还没有创作过小说')).toBeVisible()
      await expect(page.getByText('点击下方按钮开始你的第一篇创作')).toBeVisible()
    })

    test('空状态有「开始创作」按钮', async ({ page }) => {
      const startBtn = page.getByRole('button', { name: /开始创作/ })
      await expect(startBtn).toBeVisible()
    })

    test('点击「开始创作」跳转到创作页面', async ({ page }) => {
      const startBtn = page.getByRole('button', { name: /开始创作/ })
      await startBtn.click()
      await page.waitForLoadState('networkidle')

      await expect(page).toHaveURL('http://localhost:5173/')
    })

    test('切换到记录 tab 显示空状态', async ({ page }) => {
      // 点击记录 tab
      const recordTab = page.getByRole('button', { name: /记录/ }).first()
      await recordTab.click()

      // 等待加载完成
      await page.waitForLoadState('networkidle')

      // 空状态提示
      await expect(page.getByText('暂无生成记录')).toBeVisible()
      await expect(page.getByText('每次生成小说都会在这里留下记录')).toBeVisible()
    })
  })

  // ── Tab 切换 ──

  test.describe('Tab 切换', () => {
    test('默认选中小说 tab', async ({ page }) => {
      const novelTab = page.getByRole('button', { name: /小说/ }).first()
      await expect(novelTab).toHaveClass(/bg-orange-500/)
    })

    test('点击记录 tab 切换内容', async ({ page }) => {
      const recordTab = page.getByRole('button', { name: /记录/ }).first()
      await recordTab.click()

      // 记录 tab 应该高亮
      await expect(recordTab).toHaveClass(/bg-orange-500/)
    })
  })

  // ── 页面内容 ──

  test.describe('页面内容', () => {
    test('显示页面标题和描述', async ({ page }) => {
      await expect(page.getByRole('heading', { name: '生成历史' })).toBeVisible()
      await expect(page.getByText('管理你的创作记录')).toBeVisible()
    })

    test('加载后无加载动画残留', async ({ page }) => {
      // 等待加载完成
      await page.waitForLoadState('networkidle')

      // 加载动画应该消失
      const spinner = page.locator('.animate-spin')
      await expect(spinner).not.toBeVisible()
    })
  })
})
