import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  ChevronLeft,
  ChevronRight,
  Loader2,
  MessageSquare,
  Search,
  CheckCircle2,
  AlertTriangle,
  ArrowLeft,
  Eye,
  RotateCcw,
} from 'lucide-react'
import { agentApi, type DebateRecord } from '@/lib/api-service'

const PAGE_SIZE = 10

export default function DebateRecordsPage() {
  const { id: projectId } = useParams()
  const navigate = useNavigate()

  const [records, setRecords] = useState<DebateRecord[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [searchExecutionId, setSearchExecutionId] = useState('')

  /** 加载辩论记录 */
  const loadRecords = async () => {
    setLoading(true)
    try {
      const params: Record<string, unknown> = { page, page_size: PAGE_SIZE }
      if (searchExecutionId) {
        params.execution_id = Number(searchExecutionId)
      }
      const res = await agentApi.debates(params)
      setRecords(res.data.items)
      setTotal(res.data.total)
    } catch {
      setRecords([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadRecords()
  }, [page])

  const totalPages = Math.ceil(total / PAGE_SIZE)

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => navigate(projectId ? `/projects/${projectId}/agents` : '/agents')}>
          <ArrowLeft className="mr-1 h-4 w-4" />
          返回
        </Button>
        <div>
          <h2 className="text-xl font-bold tracking-tight">辩论记录</h2>
          <p className="text-sm text-muted-foreground">
            查看所有 AI 辩论历史记录
          </p>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">辩论历史</CardTitle>
            <div className="flex items-center gap-2">
              {/* 按执行ID筛选 */}
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="执行ID"
                  className="pl-8 h-9 w-32"
                  value={searchExecutionId}
                  onChange={(e) => setSearchExecutionId(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      setPage(1)
                      loadRecords()
                    }
                  }}
                />
              </div>
              <Button variant="outline" size="sm" onClick={() => { setPage(1); loadRecords() }}>
                <RotateCcw className="h-3 w-3 mr-1" /> 刷新
              </Button>
              <Button size="sm" onClick={() => navigate(projectId ? `/projects/${projectId}/agents/debate` : '/agents/debate')}>
                <MessageSquare className="h-3 w-3 mr-1" /> 发起辩论
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-amber-500" />
            </div>
          ) : records.length === 0 ? (
            <div className="flex flex-col items-center py-12 text-center">
              <MessageSquare className="h-10 w-10 text-gray-300 mb-2" />
              <p className="text-sm text-muted-foreground">暂无辩论记录</p>
              <Button
                variant="link"
                size="sm"
                onClick={() => navigate(projectId ? `/projects/${projectId}/agents/debate` : '/agents/debate')}
              >
                发起第一场辩论
              </Button>
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-16">ID</TableHead>
                    <TableHead>议题</TableHead>
                    <TableHead className="w-20">轮次</TableHead>
                    <TableHead className="w-28">共识状态</TableHead>
                    <TableHead className="w-40">创建时间</TableHead>
                    <TableHead className="w-20 text-right">操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {records.map((record) => (
                    <TableRow key={record.id}>
                      <TableCell className="font-mono text-xs">{record.id}</TableCell>
                      <TableCell className="max-w-xs truncate">
                        {record.topic}
                      </TableCell>
                      <TableCell>{record.rounds?.length || 0} 轮</TableCell>
                      <TableCell>
                        {record.consensus ? (
                          <Badge className="bg-green-100 text-green-700 border-green-200 gap-1">
                            <CheckCircle2 className="h-3 w-3" /> 已共识
                          </Badge>
                        ) : (
                          <Badge className="bg-yellow-100 text-yellow-700 border-yellow-200 gap-1">
                            <AlertTriangle className="h-3 w-3" /> 未共识
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {new Date(record.created_at).toLocaleString('zh-CN')}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            // 展开详情：跳转到执行详情或打开对话框
                            if (record.execution_id) {
                              navigate(
                                projectId
                                  ? `/projects/${projectId}/agents/executions/${record.execution_id}`
                                  : `/agents/executions/${record.execution_id}`,
                              )
                            }
                          }}
                        >
                          <Eye className="h-3 w-3 mr-1" /> 查看
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* 分页 */}
              <div className="flex items-center justify-between border-t px-4 py-3">
                <span className="text-xs text-muted-foreground">
                  共 {total} 条记录
                </span>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="text-xs">
                    {page} / {totalPages || 1}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page >= totalPages}
                    onClick={() => setPage((p) => p + 1)}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
