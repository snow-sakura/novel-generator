import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import {
  BrainCircuit,
  Zap,
  Scale,
  FileText,
  Loader2,
  PlayCircle,
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
} from 'lucide-react'
import { agentApi, projectApi, type ProjectItem } from '@/lib/api-service'
import { useAuthStore } from '@/lib/auth-store'

/** 工作流模板定义 */
const WORKFLOW_TEMPLATES = [
  {
    id: '全流程',
    label: '全流程测试',
    description: '7 步完整流程：需求分析 → 架构设计 → 场景设计 → 用例编写 → 执行分析 → 质量审计 → 成本优化',
    icon: <BrainCircuit className="h-5 w-5" />,
    color: 'bg-violet-50 border-violet-200 text-violet-700',
    steps: 7,
  },
  {
    id: '快速检测',
    label: '快速检测',
    description: '3 步快速流程：需求分析 → 执行分析 → 质量审计',
    icon: <Zap className="h-5 w-5" />,
    color: 'bg-amber-50 border-amber-200 text-amber-700',
    steps: 3,
  },
  {
    id: '架构评审',
    label: '架构评审',
    description: '3 步架构评审：架构设计 → 成本优化 → 质量审计',
    icon: <Scale className="h-5 w-5" />,
    color: 'bg-blue-50 border-blue-200 text-blue-700',
    steps: 3,
  },
  {
    id: '用例生成',
    label: '用例生成',
    description: '4 步用例生成：需求分析 → 场景设计 → 用例编写 → 质量审计',
    icon: <FileText className="h-5 w-5" />,
    color: 'bg-emerald-50 border-emerald-200 text-emerald-700',
    steps: 4,
  },
]

/** 状态徽标组件 */
function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { label: string; icon: React.ReactNode; className: string }> = {
    completed: { label: '已完成', icon: <CheckCircle2 className="h-3 w-3" />, className: 'bg-green-100 text-green-700 border-green-200' },
    failed: { label: '失败', icon: <XCircle className="h-3 w-3" />, className: 'bg-red-100 text-red-700 border-red-200' },
    running: { label: '运行中', icon: <Loader2 className="h-3 w-3 animate-spin" />, className: 'bg-blue-100 text-blue-700 border-blue-200' },
    pending: { label: '等待中', icon: <Clock className="h-3 w-3" />, className: 'bg-gray-100 text-gray-700 border-gray-200' },
  }
  const c = config[status] || { label: status, icon: <AlertTriangle className="h-3 w-3" />, className: 'bg-gray-100 text-gray-700 border-gray-200' }
  return (
    <Badge variant="outline" className={`gap-1 ${c.className}`}>
      {c.icon}
      {c.label}
    </Badge>
  )
}

export default function AgentLaunchPage() {
  const { id: projectIdFromRoute } = useParams()
  const navigate = useNavigate()
  const { user } = useAuthStore()

  const [projects, setProjects] = useState<ProjectItem[]>([])
  const [selectedProjectId, setSelectedProjectId] = useState(projectIdFromRoute || '')
  const [projectName, setProjectName] = useState('')
  const [requirementDoc, setRequirementDoc] = useState('')
  const [selectedTemplate, setSelectedTemplate] = useState('全流程')
  const [executing, setExecuting] = useState(false)
  const [executionResult, setExecutionResult] = useState<any>(null)
  const [loadingProjects, setLoadingProjects] = useState(false)
  const [activeTab, setActiveTab] = useState<'launch' | 'result'>('launch')

  useEffect(() => {
    setLoadingProjects(true)
    projectApi.list({ page: 1, page_size: 100 })
      .then((res) => setProjects(res.data.items))
      .catch(() => {})
      .finally(() => setLoadingProjects(false))
  }, [])

  const handleExecute = async () => {
    const pid = selectedProjectId ? Number(selectedProjectId) : 0
    if (!pid && !projectName) return

    setExecuting(true)
    setExecutionResult(null)
    setActiveTab('result')

    try {
      const res = await agentApi.dispatch({
        project_id: pid,
        project_name: projectName || projects.find(p => p.id === pid)?.name || '',
        需求文档: requirementDoc,
        执行模式: selectedTemplate,
      })
      setExecutionResult(res.data)
    } catch (err: any) {
      setExecutionResult({ status: 'error', message: err?.response?.data?.message || err.message })
    } finally {
      setExecuting(false)
    }
  }

  const canExecute = (selectedProjectId !== '' || projectName !== '') && !executing

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* 页面标题 */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight">AI 智能体工作台</h2>
        <p className="text-sm text-muted-foreground mt-1">
          选择工作流模板和项目，启动 AI 多智能体协作执行测试任务
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 左侧：模板选择 */}
        <div className="lg:col-span-1 space-y-4">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            工作流模板
          </h3>
          {WORKFLOW_TEMPLATES.map((tpl) => (
            <button
              key={tpl.id}
              onClick={() => { setSelectedTemplate(tpl.id); setActiveTab('launch') }}
              className={`w-full text-left rounded-xl border-2 p-4 transition-all ${
                selectedTemplate === tpl.id
                  ? 'border-amber-500 bg-amber-50/50 shadow-sm'
                  : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${tpl.color}`}>
                  {tpl.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-sm">{tpl.label}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    {tpl.steps} 个步骤
                  </div>
                </div>
                {selectedTemplate === tpl.id && (
                  <div className="w-2 h-2 rounded-full bg-amber-500" />
                )}
              </div>
            </button>
          ))}
        </div>

        {/* 右侧：配置与执行 */}
        <div className="lg:col-span-2 space-y-4">
          {activeTab === 'launch' ? (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">执行配置</CardTitle>
                <CardDescription>
                  选择项目和输入需求文档，启动 {WORKFLOW_TEMPLATES.find(t => t.id === selectedTemplate)?.label} 流程
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* 项目选择 */}
                <div className="space-y-2">
                  <Label>选择项目</Label>
                  <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
                    <SelectTrigger>
                      <SelectValue placeholder={loadingProjects ? '加载中...' : '请选择项目'} />
                    </SelectTrigger>
                    <SelectContent>
                      {projects.map((p) => (
                        <SelectItem key={p.id} value={String(p.id)}>
                          {p.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>或输入项目名称</Label>
                  <input
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                    placeholder="新建临时项目名称"
                    value={projectName}
                    onChange={(e) => setProjectName(e.target.value)}
                  />
                </div>

                <Separator />

                {/* 需求文档 */}
                <div className="space-y-2">
                  <Label>需求文档 / PRD 内容</Label>
                  <Textarea
                    placeholder="输入需求文档内容，供 AI 智能体分析..."
                    value={requirementDoc}
                    onChange={(e) => setRequirementDoc(e.target.value)}
                    rows={6}
                    className="resize-none"
                  />
                  <p className="text-xs text-muted-foreground">
                    可选。如果不输入，智能体将基于项目信息进行分析
                  </p>
                </div>

                <Separator />

                {/* 选中模板信息 */}
                <div className="rounded-lg bg-muted/30 p-3">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <BrainCircuit className="h-4 w-4 text-amber-600" />
                    已选模板：{WORKFLOW_TEMPLATES.find(t => t.id === selectedTemplate)?.label}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {WORKFLOW_TEMPLATES.find(t => t.id === selectedTemplate)?.description}
                  </p>
                </div>
              </CardContent>
              <CardFooter className="flex justify-between">
                <Button variant="outline" onClick={() => navigate('/agents/executions')}>
                  查看执行记录
                </Button>
                <Button onClick={handleExecute} disabled={!canExecute} className="gap-2">
                  {executing ? (
                    <><Loader2 className="h-4 w-4 animate-spin" /> 执行中...</>
                  ) : (
                    <><PlayCircle className="h-4 w-4" /> 开始执行</>
                  )}
                </Button>
              </CardFooter>
            </Card>
          ) : (
            /* 执行结果展示 */
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">执行结果</CardTitle>
                  <Button variant="ghost" size="sm" onClick={() => setActiveTab('launch')}>
                    返回配置
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {executing ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
                    <p className="mt-4 text-sm font-medium">智能体正在执行中...</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      请稍候，多智能体协作可能需要一些时间
                    </p>
                  </div>
                ) : executionResult ? (
                  <>
                    {/* 状态 */}
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-medium">执行状态：</span>
                      <StatusBadge status={executionResult.status || executionResult?.result?.status} />
                    </div>

                    {/* 执行概要 */}
                    {executionResult?.result?.output_content && (
                      <>
                        <Separator />
                        <div className="space-y-2">
                          <Label className="text-xs text-muted-foreground uppercase">执行详情</Label>
                          <pre className="rounded-lg bg-muted p-4 text-xs whitespace-pre-wrap max-h-80 overflow-y-auto font-mono leading-relaxed">
                            {(() => {
                              try {
                                const parsed = JSON.parse(executionResult.result.output_content)
                                return JSON.stringify(parsed, null, 2)
                              } catch {
                                return executionResult.result.output_content
                              }
                            })()}
                          </pre>
                        </div>
                      </>
                    )}

                    {/* 元数据 */}
                    {executionResult?.result?.metadata && (
                      <>
                        <Separator />
                        <div className="grid grid-cols-2 gap-3 text-sm">
                          <div className="rounded-lg bg-muted/30 p-3">
                            <span className="text-xs text-muted-foreground">编排引擎</span>
                            <p className="font-medium mt-0.5">
                              {executionResult.result.metadata.orchestrator || '—'}
                            </p>
                          </div>
                          <div className="rounded-lg bg-muted/30 p-3">
                            <span className="text-xs text-muted-foreground">总步骤</span>
                            <p className="font-medium mt-0.5">
                              {executionResult.result.metadata.total_steps || '—'}
                            </p>
                          </div>
                          <div className="rounded-lg bg-muted/30 p-3">
                            <span className="text-xs text-muted-foreground">总成本</span>
                            <p className="font-medium mt-0.5">
                              ¥{executionResult.result.metadata.total_cost?.toFixed(4) || '0.0000'}
                            </p>
                          </div>
                          <div className="rounded-lg bg-muted/30 p-3">
                            <span className="text-xs text-muted-foreground">错误数</span>
                            <p className="font-medium mt-0.5">
                              {executionResult.result.metadata.error_count || 0}
                            </p>
                          </div>
                        </div>
                      </>
                    )}

                    {executionResult.message && (
                      <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">
                        {executionResult.message}
                      </div>
                    )}

                    {/* 3.3.3: 执行完成后提供「立即执行测试」按钮 */}
                    {executionResult?.status === 'completed' && selectedProjectId && (
                      <>
                        <Separator />
                        <div className="rounded-lg bg-blue-50 border border-blue-200 p-4 text-sm">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-medium text-blue-800">AI 智能体分析已完成</p>
                              <p className="text-blue-600 text-xs mt-0.5">
                                可以基于分析结果创建测试执行
                              </p>
                            </div>
                            <Button
                              onClick={() => {
                                navigate(`/projects/${selectedProjectId}/executions`)
                              }}
                              className="gap-2"
                            >
                              <PlayCircle className="h-4 w-4" /> 立即执行测试
                            </Button>
                          </div>
                        </div>
                      </>
                    )}
                  </>
                ) : null}
              </CardContent>
            </Card>
          )}

          {/* 智体状态总览卡片 */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">可用智能体</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { name: '需求分析师', icon: '📋', desc: '分析 PRD 提取测试要点' },
                  { name: '测试架构师', icon: '🏗️', desc: '设计测试架构和策略' },
                  { name: '测试设计师', icon: '🎨', desc: '设计测试场景和数据' },
                  { name: '用例编写师', icon: '✏️', desc: '生成详细测试用例' },
                  { name: '执行分析师', icon: '🔍', desc: '分析执行结果和缺陷' },
                  { name: '质量审计师', icon: '✅', desc: '质量评分和合规检查' },
                  { name: '成本优化师', icon: '💰', desc: '5 层成本优化分析' },
                ].map((agent) => (
                  <div key={agent.name} className="rounded-lg border border-gray-200 bg-white p-3 text-center hover:shadow-sm transition-shadow">
                    <div className="text-lg mb-1">{agent.icon}</div>
                    <div className="text-xs font-medium">{agent.name}</div>
                    <div className="text-[10px] text-muted-foreground mt-0.5">{agent.desc}</div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
