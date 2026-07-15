import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Loader2, FileText, Target, AlertTriangle, Clock, Brain, Send } from 'lucide-react'
import { agentApi } from '../../lib/api-service'

export default function RequirementsAgentPage() {
  const [input, setInput] = useState('')
  const [analyzing, setAnalyzing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const executionIdRef = useRef<number | null>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const cleanup = () => {
    if (intervalRef.current !== null) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
  }

  useEffect(() => () => cleanup(), [])

  const [result, setResult] = useState<{
    test_items: { id: string; title: string; category: string }[]
    priorities: { level: string; count: number; color: string }[]
    efforts: { phase: string; hours: number; description: string }[]
  } | null>(null)

  const handleAnalyze = async () => {
    if (!input.trim() || analyzing) return
    setAnalyzing(true)
    setResult(null)
    setError(null)
    cleanup()

    try {
      const res = await agentApi.requirementsAnalyze({ requirement_text: input })
      const execId = res.data.execution_id
      executionIdRef.current = execId

      // Poll for status
      intervalRef.current = setInterval(async () => {
        try {
          const statusRes = await agentApi.requirementsStatus(execId)
          if (statusRes.data.status === 'completed' || statusRes.data.status === 'failed') {
            cleanup()
            if (statusRes.data.status === 'completed') {
              const resultRes = await agentApi.requirementsResult(execId)
              setResult(resultRes.data.result as typeof result)
            } else {
              setError('需求分析执行失败')
            }
            setAnalyzing(false)
          }
        } catch {
          cleanup()
          setError('检查分析状态时出错')
          setAnalyzing(false)
        }
      }, 1000)
    } catch {
      setError('触发需求分析失败')
      setAnalyzing(false)
    }
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="rounded-xl border p-5" style={{ borderColor: 'var(--polaroid-border)', backgroundColor: 'var(--polaroid-white)' }}>
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-xl flex items-center justify-center" style={{ backgroundColor: 'rgba(139, 92, 246, 0.1)' }}>
            <Brain className="h-6 w-6 text-purple-500" />
          </div>
          <div>
            <h2 className="text-lg font-semibold" style={{ color: 'var(--polaroid-text)' }}>需求分析智能体</h2>
            <p className="text-sm" style={{ color: 'var(--polaroid-text-muted)' }}>
              输入需求描述，AI 将自动分析并提取测试项、评估优先级和预估工作量
            </p>
          </div>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center gap-2">
          <span className="text-sm">{error}</span>
          <button onClick={() => setError(null)} className="ml-auto text-red-500 hover:text-red-700">&times;</button>
        </div>
      )}

      {/* Input Area */}
      <div className="rounded-xl border p-5 space-y-3" style={{ borderColor: 'var(--polaroid-border)', backgroundColor: 'var(--polaroid-white)' }}>
        <label className="block text-sm font-medium" style={{ color: 'var(--polaroid-text)' }}>需求描述</label>
        <textarea value={input} onChange={(e) => setInput(e.target.value)} rows={5}
          placeholder={`例如：用户登录模块\n1. 支持用户名/密码登录\n2. 支持短信验证码登录\n3. 连续5次失败锁定账号\n4. 会话超时时间30分钟\n5. 支持多终端同时登录`}
          className="w-full rounded-lg border bg-white px-3 py-2 text-sm outline-none resize-none focus:border-[var(--amber-primary)]"
          style={{ borderColor: 'var(--polaroid-border)' }} />
        <div className="flex justify-end">
          <button onClick={handleAnalyze} disabled={!input.trim() || analyzing}
            className="flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm text-white transition-opacity hover:opacity-90 disabled:opacity-50"
            style={{ backgroundColor: 'var(--amber-primary)' }}>
            {analyzing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            {analyzing ? '分析中...' : '分析'}
          </button>
        </div>
      </div>

      {/* Results */}
      <AnimatePresence>
        {analyzing && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="flex items-center justify-center py-12">
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="h-8 w-8 animate-spin" style={{ color: 'var(--amber-primary)' }} />
              <span className="text-sm" style={{ color: 'var(--polaroid-text-muted)' }}>AI 正在分析需求...</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {result && !analyzing && (
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
            {/* Test Items */}
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
              className="rounded-xl border p-5" style={{ borderColor: 'var(--polaroid-border)', backgroundColor: 'var(--polaroid-white)' }}>
              <h3 className="text-sm font-semibold mb-4 flex items-center gap-2" style={{ color: 'var(--polaroid-text)' }}>
                <FileText className="h-4 w-4" style={{ color: 'var(--amber-primary)' }} />
                提取的测试项
              </h3>
              <div className="grid gap-2">
                {result.test_items.map((item) => (
                  <div key={item.id} className="flex items-center gap-3 rounded-lg px-3 py-2" style={{ backgroundColor: 'var(--polaroid-warm)' }}>
                    <code className="text-xs font-mono font-medium" style={{ color: 'var(--amber-primary)' }}>{item.id}</code>
                    <span className="text-sm flex-1" style={{ color: 'var(--polaroid-text)' }}>{item.title}</span>
                    <span className="rounded-full bg-purple-50 px-2 py-0.5 text-xs text-purple-600">{item.category}</span>
                  </div>
                ))}
              </div>
            </motion.div>

            {/* Priority & Effort */}
            <div className="grid gap-4 md:grid-cols-2">
              <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
                className="rounded-xl border p-5" style={{ borderColor: 'var(--polaroid-border)', backgroundColor: 'var(--polaroid-white)' }}>
                <h3 className="text-sm font-semibold mb-4 flex items-center gap-2" style={{ color: 'var(--polaroid-text)' }}>
                  <Target className="h-4 w-4" style={{ color: 'var(--amber-primary)' }} />
                  优先级分布
                </h3>
                <div className="space-y-3">
                  {result.priorities.map((p) => (
                    <div key={p.level} className="flex items-center gap-3">
                      <div className="h-3 w-3 rounded-full shrink-0" style={{ backgroundColor: p.color }} />
                      <span className="text-sm flex-1" style={{ color: 'var(--polaroid-text)' }}>{p.level}</span>
                      <span className="text-sm font-semibold" style={{ color: p.color }}>{p.count} 项</span>
                    </div>
                  ))}
                </div>
              </motion.div>

              <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
                className="rounded-xl border p-5" style={{ borderColor: 'var(--polaroid-border)', backgroundColor: 'var(--polaroid-white)' }}>
                <h3 className="text-sm font-semibold mb-4 flex items-center gap-2" style={{ color: 'var(--polaroid-text)' }}>
                  <Clock className="h-4 w-4" style={{ color: 'var(--amber-primary)' }} />
                  预估工作量
                </h3>
                <div className="space-y-3">
                  {result.efforts.map((e) => (
                    <div key={e.phase} className="flex items-center justify-between rounded-lg px-3 py-2" style={{ backgroundColor: 'var(--polaroid-warm)' }}>
                      <div>
                        <span className="text-sm font-medium" style={{ color: 'var(--polaroid-text)' }}>{e.phase}</span>
                        <p className="text-xs" style={{ color: 'var(--polaroid-text-muted)' }}>{e.description}</p>
                      </div>
                      <span className="text-sm font-semibold" style={{ color: 'var(--amber-primary)' }}>{e.hours}h</span>
                    </div>
                  ))}
                  <div className="flex items-center justify-between pt-2 border-t" style={{ borderColor: 'var(--polaroid-border)' }}>
                    <span className="text-sm font-medium" style={{ color: 'var(--polaroid-text)' }}>合计</span>
                    <span className="text-lg font-bold" style={{ color: 'var(--amber-primary)' }}>{result.efforts.reduce((a, b) => a + b.hours, 0)}h</span>
                  </div>
                </div>
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {!result && !analyzing && !input.trim() && (
        <div className="flex flex-col items-center justify-center py-12">
          <AlertTriangle className="h-12 w-12 mb-3" style={{ color: 'var(--polaroid-text-muted)', opacity: 0.3 }} />
          <p className="text-sm" style={{ color: 'var(--polaroid-text-muted)' }}>输入需求描述并点击"分析"按钮开始</p>
        </div>
      )}
    </div>
  )
}
