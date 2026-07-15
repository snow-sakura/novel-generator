import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import {
  ArrowLeft,
  Loader2,
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  FileText,
  Activity,
  StopCircle,
  Terminal,
} from 'lucide-react'
import { executionApi } from '@/lib/api-service'

/** 状态徽标 */
function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { label: string; icon: React.ReactNode; className: string }> = {
    completed: { label: '已完成', icon: <CheckCircle2 className="h-3 w-3" />, className: 'bg-green-100 text-green-700 border-green-200' },
    failed: { label: '失败', icon: <XCircle className="h-3 w-3" />, className: 'bg-red-100 text-red-700 border-red-200' },
    running: { label: '运行中', icon: <Loader2 className="h-3 w-3 animate-spin" />, className: 'bg-blue-100 text-blue-700 border-blue-200' },
    pending: { label: '等待中', icon: <Clock className="h-3 w-3" />, className: 'bg-gray-100 text-gray-700 border-gray-200' },
    cancelled: { label: '已取消', icon: <XCircle className="h-3 w-3" />, className: 'bg-yellow-100 text-yellow-700 border-yellow-200' },
  }
  const c = config[status] || { label: status, icon: <AlertTriangle className="h-3 w-3" />, className: 'bg-gray-100 text-gray-700 border-gray-200' }
  return (
    <Badge variant="outline" className={`gap-1 ${c.className}`}>
      {c.icon}
      {c.label}
    </Badge>
  )
}

/** 执行详情接口 */
interface ExecutionDetail {
  id: number
  name: string
  status: string
  summary: { total?: number; passed?: number; failed?: number; skipped?: number; duration_ms?: number } | null
  agent_execution_id: number | null
  started_at: string
  completed_at: string | null
  error_message: string | null
}

export default function ExecutionDetailPage() {
  const { id: projectId, eid: executionId } = useParams()
  const navigate = useNavigate()
  const [detail, setDetail] = useState<ExecutionDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [cancelling, setCancelling] = useState(false)
  const [logs, setLogs] = useState<string[]>([])
  const logEndRef = useRef<HTMLDivElement>(null)
  const eventSourceRef = useRef<EventSource | null>(null)

  /** 加载执行详情 */
  useEffect(() => {
    if (!executionId) return
    setLoading(true)
    executionApi.detail(Number(executionId))
      .then(res => { setDetail(res.data as unknown as ExecutionDetail) })
      .catch(() => setDetail(null))
      .finally(() => setLoading(false))
  }, [executionId])

  /** SSE 日志流连接 */
  useEffect(() => {
    if (!executionId) return
    const url = executionApi.executionStreamUrl(Number(executionId))
    const es = new EventSource(url)
    eventSourceRef.current = es

    es.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)
        if (data.type === 'log') {
          setLogs(prev => [...prev, data.message])
        } else if (data.type === 'status' && data.status === 'done') {
          // 执行完成，刷新详情
          executionApi.detail(Number(executionId))
            .then(res => { setDetail(res.data as unknown as ExecutionDetail) })
        }
      } catch { /* ignore parse errors */ }
    }

    es.onerror = () => {
      es.close()
    }

    return () => { es.close() }
  }, [executionId])

  /** 自动滚动到底部 */
  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [logs])

  const handleCancel = async () => {
    if (!executionId) return
    setCancelling(true)
    try {
      await executionApi.cancel(Number(executionId))
      setDetail(prev => prev ? { ...prev, status: 'cancelled' } : null)
    } catch { /* ignore */ }
    finally { setCancelling(false) }
  }

  const backPath = projectId
    ? `/projects/${projectId}/executions`
    : '/executions'

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin" style={{ color: 'var(--amber-primary)' }} />
      </div>
    )
  }

  if (!detail) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" onClick={() => navigate(backPath)}>
          <ArrowLeft className="mr-1 h-4 w-4" /> 返回
        </Button>
        <Card>
          <CardContent className="p-6 text-center text-muted-foreground">
            执行记录不存在或已被删除
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* 标题 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate(backPath)}>
            <ArrowLeft className="mr-1 h-4 w-4" /> 返回
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold tracking-tight">{detail.name}</h2>
              <StatusBadge status={detail.status} />
            </div>
            <p className="text-sm text-muted-foreground mt-0.5">
              执行 #{detail.id}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {detail.status === 'running' && (
            <Button
              variant="outline"
              size="sm"
              className="text-red-600 border-red-200"
              onClick={handleCancel}
              disabled={cancelling}
            >
              <StopCircle className="h-4 w-4 mr-1" />
              {cancelling ? '取消中...' : '取消执行'}
            </Button>
          )}
        </div>
      </div>

      {/* 概要卡片 */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Activity className="h-4 w-4" /> 执行概要
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
            <div className="rounded-lg bg-muted/30 p-3 text-center">
              <div className="text-xs text-muted-foreground">总用例</div>
              <div className="text-xl font-bold mt-1">{detail.summary?.total ?? '-'}</div>
            </div>
            <div className="rounded-lg bg-green-50 p-3 text-center">
              <div className="text-xs text-green-600">通过</div>
              <div className="text-xl font-bold mt-1 text-green-700">{detail.summary?.passed ?? '-'}</div>
            </div>
            <div className="rounded-lg bg-red-50 p-3 text-center">
              <div className="text-xs text-red-600">失败</div>
              <div className="text-xl font-bold mt-1 text-red-700">{detail.summary?.failed ?? '-'}</div>
            </div>
            <div className="rounded-lg bg-gray-50 p-3 text-center">
              <div className="text-xs text-gray-600">跳过</div>
              <div className="text-xl font-bold mt-1 text-gray-700">{detail.summary?.skipped ?? '-'}</div>
            </div>
            <div className="rounded-lg bg-blue-50 p-3 text-center">
              <div className="text-xs text-blue-600">耗时</div>
              <div className="text-xl font-bold mt-1 text-blue-700">
                {detail.summary?.duration ? `${detail.summary.duration}s` : '-'}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 详情信息 */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <FileText className="h-4 w-4" /> 执行信息
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <span className="text-muted-foreground">开始时间：</span>
              <span>{detail.started_at ? new Date(detail.started_at).toLocaleString('zh-CN') : '-'}</span>
            </div>
            <div>
              <span className="text-muted-foreground">完成时间：</span>
              <span>{detail.completed_at ? new Date(detail.completed_at).toLocaleString('zh-CN') : '-'}</span>
            </div>
            <div>
              <span className="text-muted-foreground">关联Agent执行：</span>
              <span>{detail.agent_execution_id ? `#${detail.agent_execution_id}` : '-'}</span>
            </div>
            <div>
              <span className="text-muted-foreground">状态：</span>
              <StatusBadge status={detail.status} />
            </div>
          </div>
          {detail.error_message && (
            <>
              <Separator />
              <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-red-700 text-xs whitespace-pre-wrap">
                {detail.error_message}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* 实时日志（SSE 流） */}
      {(detail?.status === 'running' || detail?.status === 'pending' || logs.length > 0) && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Terminal className="h-4 w-4" /> 实时日志
              {detail?.status === 'running' && (
                <span className="flex items-center gap-1 text-xs text-blue-600 font-normal">
                  <span className="h-2 w-2 rounded-full bg-blue-500 animate-pulse" />
                  运行中
                </span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="rounded-lg bg-gray-950 text-green-400 p-4 max-h-80 overflow-y-auto font-mono text-xs leading-relaxed">
              {logs.length === 0 ? (
                <span className="text-gray-500">等待日志...</span>
              ) : (
                logs.map((line, i) => <div key={i}>{line}</div>)
              )}
              <div ref={logEndRef} />
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
