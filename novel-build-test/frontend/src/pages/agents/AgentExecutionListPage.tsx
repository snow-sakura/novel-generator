import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination'
import {
  Loader2,
  RefreshCw,
  BrainCircuit,
  Search,
} from 'lucide-react'
import { agentApi } from '@/lib/api-service'

interface ExecutionItem {
  id: number
  项目ID: number
  智能体名称: string
  任务类型: string
  状态: string
  费用: number
  模型: string
  开始时间: string
  完成时间: string
  错误: string
}

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { label: string; className: string }> = {
    completed: { label: '已完成', className: 'bg-green-100 text-green-700 border-green-200' },
    failed: { label: '失败', className: 'bg-red-100 text-red-700 border-red-200' },
    running: { label: '运行中', className: 'bg-blue-100 text-blue-700 border-blue-200' },
    pending: { label: '等待中', className: 'bg-gray-100 text-gray-700 border-gray-200' },
  }
  const c = config[status] || { label: status, className: 'bg-gray-100 text-gray-700 border-gray-200' }
  return <Badge variant="outline" className={c.className}>{c.label}</Badge>
}

export default function AgentExecutionListPage() {
  const { id: projectIdFromRoute } = useParams()
  const navigate = useNavigate()

  const [executions, setExecutions] = useState<ExecutionItem[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [pageSize] = useState(20)
  const [statusFilter, setStatusFilter] = useState('')
  const [loading, setLoading] = useState(false)

  const totalPages = Math.ceil(total / pageSize)

  const fetchExecutions = async () => {
    setLoading(true)
    try {
      const res = await agentApi.executions({
        page,
        page_size: pageSize,
        project_id: projectIdFromRoute ? Number(projectIdFromRoute) : undefined,
        status: statusFilter || undefined,
      })
      setExecutions(res.data.items as unknown as ExecutionItem[])
      setTotal(res.data.total)
    } catch {
      setExecutions([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchExecutions()
  }, [page, statusFilter, projectIdFromRoute])

  const formatTime = (t: string) => {
    if (!t) return '—'
    try {
      return new Date(t).toLocaleString('zh-CN')
    } catch {
      return t
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">智能体执行记录</h2>
          <p className="text-sm text-muted-foreground mt-1">
            查看所有 AI 智能体的任务执行历史和结果
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={fetchExecutions} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-1 ${loading ? 'animate-spin' : ''}`} />
            刷新
          </Button>
          <Button size="sm" onClick={() => navigate('/agents')}>
            <BrainCircuit className="h-4 w-4 mr-1" />
            新建执行
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">执行历史</CardTitle>
            <div className="flex items-center gap-2">
              <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1) }}>
                <SelectTrigger className="w-32 h-8 text-xs">
                  <SelectValue placeholder="全部状态" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部状态</SelectItem>
                  <SelectItem value="completed">已完成</SelectItem>
                  <SelectItem value="failed">失败</SelectItem>
                  <SelectItem value="running">运行中</SelectItem>
                  <SelectItem value="pending">等待中</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : executions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Search className="h-8 w-8 text-muted-foreground/50" />
              <p className="mt-3 text-sm text-muted-foreground">暂无执行记录</p>
              <Button variant="link" onClick={() => navigate('/agents')} className="mt-1">
                创建第一个执行任务
              </Button>
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-16">ID</TableHead>
                    <TableHead>任务类型</TableHead>
                    <TableHead>状态</TableHead>
                    <TableHead>费用 (¥)</TableHead>
                    <TableHead>模型</TableHead>
                    <TableHead>开始时间</TableHead>
                    <TableHead>完成时间</TableHead>
                    <TableHead className="w-20">操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {executions.map((exec) => (
                    <TableRow key={exec.id} className="cursor-pointer hover:bg-muted/50" onClick={() => navigate(`/agents/executions/${exec.id}`)}>
                      <TableCell className="text-xs font-mono">{exec.id}</TableCell>
                      <TableCell className="font-medium">{exec.任务类型}</TableCell>
                      <TableCell><StatusBadge status={exec.状态} /></TableCell>
                      <TableCell className="font-mono text-xs">{exec.费用?.toFixed(4) || '0.0000'}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{exec.模型 || '—'}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{formatTime(exec.开始时间)}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{formatTime(exec.完成时间)}</TableCell>
                      <TableCell>
                        <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); navigate(`/agents/executions/${exec.id}`) }}>
                          详情
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {totalPages > 1 && (
                <div className="mt-4 flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">
                    共 {total} 条记录，第 {page}/{totalPages} 页
                  </span>
                  <Pagination>
                    <PaginationContent>
                      <PaginationItem>
                        <PaginationPrevious
                          onClick={() => setPage(Math.max(1, page - 1))}
                          className={page <= 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                        />
                      </PaginationItem>
                      {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                        const start = Math.max(1, page - 2)
                        const p = start + i
                        if (p > totalPages) return null
                        return (
                          <PaginationItem key={p}>
                            <PaginationLink
                              onClick={() => setPage(p)}
                              isActive={p === page}
                            >
                              {p}
                            </PaginationLink>
                          </PaginationItem>
                        )
                      })}
                      <PaginationItem>
                        <PaginationNext
                          onClick={() => setPage(Math.min(totalPages, page + 1))}
                          className={page >= totalPages ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                        />
                      </PaginationItem>
                    </PaginationContent>
                  </Pagination>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
