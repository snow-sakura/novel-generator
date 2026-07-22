import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import {
  CheckCircle2,
  Clock,
  Play,
  RefreshCw,
  XCircle,
} from 'lucide-react'
import PolaroidCard from '@/components/polaroid/PolaroidCard'
import { workflowExecutionApi, type WorkflowExecutionItem } from '@/lib/api-service'

const statusConfig: Record<string, { label: string; color: string; icon: React.ComponentType<{ className?: string }> }> = {
  pending: { label: '等待中', color: '#6b7280', icon: Clock },
  running: { label: '执行中', color: '#2563eb', icon: RefreshCw },
  completed: { label: '已完成', color: '#059669', icon: CheckCircle2 },
  failed: { label: '失败', color: '#dc2626', icon: XCircle },
  cancelled: { label: '已取消', color: '#6b7280', icon: XCircle },
}

export default function WorkflowExecutionListPage() {
  const [executions, setExecutions] = useState<WorkflowExecutionItem[]>([])
  const [loading, setLoading] = useState(true)

  const load = () => {
    setLoading(true)
    workflowExecutionApi.list({ page_size: 50 })
      .then((res) => setExecutions(res.data.items))
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  return (
    <div className="flex flex-col h-full p-6 mx-auto max-w-5xl overflow-auto">
      {/* 标题区 */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--polaroid-text)' }}>
            Agent 工作流
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--polaroid-text-muted)' }}>
            多智能体编排执行记录
          </p>
        </div>
        <button
          onClick={load}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm transition-colors hover:opacity-80"
          style={{ backgroundColor: 'var(--polaroid-warm)', color: 'var(--polaroid-text)' }}
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          刷新
        </button>
      </div>

      {/* 执行列表 */}
      {loading && executions.length === 0 ? (
        <div className="grid gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 rounded-xl animate-pulse" style={{ backgroundColor: 'var(--polaroid-border)' }} />
          ))}
        </div>
      ) : executions.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Play className="h-12 w-12 mb-3" style={{ color: 'var(--polaroid-text-muted)' }} />
          <p style={{ color: 'var(--polaroid-text-muted)' }}>暂无工作流执行记录</p>
          <p className="text-sm mt-1 mb-4" style={{ color: 'var(--polaroid-text-muted)' }}>
            创建一个项目后，在项目详情页启动 Agent 工作流
          </p>
        </div>
      ) : (
        <div className="grid gap-4">
          {executions.map((exec, i) => {
            const cfg = statusConfig[exec.status] || statusConfig.pending
            const Icon = cfg.icon
            return (
              <motion.div
                key={exec.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
              >
                <PolaroidCard
                  icon={<Icon className="h-6 w-6" />}
                  color={cfg.color}
                  title={exec.name}
                  subtitle={`项目 #${exec.project_id} · ${cfg.label}${exec.total_cost > 0 ? ` · ¥${exec.total_cost.toFixed(4)}` : ''}`}
                  signature={exec.finished_at
                    ? `完成于 ${new Date(exec.finished_at).toLocaleString('zh-CN')}`
                    : exec.started_at
                      ? `开始于 ${new Date(exec.started_at).toLocaleString('zh-CN')}`
                      : exec.created_at
                        ? `创建于 ${new Date(exec.created_at).toLocaleString('zh-CN')}`
                        : ''}
                  badge={{
                    label: exec.current_step || cfg.label,
                    variant: exec.status === 'failed' ? 'rose' : 'default' as const,
                  }}
                  status={exec.status === 'completed' || exec.status === 'running' ? 'active' : 'pending'}
                  lastRunTime={exec.started_at || exec.created_at || undefined}
                />
              </motion.div>
            )
          })}
        </div>
      )}
    </div>
  )
}
