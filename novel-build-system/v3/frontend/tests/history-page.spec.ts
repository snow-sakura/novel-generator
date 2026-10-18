/**
 * 历史页面 E2E 测试（对齐 v3.1 当前 UI）
 * - 标题「创作历史」；Tab：已完成小说 / 生成记录（下划线高亮样式）
 * - 数据经 page.route 精准控制（空/有数据），不依赖真实后端
 */
import { test, expect, type Page } from '@playwright/test'

const NOVEL = {
  id: 1, title: '星穹残响', gender: '男频', genre: '科幻星际', style: '热血爽文',
  word_count: 3000, actual_count: 3215, model_used: 'mimo-v2.5-free',
  created_at: '2026-08-01T10:00:00', status: 'completed',
}
const RECORD = {
  id: 9, seed_text: '一个测试种子句', status: 'running', chapters_done: 1, chapters_total: 3,
  gender: '男频', genre: '玄幻奇幻', style: '热血爽文', model_used: 'mimo-v2.5-free',
  created_at: '2026-08-02T10:00:00',
}

/** 在 goto 之前调用，拦截列表接口以控制空/非空状态 */
async function mockLists(page: Page, opts: { novels?: unknown[]; records?: unknown[] } = {}) {
  const novels = opts.novels ?? [NOVEL]
  const records = opts.records ?? []
  await page.route('**/api/v3/novels**', route =>
    route.fulfill({ contentType: 'application/json', body: JSON.stringify({ total: novels.length, page: 1, size: 10, items: novels }) }))
  await page.route('**/api/v3/records**', route =>
    route.fulfill({ contentType: 'application/json', body: JSON.stringify({ total: records.length, page: 1, size: 20, items: records }) }))
  // 记录状态轮询保持完成态，避免 running 记录引发轮询
  await page.route('**/api/v3/records/**/status', route =>
    route.fulfill({ contentType: 'application/json', body: JSON.stringify({ status: 'completed', completed_chapters: 3, total_chapters: 3 }) }))
}

test.describe('历史页面', () => {

  // ── 页面加载 ──

  test.describe('页面加载', () => {
    test('历史页面正确加载（标题「创作历史」）', async ({ page }) => {
      await mockLists(page)
      await page.goto('/history')
      await page.waitForLoadState('networkidle')
      await expect(page.getByRole('heading', { name: '创作历史' })).toBeVisible()
    })

    test('页面显示 Tab 切换按钮', async ({ page }) => {
      await mockLists(page)
      await page.goto('/history')
      await page.waitForLoadState('networkidle')
      await expect(page.getByRole('button', { name: /已完成小说/ })).toBeVisible()
      await expect(page.getByRole('button', { name: /生成记录/ })).toBeVisible()
    })

    test('显示页面描述（已完成 N 部 · 共 N 条生成记录）', async ({ page }) => {
      await mockLists(page, { novels: [NOVEL], records: [RECORD] })
      await page.goto('/history')
      await page.waitForLoadState('networkidle')
      await expect(page.getByText(/已完成 1 部 · 共 1 条生成记录/)).toBeVisible()
    })
  })

  // ── 小说列表 / 空状态 ──

  test.describe('小说 Tab', () => {
    test('有数据时渲染小说卡片', async ({ page }) => {
      await mockLists(page, { novels: [NOVEL] })
      await page.goto('/history')
      await page.waitForLoadState('networkidle')
      await expect(page.getByText('星穹残响')).toBeVisible()
    })

    test('无数据时显示空状态', async ({ page }) => {
      await mockLists(page, { novels: [] })
      await page.goto('/history')
      await page.waitForLoadState('networkidle')
      await expect(page.getByText('还没有创作过小说')).toBeVisible()
      await expect(page.getByText('点击下方按钮开始你的第一篇创作')).toBeVisible()
    })

    test('空状态有「开始创作」按钮并可点击', async ({ page }) => {
      await mockLists(page, { novels: [] })
      await page.goto('/history')
      await page.waitForLoadState('networkidle')
      const startBtn = page.getByRole('button', { name: /开始创作/ })
      await expect(startBtn).toBeVisible()
    })

    test('点击「开始创作」跳转到创作页面', async ({ page }) => {
      await mockLists(page, { novels: [] })
      await page.goto('/history')
      await page.waitForLoadState('networkidle')
      await page.getByRole('button', { name: /开始创作/ }).click()
      await page.waitForLoadState('networkidle')
      await expect(page).toHaveURL(/\/$/)
    })
  })

  // ── Tab 切换 ──

  test.describe('Tab 切换', () => {
    test('默认选中「已完成小说」tab（下划线高亮）', async ({ page }) => {
      await mockLists(page)
      await page.goto('/history')
      await page.waitForLoadState('networkidle')
      await expect(page.getByRole('button', { name: /已完成小说/ }))
        .toHaveClass(/border-orange-500/)
    })

    test('点击「生成记录」tab 切换并高亮', async ({ page }) => {
      await mockLists(page, { records: [RECORD] })
      await page.goto('/history')
      await page.waitForLoadState('networkidle')
      const recordTab = page.getByRole('button', { name: /生成记录/ })
      await recordTab.click()
      await expect(recordTab).toHaveClass(/border-orange-500/)
    })

    test('记录 tab 无数据显示「暂无生成记录」', async ({ page }) => {
      await mockLists(page, { records: [] })
      await page.goto('/history')
      await page.waitForLoadState('networkidle')
      await page.getByRole('button', { name: /生成记录/ }).click()
      await expect(page.getByText('暂无生成记录')).toBeVisible()
      await expect(page.getByText('每次生成小说都会在这里留下记录')).toBeVisible()
    })
  })

  // ── 加载状态 ──

  test('加载后无加载动画残留', async ({ page }) => {
    await mockLists(page)
    await page.goto('/history')
    await page.waitForLoadState('networkidle')
    await expect(page.locator('.animate-spin')).toHaveCount(0)
  })
})
