import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
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
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Plus, Search, Eye, Loader2, FolderKanban } from 'lucide-react'
import { projectApi, type ProjectItem } from '@/lib/api-service'

/** 状态映射 */
const statusMap: Record<string, { label: string; variant: 'default' | 'secondary' | 'outline' }> = {
  active: { label: '进行中', variant: 'default' },
  draft: { label: '草稿', variant: 'secondary' },
  archived: { label: '已归档', variant: 'outline' },
}

/**
 * 项目管理列表页
 * Polaroid 暖色风格表格 + 搜索 + 新建
 */
export default function ProjectListPage() {
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [projects, setProjects] = useState<ProjectItem[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)

  const fetchProjects = useCallback(async () => {
    setLoading(true)
    try {
      const res = await projectApi.list({ page, page_size: 20, search: search || undefined })
      setProjects(res.data.items)
      setTotalPages(res.data.total_pages)
    } catch {
      // 保持现有数据
    } finally {
      setLoading(false)
    }
  }, [page, search])

  useEffect(() => { fetchProjects() }, [fetchProjects])

  const handleSearch = (value: string) => {
    setSearch(value)
    setPage(1)
  }

  return (
    <div className="space-y-4">
      {/* 操作栏 */}
      <div className="flex items-center justify-between">
        <div className="relative w-72">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4" style={{ color: 'var(--polaroid-text-muted)' }} />
          <Input
            placeholder="搜索项目..."
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
            className="border-[var(--polaroid-border)] bg-white pl-8 text-sm placeholder:text-[var(--polaroid-text-muted)]"
            style={{ borderColor: 'var(--polaroid-border)' }}
          />
        </div>
        <Button
          onClick={() => navigate('/projects/new')}
          className="bg-[var(--amber-primary)] text-white hover:bg-[var(--amber-hover)]"
        >
          <Plus className="mr-1 h-4 w-4" />
          新建项目
        </Button>
      </div>

      {/* 项目表格 */}
      <Card className="border-[var(--polaroid-border)] shadow-polaroid">
        <CardHeader className="border-b border-[var(--polaroid-border)] bg-[var(--polaroid-white)]">
          <div className="flex items-center gap-2">
            <FolderKanban className="h-5 w-5" style={{ color: 'var(--amber-primary)' }} />
            <CardTitle className="text-base" style={{ color: 'var(--polaroid-text)' }}>项目列表</CardTitle>
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
                    <TableHead className="font-medium" style={{ color: 'var(--polaroid-text)' }}>项目名称</TableHead>
                    <TableHead className="font-medium" style={{ color: 'var(--polaroid-text)' }}>描述</TableHead>
                    <TableHead className="font-medium" style={{ color: 'var(--polaroid-text)' }}>状态</TableHead>
                    <TableHead className="font-medium" style={{ color: 'var(--polaroid-text)' }}>创建时间</TableHead>
                    <TableHead className="text-right font-medium" style={{ color: 'var(--polaroid-text)' }}>操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {projects.map((project) => (
                    <TableRow
                      key={project.id}
                      className="cursor-pointer transition-colors hover:bg-[var(--polaroid-warm)]"
                      style={{ borderColor: 'var(--polaroid-border)' }}
                    >
                      <TableCell className="font-medium" style={{ color: 'var(--polaroid-text)' }}>
                        {project.name}
                      </TableCell>
                      <TableCell style={{ color: 'var(--polaroid-text-muted)' }}>
                        {project.description ?? '—'}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={statusMap[project.status]?.variant ?? 'outline'}
                          className={
                            project.status === 'active'
                              ? 'bg-amber-50 text-amber-700 hover:bg-amber-100'
                              : project.status === 'draft'
                                ? 'bg-gray-50 text-gray-500'
                                : ''
                          }
                        >
                          {statusMap[project.status]?.label ?? project.status}
                        </Badge>
                      </TableCell>
                      <TableCell style={{ color: 'var(--polaroid-text-muted)' }}>{project.created_at}</TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => navigate(`/projects/${project.id}`)}
                          style={{ color: 'var(--amber-primary)' }}
                        >
                          <Eye className="mr-1 h-4 w-4" />
                          查看
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {projects.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="py-8 text-center" style={{ color: 'var(--polaroid-text-muted)' }}>
                        暂无项目数据
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
