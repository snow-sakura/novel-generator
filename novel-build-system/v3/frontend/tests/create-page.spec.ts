/**
 * 创作页面 E2E 测试
 * 测试表单元素可见性、种子句验证、题材/风格选择、
 * 字数配置、叙事设置、提交按钮
 */
import { test, expect } from '@playwright/test'

test.describe('创作页面', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')
  })

  // ── 页面加载 ──

  test.describe('页面加载与表单元素', () => {
    test('页面加载后所有主要表单元素可见', async ({ page }) => {
      // 页面标题
      await expect(page.getByRole('heading', { name: '创作新小说' })).toBeVisible()

      // 种子句输入框
      await expect(page.getByPlaceholder('例如：一个少年在废弃图书馆发现了一本会发光的书...')).toBeVisible()

      // 频道选择按钮
      await expect(page.getByRole('button', { name: /♂ 男频/ })).toBeVisible()
      await expect(page.getByRole('button', { name: /♀ 女频/ })).toBeVisible()

      // 开始生成按钮
      await expect(page.getByRole('button', { name: /开始生成/ })).toBeVisible()
    })

    test('篇幅选择按钮可见', async ({ page }) => {
      await expect(page.getByRole('button', { name: /短篇/ })).toBeVisible()
      await expect(page.getByRole('button', { name: /中篇/ })).toBeVisible()
      await expect(page.getByRole('button', { name: /长篇/ })).toBeVisible()
    })

    test('章节数滑块存在', async ({ page }) => {
      const slider = page.locator('input[type="range"]')
      await expect(slider).toBeVisible()
    })

    test('叙事设置区域可见', async ({ page }) => {
      await expect(page.getByText('叙事设置')).toBeVisible()
      await expect(page.getByText('叙事视角')).toBeVisible()
      await expect(page.getByText('节奏模式')).toBeVisible()
    })

    test('字数配置区域可见', async ({ page }) => {
      await expect(page.getByText('字数配置')).toBeVisible()
      await expect(page.getByText('章节数')).toBeVisible()
      await expect(page.getByText('目标字数')).toBeVisible()
    })
  })

  // ── 种子句验证 ──

  test.describe('种子句验证', () => {
    test('空种子句提交显示验证错误', async ({ page }) => {
      await page.getByRole('button', { name: /开始生成/ }).click()

      await expect(page.getByText('请输入一句话作为种子')).toBeVisible()
    })

    test('少于4个字的种子句提交显示验证错误', async ({ page }) => {
      await page.getByPlaceholder('例如：一个少年在废弃图书馆发现了一本会发光的书...').fill('你好')
      await page.getByRole('button', { name: /开始生成/ }).click()

      await expect(page.getByText('种子句至少 4 个字')).toBeVisible()
    })

    test('有效种子句不显示验证错误', async ({ page }) => {
      await page.getByPlaceholder('例如：一个少年在废弃图书馆发现了一本会发光的书...').fill('一个少年在废弃图书馆发现了一本会发光的书')
      await page.getByRole('button', { name: /开始生成/ }).click()

      // 不应显示种子句相关的错误
      await expect(page.getByText('请输入一句话作为种子')).not.toBeVisible()
      await expect(page.getByText('种子句至少 4 个字')).not.toBeVisible()
    })
  })

  // ── 频道选择 ──

  test.describe('频道选择', () => {
    test('默认选中男频', async ({ page }) => {
      const maleBtn = page.getByRole('button', { name: /♂ 男频/ })
      await expect(maleBtn).toHaveClass(/gradient-brand/)
    })

    test('点击女频切换选中状态', async ({ page }) => {
      const femaleBtn = page.getByRole('button', { name: /♀ 女频/ })
      await femaleBtn.click()

      await expect(femaleBtn).toHaveClass(/gradient-brand/)
      // 男频应失去高亮
      const maleBtn = page.getByRole('button', { name: /♂ 男频/ })
      await expect(maleBtn).not.toHaveClass(/gradient-brand/)
    })
  })

  // ── 题材选择 ──

  test.describe('题材选择', () => {
    test('默认展开题材面板', async ({ page }) => {
      // 题材 chip 应该可见（默认展开 genres 区域）
      await expect(page.getByText('都市脑洞')).toBeVisible()
    })

    test('点击题材按钮切换选中', async ({ page }) => {
      // 点击另一个题材
      const targetGenre = page.getByRole('button', { name: '都市生活' }).first()
      await targetGenre.click()

      // 该题材应获得 active 样式（orange-500 background）
      await expect(targetGenre).toHaveClass(/bg-orange-500/)
    })
  })

  // ── 风格多选 ──

  test.describe('风格多选', () => {
    test('展开风格面板后显示风格选项', async ({ page }) => {
      // 点击风格 section toggle
      const styleToggle = page.locator('button').filter({ hasText: '风格' }).first()
      await styleToggle.click()

      // 默认选中的风格应该可见
      await expect(page.getByRole('button', { name: '轻松搞笑' }).first()).toBeVisible()
    })

    test('点击多个风格显示标签芯片', async ({ page }) => {
      // 展开风格面板
      const styleToggle = page.locator('button').filter({ hasText: '风格' }).first()
      await styleToggle.click()

      // 点击一个额外的风格
      const extraStyle = page.getByRole('button', { name: '热血爽文' }).first()
      if (await extraStyle.isVisible()) {
        await extraStyle.click()

        // 应该出现芯片标签
        await expect(page.locator('span').filter({ hasText: '热血爽文' }).first()).toBeVisible()
      }
    })
  })

  // ── 篇幅选择 ──

  test.describe('篇幅选择', () => {
    test('默认选中短篇', async ({ page }) => {
      const shortBtn = page.getByRole('button', { name: /短篇/ }).first()
      await expect(shortBtn).toHaveClass(/bg-emerald-500/)
    })

    test('点击中篇切换选中', async ({ page }) => {
      const mediumBtn = page.getByRole('button', { name: /中篇/ }).first()
      await mediumBtn.click()

      await expect(mediumBtn).toHaveClass(/bg-emerald-500/)
    })

    test('点击长篇切换选中', async ({ page }) => {
      const longBtn = page.getByRole('button', { name: /长篇/ }).first()
      await longBtn.click()

      await expect(longBtn).toHaveClass(/bg-emerald-500/)
    })
  })

  // ── 章节数滑块 ──

  test.describe('章节数滑块', () => {
    test('拖动滑块更新章节数显示', async ({ page }) => {
      const slider = page.locator('input[type="range"]')

      // 初始值显示
      await expect(page.locator('text=章').first()).toBeVisible()

      // 修改滑块值
      await slider.fill('10')

      // 应该显示更新后的章节数
      await expect(page.getByText('10 章')).toBeVisible()
    })

    test('目标字数随章节数变化', async ({ page }) => {
      const slider = page.locator('input[type="range"]')

      // 获取初始目标字数
      const initialWordCount = await page.locator('.gradient-text').textContent()

      // 修改章节数
      await slider.fill('20')

      // 目标字数应该更新（不等于初始值）
      const newWordCount = await page.locator('.gradient-text').textContent()
      expect(newWordCount).not.toBe(initialWordCount)
    })
  })

  // ── 叙事设置 ──

  test.describe('叙事设置', () => {
    test('视角下拉框可选择不同选项', async ({ page }) => {
      const povSelect = page.locator('select').filter({ hasText: '第一人称' })
      await expect(povSelect).toBeVisible()

      // 切换到第三人称
      await povSelect.selectOption('第三人称有限')
      await expect(povSelect).toHaveValue('第三人称有限')
    })

    test('节奏模式按钮可切换', async ({ page }) => {
      // 点击紧凑型
      const compactBtn = page.getByRole('button', { name: /紧凑/ }).first()
      await compactBtn.click()
      await expect(compactBtn).toHaveClass(/bg-orange-500/)
    })

    test('叙事张力复选框可切换', async ({ page }) => {
      const suspenseCheckbox = page.locator('input[type="checkbox"]').first()
      await expect(suspenseCheckbox).toBeVisible()

      // 初始状态
      const initialState = await suspenseCheckbox.isChecked()

      // 切换
      await suspenseCheckbox.click()
      expect(await suspenseCheckbox.isChecked()).toBe(!initialState)
    })

    test('结局类型按钮可切换', async ({ page }) => {
      // 滚动到底部确保结局类型可见
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))

      const happyEndBtn = page.getByRole('button', { name: '好结局' }).first()
      if (await happyEndBtn.isVisible()) {
        await happyEndBtn.click()
        await expect(happyEndBtn).toHaveClass(/bg-rose-500/)
      }
    })
  })

  // ── 开始生成按钮 ──

  test.describe('开始生成按钮', () => {
    test('按钮始终可见且可点击', async ({ page }) => {
      const submitBtn = page.getByRole('button', { name: /开始生成/ })
      await expect(submitBtn).toBeVisible()
      await expect(submitBtn).toBeEnabled()
    })

    test('按钮包含正确的文字', async ({ page }) => {
      const submitBtn = page.getByRole('button', { name: /开始生成/ })
      await expect(submitBtn).toContainText('开始生成')
    })
  })
})
