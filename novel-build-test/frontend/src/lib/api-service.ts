import apiClient from './api-client'

// ====== 认证 ======
export interface UserInfo {
  id: number
  username: string
  email: string
  display_name: string | null
  role: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export const authApi = {
  /** 登录 */
  login: (username: string, password: string) =>
    apiClient.post('/auth/login', { username, password }),

  /** 注册 */
  register: (data: { username: string; email: string; password: string; display_name?: string }) =>
    apiClient.post('/auth/register', data),

  /** 刷新令牌 */
  refresh: (refresh_token: string) =>
    apiClient.post('/auth/refresh', { refresh_token }),

  /** 获取当前用户信息 */
  me: () => apiClient.get<UserInfo>('/auth/me'),

  /** 修改密码 */
  changePassword: (data: { current_password: string; new_password: string }) =>
    apiClient.post('/auth/change-password', data),
}

// ====== 项目 ======
export interface ProjectItem {
  id: number
  name: string
  description: string | null
  status: 'active' | 'archived' | 'draft'
  repo_url?: string | null
  owner_id?: number
  created_at: string
  updated_at: string
}

export interface PaginatedResponse<T> {
  items: T[]
  total: number
  page: number
  page_size: number
  total_pages: number
}

export const projectApi = {
  /** 获取项目列表 */
  list: (params?: { page?: number; page_size?: number; search?: string }) =>
    apiClient.get<PaginatedResponse<ProjectItem>>('/projects', { params }),

  /** 创建项目 */
  create: (data: { name: string; description?: string; repo_url?: string }) =>
    apiClient.post<ProjectItem>('/projects', data),

  /** 获取项目详情 */
  detail: (id: number) => apiClient.get<ProjectItem>(`/projects/${id}`),

  /** 更新项目 */
  update: (id: number, data: Partial<ProjectItem>) =>
    apiClient.put<ProjectItem>(`/projects/${id}`, data),

  /** 删除项目 */
  delete: (id: number) => apiClient.delete(`/projects/${id}`),

  /** 获取项目统计 */
  stats: (id: number) => apiClient.get<{
    total_requirements: number
    total_environments: number
    total_assets: number
    total_knowledge: number
  }>(`/projects/${id}/stats`),
}

// ====== 需求 ======
export interface RequirementItem {
  id: number
  project_id: number
  title: string
  description: string | null
  module: string | null
  priority: 'P0' | 'P1' | 'P2' | 'P3'
  status: 'draft' | 'review' | 'approved' | 'implemented' | 'rejected'
  created_by: number
  created_at: string
  updated_at: string
}

export const requirementApi = {
  /** 获取需求列表 */
  list: (params?: { page?: number; page_size?: number; project_id?: number; status?: string; priority?: string; search?: string }) =>
    apiClient.get<PaginatedResponse<RequirementItem>>('/requirements', { params }),

  /** 创建需求 */
  create: (data: { project_id: number; title: string; description?: string; module?: string; priority?: string }) =>
    apiClient.post<RequirementItem>('/requirements', data),

  /** 获取需求详情 */
  detail: (id: number) => apiClient.get<RequirementItem>(`/requirements/${id}`),

  /** 更新需求 */
  update: (id: number, data: Record<string, unknown>) =>
    apiClient.put<RequirementItem>(`/requirements/${id}`, data),

  /** 删除需求 */
  delete: (id: number) => apiClient.delete(`/requirements/${id}`),
}

// ====== 测试环境 ======
export interface EnvironmentItem {
  id: number
  project_id: number
  name: string
  type: 'dev' | 'test' | 'staging' | 'production' | 'custom'
  config: Record<string, string> | null
  status: 'preparing' | 'ready' | 'in_use' | 'maintenance' | 'unavailable'
  owner_id: number
  created_at: string
  updated_at: string
}

export const environmentApi = {
  /** 获取环境列表 */
  list: (params?: { page?: number; page_size?: number; project_id?: number; status?: string; type?: string }) =>
    apiClient.get<PaginatedResponse<EnvironmentItem>>('/environments', { params }),

  /** 创建环境 */
  create: (data: { project_id: number; name: string; type?: string; config?: Record<string, string> }) =>
    apiClient.post<EnvironmentItem>('/environments', data),

  /** 获取环境详情 */
  detail: (id: number) => apiClient.get<EnvironmentItem>(`/environments/${id}`),

  /** 更新环境 */
  update: (id: number, data: Record<string, unknown>) =>
    apiClient.put<EnvironmentItem>(`/environments/${id}`, data),

  /** 删除环境 */
  delete: (id: number) => apiClient.delete(`/environments/${id}`),

  /** 健康检查 */
  healthCheck: (id: number) => apiClient.post(`/environments/${id}/health-check`),

  /** 部署环境 */
  deploy: (id: number) => apiClient.post(`/environments/${id}/deploy`),
}

// ====== 测试资产 ======
export interface AssetResponse {
  id: number
  project_id: number
  name: string
  type: 'file' | 'script' | 'data' | 'config' | 'image' | 'other'
  tags: string | null
  file_path: string | null
  file_size: number
  content: string | null
  version: number
  created_by: number
  created_at: string
  updated_at: string
}

export interface AssetUpdate {
  name: string
  type?: string
  tags?: string
  content?: string
}

export const assetApi = {
  /** 获取资产列表 */
  list: (params?: { page?: number; pageSize?: number; project_id?: number; type?: string; tags?: string; search?: string }) =>
    apiClient.get<PaginatedResponse<AssetResponse>>('/assets', { params }),

  /** 创建资产 */
  create: (data: { project_id: number; name: string; type?: string; tags?: string | null; content?: string | null }) =>
    apiClient.post<AssetResponse>('/assets', data),

  /** 获取资产详情 */
  getById: (id: number) => apiClient.get<AssetResponse>(`/assets/${id}`),

  /** 更新资产 */
  update: (id: number, data: AssetUpdate) =>
    apiClient.put<AssetResponse>(`/assets/${id}`, data),

  /** 删除资产 */
  delete: (id: number) => apiClient.delete(`/assets/${id}`),
}

// ====== 系统设置 ======
export interface SettingItem {
  id: number
  key: string
  value: string
  description: string | null
  updated_at: string
}

export const settingsApi = {
  /** 获取全部设置 */
  list: () => apiClient.get<SettingItem[]>('/settings'),

  /** 获取单项设置 */
  getByKey: (key: string) => apiClient.get<SettingItem>(`/settings/${encodeURIComponent(key)}`),

  /** 创建设置 */
  create: (data: { key: string; value: string; description?: string }) =>
    apiClient.post<SettingItem>('/settings', data),

  /** 更新设置 */
  update: (key: string, data: { value: string; description?: string }) =>
    apiClient.put<SettingItem>(`/settings/${encodeURIComponent(key)}`, data),

  /** 删除设置 */
  delete: (key: string) => apiClient.delete(`/settings/${encodeURIComponent(key)}`),
}

// ====== AI 知识库 ======
export interface KnowledgeItem {
  id: number
  project_id: number
  title: string
  content: string | null
  source: 'manual' | 'file' | 'api'
  tags: string | null
  collection_name: string
  vector_id: string | null
  vector_synced: boolean
  created_by: number
  created_at: string
  updated_at: string
}

export const knowledgeApi = {
  /** 获取知识列表 */
  list: (params?: { page?: number; pageSize?: number; project_id?: number; collection?: string; source?: string; search?: string }) =>
    apiClient.get<PaginatedResponse<KnowledgeItem>>('/knowledge', { params }),

  /** 创建知识条目 */
  create: (data: { project_id: number; title: string; content?: string | null; source?: string; tags?: string | null; collection_name?: string }) =>
    apiClient.post<KnowledgeItem>('/knowledge', data),

  /** 获取知识详情 */
  getById: (id: number) => apiClient.get<KnowledgeItem>(`/knowledge/${id}`),

  /** 更新知识 */
  update: (id: number, data: { title?: string; content?: string | null; source?: string; tags?: string | null }) =>
    apiClient.put<KnowledgeItem>(`/knowledge/${id}`, data),

  /** 删除知识 */
  delete: (id: number) => apiClient.delete(`/knowledge/${id}`),

  /** 同步到向量库 */
  sync: (id: number) => apiClient.post<KnowledgeItem>(`/knowledge/${id}/sync`),

  /** 语义搜索 */
  search: (params: { query: string; collection_name?: string; limit?: number }) =>
    apiClient.post<Array<{ id: string; score: number; payload: Record<string, unknown> }>>('/knowledge/search', params),
}

// ====== 用户管理 ======
export interface UserItem {
  id: number
  username: string
  email: string
  display_name: string | null
  role: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export const userApi = {
  /** 获取用户列表 */
  list: (params?: { page?: number; page_size?: number; search?: string; role?: string; status?: string }) =>
    apiClient.get<PaginatedResponse<UserItem>>('/users', { params }),

  /** 获取用户详情 */
  detail: (id: number) => apiClient.get<UserItem>(`/users/${id}`),

  /** 创建用户 */
  create: (data: { username: string; email: string; password: string; display_name?: string }) =>
    apiClient.post<UserItem>('/users', data),

  /** 更新用户 */
  update: (id: number, data: { display_name?: string; email?: string; role?: string; is_active?: boolean }) =>
    apiClient.put<UserItem>(`/users/${id}`, data),

  /** 删除用户 */
  delete: (id: number) => apiClient.delete(`/users/${id}`),

  /** 更新用户角色 */
  updateRole: (id: number, role: string) =>
    apiClient.put<UserItem>(`/users/${id}/role`, { role }),

  /** 更新用户状态 */
  updateStatus: (id: number, is_active: boolean) =>
    apiClient.put<UserItem>(`/users/${id}/status`, { is_active }),

  /** 重置用户密码 */
  resetPassword: (id: number, new_password: string) =>
    apiClient.post(`/users/${id}/reset-password`, { new_password }),
}

// ====== 角色管理 ======
export interface RoleItem {
  id: number
  name: string
  code: string
  description: string | null
  menu_permissions: string[] | null
  data_scope: 'all' | 'project' | 'self'
  user_count: number
  created_at: string
  updated_at: string
}

export const roleApi = {
  /** 获取角色列表 */
  list: (params?: { page?: number; page_size?: number; search?: string }) =>
    apiClient.get<PaginatedResponse<RoleItem>>('/roles', { params }),

  /** 获取角色详情 */
  detail: (id: number) => apiClient.get<RoleItem>(`/roles/${id}`),

  /** 创建角色 */
  create: (data: { name: string; code: string; description?: string; menu_permissions?: string[]; data_scope?: string }) =>
    apiClient.post<RoleItem>('/roles', data),

  /** 更新角色 */
  update: (id: number, data: { name?: string; description?: string; menu_permissions?: string[]; data_scope?: string }) =>
    apiClient.put<RoleItem>(`/roles/${id}`, data),

  /** 删除角色 */
  delete: (id: number) => apiClient.delete(`/roles/${id}`),
}

// ====== 审计日志 ======
export interface AuditLogItem {
  id: number
  entity_type: string
  entity_id: number
  action: 'create' | 'update' | 'delete' | 'login' | 'export'
  actor: string
  detail: string
  ip_address: string
  created_at: string
}

export const auditApi = {
  /** 审计日志列表 */
  list: (params?: { page?: number; page_size?: number; entity_type?: string; entity_id?: number }) =>
    apiClient.get<PaginatedResponse<AuditLogItem>>('/audit-logs', { params }),

  /** 实体审计轨迹 */
  entityTrail: (entity_type: string, entity_id: number) =>
    apiClient.get<AuditLogItem[]>(`/audit-logs/entity/${entity_type}/${entity_id}`),
}

// ====== 智能体 ======
export interface AgentExecution {
  id: number
  project_id: number
  project_name?: string
  task_type: string
  status: 'running' | 'completed' | 'failed' | 'pending'
  progress: number
  result?: string
  cost?: number
  tokens_used?: number
  started_at: string
  completed_at?: string
}

export interface DebateRecord {
  id: number
  execution_id?: number
  topic: string
  pro_side: string
  con_side: string
  rounds: DebateRound[]
  consensus: boolean
  consensus_summary?: string
  created_at: string
}

export interface DebateRound {
  round: number
  pro_argument: string
  con_argument: string
}

export interface CostStats {
  total_cost: number
  total_calls: number
  total_tokens: number
  model_usage: Array<{ model: string; cost: number; calls: number; tokens: number }>
  daily_costs: Array<{ date: string; cost: number; calls: number }>
  recent_executions: AgentExecution[]
}

export const agentApi = {
  /** 执行智能体 */
  execute: (data: { project_id: number; task_type: string; project_name?: string; project_description?: string }) =>
    apiClient.post<AgentExecution>('/agents/execute', data),

  /** 发起辩论 */
  debate: (data: { topic: string; pro_side: string; con_side: string; execution_id?: number }) =>
    apiClient.post<DebateRecord>('/agents/debate', data),

  /** 执行列表 */
  executions: (params?: { page?: number; page_size?: number; project_id?: number; status?: string }) =>
    apiClient.get<PaginatedResponse<AgentExecution>>('/agents/executions', { params }),

  /** 执行详情 */
  executionDetail: (id: number) => apiClient.get<AgentExecution>(`/agents/executions/${id}`),

  /** 辩论记录 */
  debates: (params?: { page?: number; page_size?: number; execution_id?: number }) =>
    apiClient.get<PaginatedResponse<DebateRecord>>('/agents/debates', { params }),

  /** 成本统计 */
  costs: () => apiClient.get<CostStats>('/agents/costs'),

  /** AI-Native: 调度全流程执行（支持中文/英文双通） */
  dispatch: (data: {
    project_id?: number;
    project_name?: string;
    requirement_doc?: string;
    execution_mode?: string;
    项目ID?: number;
    项目名称?: string;
    需求文档?: string;
    执行模式?: string;
  }) => apiClient.post('/agents/dispatch', data),

  /** AI-Native: 启动辩论（支持中文/英文双通） */
  startDebate: (data: {
    topic?: string;
    pro_side?: string;
    con_side?: string;
    max_rounds?: number;
    议题?: string;
    论点列表?: string[];
    最大轮次?: number;
  }) => apiClient.post('/agents/debate', data),

  /** AI-Native: 执行单个智能体（支持中文/英文双通） */
  executeAgent: (data: {
    agent?: string;
    input?: Record<string, unknown>;
    智能体?: string;
    输入?: Record<string, unknown>;
  }) => apiClient.post('/agents/execute-single', data),

  // ====== 需求分析智能体 ======
  /** 触发需求分析 */
  requirementsAnalyze: (data: { requirement_text: string; project_id?: number }) =>
    apiClient.post<{ execution_id: number; status: string }>('/agents/requirements/analyze', data),

  /** 需求分析状态 */
  requirementsStatus: (execution_id: number) =>
    apiClient.get<{ execution_id: number; status: string }>(`/agents/requirements/${execution_id}/status`),

  /** 需求分析结果 */
  requirementsResult: (execution_id: number) =>
    apiClient.get<{ execution_id: number; status: string; result: unknown }>(`/agents/requirements/${execution_id}/result`),

  // ====== 测试架构智能体 ======
  /** 触发架构设计 */
  architectDesign: (data: { requirement_id?: number; requirement_text?: string }) =>
    apiClient.post<{ execution_id: number; status: string }>('/agents/architect/design', data),

  /** 架构设计状态 */
  architectStatus: (execution_id: number) =>
    apiClient.get<{ execution_id: number; status: string }>(`/agents/architect/${execution_id}/status`),

  /** 架构设计结果 */
  architectResult: (execution_id: number) =>
    apiClient.get<{ execution_id: number; status: string; result: unknown }>(`/agents/architect/${execution_id}/result`),

  // ====== 测试设计智能体 ======
  /** 触发场景设计 */
  designerDesign: (data: { architecture_id?: number; requirement_text?: string }) =>
    apiClient.post<{ execution_id: number; status: string }>('/agents/designer/design', data),

  /** 场景设计状态 */
  designerStatus: (execution_id: number) =>
    apiClient.get<{ execution_id: number; status: string }>(`/agents/designer/${execution_id}/status`),

  /** 场景设计结果 */
  designerResult: (execution_id: number) =>
    apiClient.get<{ execution_id: number; status: string; result: unknown }>(`/agents/designer/${execution_id}/result`),

  // ====== 用例编写智能体 ======
  /** 触发用例生成 */
  casewriterGenerate: (data: { design_id?: number; scenario_text?: string }) =>
    apiClient.post<{ execution_id: number; status: string }>('/agents/casewriter/generate', data),

  /** 用例生成状态 */
  casewriterStatus: (execution_id: number) =>
    apiClient.get<{ execution_id: number; status: string }>(`/agents/casewriter/${execution_id}/status`),

  /** 用例生成结果 */
  casewriterResult: (execution_id: number) =>
    apiClient.get<{ execution_id: number; status: string; result: unknown }>(`/agents/casewriter/${execution_id}/result`),

  /** 导入测试用例 */
  casewriterImport: (execution_id: number) =>
    apiClient.post<{ message: string }>(`/agents/casewriter/${execution_id}/import`),

  // ====== 执行分析智能体 ======
  /** 触发执行分析 */
  executionAnalyze: (data: { execution_id?: number; log_text?: string }) =>
    apiClient.post<{ execution_id: number; status: string }>('/agents/execution/analyze', data),

  /** 执行分析状态 */
  executionStatus: (execution_id: number) =>
    apiClient.get<{ execution_id: number; status: string }>(`/agents/execution/${execution_id}/status`),

  /** 执行分析结果 */
  executionResult: (execution_id: number) =>
    apiClient.get<{ execution_id: number; status: string; result: unknown }>(`/agents/execution/${execution_id}/result`),

  // ====== 质量审计智能体 ======
  /** 触发质量审计 */
  qualityAudit: (data: { execution_id?: number; project_id?: number }) =>
    apiClient.post<{ execution_id: number; status: string }>('/agents/quality/audit', data),

  /** 质量审计状态 */
  qualityStatus: (execution_id: number) =>
    apiClient.get<{ execution_id: number; status: string }>(`/agents/quality/${execution_id}/status`),

  /** 质量审计结果 */
  qualityResult: (execution_id: number) =>
    apiClient.get<{ execution_id: number; status: string; result: unknown }>(`/agents/quality/${execution_id}/result`),

  // ====== 成本相关 ======
  /** 成本概览 */
  costOverview: () => apiClient.get('/agents/cost/overview'),

  /** 成本趋势 */
  costTrend: () => apiClient.get('/agents/cost/trend'),

  /** 成本分布 */
  costDistribution: () => apiClient.get('/agents/cost/distribution'),

  /** 成本优化建议 */
  costSuggestions: () => apiClient.get('/agents/cost/suggestions'),
}

// ====== 测试执行 ======
export interface ExecutionItem {
  id: number
  project_id: number
  name: string
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled'
  agent_execution_id: number | null
  summary: { total?: number; passed?: number; failed?: number; skipped?: number; duration?: number } | null
  error_message: string | null
  created_by: number
  started_at: string
  completed_at: string | null
  created_at: string
  updated_at: string
}

export const executionApi = {
  /** 获取项目级执行列表 */
  list: (projectId: number, params?: { page?: number; page_size?: number; status?: string }) =>
    apiClient.get<PaginatedResponse<ExecutionItem>>(`/projects/${projectId}/executions`, { params }),

  /** 创建执行 */
  create: (projectId: number, data: { name: string; agent_execution_id?: number }) =>
    apiClient.post<ExecutionItem>(`/projects/${projectId}/executions`, data),

  /** 获取执行详情 */
  detail: (id: number) => apiClient.get<ExecutionItem>(`/executions/${id}`),

  /** 取消执行 */
  cancel: (id: number) => apiClient.patch<ExecutionItem>(`/executions/${id}/cancel`),

  /** 删除执行 */
  delete: (id: number) => apiClient.delete(`/executions/${id}`),

  /** SSE 日志流 URL */
  executionStreamUrl: (id: number) => `/api/v1/executions/${id}/stream`,
}

// ====== 测试报告 ======
export interface ReportItem {
  id: number
  execution_id: number
  total_cases: number
  passed: number
  failed: number
  skipped: number
  duration: number | null
  pass_rate: number
  summary: string | null
  details: Array<{ name: string; status: string; duration: number; error?: string }> | null
  quality_score: number | null
  created_by: number
  created_at: string
}

export const reportApi = {
  /** 获取指定执行的报告 */
  getByExecution: (executionId: number) =>
    apiClient.get<ReportItem>(`/executions/${executionId}/report`),

  /** 创建报告 */
  create: (executionId: number, data: {
    total_cases: number; passed: number; failed: number; skipped: number;
    duration?: number; summary?: string; details?: Array<unknown>;
  }) => apiClient.post<ReportItem>(`/executions/${executionId}/report`, data),

  /** 获取全局报告列表（分页） */
  list: (params?: { page?: number; page_size?: number; project_id?: number }) =>
    apiClient.get<PaginatedResponse<ReportItem>>('/reports', { params }),

  /** 获取报告详情 */
  detail: (reportId: number) =>
    apiClient.get<ReportItem>(`/reports/${reportId}`),
}

// ====== AI 助手 ======
export interface QuickActionItem {
  key: string
  label: string
  icon: string
}

export interface AssistantOverviewData {
  project_count: number
  execution_count: number
  pass_rate: number
  recent_activities: Array<{
    id: number
    action: string
    entity_type: string
    entity_id: number
    actor_name: string
    created_at: string
  }>
}

export const aiAssistantApi = {
  /** 获取快捷操作列表 */
  quickActions: () =>
    apiClient.get<QuickActionItem[]>('/ai-assistant/quick-actions'),

  /** 获取概览数据 */
  overview: () =>
    apiClient.get<AssistantOverviewData>('/ai-assistant/overview'),

  /** 发送聊天消息 */
  chat: (message: string) =>
    apiClient.post<{ reply: string }>('/ai-assistant/chat', { message }),
}

// ====== AI-Native 子系统 ======
export const aiNativeApi = {
  /** 系统健康状态 */
  health: () => apiClient.get<{
    status: string
    app: string
    version: string
    subsystem_status: {
      database: string
      vector_db: string
      event_bus: string
    }
  }>('/health'),

  /** 向量集合列表 */
  getCollections: () => apiClient.get('/vector-db/collections'),

  /** 语义检索 */
  searchVectorDb: (data: { query?: string; collection_name?: string; limit?: number; 文本?: string; 集合?: string; 限制?: number }) =>
    apiClient.post('/vector-db/search', data),
}

// ====== 功能测试 ======
export interface FunctionalTestCaseItem {
  id: number
  project_id: number
  title: string
  module: string | null
  priority: 'P0' | 'P1' | 'P2' | 'P3'
  status: 'draft' | 'ready' | 'passed' | 'failed' | 'blocked'
  precondition: string | null
  steps: string | null
  expected: string | null
  created_by: number
  created_at: string
  updated_at: string
}

export const functionalTestApi = {
  /** 获取功能测试用例列表 */
  list: (params?: { page?: number; page_size?: number; project_id?: number; status?: string; search?: string }) =>
    apiClient.get<PaginatedResponse<FunctionalTestCaseItem>>('/test-functional/cases', { params }),

  /** 创建功能测试用例 */
  create: (data: Partial<FunctionalTestCaseItem>) =>
    apiClient.post<FunctionalTestCaseItem>('/test-functional/cases', data),

  /** 获取用例详情 */
  detail: (id: number) => apiClient.get<FunctionalTestCaseItem>(`/test-functional/cases/${id}`),

  /** 更新用例 */
  update: (id: number, data: Partial<FunctionalTestCaseItem>) =>
    apiClient.put<FunctionalTestCaseItem>(`/test-functional/cases/${id}`, data),

  /** 删除用例 */
  delete: (id: number) => apiClient.delete(`/test-functional/cases/${id}`),

  /** 批量导入 */
  importCases: (data: { cases: Partial<FunctionalTestCaseItem>[] }) =>
    apiClient.post<{ imported: number }>('/test-functional/cases/import', data),

  /** 执行用例 */
  run: (id: number) => apiClient.post<{ execution_id: number }>(`/test-functional/cases/${id}/run`),
}

// ====== 接口测试 ======
export interface ApiTestCaseItem {
  id: number
  project_id: number
  name: string
  url: string
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH'
  headers: Record<string, string> | null
  body: string | null
  expected_status: number
  expected_body: string | null
  auto_test: boolean
  status: 'draft' | 'ready' | 'passed' | 'failed'
  created_by: number
  created_at: string
  updated_at: string
}

export const apiTestApi = {
  /** 获取接口测试用例列表 */
  list: (params?: { page?: number; page_size?: number; project_id?: number; search?: string }) =>
    apiClient.get<PaginatedResponse<ApiTestCaseItem>>('/test-api/cases', { params }),

  /** 创建接口测试用例 */
  create: (data: Partial<ApiTestCaseItem>) =>
    apiClient.post<ApiTestCaseItem>('/test-api/cases', data),

  /** 获取用例详情 */
  detail: (id: number) => apiClient.get<ApiTestCaseItem>(`/test-api/cases/${id}`),

  /** 更新用例 */
  update: (id: number, data: Partial<ApiTestCaseItem>) =>
    apiClient.put<ApiTestCaseItem>(`/test-api/cases/${id}`, data),

  /** 删除用例 */
  delete: (id: number) => apiClient.delete(`/test-api/cases/${id}`),

  /** 切换自动化开关 */
  toggleAuto: (id: number, auto_test: boolean) =>
    apiClient.put<ApiTestCaseItem>(`/test-api/cases/${id}/auto`, { auto_test }),

  /** 执行用例 */
  run: (id: number) => apiClient.post<{ execution_id: number }>(`/test-api/cases/${id}/run`),
}

// ====== Web自动化测试 ======
export interface WebScriptItem {
  id: number
  project_id: number
  name: string
  description: string | null
  type: 'selenium' | 'playwright' | 'cypress'
  content: string | null
  status: 'draft' | 'ready' | 'passed' | 'failed'
  created_by: number
  created_at: string
  updated_at: string
}

export const webTestApi = {
  /** 获取 Web 自动化脚本列表 */
  list: (params?: { page?: number; page_size?: number; project_id?: number; search?: string }) =>
    apiClient.get<PaginatedResponse<WebScriptItem>>('/test-web/scripts', { params }),

  /** 获取脚本详情 */
  detail: (id: number) => apiClient.get<WebScriptItem>(`/test-web/scripts/${id}`),

  /** 创建脚本 */
  create: (data: Partial<WebScriptItem>) =>
    apiClient.post<WebScriptItem>('/test-web/scripts', data),

  /** 更新脚本 */
  update: (id: number, data: Partial<WebScriptItem>) =>
    apiClient.put<WebScriptItem>(`/test-web/scripts/${id}`, data),

  /** 删除脚本 */
  delete: (id: number) => apiClient.delete(`/test-web/scripts/${id}`),

  /** 执行脚本 */
  run: (id: number) => apiClient.post<{ execution_id: number }>(`/test-web/scripts/${id}/run`),

  /** 获取执行结果 */
  result: (id: number) => apiClient.get<{ status: string; output: string }>(`/test-web/scripts/${id}/result`),
}

// ====== App自动化测试 ======
export interface AppScriptItem {
  id: number
  project_id: number
  name: string
  description: string | null
  platform: 'android' | 'ios' | 'both'
  content: string | null
  status: 'draft' | 'ready' | 'passed' | 'failed'
  created_by: number
  created_at: string
  updated_at: string
}

export interface AppDeviceItem {
  id: number
  name: string
  platform: 'android' | 'ios'
  version: string
  status: 'online' | 'offline' | 'busy'
  udid: string
  created_at: string
}

export const appTestApi = {
  /** 获取 App 自动化脚本列表 */
  listScripts: (params?: { page?: number; page_size?: number; project_id?: number; search?: string }) =>
    apiClient.get<PaginatedResponse<AppScriptItem>>('/test-app/scripts', { params }),

  /** 创建脚本 */
  createScript: (data: Partial<AppScriptItem>) =>
    apiClient.post<AppScriptItem>('/test-app/scripts', data),

  /** 更新脚本 */
  updateScript: (id: number, data: Partial<AppScriptItem>) =>
    apiClient.put<AppScriptItem>(`/test-app/scripts/${id}`, data),

  /** 删除脚本 */
  deleteScript: (id: number) => apiClient.delete(`/test-app/scripts/${id}`),

  /** 执行脚本 */
  runScript: (id: number) => apiClient.post<{ execution_id: number }>(`/test-app/scripts/${id}/run`),

  /** 获取设备列表 */
  listDevices: (params?: { page?: number; page_size?: number; status?: string }) =>
    apiClient.get<PaginatedResponse<AppDeviceItem>>('/test-app/devices', { params }),

  /** 创建设备 */
  createDevice: (data: Partial<AppDeviceItem>) =>
    apiClient.post<AppDeviceItem>('/test-app/devices', data),

  /** 更新设备 */
  updateDevice: (id: number, data: Partial<AppDeviceItem>) =>
    apiClient.put<AppDeviceItem>(`/test-app/devices/${id}`, data),

  /** 删除设备 */
  deleteDevice: (id: number) => apiClient.delete(`/test-app/devices/${id}`),
}

// ====== 性能测试 ======
export interface PerfScriptItem {
  id: number
  project_id: number
  name: string
  description: string | null
  type: 'jmeter' | 'locust' | 'k6' | 'custom'
  content: string | null
  config: Record<string, unknown> | null
  status: 'draft' | 'ready' | 'running' | 'passed' | 'failed'
  created_by: number
  created_at: string
  updated_at: string
}

export interface PerfMonitorItem {
  id: number
  script_id: number
  timestamp: string
  tps: number
  avg_response_time: number
  error_rate: number
  cpu_usage: number
  memory_usage: number
}

export const perfTestApi = {
  /** 获取性能测试脚本列表 */
  list: (params?: { page?: number; page_size?: number; project_id?: number; search?: string }) =>
    apiClient.get<PaginatedResponse<PerfScriptItem>>('/test-perf/scripts', { params }),

  /** 创建脚本 */
  create: (data: Partial<PerfScriptItem>) =>
    apiClient.post<PerfScriptItem>('/test-perf/scripts', data),

  /** 更新脚本 */
  update: (id: number, data: Partial<PerfScriptItem>) =>
    apiClient.put<PerfScriptItem>(`/test-perf/scripts/${id}`, data),

  /** 删除脚本 */
  delete: (id: number) => apiClient.delete(`/test-perf/scripts/${id}`),

  /** 执行脚本 */
  run: (id: number) => apiClient.post<{ execution_id: number }>(`/test-perf/scripts/${id}/run`),

  /** 获取脚本监控 */
  monitor: (script_id: number) => apiClient.get<PerfMonitorItem>(`/test-perf/monitor/${script_id}`),

  /** 获取监控历史 */
  monitorHistory: (script_id: number) => apiClient.get<PerfMonitorItem[]>(`/test-perf/monitor/${script_id}/history`),
}

// ====== 安全测试 ======
export interface SecurityScanItem {
  id: number
  project_id: number
  name: string
  type: 'vulnerability' | 'dependency' | 'code_scan' | 'compliance'
  status: 'pending' | 'running' | 'completed' | 'failed'
  severity: 'critical' | 'high' | 'medium' | 'low' | null
  result_summary: string | null
  created_by: number
  created_at: string
  updated_at: string
}

export const securityTestApi = {
  /** 获取安全扫描列表 */
  list: (params?: { page?: number; page_size?: number; project_id?: number; status?: string }) =>
    apiClient.get<PaginatedResponse<SecurityScanItem>>('/test-security/scans', { params }),

  /** 创建扫描 */
  create: (data: Partial<SecurityScanItem>) =>
    apiClient.post<SecurityScanItem>('/test-security/scans', data),

  /** 获取扫描详情 */
  detail: (id: number) => apiClient.get<SecurityScanItem>(`/test-security/scans/${id}`),

  /** 删除扫描 */
  delete: (id: number) => apiClient.delete(`/test-security/scans/${id}`),

  /** 运行扫描 */
  run: (id: number) => apiClient.post<{ execution_id: number }>(`/test-security/scans/${id}/run`),

  /** 获取扫描结果 */
  result: (id: number) => apiClient.get<{ scan_id: number; status: string; findings: unknown[] }>(`/test-security/scans/${id}/result`),
}

// ====== UI测试 ======
export interface UIBaselineItem {
  id: number
  project_id: number
  name: string
  url: string
  viewport: string
  image_url: string
  diff_threshold: number
  created_by: number
  created_at: string
}

export const uiTestApi = {
  /** 获取视觉基线列表 */
  listBaselines: (params?: { page?: number; page_size?: number; project_id?: number }) =>
    apiClient.get<PaginatedResponse<UIBaselineItem>>('/test-ui/baselines', { params }),

  /** 创建基线 */
  createBaseline: (data: Partial<UIBaselineItem>) =>
    apiClient.post<UIBaselineItem>('/test-ui/baselines', data),

  /** 获取基线详情 */
  baselineDetail: (id: number) => apiClient.get<UIBaselineItem>(`/test-ui/baselines/${id}`),

  /** 删除基线 */
  deleteBaseline: (id: number) => apiClient.delete(`/test-ui/baselines/${id}`),

  /** 视觉差异对比 */
  visualDiff: (data: { baseline_id: number; screenshot_url: string }) =>
    apiClient.post<{ diff_percent: number; diff_image_url: string }>('/test-ui/visual-diff', data),
}

// ====== 冒烟测试 ======
export interface SmokeSuiteItem {
  id: number
  project_id: number
  name: string
  description: string | null
  status: 'draft' | 'ready' | 'passed' | 'failed'
  auto_trigger: boolean
  trigger_config: Record<string, unknown> | null
  last_run_at: string | null
  last_run_status: string | null
  created_by: number
  created_at: string
  updated_at: string
}

export const smokeTestApi = {
  /** 获取冒烟测试套件列表 */
  list: (params?: { page?: number; page_size?: number; project_id?: number; search?: string }) =>
    apiClient.get<PaginatedResponse<SmokeSuiteItem>>('/test-smoke/suites', { params }),

  /** 创建套件 */
  create: (data: Partial<SmokeSuiteItem>) =>
    apiClient.post<SmokeSuiteItem>('/test-smoke/suites', data),

  /** 获取套件详情 */
  detail: (id: number) => apiClient.get<SmokeSuiteItem>(`/test-smoke/suites/${id}`),

  /** 更新套件 */
  update: (id: number, data: Partial<SmokeSuiteItem>) =>
    apiClient.put<SmokeSuiteItem>(`/test-smoke/suites/${id}`, data),

  /** 删除套件 */
  delete: (id: number) => apiClient.delete(`/test-smoke/suites/${id}`),

  /** 运行套件 */
  run: (id: number) => apiClient.post<{ execution_id: number }>(`/test-smoke/suites/${id}/run`),

  /** 更新自动触发配置 */
  updateAutoTrigger: (id: number, config: { auto_trigger: boolean; trigger_config?: Record<string, unknown> }) =>
    apiClient.put<SmokeSuiteItem>(`/test-smoke/suites/${id}/auto`, config),
}
