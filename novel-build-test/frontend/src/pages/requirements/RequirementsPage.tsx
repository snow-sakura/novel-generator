import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router'
import { Button } from '@/components/ui/button'
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
  Card,
  CardContent,
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
import { Plus, Search, Loader2, FileText, Pencil } from 'lucide-react'
import { requirementApi, type RequirementItem } from '@/lib/api-service'

/** 优先级映射 */
const priorityMap: Record<string, { label: string; className: string }> = {
  P0: { label: 'P0 紧急', className: 'bg-red-100 text-red-700' },
  P1: { label: 'P1 高', className: 'bg-orange-100 text-orange-700' },
  P2: { label: 'P2 中', className: 'bg-amber-100 text-amber-700' },
  P3: { label: 'P3 低', className: 'bg-gray-100 text-gray-500' },
}

/** 状态映射 */
const statusMap: Record<string, { label: string; className: string }> = {
  draft: { label: '草稿', className: 'bg-gray-100 text-gray-500' },
  review: { label: '评审中', className: 'bg-blue-100 text-blue-700' },
  approved: { label: '已通过', className: 'bg-green-100 text-green-700' },
  implemented: { label: '已实现', className: 'bg-purple-100 text-purple-700' },
  rejected: { label: '已驳回', className: 'bg-red-100 text-red-700' },
}

/**
 * 需求管理列表页
 * 暖白 Polaroid 风格 + 多条件筛选
 */
export default function RequirementsPage() {
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [priorityFilter, setPriorityFilter] = useState('')
  const [requirements, setRequirements] = useState<RequirementItem[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)

  const fetchRequirements = useCallback(async () => {
    setLoading(true)
    try {
      const res = await requirementApi.list({
        page,
        page_size: 20,
        search: search || undefined,
        status: statusFilter || undefined,
        priority: priorityFilter || undefined,
      })
      setRequirements(res.data.items)
      setTotalPages(res.data.total_pages)
    } catch {
      // keep existing data
    } finally {
      setLoading(false)
    }
  }, [page, search, statusFilter, priorityFilter])

  useEffect(() => { fetchRequirements() }, [fetchRequirements])

  const handleSearch = (value: string) => {
    setSearch(value)
    setPage(1)
  }

  return (
    <div className="space-y-4">
      {/* 操作栏 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="relative w-60">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4" style={{ color: 'var(--polaroid-text-muted)' }} />
            <Input
              placeholder="搜索需求..."
              value={search}
              onChange={(e) => handleSearch(e.target.value)}
              className="border-[var(--polaroid-border)] bg-white pl-8 text-sm"
            />
          </div>
          <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1) }}>
            <SelectTrigger className="w-28 border-[var(--polaroid-border)] bg-white text-sm">
              <SelectValue placeholder="状态" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value=" ">全部</SelectItem>
              <SelectItem value="draft">草稿</SelectItem>
              <SelectItem value="review">评审中</SelectItem>
              <SelectItem value="approved">已通过</SelectItem>
              <SelectItem value="implemented">已实现</SelectItem>
              <SelectItem value="rejected">已驳回</SelectItem>
            </SelectContent>
          </Select>
          <Select value={priorityFilter} onValueChange={(v) => { setPriorityFilter(v); setPage(1) }}>
            <SelectTrigger className="w-24 border-[var(--polaroid-border)] bg-white text-sm">
              <SelectValue placeholder="优先级" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value=" ">全部</SelectItem>
              <SelectItem value="P0">P0</SelectItem>
              <SelectItem value="P1">P1</SelectItem>
              <SelectItem value="P2">P2</SelectItem>
              <SelectItem value="P3">P3</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button
          onClick={() => navigate('/requirements/new')}
          className="bg-[var(--amber-primary)] text-white hover:bg-[var(--amber-hover)]"
        >
          <Plus className="mr-1 h-4 w-4" />
          新建需求
        </Button>
      </div>

      {/* 需求表格 */}
      <Card className="border-[var(--polaroid-border)] shadow-polaroid">
        <CardHeader className="border-b border-[var(--polaroid-border)] bg-[var(--polaroid-white)]">
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5" style={{ color: 'var(--amber-primary)' }} />
            <CardTitle className="text-base" style={{ color: 'var(--polaroid-text)' }}>需求列表</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin" style={{ color: 'var(--amber-primary)' }} />
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow style={{ borderColor: 'var(--polaroid-border)' }}>
                    <TableHead className="font-medium" style={{ color: 'var(--polaroid-text)' }}>标题</TableHead>
                    <TableHead className="font-medium" style={{ color: 'var(--polaroid-text)' }}>模块</TableHead>
                    <TableHead className="font-medium" style={{ color: 'var(--polaroid-text)' }}>优先级</TableHead>
                    <TableHead className="font-medium" style={{ color: 'var(--polaroid-text)' }}>状态</TableHead>
                    <TableHead className="font-medium" style={{ color: 'var(--polaroid-text)' }}>更新时间</TableHead>
                    <TableHead className="text-right font-medium" style={{ color: 'var(--polaroid-text)' }}>操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {requirements.map((req) => (
                    <TableRow
                      key={req.id}
                      className="transition-colors hover:bg-[var(--polaroid-warm)]"
                      style={{ borderColor: 'var(--polaroid-border)' }}
                    >
                      <TableCell className="max-w-xs truncate font-medium" style={{ color: 'var(--polaroid-text)' }}>
                        {req.title}
                      </TableCell>
                      <TableCell style={{ color: 'var(--polaroid-text-muted)' }}>
                        {req.module ?? '—'}
                      </TableCell>
                      <TableCell>
                        <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${priorityMap[req.priority]?.className ?? ''}`}>
                          {priorityMap[req.priority]?.label ?? req.priority}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${statusMap[req.status]?.className ?? ''}`}>
                          {statusMap[req.status]?.label ?? req.status}
                        </span>
                      </TableCell>
                      <TableCell style={{ color: 'var(--polaroid-text-muted)' }}>{req.updated_at}</TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => navigate(`/requirements/${req.id}`)}
                          style={{ color: 'var(--amber-primary)' }}
                        >
                          <Pencil className="mr-1 h-4 w-4" />
                          编辑
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {requirements.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="py-8 text-center" style={{ color: 'var(--polaroid-text-muted)' }}>
                        暂无需求数据
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
              {totalPages > 1 && (
                <div
                  className="flex items-center justify-between border-t px-4 py-3"
                  style={{ borderColor: 'var(--polaroid-border)' }}
                >
                  <span className="text-sm" style={{ color: 'var(--polaroid-text-muted)' }}>
                    第 {page} / {totalPages} 页
                  </span>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={page <= 1}
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      className="border-[var(--polaroid-border)]"
                    >
                      上一页
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={page >= totalPages}
                      onClick={() => setPage((p) => p + 1)}
                      className="border-[var(--polaroid-border)]"
                    >
                      下一页
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
