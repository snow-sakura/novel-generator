import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'

// ============================================================
// Mocks — must be declared before all imports
// ============================================================

/** Mock all API services used by the 4 pages */
vi.mock('../../lib/api-service', () => ({
  userApi: {
    list: vi.fn().mockResolvedValue({
      data: { items: [], total: 0, page: 1, page_size: 20, total_pages: 0 },
    }),
    delete: vi.fn(),
    updateStatus: vi.fn(),
  },
  settingsApi: {
    list: vi.fn().mockResolvedValue({ data: [] }),
    update: vi.fn(),
  },
  agentApi: {
    requirementsAnalyze: vi
      .fn()
      .mockResolvedValue({ data: { execution_id: 1, status: 'running' } }),
    requirementsStatus: vi
      .fn()
      .mockResolvedValue({ data: { execution_id: 1, status: 'running' } }),
    requirementsResult: vi
      .fn()
      .mockResolvedValue({ data: { execution_id: 1, status: 'completed', result: null } }),
  },
  functionalTestApi: {
    list: vi.fn().mockResolvedValue({
      data: { items: [], total: 0, page: 1, page_size: 20, total_pages: 0 },
    }),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    run: vi.fn(),
  },
  smokeTestApi: {
    list: vi.fn().mockResolvedValue({
      data: { items: [], total: 0, page: 1, page_size: 20, total_pages: 0 },
    }),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    updateAutoTrigger: vi.fn(),
  },
}))

/** Mock framer-motion: motion.div → plain <div>, AnimatePresence → render children directly */
vi.mock('framer-motion', () => ({
  motion: { div: 'div' },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}))

/** Mock lucide-react: all icons render as null (decorative only, we test text content) */
vi.mock('lucide-react', () => {
  const iconNames = [
    'Trash2',
    'Shield',
    'User',
    'ToggleLeft',
    'Save',
    'Loader2',
    'FileText',
    'Target',
    'AlertTriangle',
    'Clock',
    'Brain',
    'Send',
    'Plus',
    'Edit2',
    'X',
    'Play',
    'CheckCircle2',
    'XCircle',
    'Bell',
    'Globe',
    'ToggleRight',
  ]
  const mock: Record<string, () => null> = {}
  iconNames.forEach((name) => {
    mock[name] = () => null
  })
  return mock
})

// ============================================================
// Imports (components under test)
// ============================================================
import AuthSecurityPage from '../auth/AuthSecurityPage'
import RequirementsAgentPage from '../agent-requirements/RequirementsAgentPage'
import FunctionalTestPage from '../test-functional/FunctionalTestPage'
import SmokeTestPage from '../test-smoke/SmokeTestPage'

// ============================================================
// Helpers
// ============================================================
beforeEach(() => {
  vi.clearAllMocks()
})

// ============================================================
// AuthSecurityPage
// ============================================================
describe('AuthSecurityPage（认证与安全设置页面）', () => {
  it('应该正常渲染，不崩溃', () => {
    const { container } = render(<AuthSecurityPage />)
    expect(container).toBeTruthy()
  })

  it('应该显示"用户管理"和"安全设置"两个Tab', () => {
    render(<AuthSecurityPage />)
    expect(screen.getByText('用户管理')).toBeInTheDocument()
    expect(screen.getByText('安全设置')).toBeInTheDocument()
  })

  it('默认应激活"用户管理"Tab', () => {
    render(<AuthSecurityPage />)
    // 用户管理Tab下应显示"共 0 个用户"
    expect(screen.getByText(/共 0 个用户/)).toBeInTheDocument()
  })

  it('点击"安全设置"Tab 后应切换到安全设置面板', async () => {
    render(<AuthSecurityPage />)
    // 点击安全设置Tab
    fireEvent.click(screen.getByText('安全设置'))
    // 安全设置面板包含描述文字
    expect(
      screen.getByText('配置系统安全策略，包括密码策略、会话管理和访问控制'),
    ).toBeInTheDocument()
  })

  it('点击"用户管理"Tab 应切回用户列表', () => {
    render(<AuthSecurityPage />)
    // 先切到安全设置
    fireEvent.click(screen.getByText('安全设置'))
    expect(
      screen.getByText('配置系统安全策略，包括密码策略、会话管理和访问控制'),
    ).toBeInTheDocument()

    // 切回用户管理
    fireEvent.click(screen.getByText('用户管理'))
    expect(screen.getByText(/共 0 个用户/)).toBeInTheDocument()
  })

  it('页面挂载时自动调用 userApi.list 和 settingsApi.list', async () => {
    const { userApi, settingsApi } = await import('../../lib/api-service')
    render(<AuthSecurityPage />)
    await waitFor(() => {
      expect(userApi.list).toHaveBeenCalledTimes(1)
      expect(settingsApi.list).toHaveBeenCalledTimes(1)
    })
  })
})

// ============================================================
// RequirementsAgentPage
// ============================================================
describe('RequirementsAgentPage（需求分析智能体页面）', () => {
  it('应该正常渲染，不崩溃', () => {
    const { container } = render(<RequirementsAgentPage />)
    expect(container).toBeTruthy()
  })

  it('应该显示标题"需求分析智能体"', () => {
    render(<RequirementsAgentPage />)
    expect(screen.getByText('需求分析智能体')).toBeInTheDocument()
  })

  it('应该显示描述文字', () => {
    render(<RequirementsAgentPage />)
    expect(
      screen.getByText(/输入需求描述，AI 将自动分析并提取测试项/),
    ).toBeInTheDocument()
  })

  it('应该显示需求描述文本输入框', () => {
    render(<RequirementsAgentPage />)
    const textarea = screen.getByPlaceholderText(/例如：用户登录模块/)
    expect(textarea).toBeInTheDocument()
    expect(textarea.tagName).toBe('TEXTAREA')
  })

  it('应该显示"分析"按钮', () => {
    render(<RequirementsAgentPage />)
    const btn = screen.getByRole('button', { name: '分析' })
    expect(btn).toBeInTheDocument()
  })

  it('文本输入框为空时"分析"按钮应被禁用', () => {
    render(<RequirementsAgentPage />)
    const btn = screen.getByRole('button', { name: '分析' })
    expect(btn).toBeDisabled()
  })

  it('输入文本后"分析"按钮应可用', () => {
    render(<RequirementsAgentPage />)
    const textarea = screen.getByPlaceholderText(/例如：用户登录模块/)
    fireEvent.change(textarea, { target: { value: '测试需求描述' } })
    const btn = screen.getByRole('button', { name: '分析' })
    expect(btn).toBeEnabled()
  })
})

// ============================================================
// FunctionalTestPage
// ============================================================
describe('FunctionalTestPage（功能测试用例页面）', () => {
  it('应该正常渲染，不崩溃', () => {
    const { container } = render(<FunctionalTestPage />)
    expect(container).toBeTruthy()
  })

  it('应该显示"用例管理"和"用例执行"两个Tab', () => {
    render(<FunctionalTestPage />)
    expect(screen.getByText('用例管理')).toBeInTheDocument()
    expect(screen.getByText('用例执行')).toBeInTheDocument()
  })

  it('默认Tab下应显示"添加用例"按钮', () => {
    render(<FunctionalTestPage />)
    expect(screen.getByText('添加用例')).toBeInTheDocument()
  })

  it('点击"添加用例"按钮应打开弹窗', () => {
    render(<FunctionalTestPage />)
    fireEvent.click(screen.getByText('添加用例'))
    // 弹窗标题-按钮和弹窗标题同时存在
    const addTexts = screen.getAllByText('添加用例')
    expect(addTexts.length).toBeGreaterThanOrEqual(2)
    // 弹窗中有标题输入框（通过 role 查找）
    expect(screen.getByDisplayValue('')).toBeInTheDocument()
    // 弹窗中有所属模块选择框
    expect(screen.getByText('所属模块')).toBeInTheDocument()
    // 包含保存和取消按钮
    expect(screen.getByText('保存')).toBeInTheDocument()
    expect(screen.getByText('取消')).toBeInTheDocument()
  })

  it('点击"用例执行"Tab 应切换到执行面板', () => {
    render(<FunctionalTestPage />)
    fireEvent.click(screen.getByText('用例执行'))
    // 统计卡片
    expect(screen.getByText('用例总数')).toBeInTheDocument()
    expect(screen.getByText('通过率')).toBeInTheDocument()
    expect(screen.getByText('失败数')).toBeInTheDocument()
  })

  it('用例执行面板应显示"执行"按钮', () => {
    render(<FunctionalTestPage />)
    fireEvent.click(screen.getByText('用例执行'))
    expect(screen.getByText('执行')).toBeInTheDocument()
  })

  it('页面挂载时自动调用 functionalTestApi.list', async () => {
    const { functionalTestApi } = await import('../../lib/api-service')
    render(<FunctionalTestPage />)
    await waitFor(() => {
      expect(functionalTestApi.list).toHaveBeenCalledTimes(1)
    })
  })
})

// ============================================================
// SmokeTestPage
// ============================================================
describe('SmokeTestPage（冒烟测试页面）', () => {
  it('应该正常渲染，不崩溃', () => {
    const { container } = render(<SmokeTestPage />)
    expect(container).toBeTruthy()
  })

  it('应该显示"冒烟用例"和"自动触发"两个Tab', () => {
    render(<SmokeTestPage />)
    expect(screen.getByText('冒烟用例')).toBeInTheDocument()
    expect(screen.getByText('自动触发')).toBeInTheDocument()
  })

  it('默认"冒烟用例"Tab下应显示"新增用例"按钮', () => {
    render(<SmokeTestPage />)
    expect(screen.getByText('新增用例')).toBeInTheDocument()
  })

  it('点击"新增用例"按钮应打开弹窗', () => {
    render(<SmokeTestPage />)
    fireEvent.click(screen.getByText('新增用例'))
    // 弹窗标题-按钮和弹窗标题同时存在
    const addTexts = screen.getAllByText('新增用例')
    expect(addTexts.length).toBeGreaterThanOrEqual(2)
    // 弹窗中有"用例名称"标签
    expect(screen.getByText('用例名称')).toBeInTheDocument()
    // 弹窗中有"描述"标签
    expect(screen.getByText('描述')).toBeInTheDocument()
    // 包含保存和取消按钮
    expect(screen.getByText('保存')).toBeInTheDocument()
    expect(screen.getByText('取消')).toBeInTheDocument()
  })

  it('点击"自动触发"Tab 应显示自动触发配置面板', () => {
    render(<SmokeTestPage />)
    fireEvent.click(screen.getByText('自动触发'))
    // 自动触发开关和配置项
    expect(screen.getByText('自动触发开关')).toBeInTheDocument()
    expect(screen.getByText('触发条件')).toBeInTheDocument()
    expect(screen.getByText('运行环境')).toBeInTheDocument()
    expect(screen.getByText('通知设置')).toBeInTheDocument()
  })

  it('页面挂载时自动调用 smokeTestApi.list', async () => {
    const { smokeTestApi } = await import('../../lib/api-service')
    render(<SmokeTestPage />)
    await waitFor(() => {
      expect(smokeTestApi.list).toHaveBeenCalledTimes(1)
    })
  })
})
