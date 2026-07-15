import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { BarChart3, Clock, Calendar, TrendingUp, ChevronDown, ChevronUp, Activity, AlertCircle, Loader2 } from 'lucide-react'
import { agentApi } from '../../lib/api-service'

interface ExecutionRecord {
  id: number
  name: string
  status: 'passed' | 'failed' | 'running' | 'aborted'
  duration: string
  date: string
  pass_rate: number
  total: number
  passed: number
  failed: number
}

interface ExecutionStats {
  total_runs: number
  total_passed: number
  total_failed: number
  avg_duration: string
  trend: string
  pass_rate: number
}

const STATUS_CONFIG: Record<string, { label: string; dot: string; bg: string }> = {
  passed: { label: '通过', dot: 'bg-green-500', bg: 'bg-green-50 text-green-600' },
  failed: { label: '失败', dot: 'bg-red-500', bg: 'bg-red-50 text-red-600' },
  running: { label: '执行中', dot: 'bg-blue-500', bg: 'bg-blue-50 text-blue-600' },
  aborted: { label: '终止', dot: 'bg-gray-400', bg: 'bg-gray-100 text-gray-500' },
}

export default function ExecutionAgentPage() {
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [stats, setStats] = useState<ExecutionStats | null>(null)
  const [executions, setExecutions] = useState<ExecutionRecord[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const cleanup = () => {
    if (intervalRef.current !== null) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
  }

  useEffect(() => {
    const loadData = async () => {
      setLoading(true)
      setError(null)
      try {
        const triggerRes = await agentApi.executionAnalyze({})
        const executionId = triggerRes.data.execution_id

        intervalRef.current = setInterval(async () => {
          try {
            const statusRes = await agentApi.executionStatus(executionId)
            if (statusRes.data.status === 'completed') {
              cleanup()
              const resultRes = await agentApi.executionResult(executionId)
              const data = resultRes.data.result as { stats: ExecutionStats; executions: ExecutionRecord[] }
              setStats(data.stats)
              setExecutions(data.executions)
              setLoading(false)
            } else if (statusRes.data.status === 'failed') {
              cleanup()
              setError('执行分析失败')
              setLoading(false)
            }
          } catch {
            cleanup()
            setError('检查状态时出错')
            setLoading(false)
          }
        }, 1000)
      } catch {
        setError('触发执行分析失败')
        setLoading(false)
      }
    }

    loadData()
    return () => cleanup()
  }, [])

  const toggleDetail = (id: number) => {
    setSelectedId(prev => prev === id ? null : id)
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="rounded-xl border p-5" style={{ borderColor: 'var(--polaroid-border)', backgroundColor: 'var(--polaroid-white)' }}>
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-xl flex items-center justify-center" style={{ backgroundColor: 'rgba(59, 130, 246, 0.1)' }}>
            <Activity className="h-6 w-6 text-blue-500" />
          </div>
          <div>
            <h2 className="text-lg font-semibold" style={{ color: 'var(--polaroid-text)' }}>执行分析智能体</h2>
            <p className="text-sm" style={{ color: 'var(--polaroid-text-muted)' }}>
              查看测试执行统计、通过率趋势和详细的执行记录
            </p>
          </div>
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="h-8 w-8 animate-spin" style={{ color: 'var(--amber-primary)' }} />
            <span className="text-sm" style={{ color: 'var(--polaroid-text-muted)' }}>AI 正在分析执行数据...</span>
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 rounded-xl border p-4" style={{ borderColor: '#FCA5A5', backgroundColor: '#FEF2F2' }}>
          <AlertCircle className="h-4 w-4 text-red-500 shrink-0" />
          <span className="text-sm text-red-600">{error}</span>
        </div>
      )}

      {/* Stats Cards */}
      {stats && (
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="rounded-xl border p-4" style={{ borderColor: 'var(--polaroid-border)', backgroundColor: 'var(--polaroid-white)' }}>
          <p className="text-xs mb-1" style={{ color: 'var(--polaroid-text-muted)' }}>总执行次数</p>
          <p className="text-xl font-bold" style={{ color: 'var(--polaroid-text)' }}>{stats.total_runs}</p>
        </div>
        <div className="rounded-xl border p-4" style={{ borderColor: 'var(--polaroid-border)', backgroundColor: 'var(--polaroid-white)' }}>
          <p className="text-xs mb-1" style={{ color: 'var(--polaroid-text-muted)' }}>通过</p>
          <p className="text-xl font-bold text-green-600">{stats.total_passed}</p>
        </div>
        <div className="rounded-xl border p-4" style={{ borderColor: 'var(--polaroid-border)', backgroundColor: 'var(--polaroid-white)' }}>
          <p className="text-xs mb-1" style={{ color: 'var(--polaroid-text-muted)' }}>失败</p>
          <p className="text-xl font-bold text-red-500">{stats.total_failed}</p>
        </div>
        <div className="rounded-xl border p-4" style={{ borderColor: 'var(--polaroid-border)', backgroundColor: 'var(--polaroid-white)' }}>
          <p className="text-xs mb-1" style={{ color: 'var(--polaroid-text-muted)' }}>通过率</p>
          <p className="text-xl font-bold" style={{ color: stats.pass_rate >= 80 ? '#10B981' : '#F59E0B' }}>
            {stats.pass_rate}%
          </p>
        </div>
        <div className="rounded-xl border p-4" style={{ borderColor: 'var(--polaroid-border)', backgroundColor: 'var(--polaroid-white)' }}>
          <p className="text-xs mb-1 flex items-center gap-1" style={{ color: 'var(--polaroid-text-muted)' }}>
            <TrendingUp className="h-3 w-3 text-green-500" /> 趋势
          </p>
          <p className="text-xl font-bold text-green-600">{stats.trend}</p>
        </div>
      </div>
      )}

      {/* Execution List */}
      {executions && (
      <div className="rounded-xl border overflow-hidden" style={{ borderColor: 'var(--polaroid-border)' }}>
        <div className="px-4 py-3 border-b" style={{ borderColor: 'var(--polaroid-border)', backgroundColor: 'var(--polaroid-warm)' }}>
          <h3 className="text-sm font-semibold flex items-center gap-2" style={{ color: 'var(--polaroid-text)' }}>
            <BarChart3 className="h-4 w-4" />
            近期执行记录
          </h3>
        </div>
        <div className="divide-y" style={{ borderColor: 'var(--polaroid-border)' }}>
          {executions.map((exec) => {
            const statusConf = STATUS_CONFIG[exec.status]
            const isOpen = selectedId === exec.id
            return (
              <div key={exec.id}>
                <button onClick={() => toggleDetail(exec.id)}
                  className="w-full flex items-center gap-4 px-4 py-3.5 text-left hover:bg-gray-50/50 transition-colors"
                  style={{ backgroundColor: 'var(--polaroid-white)' }}>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium" style={{ color: 'var(--polaroid-text)' }}>{exec.name}</p>
                  </div>
                  <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${statusConf.bg}`}>
                    <span className={`h-1.5 w-1.5 rounded-full ${statusConf.dot}`} />
                    {statusConf.label}
                  </span>
                  <span className="text-xs flex items-center gap-1" style={{ color: 'var(--polaroid-text-muted)' }}>
                    <Clock className="h-3 w-3" /> {exec.duration}
                  </span>
                  <span className="text-xs flex items-center gap-1" style={{ color: 'var(--polaroid-text-muted)' }}>
                    <Calendar className="h-3 w-3" /> {exec.date}
                  </span>
                  {isOpen ? <ChevronUp className="h-4 w-4" style={{ color: 'var(--polaroid-text-muted)' }} />
                    : <ChevronDown className="h-4 w-4" style={{ color: 'var(--polaroid-text-muted)' }} />}
                </button>
                <AnimatePresence>
                  {isOpen && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                      className="overflow-hidden border-t" style={{ borderColor: 'var(--polaroid-border)' }}>
                      <div className="px-4 py-4 space-y-3" style={{ backgroundColor: 'var(--polaroid-cream)' }}>
                        <div className="grid grid-cols-4 gap-3">
                          <div className="rounded-lg border p-3 text-center" style={{ borderColor: 'var(--polaroid-border)', backgroundColor: 'var(--polaroid-white)' }}>
                            <p className="text-xs" style={{ color: 'var(--polaroid-text-muted)' }}>总计</p>
                            <p className="text-lg font-bold" style={{ color: 'var(--polaroid-text)' }}>{exec.total}</p>
                          </div>
                          <div className="rounded-lg border p-3 text-center" style={{ borderColor: 'var(--polaroid-border)', backgroundColor: 'var(--polaroid-white)' }}>
                            <p className="text-xs" style={{ color: 'var(--polaroid-text-muted)' }}>通过</p>
                            <p className="text-lg font-bold text-green-600">{exec.passed}</p>
                          </div>
                          <div className="rounded-lg border p-3 text-center" style={{ borderColor: 'var(--polaroid-border)', backgroundColor: 'var(--polaroid-white)' }}>
                            <p className="text-xs" style={{ color: 'var(--polaroid-text-muted)' }}>失败</p>
                            <p className="text-lg font-bold text-red-500">{exec.failed}</p>
                          </div>
                          <div className="rounded-lg border p-3 text-center" style={{ borderColor: 'var(--polaroid-border)', backgroundColor: 'var(--polaroid-white)' }}>
                            <p className="text-xs" style={{ color: 'var(--polaroid-text-muted)' }}>通过率</p>
                            <p className="text-lg font-bold" style={{ color: exec.pass_rate >= 80 ? '#10B981' : '#F59E0B' }}>{exec.pass_rate}%</p>
                          </div>
                        </div>
                        {/* Progress bar */}
                        <div className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--polaroid-warm)' }}>
                          <div className="h-full rounded-full transition-all duration-500" style={{
                            width: `${exec.pass_rate}%`,
                            backgroundColor: exec.pass_rate >= 80 ? '#10B981' : exec.pass_rate >= 50 ? '#F59E0B' : '#EF4444',
                          }} />
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )
          })}
        </div>
      </div>
      )}
    </div>
  )
}
