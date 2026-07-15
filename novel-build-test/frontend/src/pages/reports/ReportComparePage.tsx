import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
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
  CheckCircle2,
  XCircle,
  SkipForward,
  GitCompareArrows,
} from 'lucide-react'
import { reportApi } from '@/lib/api-service'
import type { ReportItem } from '@/lib/api-service'

function StatusIcon({ status }: { status: string }) {
  switch (status) {
    case 'passed': return <CheckCircle2 className="h-4 w-4 text-green-600" />
    case 'failed': return <XCircle className="h-4 w-4 text-red-600" />
    case 'skipped': return <SkipForward className="h-4 w-4 text-yellow-600" />
    default: return <CheckCircle2 className="h-4 w-4 text-gray-400" />
  }
}

interface DiffRow {
  name: string
  statusA: string
  statusB: string
  durationA: number
  durationB: number
}

export default function ReportComparePage() {
  const { id: projectId } = useParams()
  const navigate = useNavigate()

  const [reports, setReports] = useState<ReportItem[]>([])
  const [reportA, setReportA] = useState<string>('')
  const [reportB, setReportB] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [diff, setDiff] = useState<DiffRow[]>([])

  const backPath = projectId ? `/projects/${projectId}/reports` : '/reports'

  useEffect(() => {
    setLoading(true)
    reportApi.list({ page: 1, page_size: 100, project_id: projectId ? Number(projectId) : undefined })
      .then(res => {
        const items = (res.data as unknown as { items: ReportItem[] }).items ?? []
        setReports(items)
        if (items.length >= 2) {
          setReportA(String(items[0].id))
          setReportB(String(items[1].id))
        }
      })
      .catch(() => setReports([]))
      .finally(() => setLoading(false))
  }, [projectId])

  useEffect(() => {
    if (!reportA || !reportB) { setDiff([]); return }

    const a = reports.find(r => r.id === Number(reportA))
    const b = reports.find(r => r.id === Number(reportB))
    if (!a || !b) { setDiff([]); return }

    // 合并用例列表，对比状态
    const detailsA = a.details ?? []
    const detailsB = b.details ?? []
    const allNames = new Set<string>()
    detailsA.forEach(d => allNames.add(d.name))
    detailsB.forEach(d => allNames.add(d.name))

    const rows: DiffRow[] = Array.from(allNames).map(name => {
      const da = detailsA.find(d => d.name === name)
      const db = detailsB.find(d => d.name === name)
      return {
        name,
        statusA: da?.status ?? 'skipped',
        statusB: db?.status ?? 'skipped',
        durationA: da?.duration ?? 0,
        durationB: db?.duration ?? 0,
      }
    }).sort((a, b) => {
      // 状态变化的排前面
      const aChanged = a.statusA !== a.statusB ? 0 : 1
      const bChanged = b.statusA !== b.statusB ? 0 : 1
      return aChanged - bChanged
    })

    setDiff(rows)
  }, [reportA, reportB, reports])

  const a = reports.find(r => r.id === Number(reportA))
  const b = reports.find(r => r.id === Number(reportB))

  const changedCount = diff.filter(r => r.statusA !== r.statusB).length

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin" style={{ color: 'var(--amber-primary)' }} />
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
            <GitCompareArrows className="h-5 w-5 text-amber-600" />
            <h2 className="text-xl font-bold tracking-tight">报告对比</h2>
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">选择两个报告并排对比执行结果差异</p>
        </div>
      </div>

      {/* 选择器 */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-sm font-medium mb-1 block">报告 A</label>
          <Select value={reportA} onValueChange={setReportA}>
            <SelectTrigger>
              <SelectValue placeholder="选择报告 A" />
            </SelectTrigger>
            <SelectContent>
              {reports.map(r => (
                <SelectItem key={r.id} value={String(r.id)}>
                  执行 #{r.execution_id} — 通过率 {r.pass_rate.toFixed(1)}%
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="text-sm font-medium mb-1 block">报告 B</label>
          <Select value={reportB} onValueChange={setReportB}>
            <SelectTrigger>
              <SelectValue placeholder="选择报告 B" />
            </SelectTrigger>
            <SelectContent>
              {reports.map(r => (
                <SelectItem key={r.id} value={String(r.id)}>
                  执行 #{r.execution_id} — 通过率 {r.pass_rate.toFixed(1)}%
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {a && b && (
        <>
          {/* 概要对比例 */}
          <div className="grid grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">报告</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-1 text-sm">
                  <div>A: 执行 #{a.execution_id} — 通过率 {a.pass_rate.toFixed(1)}%</div>
                  <div>B: 执行 #{b.execution_id} — 通过率 {b.pass_rate.toFixed(1)}%</div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">通过率差值</CardTitle></CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${(a.pass_rate - b.pass_rate) > 0 ? 'text-green-600' : (a.pass_rate - b.pass_rate) < 0 ? 'text-red-600' : ''}`}>
                  {(a.pass_rate - b.pass_rate) > 0 ? '+' : ''}{(a.pass_rate - b.pass_rate).toFixed(1)}%
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">状态变化用例</CardTitle></CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${changedCount > 0 ? 'text-amber-600' : 'text-green-600'}`}>
                  {changedCount} 个
                </div>
              </CardContent>
            </Card>
          </div>

          {/* 详细对比表格 */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">用例级对比</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>用例名称</TableHead>
                    <TableHead className="w-24 text-center">报告 A 状态</TableHead>
                    <TableHead className="w-24 text-center">报告 B 状态</TableHead>
                    <TableHead className="w-20 text-right">A 耗时</TableHead>
                    <TableHead className="w-20 text-right">B 耗时</TableHead>
                    <TableHead className="w-20 text-center">变化</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {diff.map((row, i) => {
                    const statusChanged = row.statusA !== row.statusB
                    return (
                      <TableRow key={i} className={statusChanged ? 'bg-amber-50/50' : ''}>
                        <TableCell className="max-w-md truncate text-sm">{row.name}</TableCell>
                        <TableCell className="text-center">
                          <Badge variant="outline" className={`gap-1 ${
                            row.statusA === 'passed' ? 'bg-green-50 text-green-700' :
                            row.statusA === 'failed' ? 'bg-red-50 text-red-700' : 'bg-gray-50 text-gray-500'
                          }`}>
                            <StatusIcon status={row.statusA} />
                            {row.statusA === 'passed' ? '通过' : row.statusA === 'failed' ? '失败' : '跳过'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant="outline" className={`gap-1 ${
                            row.statusB === 'passed' ? 'bg-green-50 text-green-700' :
                            row.statusB === 'failed' ? 'bg-red-50 text-red-700' : 'bg-gray-50 text-gray-500'
                          }`}>
                            <StatusIcon status={row.statusB} />
                            {row.statusB === 'passed' ? '通过' : row.statusB === 'failed' ? '失败' : '跳过'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right text-xs text-muted-foreground">{row.durationA.toFixed(1)}s</TableCell>
                        <TableCell className="text-right text-xs text-muted-foreground">{row.durationB.toFixed(1)}s</TableCell>
                        <TableCell className="text-center">
                          {statusChanged ? (
                            <Badge variant="outline" className="bg-amber-100 text-amber-700 border-amber-200">变化</Badge>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
