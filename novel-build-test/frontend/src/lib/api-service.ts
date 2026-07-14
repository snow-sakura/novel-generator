import apiClient from './api-client'

// ====== 认证 ======
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
}

// ====== 项目 ======
export interface ProjectItem {
  id: number
  name: string
  description: string
  status: 'active' | 'archived' | 'draft'
  created_at: string
  manager?: string
  stats?: {
    total_cases: number
    passed: number
    failed: number
    blocked: number
    executions: number
    bugs: number
  }
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

  /** AI-Native: 调度全流程执行 */
  dispatch: (data: { project_id: number; project_name?: string; 需求文档?: string; 执行模式?: string }) =>
    apiClient.post('/agents/dispatch', data),

  /** AI-Native: 启动辩论 */
  startDebate: (data: { 议题: string; 论点列表?: string[]; 最大轮次?: number }) =>
    apiClient.post('/agents/debate', data),

  /** AI-Native: 执行单个智能体 */
  executeAgent: (data: { 智能体: string; 输入?: Record<string, unknown> }) =>
    apiClient.post('/agents/execute-single', data),
}

// ====== AI-Native 子系统 ======
export const aiNativeApi = {
  /** 系统健康状态 */
  health: () => apiClient.get<{
    status: string
    app: string
    version: string
    子系统状态: {
      数据库: string
      向量数据库: string
      事件总线: string
    }
  }>('/health'),

  /** 向量集合列表 */
  向量集合列表: () => apiClient.get('/vector-db/collections'),

  /** 语义检索 */
  语义检索: (data: { 文本: string; 集合?: string; 限制?: number }) =>
    apiClient.post('/vector-db/search', data),
}
