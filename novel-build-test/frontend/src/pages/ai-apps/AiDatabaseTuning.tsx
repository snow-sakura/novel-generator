import { useState } from 'react'
import { motion } from 'framer-motion'
import { Database, Play, RotateCcw, CheckCircle2, AlertTriangle, Clock, Zap } from 'lucide-react'

interface AnalysisResult {
  type: 'success' | 'warning' | 'info'
  title: string
  detail: string
}

const MOCK_RESULTS: AnalysisResult[] = [
  { type: 'warning', title: '慢查询检测', detail: '发现 3 条查询耗时 > 1s，建议添加索引' },
  { type: 'success', title: '连接池配置', detail: '当前连接池大小合理，利用率 72%' },
  { type: 'info', title: '索引覆盖率', detail: '核心查询索引覆盖率 85%，建议优化 orders 表' },
  { type: 'warning', title: 'N+1 查询', detail: '检测到 2 处 N+1 查询模式，建议使用 JOIN' },
  { type: 'success', title: '缓存命中率', detail: 'Redis 缓存命中率 94%，表现良好' },
]

export default function AiDatabaseTuning() {
  const [analyzing, setAnalyzing] = useState(false)
  const [results, setResults] = useState<AnalysisResult[]>([])

  const runAnalysis = () => {
    setAnalyzing(true)
    setResults([])
    MOCK_RESULTS.forEach((r, i) => {
      setTimeout(() => {
        setResults((prev) => [...prev, r])
        if (i === MOCK_RESULTS.length - 1) setAnalyzing(false)
      }, 600 * (i + 1))
    })
  }

  const stats = [
    { label: '总查询数', value: '1,247', icon: Database, color: '#3B82F6' },
    { label: '平均耗时', value: '126ms', icon: Clock, color: '#F59E0B' },
    { label: '慢查询', value: '3', icon: AlertTriangle, color: '#EF4444' },
    { label: '优化建议', value: String(results.filter((r) => r.type === 'warning').length), icon: Zap, color: '#7C3AED' },
  ]

  return (
    <div className="flex flex-col h-full">
      {/* 标题栏 */}
      <div className="flex items-center justify-between pb-4 border-b" style={{ borderColor: 'var(--polaroid-border)' }}>
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl" style={{ backgroundColor: '#0D948820' }}>
            <Database className="h-5 w-5" style={{ color: '#0D9488' }} />
          </div>
          <div>
            <h2 className="text-lg font-semibold" style={{ color: 'var(--polaroid-text)' }}>AI 数据库调优</h2>
            <p className="text-xs" style={{ color: 'var(--polaroid-text-muted)' }}>智能分析 · 慢查询检测 · 索引优化建议</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => { setResults([]) }}
            disabled={analyzing}
            className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm border transition-colors hover:bg-gray-50 disabled:opacity-50"
            style={{ borderColor: 'var(--polaroid-border)', color: 'var(--polaroid-text-muted)' }}
          >
            <RotateCcw className="h-3.5 w-3.5" />
            重置
          </button>
          <button
            onClick={runAnalysis}
            disabled={analyzing}
            className="flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm text-white transition-opacity hover:opacity-90 disabled:opacity-50"
            style={{ backgroundColor: '#0D9488' }}
          >
            {analyzing ? (
              <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
            ) : (
              <Play className="h-3.5 w-3.5" />
            )}
            {analyzing ? '分析中...' : '开始分析'}
          </button>
        </div>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-4 gap-4 py-4">
        {stats.map((s) => {
          const Icon = s.icon
          return (
            <div key={s.label} className="rounded-xl border p-4" style={{ borderColor: 'var(--polaroid-border)', backgroundColor: 'var(--polaroid-white)' }}>
              <div className="flex items-center gap-2 mb-2">
                <Icon className="h-4 w-4" style={{ color: s.color }} />
                <span className="text-xs" style={{ color: 'var(--polaroid-text-muted)' }}>{s.label}</span>
              </div>
              <span className="text-xl font-bold" style={{ color: 'var(--polaroid-text)' }}>{s.value}</span>
            </div>
          )
        })}
      </div>

      {/* 分析结果 */}
      <div className="flex-1 overflow-y-auto space-y-3">
        {results.length === 0 && !analyzing && (
          <div className="flex h-40 items-center justify-center rounded-xl border-2 border-dashed" style={{ borderColor: 'var(--polaroid-border)' }}>
            <span className="text-sm" style={{ color: 'var(--polaroid-text-muted)' }}>点击「开始分析」运行 AI 数据库诊断</span>
          </div>
        )}
        {results.map((r, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: -12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.25 }}
            className="flex items-start gap-3 rounded-xl border p-4"
            style={{ borderColor: 'var(--polaroid-border)', backgroundColor: 'var(--polaroid-white)' }}
          >
            {r.type === 'success' && <CheckCircle2 className="h-5 w-5 shrink-0 mt-0.5" style={{ color: '#10B981' }} />}
            {r.type === 'warning' && <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5" style={{ color: '#F59E0B' }} />}
            {r.type === 'info' && <Zap className="h-5 w-5 shrink-0 mt-0.5" style={{ color: '#3B82F6' }} />}
            <div>
              <div className="text-sm font-medium" style={{ color: 'var(--polaroid-text)' }}>{r.title}</div>
              <div className="text-xs mt-0.5" style={{ color: 'var(--polaroid-text-muted)' }}>{r.detail}</div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  )
}
