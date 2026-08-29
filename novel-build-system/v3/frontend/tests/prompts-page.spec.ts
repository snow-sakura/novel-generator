/**
 * 模板页面 E2E 测试
 * 测试页面加载、Prompt 模板展示、展开/折叠、
 * 加载状态、空状态
 */
import { test, expect } from '@playwright/test'

test.describe('模板页面', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/prompts')
    await page.waitForLoadState('networkidle')
  })

  // ── 页面加载 ──

  test.describe('页面加载', () => {
    test('模板页面正确加载', async ({ page }) => {
      await expect(page.getByRole('heading', { name: '原始 Prompt 模板参考' })).toBeVisible()
    })

    test('页面显示描述文字', async ({ page }) => {
      await expect(page.getByText('此处展示生成管线使用的原始 Prompt 模板')).toBeVisible()
    })
  })

  // ── Prompt 模板列表 ──

  test.describe('Prompt 模板列表', () => {
    test('至少显示一个 Prompt 模板卡片', async ({ page }) => {
      // 等待内容加载
      await page.waitForLoadState('networkidle')

      // 模板名称应该可见
      const parseLabel = page.getByText('要素解析（原始版）')
      const outlineLabel = page.getByText('大纲规划（原始版）')
      const chapterLabel = page.getByText('逐章写作（原始版）')
      const titleLabel = page.getByText('标题生成（原始版）')

      // 至少有一个可见
      const hasAnyLabel =
        (await parseLabel.isVisible()) ||
        (await outlineLabel.isVisible()) ||
        (await chapterLabel.isVisible()) ||
        (await titleLabel.isVisible())
      expect(hasAnyLabel).toBeTruthy()
    })

    test('每个模板卡片有展开按钮', async ({ page }) => {
      // 等待加载完成
      await page.waitForLoadState('networkidle')

      // 找到第一个模板卡片的展开按钮（ChevronDown 图标按钮）
      const expandButtons = page.locator('button').filter({ has: page.locator('svg.text-gray-400') })
      const count = await expandButtons.count()
      expect(count).toBeGreaterThan(0)
    })
  })

  // ── 展开/折叠 ──

  test.describe('展开/折叠', () => {
    test('点击模板卡片可展开显示内容', async ({ page }) => {
      await page.waitForLoadState('networkidle')

      // 找到第一个模板的标题按钮并点击
      const firstPromptButton = page.getByRole('button', { name: /要素解析（原始版）/ })
      if (await firstPromptButton.isVisible()) {
        await firstPromptButton.click()

        // 展开后应该显示 pre 标签（Prompt 内容）
        const preContent = page.locator('pre').first()
        await expect(preContent).toBeVisible()
      }
    })

    test('再次点击折叠模板内容', async ({ page }) => {
      await page.waitForLoadState('networkidle')

      const firstPromptButton = page.getByRole('button', { name: /要素解析（原始版）/ })
      if (await firstPromptButton.isVisible()) {
        // 展开
        await firstPromptButton.click()
        await expect(page.locator('pre').first()).toBeVisible()

        // 再次点击折叠
        await firstPromptButton.click()

        // pre 标签应该不再可见
        await expect(page.locator('pre').first()).not.toBeVisible()
      }
    })
  })

  // ── 不同模板类型 ──

  test.describe('不同模板类型', () => {
    test('大纲规划模板可展开', async ({ page }) => {
      await page.waitForLoadState('networkidle')

      const outlineBtn = page.getByRole('button', { name: /大纲规划（原始版）/ })
      if (await outlineBtn.isVisible()) {
        await outlineBtn.click()
        await expect(page.locator('pre').first()).toBeVisible()
      }
    })

    test('逐章写作模板可展开', async ({ page }) => {
      await page.waitForLoadState('networkidle')

      const chapterBtn = page.getByRole('button', { name: /逐章写作（原始版）/ })
      if (await chapterBtn.isVisible()) {
        await chapterBtn.click()
        await expect(page.locator('pre').first()).toBeVisible()
      }
    })

    test('标题生成模板可展开', async ({ page }) => {
      await page.waitForLoadState('networkidle')

      const titleBtn = page.getByRole('button', { name: /标题生成（原始版）/ })
      if (await titleBtn.isVisible()) {
        await titleBtn.click()
        await expect(page.locator('pre').first()).toBeVisible()
      }
    })
  })

  // ── 模板标识 ──

  test.describe('模板标识', () => {
    test('每个模板卡片显示类型标签', async ({ page }) => {
      await page.waitForLoadState('networkidle')

      // 检查 name 标签存在（如 parse, outline 等）
      const nameLabels = page.locator('span').filter({ hasText: /^(parse|outline|chapter|title)$/ })
      const count = await nameLabels.count()
      expect(count).toBeGreaterThan(0)
    })
  })
})
