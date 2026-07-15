import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  ArrowLeft,
  Loader2,
  FileText,
  CheckCircle2,
  XCircle,
  SkipForward,
  Clock,
  AlertTriangle,
} from 'lucide-react'
import { reportApi } from '@/lib/api-service'
import type { ReportItem } from '@/lib/api-service'

function StatusIcon({ status }: { status: string }) {
  switch (status) {
    case 'passed': return <CheckCircle2 className="h-4 w-4 text-green-600" />
    case 'failed': return <XCircle className="h-4 w-4 text-red-600" />
    case 'skipped': return <SkipForward className="h-4 w-4 text-yellow-600" />
    default: return <Clock className="h-4 w-4 text-gray-400" />
  }
}

export default function ReportDetailPage() {
  const { id: projectId, eid: executionId } = useParams()
  const navigate = useNavigate()
  const [report, setReport] = useState<ReportItem | null>(null)
  const [loading, setLoading] = useState(true)
  const [expandedCase, setExpandedCase] = useState<number | null>(null)

  useEffect(() => {
    if (!executionId) return
    setLoading(true)
    reportApi.getByExecution(Number(executionId))
      .then(res => setReport(res.data as unknown as ReportItem))
      .catch(() => setReport(null))
      .finally(() => setLoading(false))
  }, [executionId])

  const backPath = projectId ? `/projects/${projectId}/reports` : '/reports'

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin" style={{ color: 'var(--amber-primary)' }} />
      </div>
    )
  }

  if (!report) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" onClick={() => navigate(backPath)}>
          <ArrowLeft className="mr-1 h-4 w-4" /> 返回
        </Button>
        <Card><CardContent className="p-6 text-center text-muted-foreground">报告不存在</CardContent></Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* 标题 */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => navigate(backPath)}>
          <ArrowLeft className="mr-1 h-4 w-4" /> 返回
        </Button>
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold tracking-tight">测试报告</h2>
            <Badge className={report.pass_rate >= 90 ? 'bg-green-100 text-green-700' : report.pass_rate >= 70 ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'}>
              通过率 {report.pass_rate.toFixed(1)}%
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">执行 #{report.execution_id} 的报告</p>
        </div>
      </div>

      {/* 质量评分 + 摘要 */}
      <div className="grid gap-6 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">总用例</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold">{report.total_cases}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground flex items-center gap-1"><CheckCircle2 className="h-3 w-3 text-green-600" /> 通过</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold text-green-600">{report.passed}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground flex items-center gap-1"><XCircle className="h-3 w-3 text-red-600" /> 失败</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold text-red-600">{report.failed}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">AI 质量评分</CardTitle></CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" style={{ color: report.quality_score && report.quality_score >= 80 ? '#10B981' : report.quality_score && report.quality_score >= 60 ? '#F59E0B' : '#EF4444' }}>
              {report.quality_score ?? '-'}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 摘要 */}
      {report.summary && (
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><FileText className="h-4 w-4" /> 报告摘要</CardTitle></CardHeader>
          <CardContent><p className="text-sm leading-relaxed">{report.summary}</p></CardContent>
        </Card>
      )}

      {/* 用例级结果表格 */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">用例详情</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-8">#</TableHead>
                <TableHead>用例名称</TableHead>
                <TableHead className="w-20">状态</TableHead>
                <TableHead className="w-20 text-right">耗时</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {report.details?.map((c, i) => (
                <>
                  <TableRow
                    key={i}
                    className="cursor-pointer"
                    onClick={() => setExpandedCase(expandedCase === i ? null : i)}
                  >
                    <TableCell className="text-xs text-muted-foreground">{i + 1}</TableCell>
                    <TableCell className="max-w-md truncate text-sm">{c.name}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={`gap-1 ${
                        c.status === 'passed' ? 'bg-green-50 text-green-700 border-green-200' :
                        c.status === 'failed' ? 'bg-red-50 text-red-700 border-red-200' :
                        'bg-yellow-50 text-yellow-700 border-yellow-200'
                      }`}>
                        <StatusIcon status={c.status} />
                        {c.status === 'passed' ? '通过' : c.status === 'failed' ? '失败' : '跳过'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right text-xs text-muted-foreground">{c.duration}s</TableCell>
                  </TableRow>
                  {expandedCase === i && c.error && (
                    <TableRow key={`err-${i}`}>
                      <TableCell colSpan={4} className="bg-red-50/50 px-8 py-2">
                        <div className="flex items-start gap-2 text-xs text-red-700">
                          <AlertTriangle className="h-3 w-3 mt-0.5 shrink-0" />
                          <code className="whitespace-pre-wrap">{c.error}</code>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
