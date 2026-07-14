import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Plus, Server, Activity, Rocket, Loader2 } from 'lucide-react'
import { environmentApi, type EnvironmentItem } from '@/lib/api-service'

/** 状态映射 */
const statusMap: Record<string, { label: string; className: string }> = {
  ready: { label: '就绪', className: 'bg-green-100 text-green-700' },
  in_use: { label: '使用中', className: 'bg-blue-100 text-blue-700' },
  maintenance: { label: '维护中', className: 'bg-orange-100 text-orange-700' },
  preparing: { label: '准备中', className: 'bg-gray-100 text-gray-500' },
  unavailable: { label: '不可用', className: 'bg-red-100 text-red-700' },
}

/** 类型映射 */
const typeMap: Record<string, string> = {
  dev: '开发环境',
  test: '测试环境',
  staging: '预发布环境',
  production: '生产环境',
  custom: '自定义',
}

/**
 * 测试环境列表页
 * 卡片式展示环境及其状态
 */
export default function EnvironmentListPage() {
  const navigate = useNavigate()
  const [environments, setEnvironments] = useState<EnvironmentItem[]>([])
  const [loading, setLoading] = useState(true)

  const fetchEnvironments = useCallback(async () => {
    setLoading(true)
    try {
      const res = await environmentApi.list()
      setEnvironments(res.data.items)
    } catch {
      // keep existing
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchEnvironments() }, [fetchEnvironments])

  const handleHealthCheck = async (id: number) => {
    try {
      await environmentApi.healthCheck(id)
      // 刷新状态
      fetchEnvironments()
    } catch {
      // ignore
    }
  }

  const handleDeploy = async (id: number) => {
    try {
      await environmentApi.deploy(id)
      fetchEnvironments()
    } catch {
      // ignore
    }
  }

  return (
    <div className="space-y-4">
      {/* 操作栏 */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold" style={{ color: 'var(--polaroid-text)' }}>
          测试环境
        </h2>
        <Button
          onClick={() => navigate('/environments/new')}
          className="bg-[var(--amber-primary)] text-white hover:bg-[var(--amber-hover)]"
        >
          <Plus className="mr-1 h-4 w-4" />
          新建环境
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin" style={{ color: 'var(--amber-primary)' }} />
        </div>
      ) : environments.length === 0 ? (
        <Card className="border-[var(--polaroid-border)] shadow-polaroid">
          <CardContent className="p-12 text-center" style={{ color: 'var(--polaroid-text-muted)' }}>
            <Server className="mx-auto mb-3 h-10 w-10 opacity-40" />
            <p>暂无测试环境</p>
            <Button
              variant="outline"
              size="sm"
              className="mt-3 border-[var(--polaroid-border)]"
              onClick={() => navigate('/environments/new')}
            >
              创建第一个环境
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {environments.map((env) => (
            <Card
              key={env.id}
              className="cursor-pointer border-[var(--polaroid-border)] shadow-polaroid transition-all hover:-translate-y-1 hover:shadow-polaroid-hover"
              onClick={() => navigate(`/environments/${env.id}`)}
            >
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-base" style={{ color: 'var(--polaroid-text)' }}>
                      {env.name}
                    </CardTitle>
                    <p className="mt-0.5 text-xs" style={{ color: 'var(--polaroid-text-muted)' }}>
                      {typeMap[env.type] ?? env.type}
                    </p>
                  </div>
                  <Server className="h-5 w-5 opacity-40" style={{ color: 'var(--amber-primary)' }} />
                </div>
              </CardHeader>
              <CardContent>
                <div className="mb-3 flex items-center gap-2">
                  <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${statusMap[env.status]?.className ?? ''}`}>
                    {statusMap[env.status]?.label ?? env.status}
                  </span>
                  {env.config?.url && (
                    <span className="truncate text-xs" style={{ color: 'var(--polaroid-text-muted)' }}>
                      {env.config.url}
                    </span>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-[var(--polaroid-border)] text-xs"
                    onClick={(e) => { e.stopPropagation(); handleHealthCheck(env.id) }}
                  >
                    <Activity className="mr-1 h-3 w-3" />
                    健康检查
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-[var(--polaroid-border)] text-xs"
                    onClick={(e) => { e.stopPropagation(); handleDeploy(env.id) }}
                  >
                    <Rocket className="mr-1 h-3 w-3" />
                    部署
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
