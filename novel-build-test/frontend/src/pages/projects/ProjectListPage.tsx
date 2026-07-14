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
import { Plus, Search, Eye, Loader2 } from 'lucide-react'
import { projectApi, type ProjectItem } from '@/lib/api-service'

/** 状态映射 */
const statusMap: Record<string, { label: string; variant: 'default' | 'secondary' | 'outline' }> = {
  active: { label: '进行中', variant: 'default' },
  draft: { label: '草稿', variant: 'secondary' },
  archived: { label: '已归档', variant: 'outline' },
}

/**
 * 项目管理列表页
 * 搜索、新建、表格展示项目（真实 API）
 */
export default function ProjectListPage() {
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [projects, setProjects] = useState<ProjectItem[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)

  /** 获取项目列表 */
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

  useEffect(() => {
    fetchProjects()
  }, [fetchProjects])

  /** 搜索防抖 */
  const handleSearch = (value: string) => {
    setSearch(value)
    setPage(1)
  }

  return (
    <div className="space-y-4">
      {/* 操作栏 */}
      <div className="flex items-center justify-between">
        <div className="relative w-72">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="搜索项目..."
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
            className="pl-8"
          />
        </div>
        <Button onClick={() => navigate('/projects/new')}>
          <Plus className="mr-1 h-4 w-4" />
          新建项目
        </Button>
      </div>

      {/* 项目表格 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">项目列表</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>项目名称</TableHead>
                    <TableHead>描述</TableHead>
                    <TableHead>状态</TableHead>
                    <TableHead>创建时间</TableHead>
                    <TableHead className="text-right">操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {projects.map((project) => (
                    <TableRow key={project.id}>
                      <TableCell className="font-medium">{project.name}</TableCell>
                      <TableCell className="text-muted-foreground">{project.description}</TableCell>
                      <TableCell>
                        <Badge variant={statusMap[project.status]?.variant ?? 'outline'}>
                          {statusMap[project.status]?.label ?? project.status}
                        </Badge>
                      </TableCell>
                      <TableCell>{project.created_at}</TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => navigate(`/projects/${project.id}`)}
                        >
                          <Eye className="mr-1 h-4 w-4" />
                          查看
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {projects.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                        暂无项目数据
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
              {/* 分页 */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between border-t px-4 py-3">
                  <span className="text-sm text-muted-foreground">
                    第 {page} / {totalPages} 页
                  </span>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={page <= 1}
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                    >
                      上一页
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={page >= totalPages}
                      onClick={() => setPage((p) => p + 1)}
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
