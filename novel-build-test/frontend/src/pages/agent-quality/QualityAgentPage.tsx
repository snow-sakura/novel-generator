import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Loader2, ShieldCheck, Target, TrendingUp, AlertTriangle, Lightbulb, AlertCircle, DollarSign, PieChart, BarChart3 } from 'lucide-react'
import { agentApi } from '../../lib/api-service'

interface AuditDimension {
  key: string
  label: string
  score: number
  icon: typeof Target
  color: string
}

interface AuditRecommendation {
  category: string
  items: string[]
  severity: 'critical' | 'warning' | 'suggestion'
}

interface AuditResult {
  overall_score: number
  dimensions: AuditDimension[]
  recommendations: AuditRecommendation[]
}

const SEVERITY_CONFIG: Record<string, { icon: typeof AlertTriangle; color: string; bg: string; border: string }> = {
  critical: { icon: AlertTriangle, color: '#EF4444', bg: 'bg-red-50', border: 'border-red-200' },
  warning: { icon: AlertTriangle, color: '#F59E0B', bg: 'bg-amber-50', border: 'border-amber-200' },
  suggestion: { icon: Lightbulb, color: '#3B82F6', bg: 'bg-blue-50', border: 'border-blue-200' },
}

const SEVERITY_LABELS: Record<string, string> = {
  critical: '关键问题',
  warning: '改进建议',
  suggestion: '优化方向',
}

export default function QualityAgentPage() {
  const [auditing, setAuditing] = useState(false)
  const [result, setResult] = useState<AuditResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [costOverview, setCostOverview] = useState<Record<string, unknown> | null>(null)
  const [costTrend, setCostTrend] = useState<Record<string, unknown> | null>(null)
  const [costDistribution, setCostDistribution] = useState<Record<string, unknown> | null>(null)
  const [costSuggestions, setCostSuggestions] = useState<Record<string, unknown> | null>(null)
  const [_costsLoading, setCostsLoading] = useState(false)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const cleanup = () => {
    if (intervalRef.current !== null) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
  }

  useEffect(() => {
    return () => cleanup()
  }, [])

  const handleAudit = async () => {
    if (auditing) return
    setAuditing(true)
    setResult(null)
    setError(null)
    cleanup()

    try {
      const triggerRes = await agentApi.qualityAudit({})
      const executionId = triggerRes.data.execution_id

      intervalRef.current = setInterval(async () => {
        try {
          const statusRes = await agentApi.qualityStatus(executionId)
          if (statusRes.data.status === 'completed') {
            cleanup()
            const resultRes = await agentApi.qualityResult(executionId)
            setResult(resultRes.data.result as AuditResult)
            setAuditing(false)
            // Load cost data after audit completes
            loadCostData()
          } else if (statusRes.data.status === 'failed') {
            cleanup()
            setError('质量审计执行失败')
            setAuditing(false)
          }
        } catch {
          cleanup()
          setError('检查状态时出错')
          setAuditing(false)
        }
      }, 1000)
    } catch {
      setError('触发质量审计失败')
      setAuditing(false)
    }
  }

  const loadCostData = async () => {
    setCostsLoading(true)
    try {
      const [ov, tr, dist, sug] = await Promise.all([
        agentApi.costOverview(),
        agentApi.costTrend(),
        agentApi.costDistribution(),
        agentApi.costSuggestions(),
      ])
      setCostOverview(ov.data as Record<string, unknown>)
      setCostTrend(tr.data as Record<string, unknown>)
      setCostDistribution(dist.data as Record<string, unknown>)
      setCostSuggestions(sug.data as Record<string, unknown>)
    } catch {
      // Cost data is supplementary, don't block on error
    } finally {
      setCostsLoading(false)
    }
  }

  const getScoreColor = (score: number) => {
    if (score >= 80) return '#10B981'
    if (score >= 60) return '#F59E0B'
    return '#EF4444'
  }

  const getScoreLabel = (score: number) => {
    if (score >= 80) return '优秀'
    if (score >= 60) return '良好'
    if (score >= 40) return '待改进'
    return '不合格'
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="rounded-xl border p-5" style={{ borderColor: 'var(--polaroid-border)', backgroundColor: 'var(--polaroid-white)' }}>
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-xl flex items-center justify-center" style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)' }}>
            <ShieldCheck className="h-6 w-6 text-red-500" />
          </div>
          <div className="flex-1">
            <h2 className="text-lg font-semibold" style={{ color: 'var(--polaroid-text)' }}>质量审计智能体</h2>
            <p className="text-sm" style={{ color: 'var(--polaroid-text-muted)' }}>
              对测试项目进行全面的质量评估，生成审计报告和改进建议
            </p>
          </div>
          <button onClick={handleAudit} disabled={auditing}
            className="flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm text-white transition-opacity hover:opacity-90 disabled:opacity-50"
            style={{ backgroundColor: 'var(--amber-primary)' }}>
            {auditing ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
            {auditing ? '审计中...' : '开始审计'}
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 rounded-xl border p-4" style={{ borderColor: '#FCA5A5', backgroundColor: '#FEF2F2' }}>
          <AlertCircle className="h-4 w-4 text-red-500 shrink-0" />
          <span className="text-sm text-red-600">{error}</span>
        </div>
      )}

      {/* Loading State */}
      <AnimatePresence>
        {auditing && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="flex items-center justify-center py-16">
            <div className="flex flex-col items-center gap-4">
              <Loader2 className="h-10 w-10 animate-spin" style={{ color: 'var(--amber-primary)' }} />
              <span className="text-sm" style={{ color: 'var(--polaroid-text-muted)' }}>AI 正在进行质量审计...</span>
              <div className="flex gap-1.5">
                <span className="h-2 w-2 rounded-full animate-bounce" style={{ backgroundColor: 'var(--amber-primary)', animationDelay: '0s' }} />
                <span className="h-2 w-2 rounded-full animate-bounce" style={{ backgroundColor: 'var(--amber-primary)', animationDelay: '0.15s' }} />
                <span className="h-2 w-2 rounded-full animate-bounce" style={{ backgroundColor: 'var(--amber-primary)', animationDelay: '0.3s' }} />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Results */}
      <AnimatePresence>
        {result && !auditing && (
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
            {/* Overall Score */}
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.1 }}
              className="rounded-xl border p-6 text-center" style={{ borderColor: 'var(--polaroid-border)', backgroundColor: 'var(--polaroid-white)' }}>
              <div className="inline-flex items-center justify-center w-24 h-24 rounded-full mb-3"
                style={{ border: '4px solid ' + getScoreColor(result.overall_score) }}>
                <span className="text-3xl font-bold" style={{ color: getScoreColor(result.overall_score) }}>
                  {result.overall_score}
                </span>
              </div>
              <p className="text-lg font-semibold" style={{ color: 'var(--polaroid-text)' }}>综合质量评分</p>
              <p className="text-sm" style={{ color: getScoreColor(result.overall_score) }}>
                {getScoreLabel(result.overall_score)}
              </p>
            </motion.div>

            {/* Dimensions */}
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
              className="rounded-xl border p-5" style={{ borderColor: 'var(--polaroid-border)', backgroundColor: 'var(--polaroid-white)' }}>
              <h3 className="text-sm font-semibold mb-4 flex items-center gap-2" style={{ color: 'var(--polaroid-text)' }}>
                <TrendingUp className="h-4 w-4" style={{ color: 'var(--amber-primary)' }} />
                质量维度评估
              </h3>
              <div className="space-y-4">
                {result.dimensions.map((dim) => {
                  const Icon = dim.icon
                  return (
                    <div key={dim.key}>
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-2">
                          <Icon className="h-4 w-4" style={{ color: dim.color }} />
                          <span className="text-sm font-medium" style={{ color: 'var(--polaroid-text)' }}>{dim.label}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold" style={{ color: getScoreColor(dim.score) }}>{dim.score}%</span>
                          <span className="text-xs" style={{ color: 'var(--polaroid-text-muted)' }}>{getScoreLabel(dim.score)}</span>
                        </div>
                      </div>
                      <div className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--polaroid-warm)' }}>
                        <motion.div initial={{ width: 0 }} animate={{ width: `${dim.score}%` }} transition={{ duration: 0.8, delay: 0.3 }}
                          className="h-full rounded-full" style={{ backgroundColor: getScoreColor(dim.score) }} />
                      </div>
                    </div>
                  )
                })}
              </div>
            </motion.div>

            {/* Recommendations */}
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
              className="rounded-xl border p-5" style={{ borderColor: 'var(--polaroid-border)', backgroundColor: 'var(--polaroid-white)' }}>
              <h3 className="text-sm font-semibold mb-4 flex items-center gap-2" style={{ color: 'var(--polaroid-text)' }}>
                <Lightbulb className="h-4 w-4" style={{ color: 'var(--amber-primary)' }} />
                审计建议
              </h3>
              <div className="space-y-3">
                {result.recommendations.map((rec) => {
                  const sev = SEVERITY_CONFIG[rec.severity]
                  const SevIcon = sev.icon
                  return (
                    <div key={rec.severity} className={`rounded-lg border p-4 ${sev.bg}`} style={{ borderColor: sev.color + '40' }}>
                      <div className="flex items-center gap-2 mb-2">
                        <SevIcon className="h-4 w-4" style={{ color: sev.color }} />
                        <span className="text-sm font-medium" style={{ color: sev.color }}>{SEVERITY_LABELS[rec.severity]}</span>
                      </div>
                      <ul className="space-y-1.5">
                        {rec.items.map((item, i) => (
                          <li key={i} className="flex items-start gap-2 text-sm" style={{ color: 'var(--polaroid-text)' }}>
                            <span className="mt-1.5 h-1.5 w-1.5 rounded-full shrink-0" style={{ backgroundColor: sev.color }} />
                            {item}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )
                })}
              </div>
            </motion.div>

            {/* Cost Overview */}
            {costOverview && (
              <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
                className="rounded-xl border p-5" style={{ borderColor: 'var(--polaroid-border)', backgroundColor: 'var(--polaroid-white)' }}>
                <h3 className="text-sm font-semibold mb-4 flex items-center gap-2" style={{ color: 'var(--polaroid-text)' }}>
                  <DollarSign className="h-4 w-4" style={{ color: 'var(--amber-primary)' }} />
                  成本概览
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {Object.entries(costOverview).map(([key, value]) => (
                    <div key={key} className="rounded-lg p-3 text-center" style={{ backgroundColor: 'var(--polaroid-warm)' }}>
                      <p className="text-xs mb-1" style={{ color: 'var(--polaroid-text-muted)' }}>{key}</p>
                      <p className="text-lg font-bold" style={{ color: 'var(--polaroid-text)' }}>{String(value)}</p>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {/* Cost Trend */}
            {costTrend && (
              <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45 }}
                className="rounded-xl border p-5" style={{ borderColor: 'var(--polaroid-border)', backgroundColor: 'var(--polaroid-white)' }}>
                <h3 className="text-sm font-semibold mb-4 flex items-center gap-2" style={{ color: 'var(--polaroid-text)' }}>
                  <BarChart3 className="h-4 w-4" style={{ color: 'var(--amber-primary)' }} />
                  成本趋势
                </h3>
                <pre className="text-xs whitespace-pre-wrap" style={{ color: 'var(--polaroid-text-muted)' }}>
                  {JSON.stringify(costTrend, null, 2)}
                </pre>
              </motion.div>
            )}

            {/* Cost Distribution */}
            {costDistribution && (
              <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}
                className="rounded-xl border p-5" style={{ borderColor: 'var(--polaroid-border)', backgroundColor: 'var(--polaroid-white)' }}>
                <h3 className="text-sm font-semibold mb-4 flex items-center gap-2" style={{ color: 'var(--polaroid-text)' }}>
                  <PieChart className="h-4 w-4" style={{ color: 'var(--amber-primary)' }} />
                  成本分布
                </h3>
                <pre className="text-xs whitespace-pre-wrap" style={{ color: 'var(--polaroid-text-muted)' }}>
                  {JSON.stringify(costDistribution, null, 2)}
                </pre>
              </motion.div>
            )}

            {/* Cost Suggestions */}
            {costSuggestions && (
              <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.55 }}
                className="rounded-xl border p-5" style={{ borderColor: 'var(--polaroid-border)', backgroundColor: 'var(--polaroid-white)' }}>
                <h3 className="text-sm font-semibold mb-4 flex items-center gap-2" style={{ color: 'var(--polaroid-text)' }}>
                  <Lightbulb className="h-4 w-4" style={{ color: 'var(--amber-primary)' }} />
                  成本优化建议
                </h3>
                <pre className="text-xs whitespace-pre-wrap" style={{ color: 'var(--polaroid-text-muted)' }}>
                  {JSON.stringify(costSuggestions, null, 2)}
                </pre>
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {!result && !auditing && (
        <div className="flex flex-col items-center justify-center py-16">
          <ShieldCheck className="h-16 w-16 mb-4" style={{ color: 'var(--polaroid-text-muted)', opacity: 0.2 }} />
          <p className="text-sm" style={{ color: 'var(--polaroid-text-muted)' }}>点击"开始审计"按钮，AI 将对测试项目进行全面质量评估</p>
        </div>
      )}
    </div>
  )
}
