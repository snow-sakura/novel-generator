import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Loader2, ClipboardList, CheckCircle2, AlertTriangle, Play, ArrowDown, Download, AlertCircle } from 'lucide-react'
import { agentApi } from '../../lib/api-service'

interface TestCase {
  id: string
  title: string
  steps: string[]
  expected: string
  priority: string
}

const SCENARIO_OPTIONS = [
  { value: 'login', label: '用户登录功能' },
  { value: 'order', label: '订单创建流程' },
  { value: 'payment', label: '支付处理流程' },
  { value: 'search', label: '搜索功能' },
]

const PRIORITY_STYLES: Record<string, string> = {
  'P0': 'bg-red-50 text-red-600',
  'P1': 'bg-amber-50 text-amber-600',
  'P2': 'bg-blue-50 text-blue-600',
  'P3': 'bg-gray-50 text-gray-500',
}

export default function CasewriterAgentPage() {
  const [selectedScenario, setSelectedScenario] = useState('login')
  const [customDesc, setCustomDesc] = useState('')
  const [generating, setGenerating] = useState(false)
  const [cases, setCases] = useState<TestCase[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [importing, setImporting] = useState(false)
  const [importMsg, setImportMsg] = useState<string | null>(null)
  const executionIdRef = useRef<number | null>(null)
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

  const handleGenerate = async () => {
    if (generating) return
    setGenerating(true)
    setCases(null)
    setError(null)
    setImportMsg(null)
    cleanup()

    try {
      const scenario_text = customDesc.trim() || selectedScenario
      const triggerRes = await agentApi.casewriterGenerate({ scenario_text })
      const executionId = triggerRes.data.execution_id
      executionIdRef.current = executionId

      intervalRef.current = setInterval(async () => {
        try {
          const statusRes = await agentApi.casewriterStatus(executionId)
          if (statusRes.data.status === 'completed') {
            cleanup()
            const resultRes = await agentApi.casewriterResult(executionId)
            setCases(resultRes.data.result as TestCase[])
            setGenerating(false)
          } else if (statusRes.data.status === 'failed') {
            cleanup()
            setError('用例生成执行失败')
            setGenerating(false)
          }
        } catch {
          cleanup()
          setError('检查状态时出错')
          setGenerating(false)
        }
      }, 1000)
    } catch {
      setError('触发用例生成失败')
      setGenerating(false)
    }
  }

  const handleImport = async () => {
    if (executionIdRef.current === null || importing) return
    setImporting(true)
    setError(null)
    setImportMsg(null)
    try {
      const res = await agentApi.casewriterImport(executionIdRef.current)
      setImportMsg(res.data.message || '导入成功')
    } catch {
      setError('导入测试用例失败')
    } finally {
      setImporting(false)
    }
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="rounded-xl border p-5" style={{ borderColor: 'var(--polaroid-border)', backgroundColor: 'var(--polaroid-white)' }}>
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-xl flex items-center justify-center" style={{ backgroundColor: 'rgba(245, 158, 11, 0.1)' }}>
            <ClipboardList className="h-6 w-6 text-amber-500" />
          </div>
          <div>
            <h2 className="text-lg font-semibold" style={{ color: 'var(--polaroid-text)' }}>用例编写智能体</h2>
            <p className="text-sm" style={{ color: 'var(--polaroid-text-muted)' }}>
              选择或描述测试场景，AI 自动生成详细的测试用例
            </p>
          </div>
        </div>
      </div>

      {/* Input Section */}
      <div className="rounded-xl border p-5 space-y-4" style={{ borderColor: 'var(--polaroid-border)', backgroundColor: 'var(--polaroid-white)' }}>
        <div>
          <label className="block text-sm font-medium mb-1" style={{ color: 'var(--polaroid-text)' }}>选择已有场景</label>
          <select value={selectedScenario} onChange={(e) => setSelectedScenario(e.target.value)}
            className="w-full rounded-lg border bg-white px-3 py-2 text-sm outline-none focus:border-[var(--amber-primary)]"
            style={{ borderColor: 'var(--polaroid-border)' }}>
            {SCENARIO_OPTIONS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1" style={{ color: 'var(--polaroid-text)' }}>或自定义场景描述</label>
          <textarea value={customDesc} onChange={(e) => setCustomDesc(e.target.value)} rows={3}
            placeholder="可选：描述自定义测试场景，AI 将根据描述生成用例..."
            className="w-full rounded-lg border bg-white px-3 py-2 text-sm outline-none resize-none focus:border-[var(--amber-primary)]"
            style={{ borderColor: 'var(--polaroid-border)' }} />
        </div>
        <div className="flex justify-end">
          <button onClick={handleGenerate} disabled={generating}
            className="flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm text-white transition-opacity hover:opacity-90 disabled:opacity-50"
            style={{ backgroundColor: 'var(--amber-primary)' }}>
            {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
            {generating ? '生成中...' : '生成用例'}
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

      {/* Import Message */}
      {importMsg && (
        <div className="flex items-center gap-2 rounded-xl border p-4" style={{ borderColor: '#86EFAC', backgroundColor: '#F0FDF4' }}>
          <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
          <span className="text-sm text-green-600">{importMsg}</span>
        </div>
      )}

      {/* Results */}
      <AnimatePresence>
        {generating && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="flex items-center justify-center py-12">
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="h-8 w-8 animate-spin" style={{ color: 'var(--amber-primary)' }} />
              <span className="text-sm" style={{ color: 'var(--polaroid-text-muted)' }}>AI 正在生成测试用例...</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {cases && !generating && (
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm" style={{ color: 'var(--polaroid-text-muted)' }}>
                共生成 {cases.length} 条测试用例
              </p>
              <button onClick={handleImport} disabled={importing}
                className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs text-white transition-opacity hover:opacity-90 disabled:opacity-50"
                style={{ backgroundColor: 'var(--amber-primary)' }}>
                {importing ? <Loader2 className="h-3 w-3 animate-spin" /> : <Download className="h-3 w-3" />}
                {importing ? '导入中...' : '导入到系统'}
              </button>
            </div>
            {cases.map((tc, index) => (
              <motion.div key={tc.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.06 }}
                className="rounded-xl border p-5" style={{ borderColor: 'var(--polaroid-border)', backgroundColor: 'var(--polaroid-white)' }}>
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <code className="text-sm font-mono font-semibold" style={{ color: 'var(--amber-primary)' }}>{tc.id}</code>
                    <h4 className="text-sm font-medium" style={{ color: 'var(--polaroid-text)' }}>{tc.title}</h4>
                  </div>
                  <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${PRIORITY_STYLES[tc.priority] || 'bg-gray-50 text-gray-500'}`}>
                    {tc.priority}
                  </span>
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  <div>
                    <p className="text-xs font-medium mb-1.5 flex items-center gap-1" style={{ color: 'var(--polaroid-text-muted)' }}>
                      <ArrowDown className="h-3 w-3" /> 测试步骤
                    </p>
                    <ol className="space-y-1">
                      {tc.steps.map((step, i) => (
                        <li key={i} className="flex items-start gap-2 text-xs" style={{ color: 'var(--polaroid-text)' }}>
                          <span className="font-medium shrink-0 w-4" style={{ color: 'var(--polaroid-text-muted)' }}>{i + 1}.</span>
                          {step}
                        </li>
                      ))}
                    </ol>
                  </div>
                  <div>
                    <p className="text-xs font-medium mb-1.5 flex items-center gap-1" style={{ color: 'var(--polaroid-text-muted)' }}>
                      <CheckCircle2 className="h-3 w-3" /> 预期结果
                    </p>
                    <div className="rounded-lg p-3 text-xs" style={{ backgroundColor: 'var(--polaroid-warm)', color: 'var(--polaroid-text)' }}>
                      {tc.expected}
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {!cases && !generating && (
        <div className="flex flex-col items-center justify-center py-12">
          <AlertTriangle className="h-12 w-12 mb-3" style={{ color: 'var(--polaroid-text-muted)', opacity: 0.3 }} />
          <p className="text-sm" style={{ color: 'var(--polaroid-text-muted)' }}>选择场景或输入描述并点击"生成用例"按钮开始</p>
        </div>
      )}
    </div>
  )
}
