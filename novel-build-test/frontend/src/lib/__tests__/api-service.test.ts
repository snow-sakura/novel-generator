import { describe, it, expect, beforeEach, vi } from 'vitest'

// Mock apiClient before any imports
vi.mock('../api-client', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
    patch: vi.fn(),
  },
}))

import apiClient from '../api-client'
import {
  authApi,
  projectApi,
  requirementApi,
  environmentApi,
  assetApi,
  settingsApi,
  knowledgeApi,
  userApi,
  roleApi,
  auditApi,
  agentApi,
  executionApi,
  reportApi,
  aiAssistantApi,
  aiNativeApi,
  functionalTestApi,
  apiTestApi,
  webTestApi,
  appTestApi,
  perfTestApi,
  securityTestApi,
  uiTestApi,
  smokeTestApi,
} from '../api-service'

const mockGet = vi.mocked(apiClient.get)
const mockPost = vi.mocked(apiClient.post)
const mockPut = vi.mocked(apiClient.put)
const mockDelete = vi.mocked(apiClient.delete)
const mockPatch = vi.mocked(apiClient.patch)

beforeEach(() => {
  vi.clearAllMocks()
})

// =============================================================================
// 1. authApi — 认证
// =============================================================================
describe('authApi', () => {
  it('login — 应发送 POST /auth/login 并携带用户名和密码', async () => {
    mockPost.mockResolvedValue({ data: { token: 'xxx' } })
    const result = await authApi.login('admin', '123456')
    expect(mockPost).toHaveBeenCalledWith('/auth/login', {
      username: 'admin',
      password: '123456',
    })
    expect(result.data).toEqual({ token: 'xxx' })
  })

  it('register — 应发送 POST /auth/register 并携带注册数据', async () => {
    const data = { username: 'newuser', email: 'a@b.com', password: '123' }
    mockPost.mockResolvedValue({ data: { id: 1 } })
    await authApi.register(data)
    expect(mockPost).toHaveBeenCalledWith('/auth/register', data)
  })

  it('register — 支持 display_name 可选字段', async () => {
    const data = { username: 'u', email: 'u@b.com', password: '123', display_name: 'User' }
    mockPost.mockResolvedValue({ data: { id: 2 } })
    await authApi.register(data)
    expect(mockPost).toHaveBeenCalledWith('/auth/register', data)
  })

  it('refresh — 应发送 POST /auth/refresh', async () => {
    mockPost.mockResolvedValue({ data: { access_token: 'new' } })
    await authApi.refresh('my_refresh_token')
    expect(mockPost).toHaveBeenCalledWith('/auth/refresh', {
      refresh_token: 'my_refresh_token',
    })
  })

  it('me — 应发送 GET /auth/me', async () => {
    const userMock = { id: 1, username: 'admin', role: 'admin' }
    mockGet.mockResolvedValue({ data: userMock })
    const result = await authApi.me()
    expect(mockGet).toHaveBeenCalledWith('/auth/me')
    expect(result.data).toEqual(userMock)
  })

  it('changePassword — 应发送 POST /auth/change-password', async () => {
    const data = { current_password: 'old', new_password: 'new' }
    mockPost.mockResolvedValue({ data: { success: true } })
    await authApi.changePassword(data)
    expect(mockPost).toHaveBeenCalledWith('/auth/change-password', data)
  })
})

// =============================================================================
// 2. projectApi — 项目
// =============================================================================
describe('projectApi', () => {
  it('list — 应发送 GET /projects 并携带查询参数', async () => {
    mockGet.mockResolvedValue({ data: { items: [], total: 0, page: 1, page_size: 20, total_pages: 0 } })
    const params = { page: 1, page_size: 20, search: 'test' }
    await projectApi.list(params)
    expect(mockGet).toHaveBeenCalledWith('/projects', { params })
  })

  it('list — 无参数时仅传空对象', async () => {
    mockGet.mockResolvedValue({ data: { items: [], total: 0, page: 1, page_size: 20, total_pages: 0 } })
    await projectApi.list()
    expect(mockGet).toHaveBeenCalledWith('/projects', { params: undefined })
  })

  it('create — 应发送 POST /projects', async () => {
    const data = { name: '项目A', description: 'desc', repo_url: 'https://github.com/a' }
    mockPost.mockResolvedValue({ data: { id: 1, ...data } })
    await projectApi.create(data)
    expect(mockPost).toHaveBeenCalledWith('/projects', data)
  })

  it('detail — 应发送 GET /projects/:id', async () => {
    mockGet.mockResolvedValue({ data: { id: 1, name: 'P' } })
    await projectApi.detail(1)
    expect(mockGet).toHaveBeenCalledWith('/projects/1')
  })

  it('update — 应发送 PUT /projects/:id', async () => {
    const data = { name: '更新名' }
    mockPut.mockResolvedValue({ data: { id: 1, name: '更新名' } })
    await projectApi.update(1, data)
    expect(mockPut).toHaveBeenCalledWith('/projects/1', data)
  })

  it('delete — 应发送 DELETE /projects/:id', async () => {
    mockDelete.mockResolvedValue({ data: {} })
    await projectApi.delete(1)
    expect(mockDelete).toHaveBeenCalledWith('/projects/1')
  })

  it('stats — 应发送 GET /projects/:id/stats', async () => {
    const stats = { total_requirements: 5, total_environments: 2, total_assets: 10, total_knowledge: 3 }
    mockGet.mockResolvedValue({ data: stats })
    const result = await projectApi.stats(1)
    expect(mockGet).toHaveBeenCalledWith('/projects/1/stats')
    expect(result.data).toEqual(stats)
  })
})

// =============================================================================
// 3. requirementApi — 需求
// =============================================================================
describe('requirementApi', () => {
  it('list — 应发送 GET /requirements 并携带查询参数', async () => {
    mockGet.mockResolvedValue({ data: { items: [], total: 0, page: 1, page_size: 20, total_pages: 0 } })
    const params = { page: 1, page_size: 20, project_id: 1, status: 'approved', priority: 'P1', search: 'login' }
    await requirementApi.list(params)
    expect(mockGet).toHaveBeenCalledWith('/requirements', { params })
  })

  it('create — 应发送 POST /requirements', async () => {
    const data = { project_id: 1, title: '用户登录', description: '登录功能', module: 'auth', priority: 'P1' }
    mockPost.mockResolvedValue({ data: { id: 1, ...data } })
    await requirementApi.create(data)
    expect(mockPost).toHaveBeenCalledWith('/requirements', data)
  })

  it('detail — 应发送 GET /requirements/:id', async () => {
    mockGet.mockResolvedValue({ data: { id: 1 } })
    await requirementApi.detail(1)
    expect(mockGet).toHaveBeenCalledWith('/requirements/1')
  })

  it('update — 应发送 PUT /requirements/:id', async () => {
    const data = { title: '更新需求', priority: 'P0' }
    mockPut.mockResolvedValue({ data: { id: 1, ...data } })
    await requirementApi.update(1, data)
    expect(mockPut).toHaveBeenCalledWith('/requirements/1', data)
  })

  it('delete — 应发送 DELETE /requirements/:id', async () => {
    mockDelete.mockResolvedValue({ data: {} })
    await requirementApi.delete(1)
    expect(mockDelete).toHaveBeenCalledWith('/requirements/1')
  })
})

// =============================================================================
// 4. environmentApi — 测试环境
// =============================================================================
describe('environmentApi', () => {
  it('list — 应发送 GET /environments 并携带参数', async () => {
    mockGet.mockResolvedValue({ data: { items: [], total: 0, page: 1, page_size: 20, total_pages: 0 } })
    const params = { page: 1, page_size: 20, project_id: 1, status: 'ready', type: 'test' }
    await environmentApi.list(params)
    expect(mockGet).toHaveBeenCalledWith('/environments', { params })
  })

  it('create — 应发送 POST /environments', async () => {
    const data = { project_id: 1, name: '测试环境', type: 'test', config: { key: 'val' } }
    mockPost.mockResolvedValue({ data: { id: 1 } })
    await environmentApi.create(data)
    expect(mockPost).toHaveBeenCalledWith('/environments', data)
  })

  it('detail — 应发送 GET /environments/:id', async () => {
    mockGet.mockResolvedValue({ data: { id: 1 } })
    await environmentApi.detail(1)
    expect(mockGet).toHaveBeenCalledWith('/environments/1')
  })

  it('update — 应发送 PUT /environments/:id', async () => {
    const data = { name: '更新环境' }
    mockPut.mockResolvedValue({ data: { id: 1 } })
    await environmentApi.update(1, data)
    expect(mockPut).toHaveBeenCalledWith('/environments/1', data)
  })

  it('delete — 应发送 DELETE /environments/:id', async () => {
    mockDelete.mockResolvedValue({ data: {} })
    await environmentApi.delete(1)
    expect(mockDelete).toHaveBeenCalledWith('/environments/1')
  })

  it('healthCheck — 应发送 POST /environments/:id/health-check', async () => {
    mockPost.mockResolvedValue({ data: { status: 'ok' } })
    await environmentApi.healthCheck(1)
    expect(mockPost).toHaveBeenCalledWith('/environments/1/health-check')
  })

  it('deploy — 应发送 POST /environments/:id/deploy', async () => {
    mockPost.mockResolvedValue({ data: { status: 'deploying' } })
    await environmentApi.deploy(1)
    expect(mockPost).toHaveBeenCalledWith('/environments/1/deploy')
  })
})

// =============================================================================
// 5. assetApi — 测试资产
// =============================================================================
describe('assetApi', () => {
  it('list — 应发送 GET /assets 并携带参数', async () => {
    mockGet.mockResolvedValue({ data: { items: [], total: 0, page: 1, pageSize: 20, total_pages: 0 } })
    const params = { page: 1, pageSize: 20, project_id: 1, type: 'file', tags: 'tag1', search: 'test' }
    await assetApi.list(params)
    expect(mockGet).toHaveBeenCalledWith('/assets', { params })
  })

  it('create — 应发送 POST /assets', async () => {
    const data = { project_id: 1, name: '测试数据', type: 'data', tags: 'tag1', content: 'content' }
    mockPost.mockResolvedValue({ data: { id: 1 } })
    await assetApi.create(data)
    expect(mockPost).toHaveBeenCalledWith('/assets', data)
  })

  it('getById — 应发送 GET /assets/:id', async () => {
    mockGet.mockResolvedValue({ data: { id: 1 } })
    await assetApi.getById(1)
    expect(mockGet).toHaveBeenCalledWith('/assets/1')
  })

  it('update — 应发送 PUT /assets/:id', async () => {
    const data = { name: '新资产', type: 'script', tags: 'new', content: 'new content' }
    mockPut.mockResolvedValue({ data: { id: 1 } })
    await assetApi.update(1, data)
    expect(mockPut).toHaveBeenCalledWith('/assets/1', data)
  })

  it('delete — 应发送 DELETE /assets/:id', async () => {
    mockDelete.mockResolvedValue({ data: {} })
    await assetApi.delete(1)
    expect(mockDelete).toHaveBeenCalledWith('/assets/1')
  })
})

// =============================================================================
// 6. settingsApi — 系统设置
// =============================================================================
describe('settingsApi', () => {
  it('list — 应发送 GET /settings', async () => {
    mockGet.mockResolvedValue({ data: [] })
    await settingsApi.list()
    expect(mockGet).toHaveBeenCalledWith('/settings')
  })

  it('getByKey — 应发送 GET /settings/:key 并对 key 进行 URI 编码', async () => {
    mockGet.mockResolvedValue({ data: { key: 'site_name', value: 'AISQA' } })
    await settingsApi.getByKey('site_name')
    expect(mockGet).toHaveBeenCalledWith('/settings/site_name')
  })

  it('getByKey — 应对含特殊字符的 key 进行编码', async () => {
    mockGet.mockResolvedValue({ data: { key: 'a/b', value: 'v' } })
    await settingsApi.getByKey('a/b')
    expect(mockGet).toHaveBeenCalledWith('/settings/a%2Fb')
  })

  it('create — 应发送 POST /settings', async () => {
    const data = { key: 'theme', value: 'dark', description: '主题色' }
    mockPost.mockResolvedValue({ data: { id: 1 } })
    await settingsApi.create(data)
    expect(mockPost).toHaveBeenCalledWith('/settings', data)
  })

  it('update — 应发送 PUT /settings/:key', async () => {
    const data = { value: 'light', description: '亮色主题' }
    mockPut.mockResolvedValue({ data: { key: 'theme' } })
    await settingsApi.update('theme', data)
    expect(mockPut).toHaveBeenCalledWith('/settings/theme', data)
  })

  it('delete — 应发送 DELETE /settings/:key', async () => {
    mockDelete.mockResolvedValue({ data: {} })
    await settingsApi.delete('theme')
    expect(mockDelete).toHaveBeenCalledWith('/settings/theme')
  })
})

// =============================================================================
// 7. knowledgeApi — AI 知识库
// =============================================================================
describe('knowledgeApi', () => {
  it('list — 应发送 GET /knowledge 并携带参数', async () => {
    mockGet.mockResolvedValue({ data: { items: [], total: 0, page: 1, pageSize: 20, total_pages: 0 } })
    const params = { page: 1, pageSize: 20, project_id: 1, collection: 'docs', source: 'manual', search: 'AI' }
    await knowledgeApi.list(params)
    expect(mockGet).toHaveBeenCalledWith('/knowledge', { params })
  })

  it('create — 应发送 POST /knowledge', async () => {
    const data = { project_id: 1, title: 'AI知识', content: '内容', source: 'manual', tags: 'ai', collection_name: 'test' }
    mockPost.mockResolvedValue({ data: { id: 1 } })
    await knowledgeApi.create(data)
    expect(mockPost).toHaveBeenCalledWith('/knowledge', data)
  })

  it('getById — 应发送 GET /knowledge/:id', async () => {
    mockGet.mockResolvedValue({ data: { id: 1 } })
    await knowledgeApi.getById(1)
    expect(mockGet).toHaveBeenCalledWith('/knowledge/1')
  })

  it('update — 应发送 PUT /knowledge/:id', async () => {
    const data = { title: '新标题', content: '新内容', source: 'api', tags: 'new' }
    mockPut.mockResolvedValue({ data: { id: 1 } })
    await knowledgeApi.update(1, data)
    expect(mockPut).toHaveBeenCalledWith('/knowledge/1', data)
  })

  it('delete — 应发送 DELETE /knowledge/:id', async () => {
    mockDelete.mockResolvedValue({ data: {} })
    await knowledgeApi.delete(1)
    expect(mockDelete).toHaveBeenCalledWith('/knowledge/1')
  })

  it('sync — 应发送 POST /knowledge/:id/sync', async () => {
    mockPost.mockResolvedValue({ data: { id: 1, vector_synced: true } })
    await knowledgeApi.sync(1)
    expect(mockPost).toHaveBeenCalledWith('/knowledge/1/sync')
  })

  it('search — 应发送 POST /knowledge/search 并携带查询参数', async () => {
    const params = { query: 'AI测试', collection_name: 'docs', limit: 10 }
    mockPost.mockResolvedValue({ data: [] })
    await knowledgeApi.search(params)
    expect(mockPost).toHaveBeenCalledWith('/knowledge/search', params)
  })
})

// =============================================================================
// 8. userApi — 用户管理
// =============================================================================
describe('userApi', () => {
  it('list — 应发送 GET /users 并携带参数', async () => {
    mockGet.mockResolvedValue({ data: { items: [], total: 0, page: 1, page_size: 20, total_pages: 0 } })
    const params = { page: 1, page_size: 20, search: 'admin', role: 'admin', status: 'active' }
    await userApi.list(params)
    expect(mockGet).toHaveBeenCalledWith('/users', { params })
  })

  it('detail — 应发送 GET /users/:id', async () => {
    mockGet.mockResolvedValue({ data: { id: 1 } })
    await userApi.detail(1)
    expect(mockGet).toHaveBeenCalledWith('/users/1')
  })

  it('create — 应发送 POST /users', async () => {
    const data = { username: 'new', email: 'new@b.com', password: '123', display_name: 'New' }
    mockPost.mockResolvedValue({ data: { id: 1 } })
    await userApi.create(data)
    expect(mockPost).toHaveBeenCalledWith('/users', data)
  })

  it('update — 应发送 PUT /users/:id', async () => {
    const data = { display_name: 'Admin', email: 'a@b.com', role: 'admin', is_active: true }
    mockPut.mockResolvedValue({ data: { id: 1 } })
    await userApi.update(1, data)
    expect(mockPut).toHaveBeenCalledWith('/users/1', data)
  })

  it('delete — 应发送 DELETE /users/:id', async () => {
    mockDelete.mockResolvedValue({ data: {} })
    await userApi.delete(1)
    expect(mockDelete).toHaveBeenCalledWith('/users/1')
  })

  it('updateRole — 应发送 PUT /users/:id/role', async () => {
    mockPut.mockResolvedValue({ data: { id: 1, role: 'admin' } })
    await userApi.updateRole(1, 'admin')
    expect(mockPut).toHaveBeenCalledWith('/users/1/role', { role: 'admin' })
  })

  it('updateStatus — 应发送 PUT /users/:id/status', async () => {
    mockPut.mockResolvedValue({ data: { id: 1, is_active: true } })
    await userApi.updateStatus(1, true)
    expect(mockPut).toHaveBeenCalledWith('/users/1/status', { is_active: true })
  })

  it('resetPassword — 应发送 POST /users/:id/reset-password', async () => {
    mockPost.mockResolvedValue({ data: { success: true } })
    await userApi.resetPassword(1, 'newpass123')
    expect(mockPost).toHaveBeenCalledWith('/users/1/reset-password', { new_password: 'newpass123' })
  })
})

// =============================================================================
// 9. roleApi — 角色管理
// =============================================================================
describe('roleApi', () => {
  it('list — 应发送 GET /roles 并携带参数', async () => {
    mockGet.mockResolvedValue({ data: { items: [], total: 0, page: 1, page_size: 20, total_pages: 0 } })
    const params = { page: 1, page_size: 20, search: 'admin' }
    await roleApi.list(params)
    expect(mockGet).toHaveBeenCalledWith('/roles', { params })
  })

  it('detail — 应发送 GET /roles/:id', async () => {
    mockGet.mockResolvedValue({ data: { id: 1 } })
    await roleApi.detail(1)
    expect(mockGet).toHaveBeenCalledWith('/roles/1')
  })

  it('create — 应发送 POST /roles', async () => {
    const data = { name: '测试员', code: 'tester', description: '测试角色', menu_permissions: ['menu1'], data_scope: 'project' }
    mockPost.mockResolvedValue({ data: { id: 1 } })
    await roleApi.create(data)
    expect(mockPost).toHaveBeenCalledWith('/roles', data)
  })

  it('update — 应发送 PUT /roles/:id', async () => {
    const data = { name: '新角色', description: '描述', menu_permissions: ['m1'], data_scope: 'self' }
    mockPut.mockResolvedValue({ data: { id: 1 } })
    await roleApi.update(1, data)
    expect(mockPut).toHaveBeenCalledWith('/roles/1', data)
  })

  it('delete — 应发送 DELETE /roles/:id', async () => {
    mockDelete.mockResolvedValue({ data: {} })
    await roleApi.delete(1)
    expect(mockDelete).toHaveBeenCalledWith('/roles/1')
  })
})

// =============================================================================
// 10. auditApi — 审计日志
// =============================================================================
describe('auditApi', () => {
  it('list — 应发送 GET /audit-logs 并携带参数', async () => {
    mockGet.mockResolvedValue({ data: { items: [], total: 0, page: 1, page_size: 20, total_pages: 0 } })
    const params = { page: 1, page_size: 20, entity_type: 'project', entity_id: 1 }
    await auditApi.list(params)
    expect(mockGet).toHaveBeenCalledWith('/audit-logs', { params })
  })

  it('entityTrail — 应发送 GET /audit-logs/entity/:entity_type/:entity_id', async () => {
    mockGet.mockResolvedValue({ data: [] })
    await auditApi.entityTrail('project', 1)
    expect(mockGet).toHaveBeenCalledWith('/audit-logs/entity/project/1')
  })
})

// =============================================================================
// 11. agentApi — 智能体
// =============================================================================
describe('agentApi', () => {
  it('execute — 应发送 POST /agents/execute', async () => {
    const data = { project_id: 1, task_type: 'test', project_name: 'P', project_description: 'desc' }
    mockPost.mockResolvedValue({ data: { id: 1, status: 'running' } })
    await agentApi.execute(data)
    expect(mockPost).toHaveBeenCalledWith('/agents/execute', data)
  })

  it('debate — 应发送 POST /agents/debate', async () => {
    const data = { topic: '测试', pro_side: 'pro', con_side: 'con', execution_id: 1 }
    mockPost.mockResolvedValue({ data: { id: 1 } })
    await agentApi.debate(data)
    expect(mockPost).toHaveBeenCalledWith('/agents/debate', data)
  })

  it('executions — 应发送 GET /agents/executions 并携带参数', async () => {
    mockGet.mockResolvedValue({ data: { items: [], total: 0, page: 1, page_size: 20, total_pages: 0 } })
    const params = { page: 1, page_size: 20, project_id: 1, status: 'running' }
    await agentApi.executions(params)
    expect(mockGet).toHaveBeenCalledWith('/agents/executions', { params })
  })

  it('executionDetail — 应发送 GET /agents/executions/:id', async () => {
    mockGet.mockResolvedValue({ data: { id: 1 } })
    await agentApi.executionDetail(1)
    expect(mockGet).toHaveBeenCalledWith('/agents/executions/1')
  })

  it('debates — 应发送 GET /agents/debates', async () => {
    mockGet.mockResolvedValue({ data: { items: [], total: 0, page: 1, page_size: 20, total_pages: 0 } })
    const params = { page: 1, page_size: 20, execution_id: 1 }
    await agentApi.debates(params)
    expect(mockGet).toHaveBeenCalledWith('/agents/debates', { params })
  })

  it('costs — 应发送 GET /agents/costs', async () => {
    mockGet.mockResolvedValue({ data: { total_cost: 0 } })
    await agentApi.costs()
    expect(mockGet).toHaveBeenCalledWith('/agents/costs')
  })

  it('dispatch — 应发送 POST /agents/dispatch', async () => {
    const data = { project_id: 1, project_name: 'P', requirement_doc: 'doc', execution_mode: 'auto' }
    mockPost.mockResolvedValue({ data: { execution_id: 1 } })
    await agentApi.dispatch(data)
    expect(mockPost).toHaveBeenCalledWith('/agents/dispatch', data)
  })

  it('startDebate — 应发送 POST /agents/debate', async () => {
    const data = { topic: '议题', pro_side: '正方', con_side: '反方', max_rounds: 3 }
    mockPost.mockResolvedValue({ data: { id: 1 } })
    await agentApi.startDebate(data)
    expect(mockPost).toHaveBeenCalledWith('/agents/debate', data)
  })

  it('executeAgent — 应发送 POST /agents/execute-single', async () => {
    const data = { agent: 'architect', input: { text: 'test' } }
    mockPost.mockResolvedValue({ data: { result: {} } })
    await agentApi.executeAgent(data)
    expect(mockPost).toHaveBeenCalledWith('/agents/execute-single', data)
  })

  // ---- 需求分析智能体 ----
  it('requirementsAnalyze — 应发送 POST /agents/requirements/analyze', async () => {
    const data = { requirement_text: '用户登录', project_id: 1 }
    mockPost.mockResolvedValue({ data: { execution_id: 1, status: 'running' } })
    await agentApi.requirementsAnalyze(data)
    expect(mockPost).toHaveBeenCalledWith('/agents/requirements/analyze', data)
  })

  it('requirementsStatus — 应发送 GET /agents/requirements/:id/status', async () => {
    mockGet.mockResolvedValue({ data: { execution_id: 1, status: 'running' } })
    await agentApi.requirementsStatus(1)
    expect(mockGet).toHaveBeenCalledWith('/agents/requirements/1/status')
  })

  it('requirementsResult — 应发送 GET /agents/requirements/:id/result', async () => {
    mockGet.mockResolvedValue({ data: { execution_id: 1, status: 'completed', result: {} } })
    await agentApi.requirementsResult(1)
    expect(mockGet).toHaveBeenCalledWith('/agents/requirements/1/result')
  })

  // ---- 测试架构智能体 ----
  it('architectDesign — 应发送 POST /agents/architect/design', async () => {
    const data = { requirement_id: 1, requirement_text: '测试' }
    mockPost.mockResolvedValue({ data: { execution_id: 1, status: 'running' } })
    await agentApi.architectDesign(data)
    expect(mockPost).toHaveBeenCalledWith('/agents/architect/design', data)
  })

  it('architectStatus — 应发送 GET /agents/architect/:id/status', async () => {
    mockGet.mockResolvedValue({ data: { execution_id: 1, status: 'running' } })
    await agentApi.architectStatus(1)
    expect(mockGet).toHaveBeenCalledWith('/agents/architect/1/status')
  })

  it('architectResult — 应发送 GET /agents/architect/:id/result', async () => {
    mockGet.mockResolvedValue({ data: { execution_id: 1, status: 'completed', result: {} } })
    await agentApi.architectResult(1)
    expect(mockGet).toHaveBeenCalledWith('/agents/architect/1/result')
  })

  // ---- 测试设计智能体 ----
  it('designerDesign — 应发送 POST /agents/designer/design', async () => {
    const data = { architecture_id: 1, requirement_text: '场景' }
    mockPost.mockResolvedValue({ data: { execution_id: 1, status: 'running' } })
    await agentApi.designerDesign(data)
    expect(mockPost).toHaveBeenCalledWith('/agents/designer/design', data)
  })

  it('designerStatus — 应发送 GET /agents/designer/:id/status', async () => {
    mockGet.mockResolvedValue({ data: { execution_id: 1, status: 'running' } })
    await agentApi.designerStatus(1)
    expect(mockGet).toHaveBeenCalledWith('/agents/designer/1/status')
  })

  it('designerResult — 应发送 GET /agents/designer/:id/result', async () => {
    mockGet.mockResolvedValue({ data: { execution_id: 1, status: 'completed', result: {} } })
    await agentApi.designerResult(1)
    expect(mockGet).toHaveBeenCalledWith('/agents/designer/1/result')
  })

  // ---- 用例编写智能体 ----
  it('casewriterGenerate — 应发送 POST /agents/casewriter/generate', async () => {
    const data = { design_id: 1, scenario_text: '场景描述' }
    mockPost.mockResolvedValue({ data: { execution_id: 1, status: 'running' } })
    await agentApi.casewriterGenerate(data)
    expect(mockPost).toHaveBeenCalledWith('/agents/casewriter/generate', data)
  })

  it('casewriterStatus — 应发送 GET /agents/casewriter/:id/status', async () => {
    mockGet.mockResolvedValue({ data: { execution_id: 1, status: 'running' } })
    await agentApi.casewriterStatus(1)
    expect(mockGet).toHaveBeenCalledWith('/agents/casewriter/1/status')
  })

  it('casewriterResult — 应发送 GET /agents/casewriter/:id/result', async () => {
    mockGet.mockResolvedValue({ data: { execution_id: 1, status: 'completed', result: {} } })
    await agentApi.casewriterResult(1)
    expect(mockGet).toHaveBeenCalledWith('/agents/casewriter/1/result')
  })

  it('casewriterImport — 应发送 POST /agents/casewriter/:id/import', async () => {
    mockPost.mockResolvedValue({ data: { message: '导入成功' } })
    await agentApi.casewriterImport(1)
    expect(mockPost).toHaveBeenCalledWith('/agents/casewriter/1/import')
  })

  // ---- 执行分析智能体 ----
  it('executionAnalyze — 应发送 POST /agents/execution/analyze', async () => {
    const data = { execution_id: 1, log_text: 'log...' }
    mockPost.mockResolvedValue({ data: { execution_id: 1, status: 'running' } })
    await agentApi.executionAnalyze(data)
    expect(mockPost).toHaveBeenCalledWith('/agents/execution/analyze', data)
  })

  it('executionStatus — 应发送 GET /agents/execution/:id/status', async () => {
    mockGet.mockResolvedValue({ data: { execution_id: 1, status: 'running' } })
    await agentApi.executionStatus(1)
    expect(mockGet).toHaveBeenCalledWith('/agents/execution/1/status')
  })

  it('executionResult — 应发送 GET /agents/execution/:id/result', async () => {
    mockGet.mockResolvedValue({ data: { execution_id: 1, status: 'completed', result: {} } })
    await agentApi.executionResult(1)
    expect(mockGet).toHaveBeenCalledWith('/agents/execution/1/result')
  })

  // ---- 质量审计智能体 ----
  it('qualityAudit — 应发送 POST /agents/quality/audit', async () => {
    const data = { execution_id: 1, project_id: 1 }
    mockPost.mockResolvedValue({ data: { execution_id: 1, status: 'running' } })
    await agentApi.qualityAudit(data)
    expect(mockPost).toHaveBeenCalledWith('/agents/quality/audit', data)
  })

  it('qualityStatus — 应发送 GET /agents/quality/:id/status', async () => {
    mockGet.mockResolvedValue({ data: { execution_id: 1, status: 'running' } })
    await agentApi.qualityStatus(1)
    expect(mockGet).toHaveBeenCalledWith('/agents/quality/1/status')
  })

  it('qualityResult — 应发送 GET /agents/quality/:id/result', async () => {
    mockGet.mockResolvedValue({ data: { execution_id: 1, status: 'completed', result: {} } })
    await agentApi.qualityResult(1)
    expect(mockGet).toHaveBeenCalledWith('/agents/quality/1/result')
  })

  // ---- 成本相关 ----
  it('costOverview — 应发送 GET /agents/cost/overview', async () => {
    mockGet.mockResolvedValue({ data: { total_cost: 100 } })
    await agentApi.costOverview()
    expect(mockGet).toHaveBeenCalledWith('/agents/cost/overview')
  })

  it('costTrend — 应发送 GET /agents/cost/trend', async () => {
    mockGet.mockResolvedValue({ data: [] })
    await agentApi.costTrend()
    expect(mockGet).toHaveBeenCalledWith('/agents/cost/trend')
  })

  it('costDistribution — 应发送 GET /agents/cost/distribution', async () => {
    mockGet.mockResolvedValue({ data: {} })
    await agentApi.costDistribution()
    expect(mockGet).toHaveBeenCalledWith('/agents/cost/distribution')
  })

  it('costSuggestions — 应发送 GET /agents/cost/suggestions', async () => {
    mockGet.mockResolvedValue({ data: [] })
    await agentApi.costSuggestions()
    expect(mockGet).toHaveBeenCalledWith('/agents/cost/suggestions')
  })
})

// =============================================================================
// 12. executionApi — 测试执行
// =============================================================================
describe('executionApi', () => {
  it('list — 应发送 GET /projects/:projectId/executions 并携带参数', async () => {
    mockGet.mockResolvedValue({ data: { items: [], total: 0, page: 1, page_size: 20, total_pages: 0 } })
    const params = { page: 1, page_size: 20, status: 'running' }
    await executionApi.list(1, params)
    expect(mockGet).toHaveBeenCalledWith('/projects/1/executions', { params })
  })

  it('create — 应发送 POST /projects/:projectId/executions', async () => {
    const data = { name: '执行1', agent_execution_id: 1 }
    mockPost.mockResolvedValue({ data: { id: 1 } })
    await executionApi.create(1, data)
    expect(mockPost).toHaveBeenCalledWith('/projects/1/executions', data)
  })

  it('detail — 应发送 GET /executions/:id', async () => {
    mockGet.mockResolvedValue({ data: { id: 1 } })
    await executionApi.detail(1)
    expect(mockGet).toHaveBeenCalledWith('/executions/1')
  })

  it('cancel — 应发送 PATCH /executions/:id/cancel', async () => {
    mockPatch.mockResolvedValue({ data: { id: 1, status: 'cancelled' } })
    await executionApi.cancel(1)
    expect(mockPatch).toHaveBeenCalledWith('/executions/1/cancel')
  })

  it('delete — 应发送 DELETE /executions/:id', async () => {
    mockDelete.mockResolvedValue({ data: {} })
    await executionApi.delete(1)
    expect(mockDelete).toHaveBeenCalledWith('/executions/1')
  })

  it('executionStreamUrl — 应返回正确格式的流 URL', () => {
    const url = executionApi.executionStreamUrl(1)
    expect(url).toBe('/api/v1/executions/1/stream')
  })
})

// =============================================================================
// 13. reportApi — 测试报告
// =============================================================================
describe('reportApi', () => {
  it('getByExecution — 应发送 GET /executions/:id/report', async () => {
    mockGet.mockResolvedValue({ data: { id: 1, execution_id: 1 } })
    await reportApi.getByExecution(1)
    expect(mockGet).toHaveBeenCalledWith('/executions/1/report')
  })

  it('create — 应发送 POST /executions/:id/report', async () => {
    const data = { total_cases: 10, passed: 8, failed: 1, skipped: 1, duration: 100, summary: 'ok', details: [] }
    mockPost.mockResolvedValue({ data: { id: 1 } })
    await reportApi.create(1, data)
    expect(mockPost).toHaveBeenCalledWith('/executions/1/report', data)
  })

  it('list — 应发送 GET /reports 并携带参数', async () => {
    mockGet.mockResolvedValue({ data: { items: [], total: 0, page: 1, page_size: 20, total_pages: 0 } })
    const params = { page: 1, page_size: 20, project_id: 1 }
    await reportApi.list(params)
    expect(mockGet).toHaveBeenCalledWith('/reports', { params })
  })

  it('detail — 应发送 GET /reports/:id', async () => {
    mockGet.mockResolvedValue({ data: { id: 1 } })
    await reportApi.detail(1)
    expect(mockGet).toHaveBeenCalledWith('/reports/1')
  })
})

// =============================================================================
// 14. aiAssistantApi — AI 助手
// =============================================================================
describe('aiAssistantApi', () => {
  it('quickActions — 应发送 GET /ai-assistant/quick-actions', async () => {
    mockGet.mockResolvedValue({ data: [] })
    await aiAssistantApi.quickActions()
    expect(mockGet).toHaveBeenCalledWith('/ai-assistant/quick-actions')
  })

  it('overview — 应发送 GET /ai-assistant/overview', async () => {
    mockGet.mockResolvedValue({ data: { project_count: 0, execution_count: 0, pass_rate: 0, recent_activities: [] } })
    await aiAssistantApi.overview()
    expect(mockGet).toHaveBeenCalledWith('/ai-assistant/overview')
  })

  it('chat — 应发送 POST /ai-assistant/chat', async () => {
    mockPost.mockResolvedValue({ data: { reply: '你好' } })
    await aiAssistantApi.chat('你好')
    expect(mockPost).toHaveBeenCalledWith('/ai-assistant/chat', { message: '你好' })
  })
})

// =============================================================================
// 15. aiNativeApi — AI-Native 子系统
// =============================================================================
describe('aiNativeApi', () => {
  it('health — 应发送 GET /health', async () => {
    mockGet.mockResolvedValue({ data: { status: 'ok', app: 'aisqa', version: '1.0.0', subsystem_status: { database: 'ok', vector_db: 'ok', event_bus: 'ok' } } })
    await aiNativeApi.health()
    expect(mockGet).toHaveBeenCalledWith('/health')
  })

  it('getCollections — 应发送 GET /vector-db/collections', async () => {
    mockGet.mockResolvedValue({ data: [] })
    await aiNativeApi.getCollections()
    expect(mockGet).toHaveBeenCalledWith('/vector-db/collections')
  })

  it('searchVectorDb — 应发送 POST /vector-db/search', async () => {
    const data = { query: 'test', collection_name: 'docs', limit: 5 }
    mockPost.mockResolvedValue({ data: [] })
    await aiNativeApi.searchVectorDb(data)
    expect(mockPost).toHaveBeenCalledWith('/vector-db/search', data)
  })
})

// =============================================================================
// 16. functionalTestApi — 功能测试
// =============================================================================
describe('functionalTestApi', () => {
  it('list — 应发送 GET /test-functional/cases 并携带参数', async () => {
    mockGet.mockResolvedValue({ data: { items: [], total: 0, page: 1, page_size: 20, total_pages: 0 } })
    const params = { page: 1, page_size: 20, project_id: 1, status: 'ready', search: 'login' }
    await functionalTestApi.list(params)
    expect(mockGet).toHaveBeenCalledWith('/test-functional/cases', { params })
  })

  it('create — 应发送 POST /test-functional/cases', async () => {
    const data = { title: '登录测试', project_id: 1, steps: '1.打开页面' }
    mockPost.mockResolvedValue({ data: { id: 1 } })
    await functionalTestApi.create(data)
    expect(mockPost).toHaveBeenCalledWith('/test-functional/cases', data)
  })

  it('detail — 应发送 GET /test-functional/cases/:id', async () => {
    mockGet.mockResolvedValue({ data: { id: 1 } })
    await functionalTestApi.detail(1)
    expect(mockGet).toHaveBeenCalledWith('/test-functional/cases/1')
  })

  it('update — 应发送 PUT /test-functional/cases/:id', async () => {
    const data = { title: '更新用例', status: 'ready' as const }
    mockPut.mockResolvedValue({ data: { id: 1 } })
    await functionalTestApi.update(1, data)
    expect(mockPut).toHaveBeenCalledWith('/test-functional/cases/1', data)
  })

  it('delete — 应发送 DELETE /test-functional/cases/:id', async () => {
    mockDelete.mockResolvedValue({ data: {} })
    await functionalTestApi.delete(1)
    expect(mockDelete).toHaveBeenCalledWith('/test-functional/cases/1')
  })

  it('importCases — 应发送 POST /test-functional/cases/import', async () => {
    const data = { cases: [{ title: '用例1' }, { title: '用例2' }] }
    mockPost.mockResolvedValue({ data: { imported: 2 } })
    await functionalTestApi.importCases(data)
    expect(mockPost).toHaveBeenCalledWith('/test-functional/cases/import', data)
  })

  it('run — 应发送 POST /test-functional/cases/:id/run', async () => {
    mockPost.mockResolvedValue({ data: { execution_id: 1 } })
    await functionalTestApi.run(1)
    expect(mockPost).toHaveBeenCalledWith('/test-functional/cases/1/run')
  })
})

// =============================================================================
// 17. apiTestApi — 接口测试
// =============================================================================
describe('apiTestApi', () => {
  it('list — 应发送 GET /test-api/cases 并携带参数', async () => {
    mockGet.mockResolvedValue({ data: { items: [], total: 0, page: 1, page_size: 20, total_pages: 0 } })
    const params = { page: 1, page_size: 20, project_id: 1, search: 'api' }
    await apiTestApi.list(params)
    expect(mockGet).toHaveBeenCalledWith('/test-api/cases', { params })
  })

  it('create — 应发送 POST /test-api/cases', async () => {
    const data = { name: '测试API', url: '/api/test', method: 'GET' as const, project_id: 1 }
    mockPost.mockResolvedValue({ data: { id: 1 } })
    await apiTestApi.create(data)
    expect(mockPost).toHaveBeenCalledWith('/test-api/cases', data)
  })

  it('detail — 应发送 GET /test-api/cases/:id', async () => {
    mockGet.mockResolvedValue({ data: { id: 1 } })
    await apiTestApi.detail(1)
    expect(mockGet).toHaveBeenCalledWith('/test-api/cases/1')
  })

  it('update — 应发送 PUT /test-api/cases/:id', async () => {
    const data = { name: '更新API', expected_status: 200 }
    mockPut.mockResolvedValue({ data: { id: 1 } })
    await apiTestApi.update(1, data)
    expect(mockPut).toHaveBeenCalledWith('/test-api/cases/1', data)
  })

  it('delete — 应发送 DELETE /test-api/cases/:id', async () => {
    mockDelete.mockResolvedValue({ data: {} })
    await apiTestApi.delete(1)
    expect(mockDelete).toHaveBeenCalledWith('/test-api/cases/1')
  })

  it('toggleAuto — 应发送 PUT /test-api/cases/:id/auto', async () => {
    mockPut.mockResolvedValue({ data: { id: 1, auto_test: true } })
    await apiTestApi.toggleAuto(1, true)
    expect(mockPut).toHaveBeenCalledWith('/test-api/cases/1/auto', { auto_test: true })
  })

  it('run — 应发送 POST /test-api/cases/:id/run', async () => {
    mockPost.mockResolvedValue({ data: { execution_id: 1 } })
    await apiTestApi.run(1)
    expect(mockPost).toHaveBeenCalledWith('/test-api/cases/1/run')
  })
})

// =============================================================================
// 18. webTestApi — Web 自动化测试
// =============================================================================
describe('webTestApi', () => {
  it('list — 应发送 GET /test-web/scripts 并携带参数', async () => {
    mockGet.mockResolvedValue({ data: { items: [], total: 0, page: 1, page_size: 20, total_pages: 0 } })
    const params = { page: 1, page_size: 20, project_id: 1, search: 'login' }
    await webTestApi.list(params)
    expect(mockGet).toHaveBeenCalledWith('/test-web/scripts', { params })
  })

  it('detail — 应发送 GET /test-web/scripts/:id', async () => {
    mockGet.mockResolvedValue({ data: { id: 1 } })
    await webTestApi.detail(1)
    expect(mockGet).toHaveBeenCalledWith('/test-web/scripts/1')
  })

  it('create — 应发送 POST /test-web/scripts', async () => {
    const data = { name: 'Web脚本', project_id: 1, type: 'playwright' as const }
    mockPost.mockResolvedValue({ data: { id: 1 } })
    await webTestApi.create(data)
    expect(mockPost).toHaveBeenCalledWith('/test-web/scripts', data)
  })

  it('update — 应发送 PUT /test-web/scripts/:id', async () => {
    const data = { name: '更新脚本', status: 'ready' as const }
    mockPut.mockResolvedValue({ data: { id: 1 } })
    await webTestApi.update(1, data)
    expect(mockPut).toHaveBeenCalledWith('/test-web/scripts/1', data)
  })

  it('delete — 应发送 DELETE /test-web/scripts/:id', async () => {
    mockDelete.mockResolvedValue({ data: {} })
    await webTestApi.delete(1)
    expect(mockDelete).toHaveBeenCalledWith('/test-web/scripts/1')
  })

  it('run — 应发送 POST /test-web/scripts/:id/run', async () => {
    mockPost.mockResolvedValue({ data: { execution_id: 1 } })
    await webTestApi.run(1)
    expect(mockPost).toHaveBeenCalledWith('/test-web/scripts/1/run')
  })

  it('result — 应发送 GET /test-web/scripts/:id/result', async () => {
    mockGet.mockResolvedValue({ data: { status: 'completed', output: 'ok' } })
    await webTestApi.result(1)
    expect(mockGet).toHaveBeenCalledWith('/test-web/scripts/1/result')
  })
})

// =============================================================================
// 19. appTestApi — App 自动化测试
// =============================================================================
describe('appTestApi', () => {
  // 脚本
  it('listScripts — 应发送 GET /test-app/scripts 并携带参数', async () => {
    mockGet.mockResolvedValue({ data: { items: [], total: 0, page: 1, page_size: 20, total_pages: 0 } })
    const params = { page: 1, page_size: 20, project_id: 1, search: 'app' }
    await appTestApi.listScripts(params)
    expect(mockGet).toHaveBeenCalledWith('/test-app/scripts', { params })
  })

  it('createScript — 应发送 POST /test-app/scripts', async () => {
    const data = { name: 'App脚本', project_id: 1, platform: 'android' as const }
    mockPost.mockResolvedValue({ data: { id: 1 } })
    await appTestApi.createScript(data)
    expect(mockPost).toHaveBeenCalledWith('/test-app/scripts', data)
  })

  it('updateScript — 应发送 PUT /test-app/scripts/:id', async () => {
    const data = { name: '更新脚本', platform: 'ios' as const }
    mockPut.mockResolvedValue({ data: { id: 1 } })
    await appTestApi.updateScript(1, data)
    expect(mockPut).toHaveBeenCalledWith('/test-app/scripts/1', data)
  })

  it('deleteScript — 应发送 DELETE /test-app/scripts/:id', async () => {
    mockDelete.mockResolvedValue({ data: {} })
    await appTestApi.deleteScript(1)
    expect(mockDelete).toHaveBeenCalledWith('/test-app/scripts/1')
  })

  it('runScript — 应发送 POST /test-app/scripts/:id/run', async () => {
    mockPost.mockResolvedValue({ data: { execution_id: 1 } })
    await appTestApi.runScript(1)
    expect(mockPost).toHaveBeenCalledWith('/test-app/scripts/1/run')
  })

  // 设备
  it('listDevices — 应发送 GET /test-app/devices 并携带参数', async () => {
    mockGet.mockResolvedValue({ data: { items: [], total: 0, page: 1, page_size: 20, total_pages: 0 } })
    const params = { page: 1, page_size: 20, status: 'online' }
    await appTestApi.listDevices(params)
    expect(mockGet).toHaveBeenCalledWith('/test-app/devices', { params })
  })

  it('createDevice — 应发送 POST /test-app/devices', async () => {
    const data = { name: '设备1', platform: 'android' as const, version: '14', udid: 'abc123' }
    mockPost.mockResolvedValue({ data: { id: 1 } })
    await appTestApi.createDevice(data)
    expect(mockPost).toHaveBeenCalledWith('/test-app/devices', data)
  })

  it('updateDevice — 应发送 PUT /test-app/devices/:id', async () => {
    const data = { name: '更新设备', status: 'busy' as const }
    mockPut.mockResolvedValue({ data: { id: 1 } })
    await appTestApi.updateDevice(1, data)
    expect(mockPut).toHaveBeenCalledWith('/test-app/devices/1', data)
  })

  it('deleteDevice — 应发送 DELETE /test-app/devices/:id', async () => {
    mockDelete.mockResolvedValue({ data: {} })
    await appTestApi.deleteDevice(1)
    expect(mockDelete).toHaveBeenCalledWith('/test-app/devices/1')
  })
})

// =============================================================================
// 20. perfTestApi — 性能测试
// =============================================================================
describe('perfTestApi', () => {
  it('list — 应发送 GET /test-perf/scripts 并携带参数', async () => {
    mockGet.mockResolvedValue({ data: { items: [], total: 0, page: 1, page_size: 20, total_pages: 0 } })
    const params = { page: 1, page_size: 20, project_id: 1, search: 'perf' }
    await perfTestApi.list(params)
    expect(mockGet).toHaveBeenCalledWith('/test-perf/scripts', { params })
  })

  it('create — 应发送 POST /test-perf/scripts', async () => {
    const data = { name: '性能脚本', project_id: 1, type: 'jmeter' as const }
    mockPost.mockResolvedValue({ data: { id: 1 } })
    await perfTestApi.create(data)
    expect(mockPost).toHaveBeenCalledWith('/test-perf/scripts', data)
  })

  it('update — 应发送 PUT /test-perf/scripts/:id', async () => {
    const data = { name: '更新性能脚本', status: 'ready' as const }
    mockPut.mockResolvedValue({ data: { id: 1 } })
    await perfTestApi.update(1, data)
    expect(mockPut).toHaveBeenCalledWith('/test-perf/scripts/1', data)
  })

  it('delete — 应发送 DELETE /test-perf/scripts/:id', async () => {
    mockDelete.mockResolvedValue({ data: {} })
    await perfTestApi.delete(1)
    expect(mockDelete).toHaveBeenCalledWith('/test-perf/scripts/1')
  })

  it('run — 应发送 POST /test-perf/scripts/:id/run', async () => {
    mockPost.mockResolvedValue({ data: { execution_id: 1 } })
    await perfTestApi.run(1)
    expect(mockPost).toHaveBeenCalledWith('/test-perf/scripts/1/run')
  })

  it('monitor — 应发送 GET /test-perf/monitor/:script_id', async () => {
    mockGet.mockResolvedValue({ data: { id: 1, script_id: 1, tps: 100, avg_response_time: 200, error_rate: 0.01, cpu_usage: 50, memory_usage: 60 } })
    await perfTestApi.monitor(1)
    expect(mockGet).toHaveBeenCalledWith('/test-perf/monitor/1')
  })

  it('monitorHistory — 应发送 GET /test-perf/monitor/:script_id/history', async () => {
    mockGet.mockResolvedValue({ data: [] })
    await perfTestApi.monitorHistory(1)
    expect(mockGet).toHaveBeenCalledWith('/test-perf/monitor/1/history')
  })
})

// =============================================================================
// 21. securityTestApi — 安全测试
// =============================================================================
describe('securityTestApi', () => {
  it('list — 应发送 GET /test-security/scans 并携带参数', async () => {
    mockGet.mockResolvedValue({ data: { items: [], total: 0, page: 1, page_size: 20, total_pages: 0 } })
    const params = { page: 1, page_size: 20, project_id: 1, status: 'completed' }
    await securityTestApi.list(params)
    expect(mockGet).toHaveBeenCalledWith('/test-security/scans', { params })
  })

  it('create — 应发送 POST /test-security/scans', async () => {
    const data = { name: '安全扫描', project_id: 1, type: 'vulnerability' as const }
    mockPost.mockResolvedValue({ data: { id: 1 } })
    await securityTestApi.create(data)
    expect(mockPost).toHaveBeenCalledWith('/test-security/scans', data)
  })

  it('detail — 应发送 GET /test-security/scans/:id', async () => {
    mockGet.mockResolvedValue({ data: { id: 1 } })
    await securityTestApi.detail(1)
    expect(mockGet).toHaveBeenCalledWith('/test-security/scans/1')
  })

  it('delete — 应发送 DELETE /test-security/scans/:id', async () => {
    mockDelete.mockResolvedValue({ data: {} })
    await securityTestApi.delete(1)
    expect(mockDelete).toHaveBeenCalledWith('/test-security/scans/1')
  })

  it('run — 应发送 POST /test-security/scans/:id/run', async () => {
    mockPost.mockResolvedValue({ data: { execution_id: 1 } })
    await securityTestApi.run(1)
    expect(mockPost).toHaveBeenCalledWith('/test-security/scans/1/run')
  })

  it('result — 应发送 GET /test-security/scans/:id/result', async () => {
    mockGet.mockResolvedValue({ data: { scan_id: 1, status: 'completed', findings: [] } })
    await securityTestApi.result(1)
    expect(mockGet).toHaveBeenCalledWith('/test-security/scans/1/result')
  })
})

// =============================================================================
// 22. uiTestApi — UI 测试
// =============================================================================
describe('uiTestApi', () => {
  it('listBaselines — 应发送 GET /test-ui/baselines 并携带参数', async () => {
    mockGet.mockResolvedValue({ data: { items: [], total: 0, page: 1, page_size: 20, total_pages: 0 } })
    const params = { page: 1, page_size: 20, project_id: 1 }
    await uiTestApi.listBaselines(params)
    expect(mockGet).toHaveBeenCalledWith('/test-ui/baselines', { params })
  })

  it('createBaseline — 应发送 POST /test-ui/baselines', async () => {
    const data = { name: '首页基线', project_id: 1, url: '/home', viewport: '1920x1080' }
    mockPost.mockResolvedValue({ data: { id: 1 } })
    await uiTestApi.createBaseline(data)
    expect(mockPost).toHaveBeenCalledWith('/test-ui/baselines', data)
  })

  it('baselineDetail — 应发送 GET /test-ui/baselines/:id', async () => {
    mockGet.mockResolvedValue({ data: { id: 1 } })
    await uiTestApi.baselineDetail(1)
    expect(mockGet).toHaveBeenCalledWith('/test-ui/baselines/1')
  })

  it('deleteBaseline — 应发送 DELETE /test-ui/baselines/:id', async () => {
    mockDelete.mockResolvedValue({ data: {} })
    await uiTestApi.deleteBaseline(1)
    expect(mockDelete).toHaveBeenCalledWith('/test-ui/baselines/1')
  })

  it('visualDiff — 应发送 POST /test-ui/visual-diff', async () => {
    const data = { baseline_id: 1, screenshot_url: 'http://example.com/shot.png' }
    mockPost.mockResolvedValue({ data: { diff_percent: 5.2, diff_image_url: 'http://example.com/diff.png' } })
    await uiTestApi.visualDiff(data)
    expect(mockPost).toHaveBeenCalledWith('/test-ui/visual-diff', data)
  })
})

// =============================================================================
// 23. smokeTestApi — 冒烟测试
// =============================================================================
describe('smokeTestApi', () => {
  it('list — 应发送 GET /test-smoke/suites 并携带参数', async () => {
    mockGet.mockResolvedValue({ data: { items: [], total: 0, page: 1, page_size: 20, total_pages: 0 } })
    const params = { page: 1, page_size: 20, project_id: 1, search: 'smoke' }
    await smokeTestApi.list(params)
    expect(mockGet).toHaveBeenCalledWith('/test-smoke/suites', { params })
  })

  it('create — 应发送 POST /test-smoke/suites', async () => {
    const data = { name: '冒烟测试套件', project_id: 1, description: '基础冒烟' }
    mockPost.mockResolvedValue({ data: { id: 1 } })
    await smokeTestApi.create(data)
    expect(mockPost).toHaveBeenCalledWith('/test-smoke/suites', data)
  })

  it('detail — 应发送 GET /test-smoke/suites/:id', async () => {
    mockGet.mockResolvedValue({ data: { id: 1 } })
    await smokeTestApi.detail(1)
    expect(mockGet).toHaveBeenCalledWith('/test-smoke/suites/1')
  })

  it('update — 应发送 PUT /test-smoke/suites/:id', async () => {
    const data = { name: '更新套件', status: 'ready' as const }
    mockPut.mockResolvedValue({ data: { id: 1 } })
    await smokeTestApi.update(1, data)
    expect(mockPut).toHaveBeenCalledWith('/test-smoke/suites/1', data)
  })

  it('delete — 应发送 DELETE /test-smoke/suites/:id', async () => {
    mockDelete.mockResolvedValue({ data: {} })
    await smokeTestApi.delete(1)
    expect(mockDelete).toHaveBeenCalledWith('/test-smoke/suites/1')
  })

  it('run — 应发送 POST /test-smoke/suites/:id/run', async () => {
    mockPost.mockResolvedValue({ data: { execution_id: 1 } })
    await smokeTestApi.run(1)
    expect(mockPost).toHaveBeenCalledWith('/test-smoke/suites/1/run')
  })

  it('updateAutoTrigger — 应发送 PUT /test-smoke/suites/:id/auto', async () => {
    const config = { auto_trigger: true, trigger_config: { branch: 'main' } }
    mockPut.mockResolvedValue({ data: { id: 1, auto_trigger: true } })
    await smokeTestApi.updateAutoTrigger(1, config)
    expect(mockPut).toHaveBeenCalledWith('/test-smoke/suites/1/auto', config)
  })
})
