import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Loader2, PlayCircle } from 'lucide-react'
import { agentApi, projectApi, type ProjectItem, type AgentExecution } from '@/lib/api-service'

interface ExecuteAgentDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: (execution: AgentExecution) => void
}

/** 任务类型选项 */
const TASK_TYPES = [
  { value: 'full_test', label: '完整测试流程' },
  { value: 'quick_check', label: '快速检测' },
  { value: 'test_gen', label: '测试用例生成' },
  { value: 'code_review', label: '代码审查' },
  { value: 'requirement_analysis', label: '需求分析' },
]

/**
 * 执行智能体对话框
 * 用于手动触发智能体执行
 */
export default function ExecuteAgentDialog({
  open,
  onOpenChange,
  onSuccess,
}: ExecuteAgentDialogProps) {
  const [projects, setProjects] = useState<ProjectItem[]>([])
  const [projectId, setProjectId] = useState('')
  const [taskType, setTaskType] = useState('full_test')
  const [projectName, setProjectName] = useState('')
  const [projectDescription, setProjectDescription] = useState('')
  const [executing, setExecuting] = useState(false)
  const [result, setResult] = useState<AgentExecution | null>(null)
  const [loadingProjects, setLoadingProjects] = useState(false)

  /** 加载项目列表 */
  useEffect(() => {
    if (!open) {
      setResult(null)
      setExecuting(false)
      return
    }
    setLoadingProjects(true)
    projectApi.list({ page: 1, page_size: 100 })
      .then((res) => setProjects(res.data.items))
      .catch(() => {})
      .finally(() => setLoadingProjects(false))
  }, [open])

  /** 执行智能体 */
  const handleExecute = async () => {
    if (!projectId && !projectName) return

    setExecuting(true)
    setResult(null)

    try {
      const res = await agentApi.execute({
        project_id: projectId ? Number(projectId) : 0,
        task_type: taskType,
        project_name: projectName || undefined,
        project_description: projectDescription || undefined,
      })
      setResult(res.data)
      onSuccess?.(res.data)
    } catch {
      setResult(null)
    } finally {
      setExecuting(false)
    }
  }

  /** 是否可以执行 */
  const canExecute = (projectId !== '' || projectName !== '') && !executing

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>执行智能体</DialogTitle>
          <DialogDescription>
            选择项目并配置任务参数，启动 AI 智能体执行
          </DialogDescription>
        </DialogHeader>

        {result ? (
          /* 执行结果 */
          <div className="space-y-4">
            <div className="rounded-lg border bg-muted/50 p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">执行状态</span>
                <span className={`text-sm font-medium ${
                  result.status === 'completed' ? 'text-green-600' :
                  result.status === 'failed' ? 'text-red-600' :
                  'text-blue-600'
                }`}>
                  {result.status === 'completed' ? '已完成' :
                   result.status === 'failed' ? '失败' :
                   result.status === 'running' ? '运行中' : '等待中'}
                </span>
              </div>
              <div className="mt-2 grid grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="text-muted-foreground">任务类型：</span>
                  <span>{result.task_type}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">进度：</span>
                  <span>{result.progress}%</span>
                </div>
                {result.cost !== undefined && (
                  <div>
                    <span className="text-muted-foreground">费用：</span>
                    <span>${result.cost.toFixed(4)}</span>
                  </div>
                )}
                {result.tokens_used !== undefined && (
                  <div>
                    <span className="text-muted-foreground">Token：</span>
                    <span>{result.tokens_used.toLocaleString()}</span>
                  </div>
                )}
              </div>
            </div>
            {result.result && (
              <div>
                <Label className="text-sm text-muted-foreground">执行结果</Label>
                <pre className="mt-1 rounded-md bg-muted p-3 text-sm whitespace-pre-wrap max-h-40 overflow-y-auto">
                  {result.result}
                </pre>
              </div>
            )}
            <DialogFooter>
              <Button onClick={() => onOpenChange(false)}>关闭</Button>
            </DialogFooter>
          </div>
        ) : (
          /* 配置表单 */
          <div className="space-y-4">
            {/* 项目选择 */}
            <div className="space-y-2">
              <Label htmlFor="project">选择项目</Label>
              <Select value={projectId} onValueChange={setProjectId}>
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

            {/* 或输入项目名称 */}
            <div className="space-y-2">
              <Label htmlFor="projectName">或输入项目名称</Label>
              <Input
                id="projectName"
                placeholder="新项目名称（不选择项目时使用）"
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
              />
            </div>

            {/* 项目描述 */}
            <div className="space-y-2">
              <Label htmlFor="projectDesc">项目描述</Label>
              <textarea
                id="projectDesc"
                placeholder="可选：输入项目描述信息"
                value={projectDescription}
                onChange={(e) => setProjectDescription(e.target.value)}
                rows={3}
                className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
              />
            </div>

            {/* 任务类型 */}
            <div className="space-y-2">
              <Label htmlFor="taskType">任务类型</Label>
              <Select value={taskType} onValueChange={setTaskType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TASK_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                取消
              </Button>
              <Button onClick={handleExecute} disabled={!canExecute}>
                {executing ? (
                  <>
                    <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                    执行中...
                  </>
                ) : (
                  <>
                    <PlayCircle className="mr-1 h-4 w-4" />
                    开始执行
                  </>
                )}
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
