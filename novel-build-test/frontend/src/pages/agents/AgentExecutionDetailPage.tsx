import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Loader2,
  ArrowLeft,
  BrainCircuit,
  CheckCircle2,
  XCircle,
  Clock,
  DollarSign,
  FileText,
  AlertTriangle,
} from 'lucide-react'
import { agentApi } from '@/lib/api-service'

interface ExecutionDetail {
  id: number
  项目ID: number
  智能体名称: string
  任务类型: string
  状态: string
  输入: any
  输出: any
  模型: string
  提示token: number
  完成token: number
  费用: number
  开始时间: string
  完成时间: string
  错误: string
}

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { label: string; className: string }> = {
    completed: { label: '已完成', className: 'bg-green-100 text-green-700 border-green-200' },
    completed_with_errors: { label: '完成(有错误)', className: 'bg-amber-100 text-amber-700 border-amber-200' },
    failed: { label: '失败', className: 'bg-red-100 text-red-700 border-red-200' },
    running: { label: '运行中', className: 'bg-blue-100 text-blue-700 border-blue-200' },
    pending: { label: '等待中', className: 'bg-gray-100 text-gray-700 border-gray-200' },
  }
  const c = config[status] || { label: status, className: 'bg-gray-100 text-gray-700 border-gray-200' }
  return <Badge variant="outline" className={c.className}>{c.label}</Badge>
}

export default function AgentExecutionDetailPage() {
  const { eid } = useParams()
  const navigate = useNavigate()
  const [detail, setDetail] = useState<ExecutionDetail | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!eid) return
    setLoading(true)
    agentApi.executionDetail(Number(eid))
      .then((res) => setDetail(res.data))
      .catch(() => setDetail(null))
      .finally(() => setLoading(false))
  }, [eid])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!detail) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" onClick={() => navigate('/agents/executions')}>
          <ArrowLeft className="h-4 w-4 mr-1" /> 返回列表
        </Button>
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <AlertTriangle className="h-8 w-8 text-muted-foreground/50" />
            <p className="mt-3 text-sm text-muted-foreground">未找到执行记录</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  const formatTime = (t: string) => {
    if (!t) return '—'
    try { return new Date(t).toLocaleString('zh-CN') } catch { return t }
  }

  const renderJson = (data: any) => {
    if (!data) return '—'
    try {
      const str = typeof data === 'string' ? data : JSON.stringify(data, null, 2)
      return str
    } catch {
      return String(data)
    }
  }

  // 解析输出中的 results 和 errors
  const outputData = (() => {
    if (!detail.输出) return null
    const raw = typeof detail.输出 === 'string' ? detail.输出 : JSON.stringify(detail.输出)
    try { return JSON.parse(raw) } catch { return null }
  })()

  const results = outputData?.results || outputData?.结果 || {}
  const errors = outputData?.errors || outputData?.错误 || []
  const isError = Array.isArray(errors) ? errors.length > 0 : !!errors

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* 导航 */}
      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={() => navigate('/agents/executions')}>
          <ArrowLeft className="h-4 w-4 mr-1" /> 返回列表
        </Button>
        <Button variant="outline" size="sm" onClick={() => navigate('/agents')}>
          <BrainCircuit className="h-4 w-4 mr-1" /> 新建执行
        </Button>
      </div>

      {/* 概要信息 */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <CardTitle className="text-lg">执行 #{detail.id}</CardTitle>
              <StatusBadge status={detail.状态} />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="space-y-1">
              <span className="text-xs text-muted-foreground">任务类型</span>
              <p className="text-sm font-medium">{detail.任务类型}</p>
            </div>
            <div className="space-y-1">
              <span className="text-xs text-muted-foreground">智能体</span>
              <p className="text-sm font-medium">{detail.智能体名称}</p>
            </div>
            <div className="space-y-1">
              <span className="text-xs text-muted-foreground">使用模型</span>
              <p className="text-sm font-mono">{detail.模型 || '—'}</p>
            </div>
            <div className="space-y-1">
              <span className="text-xs text-muted-foreground">总费用</span>
              <p className="text-sm font-medium">¥{detail.费用?.toFixed(4) || '0.0000'}</p>
            </div>
            <div className="space-y-1">
              <span className="text-xs text-muted-foreground">提示 Token</span>
              <p className="text-sm font-mono">{detail.提示token?.toLocaleString() || '0'}</p>
            </div>
            <div className="space-y-1">
              <span className="text-xs text-muted-foreground">完成 Token</span>
              <p className="text-sm font-mono">{detail.完成token?.toLocaleString() || '0'}</p>
            </div>
            <div className="space-y-1">
              <span className="text-xs text-muted-foreground">开始时间</span>
              <p className="text-sm">{formatTime(detail.开始时间)}</p>
            </div>
            <div className="space-y-1">
              <span className="text-xs text-muted-foreground">完成时间</span>
              <p className="text-sm">{formatTime(detail.完成时间)}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 详情 Tabs */}
      <Tabs defaultValue="results" className="space-y-4">
        <TabsList>
          <TabsTrigger value="results">执行结果</TabsTrigger>
          <TabsTrigger value="input">输入参数</TabsTrigger>
          <TabsTrigger value="output">原始输出</TabsTrigger>
          {detail.错误 && <TabsTrigger value="error">错误信息</TabsTrigger>}
        </TabsList>

        <TabsContent value="results">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <FileText className="h-4 w-4" />
                各步骤执行结果
              </CardTitle>
            </CardHeader>
            <CardContent>
              {Object.keys(results).length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">暂无步骤级结果数据</p>
              ) : (
                <div className="space-y-3">
                  {Object.entries(results).map(([agentName, data]: [string, any]) => (
                    <div key={agentName} className="rounded-lg border border-gray-200 p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <BrainCircuit className="h-4 w-4 text-amber-600" />
                          <span className="font-medium text-sm">{agentName}</span>
                        </div>
                        <Badge variant="outline" className={
                          data.status === 'completed' ? 'bg-green-100 text-green-700 border-green-200' :
                          data.status === 'failed' ? 'bg-red-100 text-red-700 border-red-200' :
                          'bg-gray-100 text-gray-700 border-gray-200'
                        }>
                          {data.status || '—'}
                        </Badge>
                      </div>
                      {data.cost !== undefined && (
                        <div className="text-xs text-muted-foreground mb-1">
                          费用: ¥{Number(data.cost).toFixed(4)}
                        </div>
                      )}
                      {data.output && (
                        <pre className="text-xs bg-muted/30 p-3 rounded-md max-h-40 overflow-y-auto font-mono whitespace-pre-wrap">
                          {data.output}
                        </pre>
                      )}
                      {data.error && (
                        <div className="mt-2 text-xs text-red-600 bg-red-50 p-2 rounded">
                          {data.error}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* 错误汇总 */}
              {isError && (
                <>
                  <Separator className="my-4" />
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm font-medium text-red-600">
                      <AlertTriangle className="h-4 w-4" />
                      错误汇总 ({Array.isArray(errors) ? errors.length : 1})
                    </div>
                    {(Array.isArray(errors) ? errors : [errors]).map((err: any, i: number) => (
                      <div key={i} className="rounded-lg bg-red-50 border border-red-200 p-3 text-xs text-red-700">
                        <div className="font-medium">步骤 {err.step || err.agent || i + 1}</div>
                        <div className="mt-0.5">{err.error || err.message || JSON.stringify(err)}</div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="input">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">输入参数</CardTitle>
            </CardHeader>
            <CardContent>
              <pre className="text-xs bg-muted/30 p-4 rounded-lg max-h-96 overflow-y-auto font-mono whitespace-pre-wrap">
                {renderJson(detail.输入)}
              </pre>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="output">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">原始输出</CardTitle>
            </CardHeader>
            <CardContent>
              <pre className="text-xs bg-muted/30 p-4 rounded-lg max-h-96 overflow-y-auto font-mono whitespace-pre-wrap">
                {renderJson(detail.输出)}
              </pre>
            </CardContent>
          </Card>
        </TabsContent>

        {detail.错误 && (
          <TabsContent value="error">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2 text-red-600">
                  <XCircle className="h-4 w-4" />
                  错误信息
                </CardTitle>
              </CardHeader>
              <CardContent>
                <pre className="text-xs bg-red-50 border border-red-200 p-4 rounded-lg max-h-60 overflow-y-auto font-mono whitespace-pre-wrap text-red-700">
                  {detail.错误}
                </pre>
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>
    </div>
  )
}
