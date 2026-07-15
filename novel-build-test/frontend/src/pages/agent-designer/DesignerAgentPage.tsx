import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Loader2, FileText, AlertTriangle, Zap, Layers, AlertCircle } from 'lucide-react'
import { agentApi } from '../../lib/api-service'

interface TestScenario {
  id: string
  description: string
  coverage_type: string
  priority: 'high' | 'medium' | 'low'
}

const COVERAGE_COLORS: Record<string, string> = {
  '功能': 'bg-emerald-50 text-emerald-600',
  '边界': 'bg-blue-50 text-blue-600',
  '异常': 'bg-red-50 text-red-600',
  '性能': 'bg-purple-50 text-purple-600',
}

const PRIORITY_COLORS: Record<string, string> = {
  high: 'text-red-500',
  medium: 'text-amber-500',
  low: 'text-gray-400',
}

const PRIORITY_LABELS: Record<string, string> = {
  high: '高',
  medium: '中',
  low: '低',
}

export default function DesignerAgentPage() {
  const [requirement, setRequirement] = useState('')
  const [generating, setGenerating] = useState(false)
  const [scenarios, setScenarios] = useState<TestScenario[] | null>(null)
  const [error, setError] = useState<string | null>(null)
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
    if (!requirement.trim() || generating) return
    setGenerating(true)
    setScenarios(null)
    setError(null)
    cleanup()

    try {
      const triggerRes = await agentApi.designerDesign({ requirement_text: requirement })
      const executionId = triggerRes.data.execution_id

      intervalRef.current = setInterval(async () => {
        try {
          const statusRes = await agentApi.designerStatus(executionId)
          if (statusRes.data.status === 'completed') {
            cleanup()
            const resultRes = await agentApi.designerResult(executionId)
            setScenarios(resultRes.data.result as TestScenario[])
            setGenerating(false)
          } else if (statusRes.data.status === 'failed') {
            cleanup()
            setError('场景设计执行失败')
            setGenerating(false)
          }
        } catch {
          cleanup()
          setError('检查状态时出错')
          setGenerating(false)
        }
      }, 1000)
    } catch {
      setError('触发场景设计失败')
      setGenerating(false)
    }
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="rounded-xl border p-5" style={{ borderColor: 'var(--polaroid-border)', backgroundColor: 'var(--polaroid-white)' }}>
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-xl flex items-center justify-center" style={{ backgroundColor: 'rgba(16, 185, 129, 0.1)' }}>
            <Layers className="h-6 w-6 text-emerald-500" />
          </div>
          <div>
            <h2 className="text-lg font-semibold" style={{ color: 'var(--polaroid-text)' }}>测试设计智能体</h2>
            <p className="text-sm" style={{ color: 'var(--polaroid-text-muted)' }}>
              根据需求描述，自动生成覆盖功能、边界、异常和性能的测试场景
            </p>
          </div>
        </div>
      </div>

      {/* Input */}
      <div className="rounded-xl border p-5 space-y-3" style={{ borderColor: 'var(--polaroid-border)', backgroundColor: 'var(--polaroid-white)' }}>
        <label className="block text-sm font-medium" style={{ color: 'var(--polaroid-text)' }}>需求描述</label>
        <textarea value={requirement} onChange={(e) => setRequirement(e.target.value)} rows={4}
          placeholder="输入需求描述，例如：用户登录模块需要支持用户名密码认证，包含密码错误锁定、会话超时安全机制..."
          className="w-full rounded-lg border bg-white px-3 py-2 text-sm outline-none resize-none focus:border-[var(--amber-primary)]"
          style={{ borderColor: 'var(--polaroid-border)' }} />
        <div className="flex justify-end">
          <button onClick={handleGenerate} disabled={!requirement.trim() || generating}
            className="flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm text-white transition-opacity hover:opacity-90 disabled:opacity-50"
            style={{ backgroundColor: 'var(--amber-primary)' }}>
            {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}
            {generating ? '生成中...' : '生成场景'}
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

      {/* Results */}
      <AnimatePresence>
        {generating && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="flex items-center justify-center py-12">
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="h-8 w-8 animate-spin" style={{ color: 'var(--amber-primary)' }} />
              <span className="text-sm" style={{ color: 'var(--polaroid-text-muted)' }}>AI 正在设计测试场景...</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {scenarios && !generating && (
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
            className="rounded-xl border overflow-hidden" style={{ borderColor: 'var(--polaroid-border)' }}>
            <div className="p-4 border-b" style={{ borderColor: 'var(--polaroid-border)', backgroundColor: 'var(--polaroid-white)' }}>
              <h3 className="text-sm font-semibold flex items-center gap-2" style={{ color: 'var(--polaroid-text)' }}>
                <FileText className="h-4 w-4" style={{ color: 'var(--amber-primary)' }} />
                测试场景列表
                <span className="rounded-full bg-amber-50 px-2 py-0.5 text-xs font-normal" style={{ color: 'var(--amber-primary)' }}>
                  {scenarios.length} 项
                </span>
              </h3>
            </div>
            <div className="divide-y" style={{ borderColor: 'var(--polaroid-border)' }}>
              {scenarios.map((sc, index) => (
                <motion.div key={sc.id} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: index * 0.05 }}
                  className="flex items-start gap-4 px-4 py-3.5 hover:bg-gray-50/50"
                  style={{ backgroundColor: 'var(--polaroid-white)' }}>
                  <code className="text-xs font-mono font-medium shrink-0 mt-0.5" style={{ color: 'var(--amber-primary)' }}>{sc.id}</code>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm" style={{ color: 'var(--polaroid-text)' }}>{sc.description}</p>
                  </div>
                  <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium shrink-0 ${COVERAGE_COLORS[sc.coverage_type] || 'bg-gray-50 text-gray-600'}`}>
                    {sc.coverage_type}
                  </span>
                  <span className={`text-xs font-medium shrink-0 ${PRIORITY_COLORS[sc.priority]}`}>
                    {PRIORITY_LABELS[sc.priority]}
                  </span>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {!scenarios && !generating && !requirement.trim() && (
        <div className="flex flex-col items-center justify-center py-12">
          <AlertTriangle className="h-12 w-12 mb-3" style={{ color: 'var(--polaroid-text-muted)', opacity: 0.3 }} />
          <p className="text-sm" style={{ color: 'var(--polaroid-text-muted)' }}>输入需求描述并点击"生成场景"按钮开始</p>
        </div>
      )}
    </div>
  )
}
