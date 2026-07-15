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
