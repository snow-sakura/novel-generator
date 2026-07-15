import { lazy, type ComponentType } from 'react'
import {
  FolderKanban,
  FileText,
  Server,
  Package,
  BookOpen,
  Settings,
  BrainCircuit,
  ListChecks,
  BarChart3,
  MessageSquare,
  DollarSign,
  ClipboardCheck,
  GitCompareArrows,
  TestTube2,
  Globe,
  Smartphone,
  Gauge,
  Shield,
  Paintbrush,
  Zap,
  PenTool,
  Mic,
  Cpu,
  Workflow,
  Database,
  Bell,
  Plug,
  ScrollText,
  Users,
  User,
  Sparkles,
  Bot,
  Lock,
  Puzzle,
  Send,
  type LucideIcon,
} from 'lucide-react'

/** 二级功能定义 */
export interface SubFeature {
  key: string
  title: string
  subtitle: string
  icon: LucideIcon
  color: string
  component: ComponentType
}

/** 大模块定义 */
export interface Module {
  key: string
  title: string
  subtitle: string
  icon: LucideIcon
  color: string
  signature: string
  group: string
  subFeatures: SubFeature[]
  status?: 'active' | 'pending' | 'beta'
  lastRunTime?: string
}


/** 所有大模块配置 — 按 7 个分组排列 */
export const modules: Module[] = [

  // ═══════════════════════════════════════
  // 1. 公共模块（平台基础设施）
  // ═══════════════════════════════════════
  {
    key: 'settings',
    title: '系统设置',
    subtitle: '键值配置与全局参数',
    icon: Settings,
    color: '#6B7280',
    signature: 'System Settings',
    group: '公共模块',
    subFeatures: [
      { key: 'settings-config', title: '系统配置', subtitle: '密钥、模型与参数设置', icon: Settings, color: '#6B7280', component: lazy(() => import('@/pages/settings/SettingsPage')) },
    ],
  },
  {
    key: 'audit',
    title: '审计日志',
    subtitle: '操作记录与实体轨迹追踪',
    icon: ScrollText,
    color: '#78716C',
    signature: 'Audit Logs',
    group: '公共模块',
    subFeatures: [
      { key: 'audit-list', title: '日志列表', subtitle: '分页查看操作记录', icon: ScrollText, color: '#78716C', component: lazy(() => import('@/pages/audit/AuditLogPage')) },
    ],
  },
  {
    key: 'auth',
    title: '认证与安全',
    subtitle: '注册、登录与令牌管理',
    icon: Shield,
    color: '#DC2626',
    signature: 'Auth & Security',
    group: '公共模块',
    subFeatures: [
      { key: 'auth-users', title: '用户管理', subtitle: '注册、登录与权限控制', icon: Users, color: '#DC2626', component: lazy(() => import('@/pages/auth/AuthSecurityPage')) },
    ],
  },
  {
    key: 'integration',
    title: '集成与通知',
    subtitle: 'CI/CD、外部工具与消息推送',
    icon: Bell,
    color: '#F59E0B',
    signature: 'Integration',
    group: '公共模块',
    subFeatures: [
      { key: 'int-cicd', title: 'CI/CD 集成', subtitle: 'Jenkins/GitHub Actions Webhook', icon: Workflow, color: '#059669', component: lazy(() => import('@/pages/integration/IntegrationPage')) },
      { key: 'int-notify', title: '通知渠道', subtitle: '邮件/钉钉/飞书/Slack 推送', icon: Bell, color: '#F59E0B', component: lazy(() => import('@/pages/integration/IntegrationPage')) },
      { key: 'int-tools', title: '外部工具对接', subtitle: 'Jira/禅道缺陷同步、Git 仓库', icon: Plug, color: '#3B82F6', component: lazy(() => import('@/pages/integration/IntegrationPage')) },
      { key: 'int-device', title: '设备云连接', subtitle: 'BrowserStack/Sauce Labs 配置', icon: Globe, color: '#0891B2', component: lazy(() => import('@/pages/integration/IntegrationPage')) },
    ],
  },

  // ═══════════════════════════════════════
  // 2. 项目模块（业务管理）
  // ═══════════════════════════════════════
  {
    key: 'projects',
    title: '项目管理',
    subtitle: '测试项目全生命周期管理',
    icon: FolderKanban,
    color: '#F59E0B',
    signature: 'Project Management',
    group: '项目模块',
    subFeatures: [
      { key: 'project-list', title: '项目列表', subtitle: '查看和管理所有测试项目', icon: FolderKanban, color: '#F59E0B', component: lazy(() => import('@/pages/projects/ProjectListPage')) },
    ],
  },
  {
    key: 'requirements',
    title: '需求管理',
    subtitle: '需求录入、追踪与状态流转',
    icon: FileText,
    color: '#3B82F6',
    signature: 'Requirements',
    group: '项目模块',
    subFeatures: [
      { key: 'requirements-list', title: '需求列表', subtitle: '测试需求与功能模块追踪', icon: FileText, color: '#3B82F6', component: lazy(() => import('@/pages/requirements/RequirementsPage')) },
    ],
  },
  {
    key: 'environments',
    title: '测试环境',
    subtitle: '环境配置、健康检查与部署',
    icon: Server,
    color: '#10B981',
    signature: 'Environments',
    group: '项目模块',
    subFeatures: [
      { key: 'env-list', title: '环境列表', subtitle: '环境配置与部署管理', icon: Server, color: '#10B981', component: lazy(() => import('@/pages/environments/EnvironmentListPage')) },
    ],
  },
  {
    key: 'assets',
    title: '测试资产库',
    subtitle: '测试数据、脚本、文档管理',
    icon: Package,
    color: '#8B5CF6',
    signature: 'Test Assets',
    group: '项目模块',
    subFeatures: [
      { key: 'asset-list', title: '资产列表', subtitle: '测试数据与脚本资产管理', icon: Package, color: '#8B5CF6', component: lazy(() => import('@/pages/assets/AssetListPage')) },
    ],
  },
  {
    key: 'knowledge',
    title: 'AI 知识库',
    subtitle: '向量知识存储与语义检索',
    icon: BookOpen,
    color: '#EC4899',
    signature: 'AI Knowledge',
    group: '项目模块',
    subFeatures: [
      { key: 'knowledge-list', title: '知识库管理', subtitle: '知识条目创建与向量同步', icon: BookOpen, color: '#EC4899', component: lazy(() => import('@/pages/knowledge/KnowledgeListPage')) },
    ],
  },

  // ═══════════════════════════════════════
  // 3. AI 智能体（9 个 Agent）
  // ═══════════════════════════════════════
  {
    key: 'agent-dispatch', title: '调度总控', subtitle: '任务分发 · 流程编排 · 4 种工作流模板', icon: BrainCircuit, color: '#7C3AED', signature: 'DispatchController', group: 'AI 智能体', status: 'active', lastRunTime: '2026-07-14 10:30',
    subFeatures: [{ key: 'dispatch-workflow', title: '工作流编排', subtitle: 'LangGraph 有状态工作流', icon: Workflow, color: '#7C3AED', component: lazy(() => import('@/pages/agents/AgentLaunchPage')) }],
  },
  {
    key: 'agent-requirements', title: '需求分析', subtitle: '解析 PRD · 提取功能点/边界条件/风险点', icon: FileText, color: '#3B82F6', signature: 'RequirementsAnalyst', group: 'AI 智能体', status: 'pending',
    subFeatures: [{ key: 'req-analyze', title: '需求解析', subtitle: 'deepseek-v4-flash · 结构化输出', icon: FileText, color: '#3B82F6', component: lazy(() => import('@/pages/agent-requirements/RequirementsAgentPage')) }],
  },
  {
    key: 'agent-architect', title: '测试架构', subtitle: '设计测试架构 · 策略 · 技术选型', icon: Cpu, color: '#0891B2', signature: 'TestArchitect', group: 'AI 智能体', status: 'pending',
    subFeatures: [{ key: 'arch-design', title: '架构设计', subtitle: 'qwen3-max · 测试层级与技术栈', icon: Cpu, color: '#0891B2', component: lazy(() => import('@/pages/agent-architect/ArchitectAgentPage')) }],
  },
  {
    key: 'agent-designer', title: '测试设计', subtitle: '设计测试场景 · 用例大纲 · 数据策略', icon: PenTool, color: '#0D9488', signature: 'TestDesigner', group: 'AI 智能体', status: 'pending',
    subFeatures: [{ key: 'design-scenario', title: '场景设计', subtitle: 'glm-5 · 功能/边界/异常/性能覆盖', icon: PenTool, color: '#0D9488', component: lazy(() => import('@/pages/agent-designer/DesignerAgentPage')) }],
  },
  {
    key: 'agent-casewriter', title: '用例编写', subtitle: '生成详细测试用例 · 前置/步骤/预期', icon: ScrollText, color: '#059669', signature: 'TestCaseWriter', group: 'AI 智能体', status: 'pending',
    subFeatures: [{ key: 'case-write', title: '用例生成', subtitle: 'glm-5 · 结构化可执行用例', icon: ScrollText, color: '#059669', component: lazy(() => import('@/pages/agent-casewriter/CasewriterAgentPage')) }],
  },
  {
    key: 'agent-execution', title: '执行分析', subtitle: '分析执行结果 · 识别失败根因 · 缺陷报告', icon: BarChart3, color: '#EA580C', signature: 'ExecutionAnalyst', group: 'AI 智能体', status: 'pending',
    subFeatures: [{ key: 'exec-analyze', title: '结果分析', subtitle: 'deepseek-v4-flash · 通过率/失败原因/趋势', icon: BarChart3, color: '#EA580C', component: lazy(() => import('@/pages/agent-execution/ExecutionAgentPage')) }],
  },
  {
    key: 'agent-quality', title: '质量审计', subtitle: '质量评分(0-100) · 合规检查 · 改进建议', icon: Shield, color: '#DC2626', signature: 'QualityAuditor', group: 'AI 智能体', status: 'pending',
    subFeatures: [{ key: 'quality-audit', title: '质量评分', subtitle: 'deepseek-v4-pro · 多维度审计', icon: Shield, color: '#DC2626', component: lazy(() => import('@/pages/agent-quality/QualityAgentPage')) }],
  },
  {
    key: 'agent-cost', title: '成本优化', subtitle: '5 层优化策略 · 模型分级 · 预算控制', icon: DollarSign, color: '#10B981', signature: 'CostOptimizer', group: 'AI 智能体', status: 'active', lastRunTime: '2026-07-14 09:15',
    subFeatures: [{ key: 'cost-optimize', title: '成本分析', subtitle: 'deepseek-v4-flash · 费用统计与节省建议', icon: DollarSign, color: '#10B981', component: lazy(() => import('@/pages/agents/CostDashboard')) }],
  },
  {
    key: 'agent-debate', title: '辩论引擎', subtitle: '多模型正反方辩论 · 共识仲裁', icon: MessageSquare, color: '#EC4899', signature: 'DebateEngine', group: 'AI 智能体', status: 'beta', lastRunTime: '2026-07-13 16:45',
    subFeatures: [
      { key: 'debate-launch', title: '发起辩论', subtitle: 'AutoGen 多轮辩论 · 3 轮共识检查', icon: MessageSquare, color: '#EC4899', component: lazy(() => import('@/pages/agents/DebateLaunchPage')) },
      { key: 'debate-records', title: '辩论记录', subtitle: '查看历史辩论与决策结果', icon: ListChecks, color: '#8B5CF6', component: lazy(() => import('@/pages/agents/DebateRecordsPage')) },
    ],
  },

  // ═══════════════════════════════════════
  // 4. AI 测试（测试全流程：用例→执行→报告）
  // ═══════════════════════════════════════
  {
    key: 'test-functional', title: '功能测试', subtitle: '业务功能点验证与用例管理', icon: TestTube2, color: '#2563EB', signature: 'Functional Testing', group: 'AI 测试',
    subFeatures: [
      { key: 'func-cases', title: '用例管理', subtitle: '功能测试用例的增删改查', icon: TestTube2, color: '#2563EB', component: lazy(() => import('@/pages/test-functional/FunctionalTestPage')) },
      { key: 'func-execution', title: '用例执行', subtitle: '手动/自动执行功能测试', icon: Zap, color: '#F59E0B', component: lazy(() => import('@/pages/test-functional/FunctionalTestPage')) },
    ],
  },
  {
    key: 'test-api', title: '接口测试', subtitle: 'API 接口验证与自动化测试', icon: Plug, color: '#0891B2', signature: 'API Testing', group: 'AI 测试',
    subFeatures: [
      { key: 'api-cases', title: '接口用例', subtitle: '接口测试用例管理', icon: Plug, color: '#0891B2', component: lazy(() => import('@/pages/test-api/ApiTestPage')) },
      { key: 'api-auto', title: '接口自动化', subtitle: '批量执行/定时/断言配置', icon: Zap, color: '#F59E0B', component: lazy(() => import('@/pages/test-api/ApiTestPage')) },
    ],
  },
  {
    key: 'test-web-auto', title: 'Web 自动化测试', subtitle: 'Playwright/Selenium 脚本管理', icon: Globe, color: '#059669', signature: 'Web Automation', group: 'AI 测试',
    subFeatures: [
      { key: 'web-scripts', title: '脚本管理', subtitle: '自动化脚本的创建与维护', icon: Globe, color: '#059669', component: lazy(() => import('@/pages/test-web-auto/WebAutoTestPage')) },
      { key: 'web-execution', title: '脚本执行', subtitle: '执行自动化测试并查看结果', icon: Zap, color: '#F59E0B', component: lazy(() => import('@/pages/test-web-auto/WebAutoTestPage')) },
    ],
  },
  {
    key: 'test-app-auto', title: 'App 自动化测试', subtitle: 'Appium 脚本管理（iOS/Android）', icon: Smartphone, color: '#D946EF', signature: 'App Automation', group: 'AI 测试',
    subFeatures: [
      { key: 'app-scripts', title: '脚本管理', subtitle: '移动端自动化脚本管理', icon: Smartphone, color: '#D946EF', component: lazy(() => import('@/pages/test-app-auto/AppAutoTestPage')) },
      { key: 'app-devices', title: '设备管理', subtitle: 'iOS/Android 设备池配置', icon: Server, color: '#8B5CF6', component: lazy(() => import('@/pages/test-app-auto/AppAutoTestPage')) },
    ],
  },
  {
    key: 'test-performance', title: '性能测试', subtitle: '压测脚本与并发/TPS 监控', icon: Gauge, color: '#EA580C', signature: 'Performance Testing', group: 'AI 测试',
    subFeatures: [
      { key: 'perf-scripts', title: '压测脚本', subtitle: 'JMeter/k6 脚本管理', icon: Gauge, color: '#EA580C', component: lazy(() => import('@/pages/test-performance/PerformanceTestPage')) },
      { key: 'perf-monitor', title: '实时监控', subtitle: '并发数/TPS/响应时间看板', icon: BarChart3, color: '#3B82F6', component: lazy(() => import('@/pages/test-performance/PerformanceTestPage')) },
    ],
  },
  {
    key: 'test-security', title: '安全测试', subtitle: '漏洞扫描与 OWASP 检查', icon: Shield, color: '#DC2626', signature: 'Security Testing', group: 'AI 测试',
    subFeatures: [
      { key: 'sec-scan', title: '漏洞扫描', subtitle: '自动化安全漏洞扫描', icon: Shield, color: '#DC2626', component: lazy(() => import('@/pages/test-security/SecurityTestPage')) },
      { key: 'sec-report', title: '安全报告', subtitle: 'OWASP Top 10 检查报告', icon: FileText, color: '#F59E0B', component: lazy(() => import('@/pages/test-security/SecurityTestPage')) },
    ],
  },
  {
    key: 'test-ui', title: 'UI 测试', subtitle: '界面一致性与视觉回归', icon: Paintbrush, color: '#7C3AED', signature: 'UI Testing', group: 'AI 测试',
    subFeatures: [
      { key: 'ui-visual', title: '视觉回归', subtitle: '截图对比与像素级检测', icon: Paintbrush, color: '#7C3AED', component: lazy(() => import('@/pages/test-ui/UITestPage')) },
      { key: 'ui-responsive', title: '响应式测试', subtitle: '多端适配与布局验证', icon: Smartphone, color: '#D946EF', component: lazy(() => import('@/pages/test-ui/UITestPage')) },
    ],
  },
  {
    key: 'test-smoke', title: '冒烟测试', subtitle: '核心链路快速验证', icon: Zap, color: '#F59E0B', signature: 'Smoke Testing', group: 'AI 测试',
    subFeatures: [
      { key: 'smoke-cases', title: '冒烟用例', subtitle: '核心链路用例集管理', icon: Zap, color: '#F59E0B', component: lazy(() => import('@/pages/test-smoke/SmokeTestPage')) },
      { key: 'smoke-auto', title: '自动触发', subtitle: '部署后自动执行冒烟验证', icon: Workflow, color: '#059669', component: lazy(() => import('@/pages/test-smoke/SmokeTestPage')) },
    ],
  },
  {
    key: 'execution', title: '测试执行与报告', subtitle: '执行引擎、实时日志与报告生成', icon: ClipboardCheck, color: '#10B981', signature: 'Execution & Reports', group: 'AI 测试',
    subFeatures: [
      { key: 'executions', title: '执行记录', subtitle: '测试执行历史与实时日志', icon: ClipboardCheck, color: '#10B981', component: lazy(() => import('@/pages/executions/ExecutionListPage')) },
      { key: 'reports', title: '测试报告', subtitle: '测试结果统计与分析', icon: BarChart3, color: '#3B82F6', component: lazy(() => import('@/pages/reports/ReportDashboard')) },
      { key: 'report-compare', title: '报告对比', subtitle: '多份报告横向对比分析', icon: GitCompareArrows, color: '#F59E0B', component: lazy(() => import('@/pages/reports/ReportComparePage')) },
    ],
  },

  // ═══════════════════════════════════════
  // 5. AI 应用（面向用户的 AI 工具）
  // ═══════════════════════════════════════
  {
    key: 'ai-chatroom', title: 'AI 聊天室', subtitle: '多轮对话 · 测试策略讨论 · 缺陷分析', icon: MessageSquare, color: '#7C3AED', signature: 'AI Chat Room', group: 'AI 应用',
    subFeatures: [{ key: 'chat-room', title: '聊天室', subtitle: '与 AI 进行多轮专业对话', icon: MessageSquare, color: '#7C3AED', component: lazy(() => import('@/pages/ai-apps/AiChatRoom')) }],
  },
  {
    key: 'ai-db-tuning', title: 'AI 数据库调优', subtitle: '智能分析 · 慢查询检测 · 索引优化', icon: Database, color: '#0D9488', signature: 'AI DB Tuning', group: 'AI 应用',
    subFeatures: [{ key: 'db-analysis', title: '数据库诊断', subtitle: '慢查询/索引/连接池智能分析', icon: Database, color: '#0D9488', component: lazy(() => import('@/pages/ai-apps/AiDatabaseTuning')) }],
  },
  {
    key: 'ai-assistant', title: 'AI 助手', subtitle: '智能问答 · 快捷跳转 · 项目总览', icon: Bot, color: '#F59E0B', signature: 'AI Assistant', group: 'AI 应用',
    subFeatures: [{ key: 'assistant-full', title: '全屏助手', subtitle: '全屏交互模式，深度对话', icon: Sparkles, color: '#F59E0B', component: lazy(() => import('@/pages/ai-apps/AiAssistantPage')) }],
  },

  // ═══════════════════════════════════════
  // 6. AI 配置（Agent 运行所需的全部配置）
  // ═══════════════════════════════════════
  {
    key: 'model-config', title: '模型配置', subtitle: 'LLM Provider、分级策略与成本监控', icon: Cpu, color: '#2563EB', signature: 'Model Config', group: 'AI 配置',
    subFeatures: [
      { key: 'model-providers', title: 'Provider 管理', subtitle: 'LLM 提供商与 API Key 配置', icon: Cpu, color: '#2563EB', component: lazy(() => import('@/pages/model-config/ModelConfigPage')) },
      { key: 'model-list', title: '模型列表', subtitle: '可用模型、价格与状态', icon: ListChecks, color: '#3B82F6', component: lazy(() => import('@/pages/model-config/ModelConfigPage')) },
      { key: 'model-tier', title: '分级策略', subtitle: 'L1~L5 模型分级与路由规则', icon: Workflow, color: '#7C3AED', component: lazy(() => import('@/pages/model-config/ModelConfigPage')) },
      { key: 'model-cost', title: '成本监控', subtitle: 'Token 消耗与费用统计', icon: DollarSign, color: '#10B981', component: lazy(() => import('@/pages/model-config/ModelConfigPage')) },
    ],
  },
  {
    key: 'prompt-engineering', title: '提示词工程', subtitle: 'Agent 提示词编辑、模板与调试', icon: PenTool, color: '#EA580C', signature: 'Prompt Engineering', group: 'AI 配置',
    subFeatures: [
      { key: 'prompt-agents', title: 'Agent 提示词', subtitle: '7 个 Agent 的 System Prompt 编辑', icon: PenTool, color: '#EA580C', component: lazy(() => import('@/pages/prompts/PromptEngineerPage')) },
      { key: 'prompt-templates', title: '模板库', subtitle: '预置提示词模板，按测试类型分类', icon: ScrollText, color: '#F59E0B', component: lazy(() => import('@/pages/prompts/PromptEngineerPage')) },
      { key: 'prompt-versions', title: '版本管理', subtitle: '修改历史、A/B 对比、回滚', icon: GitCompareArrows, color: '#3B82F6', component: lazy(() => import('@/pages/prompts/PromptEngineerPage')) },
      { key: 'prompt-debug', title: '在线调试', subtitle: '输入样本数据预览 Agent 输出', icon: Zap, color: '#10B981', component: lazy(() => import('@/pages/prompts/PromptEngineerPage')) },
      { key: 'prompt-fewshot', title: 'Few-shot 示例', subtitle: '为 Agent 配置示例输入输出对', icon: FileText, color: '#8B5CF6', component: lazy(() => import('@/pages/prompts/PromptEngineerPage')) },
    ],
  },
  {
    key: 'de-ai', title: '去AI味配置', subtitle: 'AI 输出风格控制与人性化处理', icon: Mic, color: '#E11D48', signature: 'De-AI Config', group: 'AI 配置',
    subFeatures: [
      { key: 'deai-style', title: '语言风格控制', subtitle: '专业正式 / 口语化 / 中性默认', icon: Mic, color: '#E11D48', component: lazy(() => import('@/pages/deai-config/DeaiConfigPage')) },
      { key: 'deai-variety', title: '句式多样性', subtitle: '长短句交替、主被动切换、倒装省略', icon: Workflow, color: '#7C3AED', component: lazy(() => import('@/pages/deai-config/DeaiConfigPage')) },
      { key: 'deai-terms', title: '领域术语注入', subtitle: '自动注入项目/行业专属术语', icon: BookOpen, color: '#2563EB', component: lazy(() => import('@/pages/deai-config/DeaiConfigPage')) },
      { key: 'deai-humanize', title: '人性化细节', subtitle: '口语化连接词、非标准缩写，增强真人感', icon: Users, color: '#059669', component: lazy(() => import('@/pages/deai-config/DeaiConfigPage')) },
      { key: 'deai-template', title: '输出模板约束', subtitle: '强制格式模板，禁止 AI 八股模式', icon: ScrollText, color: '#F59E0B', component: lazy(() => import('@/pages/deai-config/DeaiConfigPage')) },
      { key: 'deai-intensity', title: '去AI味强度', subtitle: '关闭 / 轻度 / 中度 / 重度', icon: Gauge, color: '#EA580C', component: lazy(() => import('@/pages/deai-config/DeaiConfigPage')) },
      { key: 'deai-blacklist', title: '词频黑名单', subtitle: '"值得注意的是"等禁用词配置', icon: Shield, color: '#DC2626', component: lazy(() => import('@/pages/deai-config/DeaiConfigPage')) },
    ],
  },
  {
    key: 'skill-config', title: '技能配置', subtitle: 'Agent 工具注册与 MCP 管理', icon: Plug, color: '#0891B2', signature: 'Skill Config', group: 'AI 配置',
    subFeatures: [
      { key: 'skill-register', title: 'Agent 技能注册', subtitle: '定义 Agent 可用的工具和能力', icon: Plug, color: '#0891B2', component: lazy(() => import('@/pages/skills-center/SkillsCenterPage')) },
      { key: 'skill-mcp', title: 'MCP 工具管理', subtitle: 'Playwright/Appium/Postman 工具配置', icon: Globe, color: '#059669', component: lazy(() => import('@/pages/skills-center/SkillsCenterPage')) },
      { key: 'skill-permission', title: '工具权限控制', subtitle: '按 Agent 角色分配工具使用权限', icon: Shield, color: '#DC2626', component: lazy(() => import('@/pages/skills-center/SkillsCenterPage')) },
      { key: 'skill-market', title: '技能市场', subtitle: '预置技能包，一键启用', icon: Package, color: '#8B5CF6', component: lazy(() => import('@/pages/skills-center/SkillsCenterPage')) },
    ],
  },
  {
    key: 'workflow-config', title: '工作流配置', subtitle: '流程模板编排与断点续跑', icon: Workflow, color: '#7C3AED', signature: 'Workflow Config', group: 'AI 配置',
    subFeatures: [
      { key: 'wf-templates', title: '流程模板管理', subtitle: '预置/自定义工作流模板', icon: Workflow, color: '#7C3AED', component: lazy(() => import('@/pages/workflow-config/WorkflowConfigPage')) },
      { key: 'wf-orchestrate', title: '步骤编排', subtitle: '可视化编排 Agent 执行顺序', icon: ListChecks, color: '#3B82F6', component: lazy(() => import('@/pages/workflow-config/WorkflowConfigPage')) },
      { key: 'wf-retry', title: '超时与重试', subtitle: '单步超时、总超时、失败重试策略', icon: Gauge, color: '#EA580C', component: lazy(() => import('@/pages/workflow-config/WorkflowConfigPage')) },
      { key: 'wf-checkpoint', title: '断点续跑', subtitle: '检查点保存策略，失败后恢复', icon: Zap, color: '#F59E0B', component: lazy(() => import('@/pages/workflow-config/WorkflowConfigPage')) },
    ],
  },
  {
    key: 'test-data', title: '测试数据配置', subtitle: '数据源、AI 生成、脱敏与 Mock', icon: Database, color: '#0D9488', signature: 'Test Data Config', group: 'AI 配置',
    subFeatures: [
      { key: 'data-source', title: '数据源管理', subtitle: '数据库/CSV/API/Mock 数据源配置', icon: Database, color: '#0D9488', component: lazy(() => import('@/pages/test-data/TestDataConfigPage')) },
      { key: 'data-ai-gen', title: 'AI 数据生成', subtitle: 'LLM 生成边界值、异常数据', icon: BrainCircuit, color: '#7C3AED', component: lazy(() => import('@/pages/test-data/TestDataConfigPage')) },
      { key: 'data-masking', title: '数据脱敏', subtitle: '手机号/身份证/密码脱敏策略', icon: Shield, color: '#DC2626', component: lazy(() => import('@/pages/test-data/TestDataConfigPage')) },
      { key: 'data-mock', title: 'Mock 服务', subtitle: 'WireMock/Mountebank 录制回放', icon: Server, color: '#6B7280', component: lazy(() => import('@/pages/test-data/TestDataConfigPage')) },
    ],
  },
  {
    key: 'mcp', title: 'MCP 工具集成', subtitle: 'MCP 协议工具发现与执行', icon: Plug, color: '#7C3AED', signature: 'MCP Integration', group: 'AI 配置',
    subFeatures: [
      { key: 'mcp-tools', title: '工具列表', subtitle: '列出可用 MCP 工具', icon: Plug, color: '#7C3AED', component: lazy(() => import('@/pages/skills-center/SkillsCenterPage')) },
      { key: 'mcp-execute', title: '工具执行', subtitle: '调用指定工具并返回结果', icon: Zap, color: '#F59E0B', component: lazy(() => import('@/pages/skills-center/SkillsCenterPage')) },
    ],
  },
  {
    key: 'hermes-config', title: 'Hermes智能体配置', subtitle: '消息桥接 · 会话管理 · 通道与权限配置', icon: MessageSquare, color: '#0D9488', signature: 'Hermes Config', group: 'AI 配置',
    subFeatures: [
      { key: 'hermes-conversations', title: '会话管理', subtitle: '列出/查询活跃对话会话', icon: MessageSquare, color: '#0D9488', component: lazy(() => import('@/pages/hermes-config/HermesConfigPage')) },
      { key: 'hermes-messages', title: '消息读写', subtitle: '读取/发送会话消息', icon: Send, color: '#3B82F6', component: lazy(() => import('@/pages/hermes-config/HermesConfigPage')) },
      { key: 'hermes-channels', title: '通道列表', subtitle: 'Telegram/Discord/Slack 通道配置', icon: Globe, color: '#7C3AED', component: lazy(() => import('@/pages/hermes-config/HermesConfigPage')) },
      { key: 'hermes-events', title: '事件轮询', subtitle: '实时事件监听与消息等待', icon: Zap, color: '#F59E0B', component: lazy(() => import('@/pages/hermes-config/HermesConfigPage')) },
      { key: 'hermes-attachments', title: '附件管理', subtitle: '图片/媒体文件获取与处理', icon: FileText, color: '#EA580C', component: lazy(() => import('@/pages/hermes-config/HermesConfigPage')) },
      { key: 'hermes-permissions', title: '权限审批', subtitle: '执行请求审批与权限控制', icon: Shield, color: '#DC2626', component: lazy(() => import('@/pages/hermes-config/HermesConfigPage')) },
    ],
  },
  {
    key: 'skills-center', title: 'Skills技能中心', subtitle: '技能注册 · MCP工具 · 权限管理 · 技能市场', icon: Puzzle, color: '#8B5CF6', signature: 'Skills Center', group: 'AI 配置',
    subFeatures: [
      { key: 'skills-registry', title: '技能注册', subtitle: '定义Agent可用的工具和能力', icon: Plug, color: '#0891B2', component: lazy(() => import('@/pages/skills-center/SkillsCenterPage')) },
      { key: 'skills-mcp', title: 'MCP工具管理', subtitle: 'Playwright/Appium/Postman工具配置', icon: Globe, color: '#059669', component: lazy(() => import('@/pages/skills-center/SkillsCenterPage')) },
      { key: 'skills-permission', title: '工具权限控制', subtitle: '按Agent角色分配工具使用权限', icon: Shield, color: '#DC2626', component: lazy(() => import('@/pages/skills-center/SkillsCenterPage')) },
      { key: 'skills-market', title: '技能市场', subtitle: '预置技能包，一键启用', icon: Package, color: '#8B5CF6', component: lazy(() => import('@/pages/skills-center/SkillsCenterPage')) },
      { key: 'skills-test', title: '技能测试', subtitle: '在线测试已注册技能的执行效果', icon: Zap, color: '#F59E0B', component: lazy(() => import('@/pages/skills-center/SkillsCenterPage')) },
      { key: 'skills-logs', title: '调用日志', subtitle: '技能调用记录与性能统计', icon: ScrollText, color: '#EA580C', component: lazy(() => import('@/pages/skills-center/SkillsCenterPage')) },
    ],
  },

  // ═══════════════════════════════════════
  // 7. 个人设置（用户 + 权限管理）
  // ═══════════════════════════════════════
  {
    key: 'personal-settings', title: '个人设置', subtitle: '个人信息、密码、通知与外观偏好', icon: User, color: '#6B7280', signature: 'Personal Settings', group: '个人设置',
    subFeatures: [
      { key: 'ps-profile', title: '基本信息', subtitle: '头像、昵称、邮箱、简介', icon: User, color: '#6B7280', component: lazy(() => import('@/pages/settings/ProfilePage')) },
      { key: 'ps-password', title: '修改密码', subtitle: '定期修改保障账号安全', icon: Lock, color: '#DC2626', component: lazy(() => import('@/pages/settings/PasswordPage')) },
      { key: 'ps-notify', title: '通知设置', subtitle: '邮件/浏览器/执行/报告通知', icon: Bell, color: '#F59E0B', component: lazy(() => import('@/pages/settings/NotifyPage')) },
      { key: 'ps-appearance', title: '外观偏好', subtitle: '浅色/深色/跟随系统', icon: Paintbrush, color: '#7C3AED', component: lazy(() => import('@/pages/settings/AppearancePage')) },
    ],
  },
  {
    key: 'user-mgmt', title: '用户管理', subtitle: '用户账号 CRUD · 角色分配 · 状态管理', icon: Users, color: '#3B82F6', signature: 'User Management', group: '个人设置',
    subFeatures: [{ key: 'um-list', title: '用户列表', subtitle: '新建/编辑/删除用户，分配角色', icon: Users, color: '#3B82F6', component: lazy(() => import('@/pages/settings/UserManagementPage')) }],
  },
  {
    key: 'role-mgmt', title: '角色管理', subtitle: '角色 CRUD · 菜单权限 · 数据权限', icon: Shield, color: '#0891B2', signature: 'Role Management', group: '个人设置',
    subFeatures: [{ key: 'rm-list', title: '角色列表', subtitle: '新建/编辑/删除角色，配置权限', icon: Shield, color: '#0891B2', component: lazy(() => import('@/pages/settings/RoleManagementPage')) }],
  },
]

/** 按分组获取模块 */
export function getModulesByGroup(): Map<string, Module[]> {
  const map = new Map<string, Module[]>()
  for (const mod of modules) {
    const list = map.get(mod.group) ?? []
    list.push(mod)
    map.set(mod.group, list)
  }
  return map
}

/** 根据 key 查找模块 */
export function getModuleByKey(key: string): Module | undefined {
  return modules.find((m) => m.key === key)
}

/** 所有分组顺序 */
export const groupOrder = [
  '公共模块',
  '项目模块',
  'AI 智能体',
  'AI 测试',
  'AI 应用',
  'AI 配置',
  '个人设置',
]
