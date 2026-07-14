import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, Loader2, FileText, Server, Package, BookOpen, FolderKanban } from 'lucide-react'
import { projectApi, type ProjectItem } from '@/lib/api-service'

/** 状态映射 */
const statusMap: Record<string, { label: string; variant: 'default' | 'secondary' | 'outline' }> = {
  active: { label: '进行中', variant: 'default' },
  draft: { label: '草稿', variant: 'secondary' },
  archived: { label: '已归档', variant: 'outline' },
}

/** 统计卡片配置 */
interface StatItem {
  label: string
  value: number | string
  icon: React.ReactNode
  color: string
  href?: string
}

/**
 * 项目详情页
 * 暖白风格 + 关联模块统计卡片
 */
export default function ProjectDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [project, setProject] = useState<ProjectItem | null>(null)
  const [stats, setStats] = useState({ total_requirements: 0, total_environments: 0, total_assets: 0, total_knowledge: 0 })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!id) return
    const projectId = Number(id)
    setLoading(true)

    Promise.all([
      projectApi.detail(projectId),
      projectApi.stats(projectId).catch(() => ({ data: { total_requirements: 0, total_environments: 0, total_assets: 0, total_knowledge: 0 } })),
    ])
      .then(([projRes, statsRes]) => {
        setProject(projRes.data)
        setStats(statsRes.data)
      })
      .catch(() => setProject(null))
      .finally(() => setLoading(false))
  }, [id])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin" style={{ color: 'var(--amber-primary)' }} />
      </div>
    )
  }

  if (!project) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" onClick={() => navigate('/projects')}>
          <ArrowLeft className="mr-1 h-4 w-4" />
          返回
        </Button>
        <Card className="border-[var(--polaroid-border)] shadow-polaroid">
          <CardContent className="p-6 text-center" style={{ color: 'var(--polaroid-text-muted)' }}>
            项目不存在或已被删除
          </CardContent>
        </Card>
      </div>
    )
  }

  const statCards: StatItem[] = [
    { label: '需求', value: stats.total_requirements, icon: <FileText className="h-5 w-5" />, color: '#3B82F6', href: '/requirements' },
    { label: '环境', value: stats.total_environments, icon: <Server className="h-5 w-5" />, color: '#10B981', href: '/environments' },
    { label: '资产', value: stats.total_assets, icon: <Package className="h-5 w-5" />, color: '#8B5CF6', href: '/assets' },
    { label: '知识', value: stats.total_knowledge, icon: <BookOpen className="h-5 w-5" />, color: '#EC4899', href: '/knowledge' },
  ]

  return (
    <div className="space-y-6">
      {/* 返回 + 标题 */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => navigate('/projects')}>
          <ArrowLeft className="mr-1 h-4 w-4" />
          返回
        </Button>
        <div className="flex items-center gap-2">
          <FolderKanban className="h-5 w-5" style={{ color: 'var(--amber-primary)' }} />
          <h2 className="text-xl font-semibold" style={{ color: 'var(--polaroid-text)' }}>
            {project.name}
          </h2>
        </div>
        <Badge
          variant={statusMap[project.status]?.variant ?? 'outline'}
          className={project.status === 'active' ? 'bg-amber-50 text-amber-700' : ''}
        >
          {statusMap[project.status]?.label ?? project.status}
        </Badge>
      </div>

      {/* 基本信息卡片 */}
      <Card className="border-[var(--polaroid-border)] shadow-polaroid">
        <CardHeader className="border-b border-[var(--polaroid-border)] bg-[var(--polaroid-white)]">
          <CardTitle className="text-base" style={{ color: 'var(--polaroid-text)' }}>基本信息</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 p-6 text-sm md:grid-cols-3">
          <div>
            <span className="font-medium" style={{ color: 'var(--polaroid-text-muted)' }}>描述：</span>
            <span style={{ color: 'var(--polaroid-text)' }}>{project.description ?? '—'}</span>
          </div>
          <div>
            <span className="font-medium" style={{ color: 'var(--polaroid-text-muted)' }}>创建时间：</span>
            <span style={{ color: 'var(--polaroid-text)' }}>{project.created_at}</span>
          </div>
        </CardContent>
      </Card>

      {/* 关联模块统计卡片 */}
      <div>
        <h3 className="mb-3 text-base font-semibold" style={{ color: 'var(--polaroid-text)' }}>
          关联模块
        </h3>
        <div className="grid gap-4 md:grid-cols-4">
          {statCards.map((stat) => (
            <Card
              key={stat.label}
              className="cursor-pointer border-[var(--polaroid-border)] shadow-polaroid transition-all hover:-translate-y-1 hover:shadow-polaroid-hover"
              onClick={() => stat.href && navigate(stat.href)}
            >
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle
                  className="text-sm font-medium"
                  style={{ color: 'var(--polaroid-text-muted)' }}
                >
                  {stat.label}
                </CardTitle>
                <span style={{ color: stat.color }}>{stat.icon}</span>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" style={{ color: 'var(--polaroid-text)' }}>
                  {stat.value}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  )
}
