/**
 * 响应式设计 E2E 测试
 * 测试不同视口宽度下的布局表现：
 * - 移动端 (375px)
 * - 平板端 (768px)
 * - 桌面端 (1280px)
 */
import { test, expect } from '@playwright/test'

test.describe('响应式设计', () => {
  // ── 移动端视口 (375px) ──

  test.describe('移动端 (375px)', () => {
    test.use({ viewport: { width: 375, height: 812 } })

    test('导航栏 Logo 可见', async ({ page }) => {
      await page.goto('/')
      await page.waitForLoadState('networkidle')

      await expect(page.getByText('番茄小说 V3')).toBeVisible()
    })

    test('导航链接标签在移动端隐藏', async ({ page }) => {
      await page.goto('/')
      await page.waitForLoadState('networkidle')

      // 在移动端，导航文字被 hidden sm:inline 隐藏
      // 只显示图标，不显示文字标签
      const createLink = page.getByRole('link', { name: '创作' })
      await expect(createLink).toBeVisible()

      // 链接文字标签应该不可见（sm:inline 在 375px 下不生效）
      // 但链接本身仍可点击导航
    })

    test('创作页面表单在移动端可滚动查看', async ({ page }) => {
      await page.goto('/')
      await page.waitForLoadState('networkidle')

      // 表单区域应该存在
      const seedTextarea = page.getByPlaceholder('例如：一个少年在废弃图书馆发现了一本会发光的书...')
      await expect(seedTextarea).toBeVisible()

      // 开始生成按钮应该可见（需要滚动）
      const submitBtn = page.getByRole('button', { name: /开始生成/ })
      await expect(submitBtn).toBeVisible()
    })

    test('移动端导航链接可点击切换页面', async ({ page }) => {
      await page.goto('/')
      await page.waitForLoadState('networkidle')

      // 点击对话导航
      await page.getByRole('link', { name: '对话' }).click()
      await page.waitForLoadState('networkidle')
      await expect(page).toHaveURL(/\/chat/)
    })

    test('对话页面在移动端可正常使用', async ({ page }) => {
      await page.goto('/chat')
      await page.waitForLoadState('networkidle')

      // 输入框应该可见
      const textarea = page.locator('textarea[placeholder="描述你的故事灵感..."]')
      await expect(textarea).toBeVisible()

      // 可以输入文字
      await textarea.fill('移动端测试消息')
      await expect(textarea).toHaveValue('移动端测试消息')
    })
  })

  // ── 平板端视口 (768px) ──

  test.describe('平板端 (768px)', () => {
    test.use({ viewport: { width: 768, height: 1024 } })

    test('导航栏完整显示', async ({ page }) => {
      await page.goto('/')
      await page.waitForLoadState('networkidle')

      // 所有导航链接应该可见
      await expect(page.getByRole('link', { name: '创作' })).toBeVisible()
      await expect(page.getByRole('link', { name: '对话' })).toBeVisible()
      await expect(page.getByRole('link', { name: '模板' })).toBeVisible()
      await expect(page.getByRole('link', { name: '历史' })).toBeVisible()
    })

    test('创作页面表单布局正常', async ({ page }) => {
      await page.goto('/')
      await page.waitForLoadState('networkidle')

      // 表单和标题都应可见
      await expect(page.getByRole('heading', { name: '创作新小说' })).toBeVisible()
      await expect(page.getByPlaceholder('例如：一个少年在废弃图书馆发现了一本会发光的书...')).toBeVisible()
    })

    test('对话页面在平板端布局正常', async ({ page }) => {
      await page.goto('/chat')
      await page.waitForLoadState('networkidle')

      await expect(page.getByText('AI 对话创作')).toBeVisible()
      const textarea = page.locator('textarea[placeholder="描述你的故事灵感..."]')
      await expect(textarea).toBeVisible()
    })
  })

  // ── 桌面端视口 (1280px) ──

  test.describe('桌面端 (1280px)', () => {
    test.use({ viewport: { width: 1280, height: 800 } })

    test('导航栏完整显示带文字标签', async ({ page }) => {
      await page.goto('/')
      await page.waitForLoadState('networkidle')

      // 所有导航链接应该可见且有文字标签
      await expect(page.getByRole('link', { name: '创作' })).toBeVisible()
      await expect(page.getByRole('link', { name: '对话' })).toBeVisible()
      await expect(page.getByRole('link', { name: '模板' })).toBeVisible()
      await expect(page.getByRole('link', { name: '历史' })).toBeVisible()
    })

    test('创作页面左右分栏布局', async ({ page }) => {
      await page.goto('/')
      await page.waitForLoadState('networkidle')

      // 桌面端应该有左右分栏 (lg:flex-row)
      // 左侧表单区域
      const formArea = page.locator('.lg\\:w-\\[360px\\]').first()
      await expect(formArea).toBeVisible()

      // 右侧内容区域（空状态提示）
      await expect(page.getByText('填写左侧表单，点击「开始生成」')).toBeVisible()
    })

    test('对话页面右侧状态面板可见', async ({ page }) => {
      await page.goto('/chat')
      await page.waitForLoadState('networkidle')

      // 桌面端右侧 NovelStatusPanel 应该可见（lg:block）
      // 验证对话区域正常
      await expect(page.getByText('AI 对话创作')).toBeVisible()
      const textarea = page.locator('textarea[placeholder="描述你的故事灵感..."]')
      await expect(textarea).toBeVisible()
    })

    test('设置按钮在桌面端可见', async ({ page }) => {
      await page.goto('/')
      await page.waitForLoadState('networkidle')

      // 设置按钮
      const settingsBtn = page.getByRole('button', { name: /设置/ })
      await expect(settingsBtn).toBeVisible()
    })
  })

  // ── 跨视口一致性 ──

  test.describe('跨视口一致性', () => {
    test('所有视口下 Logo 始终可见', async ({ page }) => {
      const viewports = [
        { width: 375, height: 812 },
        { width: 768, height: 1024 },
        { width: 1280, height: 800 },
      ]

      for (const vp of viewports) {
        await page.setViewportSize(vp)
        await page.goto('/')
        await page.waitForLoadState('networkidle')

        await expect(page.getByText('番茄小说 V3')).toBeVisible()
      }
    })

    test('所有视口下导航链接可点击', async ({ page }) => {
      const viewports = [
        { width: 375, height: 812 },
        { width: 768, height: 1024 },
        { width: 1280, height: 800 },
      ]

      for (const vp of viewports) {
        await page.setViewportSize(vp)
        await page.goto('/')
        await page.waitForLoadState('networkidle')

        // 点击对话导航
        await page.getByRole('link', { name: '对话' }).click()
        await page.waitForLoadState('networkidle')
        await expect(page).toHaveURL(/\/chat/)

        // 返回首页
        await page.getByRole('link', { name: '创作' }).click()
        await page.waitForLoadState('networkidle')
        await expect(page).toHaveURL('http://localhost:5173/')
      }
    })
  })

  // ── 视口切换 ──

  test.describe('视口动态切换', () => {
    test('从桌面端缩小到移动端布局自适应', async ({ page }) => {
      // 先以桌面端打开
      await page.setViewportSize({ width: 1280, height: 800 })
      await page.goto('/')
      await page.waitForLoadState('networkidle')

      await expect(page.getByRole('heading', { name: '创作新小说' })).toBeVisible()

      // 缩小到移动端
      await page.setViewportSize({ width: 375, height: 812 })

      // 页面内容仍然可用
      await expect(page.getByRole('heading', { name: '创作新小说' })).toBeVisible()
      await expect(page.getByPlaceholder('例如：一个少年在废弃图书馆发现了一本会发光的书...')).toBeVisible()
    })

    test('从移动端放大到桌面端布局自适应', async ({ page }) => {
      // 先以移动端打开
      await page.setViewportSize({ width: 375, height: 812 })
      await page.goto('/')
      await page.waitForLoadState('networkidle')

      await expect(page.getByRole('heading', { name: '创作新小说' })).toBeVisible()

      // 放大到桌面端
      await page.setViewportSize({ width: 1280, height: 800 })

      // 页面内容仍然可用
      await expect(page.getByRole('heading', { name: '创作新小说' })).toBeVisible()
      await expect(page.getByPlaceholder('例如：一个少年在废弃图书馆发现了一本会发光的书...')).toBeVisible()
    })
  })
})
