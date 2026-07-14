import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Progress } from '@/components/ui/progress'
import { ArrowLeft, ClipboardList, PlayCircle, Bug, Loader2 } from 'lucide-react'
import { projectApi, type ProjectItem } from '@/lib/api-service'

/**
 * 项目详情页
 * 展示项目信息、关联用例统计和执行情况（真实 API）
 */
export default function ProjectDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [project, setProject] = useState<ProjectItem | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!id) return
    setLoading(true)
    projectApi.detail(Number(id))
      .then((res) => setProject(res.data))
      .catch(() => setProject(null))
      .finally(() => setLoading(false))
  }, [id])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
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
        <Card>
          <CardContent className="p-6 text-center text-muted-foreground">
            项目不存在或已被删除
          </CardContent>
        </Card>
      </div>
    )
  }

  const stats = project.stats ?? {
    total_cases: 0,
    passed: 0,
    failed: 0,
    blocked: 0,
    executions: 0,
    bugs: 0,
  }
  const passRate = stats.total_cases > 0
    ? Math.round((stats.passed / stats.total_cases) * 100)
    : 0

  return (
    <div className="space-y-6">
      {/* 返回按钮 + 项目名称 */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => navigate('/projects')}>
          <ArrowLeft className="mr-1 h-4 w-4" />
          返回
        </Button>
        <h2 className="text-xl font-semibold">{project.name}</h2>
        <Badge variant={project.status === 'active' ? 'default' : 'secondary'}>
          {project.status === 'active' ? '进行中' : project.status === 'draft' ? '草稿' : '已归档'}
        </Badge>
      </div>

      {/* 项目基本信息 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">基本信息</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 text-sm md:grid-cols-3">
          <div>
            <span className="text-muted-foreground">项目描述：</span>
            <span>{project.description}</span>
          </div>
          <div>
            <span className="text-muted-foreground">负责人：</span>
            <span>{project.manager ?? '—'}</span>
          </div>
          <div>
            <span className="text-muted-foreground">创建时间：</span>
            <span>{project.created_at}</span>
          </div>
        </CardContent>
      </Card>

      {/* 统计卡片 */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm text-muted-foreground">总用例数</CardTitle>
            <ClipboardList className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total_cases}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm text-muted-foreground">通过率</CardTitle>
            <PlayCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="text-2xl font-bold text-green-600">{passRate}%</div>
            <Progress value={passRate} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm text-muted-foreground">执行次数</CardTitle>
            <PlayCircle className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.executions}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm text-muted-foreground">缺陷数</CardTitle>
            <Bug className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.bugs}</div>
          </CardContent>
        </Card>
      </div>

      {/* Tab 详情区域 */}
      <Tabs defaultValue="cases">
        <TabsList>
          <TabsTrigger value="cases">关联用例</TabsTrigger>
          <TabsTrigger value="executions">执行记录</TabsTrigger>
        </TabsList>
        <TabsContent value="cases" className="pt-4">
          <Card>
            <CardContent className="p-6 text-center text-muted-foreground">
              关联用例列表（开发中）
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="executions" className="pt-4">
          <Card>
            <CardContent className="p-6 text-center text-muted-foreground">
              执行记录列表（开发中）
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
