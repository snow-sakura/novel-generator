/**
 * 导航功能 E2E 测试
 * 测试所有页面导航链接、路由跳转、浏览器前进后退
 */
import { test, expect } from '@playwright/test'

test.describe('页面导航', () => {
  // ── 导航链接 ──

  test.describe('导航链接', () => {
    test('所有导航链接可见且可点击', async ({ page }) => {
      await page.goto('/')
      await page.waitForLoadState('networkidle')

      // 验证四个导航链接都存在
      await expect(page.getByRole('link', { name: '创作' })).toBeVisible()
      await expect(page.getByRole('link', { name: '对话' })).toBeVisible()
      await expect(page.getByRole('link', { name: '模板' })).toBeVisible()
      await expect(page.getByRole('link', { name: '历史' })).toBeVisible()
    })

    test('点击「对话」导航到 /chat', async ({ page }) => {
      await page.goto('/')
      await page.waitForLoadState('networkidle')

      await page.getByRole('link', { name: '对话' }).click()
      await page.waitForLoadState('networkidle')
      await expect(page).toHaveURL(/\/chat/)
    })

    test('点击「模板」导航到 /prompts', async ({ page }) => {
      await page.goto('/')
      await page.waitForLoadState('networkidle')

      await page.getByRole('link', { name: '模板' }).click()
      await page.waitForLoadState('networkidle')
      await expect(page).toHaveURL(/\/prompts/)
    })

    test('点击「历史」导航到 /history', async ({ page }) => {
      await page.goto('/')
      await page.waitForLoadState('networkidle')

      await page.getByRole('link', { name: '历史' }).click()
      await page.waitForLoadState('networkidle')
      await expect(page).toHaveURL(/\/history/)
    })

    test('点击「创作」导航回 /', async ({ page }) => {
      await page.goto('/history')
      await page.waitForLoadState('networkidle')

      await page.getByRole('link', { name: '创作' }).click()
      await page.waitForLoadState('networkidle')
      await expect(page).toHaveURL('http://localhost:5173/')
    })
  })

  // ── 页面标题与内容 ──

  test.describe('页面标题与内容', () => {
    test('创作页面显示「创作新小说」标题', async ({ page }) => {
      await page.goto('/')
      await page.waitForLoadState('networkidle')

      await expect(page.getByRole('heading', { name: '创作新小说' })).toBeVisible()
    })

    test('对话页面显示「AI 对话创作」标题', async ({ page }) => {
      await page.goto('/chat')
      await page.waitForLoadState('networkidle')

      await expect(page.getByText('AI 对话创作')).toBeVisible()
    })

    test('模板页面显示「原始 Prompt 模板参考」标题', async ({ page }) => {
      await page.goto('/prompts')
      await page.waitForLoadState('networkidle')

      await expect(page.getByRole('heading', { name: '原始 Prompt 模板参考' })).toBeVisible()
    })

    test('历史页面显示「生成历史」标题', async ({ page }) => {
      await page.goto('/history')
      await page.waitForLoadState('networkidle')

      await expect(page.getByRole('heading', { name: '生成历史' })).toBeVisible()
    })
  })

  // ── 活跃导航链接高亮 ──

  test.describe('活跃导航链接高亮', () => {
    test('当前页面的导航链接有 gradient-brand 样式', async ({ page }) => {
      await page.goto('/')
      await page.waitForLoadState('networkidle')

      const createLink = page.getByRole('link', { name: '创作' })
      await expect(createLink).toHaveClass(/gradient-brand/)
    })

    test('切换页面后高亮跟随变化', async ({ page }) => {
      await page.goto('/')
      await page.waitForLoadState('networkidle')

      // 创作链接应该高亮
      const createLink = page.getByRole('link', { name: '创作' })
      await expect(createLink).toHaveClass(/gradient-brand/)

      // 点击对话
      await page.getByRole('link', { name: '对话' }).click()
      await page.waitForLoadState('networkidle')

      // 对话链接应该高亮
      const chatLink = page.getByRole('link', { name: '对话' })
      await expect(chatLink).toHaveClass(/gradient-brand/)
    })
  })

  // ── 浏览器前进后退 ──

  test.describe('浏览器前进后退', () => {
    test('浏览器后退按钮返回上一页', async ({ page }) => {
      await page.goto('/')
      await page.waitForLoadState('networkidle')

      await page.getByRole('link', { name: '对话' }).click()
      await page.waitForLoadState('networkidle')
      await expect(page).toHaveURL(/\/chat/)

      // 后退
      await page.goBack()
      await page.waitForLoadState('networkidle')
      await expect(page).toHaveURL('http://localhost:5173/')
    })

    test('浏览器前进按钮返回下一页', async ({ page }) => {
      await page.goto('/')
      await page.waitForLoadState('networkidle')

      await page.getByRole('link', { name: '对话' }).click()
      await page.waitForLoadState('networkidle')

      // 后退
      await page.goBack()
      await page.waitForLoadState('networkidle')
      await expect(page).toHaveURL('http://localhost:5173/')

      // 前进
      await page.goForward()
      await page.waitForLoadState('networkidle')
      await expect(page).toHaveURL(/\/chat/)
    })

    test('多次导航后可连续后退', async ({ page }) => {
      await page.goto('/')
      await page.waitForLoadState('networkidle')

      await page.getByRole('link', { name: '对话' }).click()
      await page.waitForLoadState('networkidle')

      await page.getByRole('link', { name: '历史' }).click()
      await page.waitForLoadState('networkidle')
      await expect(page).toHaveURL(/\/history/)

      // 后退两次回到首页
      await page.goBack()
      await page.waitForLoadState('networkidle')
      await expect(page).toHaveURL(/\/chat/)

      await page.goBack()
      await page.waitForLoadState('networkidle')
      await expect(page).toHaveURL('http://localhost:5173/')
    })
  })

  // ── Logo 点击回首页 ──

  test.describe('Logo 导航', () => {
    test('点击 Logo 回到首页', async ({ page }) => {
      await page.goto('/history')
      await page.waitForLoadState('networkidle')

      await page.getByText('番茄小说 V3').click()
      await page.waitForLoadState('networkidle')
      await expect(page).toHaveURL('http://localhost:5173/')
    })
  })
})
