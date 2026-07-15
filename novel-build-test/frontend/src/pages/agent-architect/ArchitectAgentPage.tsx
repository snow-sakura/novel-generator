import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Loader2, Cpu, Layers, Wrench, Building2, Network, Database, Shield, AlertCircle } from 'lucide-react'
import { agentApi } from '../../lib/api-service'

interface ArchitectureResult {
  module_hierarchy: { name: string; children: string[]; description: string }[]
  testing_layers: { name: string; scope: string; tools: string[] }[]
  recommended_tools: { name: string; purpose: string; category: string }[]
}

const TEST_TYPES = [
  { value: 'functional', label: '功能测试' },
  { value: 'api', label: 'API 测试' },
  { value: 'perf', label: '性能测试' },
  { value: 'security', label: '安全测试' },
  { value: 'ui', label: 'UI 测试' },
]

const TECH_STACKS = [
  { value: 'spring', label: 'Spring Boot + Vue' },
  { value: 'go', label: 'Go + React' },
  { value: 'python', label: 'Python + Django' },
  { value: 'node', label: 'Node.js + Next.js' },
  { value: 'micro', label: '微服务架构' },
]

export default function ArchitectAgentPage() {
  const [testType, setTestType] = useState('functional')
  const [techStack, setTechStack] = useState('spring')
  const [targetSystem, setTargetSystem] = useState('')
  const [generating, setGenerating] = useState(false)
  const [result, setResult] = useState<ArchitectureResult | null>(null)
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
    if (!targetSystem.trim() || generating) return
    setGenerating(true)
    setResult(null)
    setError(null)
    cleanup()

    try {
      const requirement_text = `测试类型: ${testType}, 技术栈: ${techStack}, 目标系统: ${targetSystem}`
      const triggerRes = await agentApi.architectDesign({ requirement_text })
      const executionId = triggerRes.data.execution_id

      intervalRef.current = setInterval(async () => {
        try {
          const statusRes = await agentApi.architectStatus(executionId)
          if (statusRes.data.status === 'completed') {
            cleanup()
            const resultRes = await agentApi.architectResult(executionId)
            setResult(resultRes.data.result as ArchitectureResult)
            setGenerating(false)
          } else if (statusRes.data.status === 'failed') {
            cleanup()
            setError('架构设计执行失败')
            setGenerating(false)
          }
        } catch {
          cleanup()
          setError('检查状态时出错')
          setGenerating(false)
        }
      }, 1000)
    } catch {
      setError('触发架构设计失败')
      setGenerating(false)
    }
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="rounded-xl border p-5" style={{ borderColor: 'var(--polaroid-border)', backgroundColor: 'var(--polaroid-white)' }}>
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-xl flex items-center justify-center" style={{ backgroundColor: 'rgba(37, 99, 235, 0.1)' }}>
            <Building2 className="h-6 w-6 text-blue-500" />
          </div>
          <div>
            <h2 className="text-lg font-semibold" style={{ color: 'var(--polaroid-text)' }}>测试架构智能体</h2>
            <p className="text-sm" style={{ color: 'var(--polaroid-text-muted)' }}>
              根据测试类型和技术栈，自动生成测试架构设计方案
            </p>
          </div>
        </div>
      </div>

      {/* Form */}
      <div className="rounded-xl border p-5 space-y-4" style={{ borderColor: 'var(--polaroid-border)', backgroundColor: 'var(--polaroid-white)' }}>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: 'var(--polaroid-text)' }}>测试类型</label>
            <select value={testType} onChange={(e) => setTestType(e.target.value)}
              className="w-full rounded-lg border bg-white px-3 py-2 text-sm outline-none focus:border-[var(--amber-primary)]"
              style={{ borderColor: 'var(--polaroid-border)' }}>
              {TEST_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: 'var(--polaroid-text)' }}>技术栈</label>
            <select value={techStack} onChange={(e) => setTechStack(e.target.value)}
              className="w-full rounded-lg border bg-white px-3 py-2 text-sm outline-none focus:border-[var(--amber-primary)]"
              style={{ borderColor: 'var(--polaroid-border)' }}>
              {TECH_STACKS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: 'var(--polaroid-text)' }}>目标系统</label>
            <input value={targetSystem} onChange={(e) => setTargetSystem(e.target.value)}
              placeholder="例如：电商订单系统"
              className="w-full rounded-lg border bg-white px-3 py-2 text-sm outline-none focus:border-[var(--amber-primary)]"
              style={{ borderColor: 'var(--polaroid-border)' }} />
          </div>
        </div>
        <div className="flex justify-end">
          <button onClick={handleGenerate} disabled={!targetSystem.trim() || generating}
            className="flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm text-white transition-opacity hover:opacity-90 disabled:opacity-50"
            style={{ backgroundColor: 'var(--amber-primary)' }}>
            {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Cpu className="h-4 w-4" />}
            {generating ? '生成中...' : '生成架构'}
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
              <span className="text-sm" style={{ color: 'var(--polaroid-text-muted)' }}>AI 正在生成测试架构...</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {result && !generating && (
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
            {/* Module Hierarchy */}
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
              <h3 className="text-sm font-semibold mb-3 flex items-center gap-2" style={{ color: 'var(--polaroid-text)' }}>
                <Network className="h-4 w-4" style={{ color: 'var(--amber-primary)' }} />
                模块分层架构
              </h3>
              <div className="grid gap-3 md:grid-cols-2">
                {result.module_hierarchy.map((mod) => (
                  <div key={mod.name} className="rounded-xl border p-4" style={{ borderColor: 'var(--polaroid-border)', backgroundColor: 'var(--polaroid-white)' }}>
                    <div className="flex items-center gap-2 mb-2">
                      <Layers className="h-4 w-4 text-blue-500" />
                      <span className="font-medium text-sm" style={{ color: 'var(--polaroid-text)' }}>{mod.name}</span>
                    </div>
                    <p className="text-xs mb-2" style={{ color: 'var(--polaroid-text-muted)' }}>{mod.description}</p>
                    <div className="flex flex-wrap gap-1">
                      {mod.children.map((child) => (
                        <span key={child} className="inline-flex rounded-full bg-blue-50 px-2 py-0.5 text-xs text-blue-600">{child}</span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>

            {/* Testing Layers */}
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
              className="rounded-xl border p-5" style={{ borderColor: 'var(--polaroid-border)', backgroundColor: 'var(--polaroid-white)' }}>
              <h3 className="text-sm font-semibold mb-4 flex items-center gap-2" style={{ color: 'var(--polaroid-text)' }}>
                <Database className="h-4 w-4" style={{ color: 'var(--amber-primary)' }} />
                测试分层策略
              </h3>
              <div className="grid gap-3 md:grid-cols-2">
                {result.testing_layers.map((layer) => (
                  <div key={layer.name} className="rounded-lg p-3" style={{ backgroundColor: 'var(--polaroid-warm)' }}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium" style={{ color: 'var(--polaroid-text)' }}>{layer.name}</span>
                      <span className="text-xs" style={{ color: 'var(--polaroid-text-muted)' }}>{layer.scope}</span>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {layer.tools.map((tool) => (
                        <span key={tool} className="inline-flex rounded-full bg-gray-100 px-2 py-0.5 text-xs" style={{ color: 'var(--polaroid-text-muted)' }}>{tool}</span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>

            {/* Recommended Tools */}
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
              className="rounded-xl border p-5" style={{ borderColor: 'var(--polaroid-border)', backgroundColor: 'var(--polaroid-white)' }}>
              <h3 className="text-sm font-semibold mb-4 flex items-center gap-2" style={{ color: 'var(--polaroid-text)' }}>
                <Wrench className="h-4 w-4" style={{ color: 'var(--amber-primary)' }} />
                推荐工具
              </h3>
              <div className="grid gap-3 md:grid-cols-2">
                {result.recommended_tools.map((tool) => (
                  <div key={tool.name} className="flex items-start gap-3 rounded-lg p-3" style={{ backgroundColor: 'var(--polaroid-warm)' }}>
                    <Shield className="h-4 w-4 mt-0.5 text-blue-500 shrink-0" />
                    <div>
                      <span className="text-sm font-medium" style={{ color: 'var(--polaroid-text)' }}>{tool.name}</span>
                      <p className="text-xs" style={{ color: 'var(--polaroid-text-muted)' }}>{tool.purpose}</p>
                    </div>
                    <span className="rounded-full bg-blue-50 px-2 py-0.5 text-xs text-blue-600 ml-auto shrink-0">{tool.category}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
