import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Edit2, Trash2, X, Play, Terminal, Loader2, CheckCircle } from 'lucide-react'
import { webTestApi, WebScriptItem } from '../../lib/api-service'

const BROWSERS = ['Chrome', 'Firefox', 'Edge', 'Safari'] as const
const ENVIRONMENTS = ['测试环境', '预发布环境', '开发环境']

const FRAMEWORK_MAP: Record<string, WebScriptItem['type']> = {
  Playwright: 'playwright',
  Selenium: 'selenium',
  Cypress: 'cypress',
}

const FRAMEWORK_REVERSE: Record<string, string> = {
  playwright: 'Playwright',
  selenium: 'Selenium',
  cypress: 'Cypress',
}

export default function WebAutoTestPage() {
  const [activeTab, setActiveTab] = useState<'web-scripts' | 'web-execution'>('web-scripts')
  const [scripts, setScripts] = useState<WebScriptItem[]>([])
  const [showDialog, setShowDialog] = useState(false)
  const [editItem, setEditItem] = useState<WebScriptItem | null>(null)
  const [form, setForm] = useState({ name: '', type: 'playwright' as WebScriptItem['type'], status: 'ready' as WebScriptItem['status'] })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Execution state
  const [selectedScript, setSelectedScript] = useState<number | ''>('')
  const [selectedBrowser, setSelectedBrowser] = useState<string>('Chrome')
  const [selectedEnv, setSelectedEnv] = useState<string>('测试环境')
  const [executing, setExecuting] = useState(false)
  const [logs, setLogs] = useState<{ time: string; level: string; message: string }[]>([])
  const [execDone, setExecDone] = useState(false)

  const pollRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  useEffect(() => {
    return () => { if (pollRef.current) clearTimeout(pollRef.current) }
  }, [])

  useEffect(() => {
    const loadData = async () => {
      setLoading(true)
      setError(null)
      try {
        const res = await webTestApi.list({ page: 1, page_size: 100 })
        setScripts(res.data.items || [])
      } catch (e) {
        console.error('Failed to load web scripts', e)
        setError(e instanceof Error ? e.message : 'Failed to load web scripts')
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [])

  const openCreate = () => {
    setEditItem(null)
    setForm({ name: '', type: 'playwright', status: 'ready' })
    setShowDialog(true)
  }

  const openEdit = (s: WebScriptItem) => {
    setEditItem(s)
    setForm({ name: s.name, type: s.type, status: s.status })
    setShowDialog(true)
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      if (editItem) {
        const res = await webTestApi.update(editItem.id, {
          name: form.name,
          type: form.type,
          status: form.status,
        })
        setScripts(prev => prev.map(s => s.id === editItem.id ? res.data : s))
      } else {
        const res = await webTestApi.create({
          name: form.name,
          type: form.type,
          status: form.status,
        })
        setScripts(prev => [...prev, res.data])
      }
      setShowDialog(false)
    } catch {
      console.error('Failed to save web script')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: number) => {
    if (!window.confirm('确定删除该脚本？')) return
    try {
      await webTestApi.delete(id)
      setScripts(prev => prev.filter(s => s.id !== id))
    } catch {
      console.error('Failed to delete web script')
    }
  }

  const handleExecute = async () => {
    if (!selectedScript) return
    setExecuting(true)
    setExecDone(false)
    setLogs([])

    const addLog = (level: string, message: string) => {
      setLogs(prev => [...prev, { time: new Date().toLocaleTimeString(), level, message }])
    }

    try {
      addLog('info', '初始化执行环境...')
      addLog('info', `启动浏览器: ${selectedBrowser}`)
      addLog('info', `目标环境: ${selectedEnv}`)

      const runRes = await webTestApi.run(selectedScript)
      const executionId = runRes.data.execution_id
      addLog('info', `执行已提交 (ID: ${executionId})`)

      // Poll for result
      let attempts = 0
      const poll = async (): Promise<void> => {
        attempts++
        addLog('info', `查询执行结果... (第 ${attempts} 次)`)
        try {
          const resultRes = await webTestApi.result(selectedScript)
          const { status, output } = resultRes.data
          if (status === 'completed' || status === 'passed') {
            if (output) {
              output.split('\n').filter(Boolean).forEach((line: string) => {
                addLog('success', line)
              })
            }
            addLog('success', '脚本执行完成')
            setExecDone(true)
            setExecuting(false)
          } else if (status === 'failed') {
            addLog('error', output || '脚本执行失败')
            setExecDone(true)
            setExecuting(false)
          } else if (attempts < 30) {
            pollRef.current = setTimeout(poll, 1000)
          } else {
            addLog('error', '执行超时')
            setExecDone(true)
            setExecuting(false)
          }
        } catch {
          addLog('warn', '结果尚未就绪，继续等待...')
          if (attempts < 30) {
            pollRef.current = setTimeout(poll, 1000)
          } else {
            addLog('error', '执行超时')
            setExecDone(true)
            setExecuting(false)
          }
        }
      }
      pollRef.current = setTimeout(poll, 1000)
    } catch {
      addLog('error', '脚本执行启动失败')
      setExecDone(true)
      setExecuting(false)
    }
  }

  const tabs = [
    { key: 'web-scripts', label: '脚本管理' },
    { key: 'web-execution', label: '脚本执行' },
  ]

  return (
    <div className="space-y-4">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4 flex items-center gap-2">
          <span className="text-sm">{error}</span>
          <button onClick={() => setError(null)} className="ml-auto text-red-500 hover:text-red-700">&times;</button>
        </div>
      )}
      {/* Tab 栏 */}
      <div className="flex gap-1 p-1 rounded-lg" style={{ backgroundColor: 'var(--polaroid-warm)' }}>
        {tabs.map((t) => (
          <button key={t.key} onClick={() => setActiveTab(t.key as typeof activeTab)}
            className="flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all"
            style={{
              backgroundColor: activeTab === t.key ? 'var(--polaroid-white)' : 'transparent',
              color: activeTab === t.key ? 'var(--amber-primary)' : 'var(--polaroid-text-muted)',
              boxShadow: activeTab === t.key ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
            }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* 脚本管理 */}
      {activeTab === 'web-scripts' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button onClick={openCreate}
              className="flex items-center gap-2 rounded-lg px-4 py-2 text-sm text-white transition-opacity hover:opacity-90"
              style={{ backgroundColor: 'var(--amber-primary)' }}>
              <Plus className="h-4 w-4" /> 添加脚本
            </button>
          </div>
          <div className="rounded-xl border overflow-hidden" style={{ borderColor: 'var(--polaroid-border)' }}>
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin" style={{ color: 'var(--amber-primary)' }} />
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ backgroundColor: 'var(--polaroid-warm)' }}>
                    <th className="px-4 py-3 text-left font-medium" style={{ color: 'var(--polaroid-text)' }}>ID</th>
                    <th className="px-4 py-3 text-left font-medium" style={{ color: 'var(--polaroid-text)' }}>脚本名称</th>
                    <th className="px-4 py-3 text-left font-medium" style={{ color: 'var(--polaroid-text)' }}>框架</th>
                    <th className="px-4 py-3 text-left font-medium" style={{ color: 'var(--polaroid-text)' }}>描述</th>
                    <th className="px-4 py-3 text-left font-medium" style={{ color: 'var(--polaroid-text)' }}>状态</th>
                    <th className="px-4 py-3 text-right font-medium" style={{ color: 'var(--polaroid-text)' }}>操作</th>
                  </tr>
                </thead>
                <tbody>
                  {scripts.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-sm" style={{ color: 'var(--polaroid-text-muted)' }}>暂无脚本</td>
                    </tr>
                  ) : (
                    scripts.map((s) => (
                      <tr key={s.id} className="border-t hover:bg-gray-50/50" style={{ borderColor: 'var(--polaroid-border)' }}>
                        <td className="px-4 py-3 text-sm" style={{ color: 'var(--polaroid-text-muted)' }}>#{s.id}</td>
                        <td className="px-4 py-3 font-medium" style={{ color: 'var(--polaroid-text)' }}>{s.name}</td>
                        <td className="px-4 py-3">
                          <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-purple-50 text-purple-600">
                            {FRAMEWORK_REVERSE[s.type] || s.type}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm" style={{ color: 'var(--polaroid-text-muted)' }}>{s.description || '-'}</td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${s.status === 'ready' || s.status === 'passed' ? 'bg-green-50 text-green-600' : 'bg-gray-100 text-gray-500'}`}>
                            {s.status === 'ready' || s.status === 'passed' ? '启用' : '停用'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button onClick={() => openEdit(s)} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
                            <Edit2 className="h-4 w-4" style={{ color: 'var(--polaroid-text-muted)' }} />
                          </button>
                          <button onClick={() => handleDelete(s.id)} className="p-1.5 rounded-lg hover:bg-red-50 transition-colors">
                            <Trash2 className="h-4 w-4 text-red-400" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* 脚本执行 */}
      {activeTab === 'web-execution' && (
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* 配置面板 */}
          <div className="lg:col-span-2 space-y-4">
            <div className="rounded-xl border p-5 space-y-4" style={{ borderColor: 'var(--polaroid-border)', backgroundColor: 'var(--polaroid-white)' }}>
              <h3 className="font-medium" style={{ color: 'var(--polaroid-text)' }}>执行配置</h3>
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: 'var(--polaroid-text)' }}>选择脚本</label>
                <select value={selectedScript} onChange={(e) => setSelectedScript(e.target.value ? parseInt(e.target.value) : '')}
                  className="w-full rounded-lg border bg-white px-3 py-2 text-sm outline-none"
                  style={{ borderColor: 'var(--polaroid-border)' }}>
                  <option value="">请选择脚本...</option>
                  {scripts.map(s => (
                    <option key={s.id} value={s.id}>{s.name} ({FRAMEWORK_REVERSE[s.type] || s.type})</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: 'var(--polaroid-text)' }}>浏览器</label>
                <select value={selectedBrowser} onChange={(e) => setSelectedBrowser(e.target.value)}
                  className="w-full rounded-lg border bg-white px-3 py-2 text-sm outline-none"
                  style={{ borderColor: 'var(--polaroid-border)' }}>
                  {BROWSERS.map(b => <option key={b} value={b}>{b}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: 'var(--polaroid-text)' }}>环境</label>
                <select value={selectedEnv} onChange={(e) => setSelectedEnv(e.target.value)}
                  className="w-full rounded-lg border bg-white px-3 py-2 text-sm outline-none"
                  style={{ borderColor: 'var(--polaroid-border)' }}>
                  {ENVIRONMENTS.map(env => <option key={env} value={env}>{env}</option>)}
                </select>
              </div>
              <button onClick={handleExecute} disabled={executing || !selectedScript}
                className="flex items-center gap-2 rounded-lg px-4 py-2 text-sm text-white transition-opacity hover:opacity-90 disabled:opacity-50 w-full justify-center"
                style={{ backgroundColor: 'var(--amber-primary)' }}>
                {executing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
                {executing ? '执行中...' : '执行'}
              </button>
            </div>
          </div>

          {/* 执行日志 */}
          <div className="lg:col-span-3">
            <div className="rounded-xl border p-5" style={{ borderColor: 'var(--polaroid-border)', backgroundColor: 'var(--polaroid-white)' }}>
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-medium flex items-center gap-2" style={{ color: 'var(--polaroid-text)' }}>
                  <Terminal className="h-4 w-4" />
                  执行日志
                </h3>
                {logs.length > 0 && (
                  <button onClick={() => { setLogs([]); setExecDone(false) }}
                    className="text-xs rounded-lg px-2 py-1 border transition-colors hover:bg-gray-50"
                    style={{ borderColor: 'var(--polaroid-border)', color: 'var(--polaroid-text-muted)' }}>
                    清空
                  </button>
                )}
              </div>
              <div className="rounded-lg border p-3 h-[400px] overflow-y-auto font-mono text-xs space-y-1"
                style={{ borderColor: 'var(--polaroid-border)', backgroundColor: '#1a1a2e' }}>
                {logs.length === 0 ? (
                  <p style={{ color: '#666' }}>等待执行...</p>
                ) : (
                  logs.map((log, i) => (
                    <div key={i} className="flex gap-2">
                      <span style={{ color: '#888' }}>[{log.time}]</span>
                      <span style={{
                        color: log.level === 'success' ? '#4ade80' :
                               log.level === 'error' ? '#ef4444' :
                               log.level === 'warn' ? '#fbbf24' : '#94a3b8',
                      }}>
                        {log.message}
                      </span>
                    </div>
                  ))
                )}
              </div>
              {execDone && (
                <div className="flex items-center gap-2 mt-2 text-xs" style={{ color: '#10B981' }}>
                  <CheckCircle className="h-3.5 w-3.5" />
                  脚本执行完成 — 所有步骤已结束
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 弹窗 */}
      <AnimatePresence>
        {showDialog && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
            onClick={() => setShowDialog(false)}>
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl"
              style={{ border: '1px solid var(--polaroid-border)' }}>
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-lg font-semibold" style={{ color: 'var(--polaroid-text)' }}>
                  {editItem ? '编辑脚本' : '添加脚本'}
                </h3>
                <button onClick={() => setShowDialog(false)} className="p-1 rounded-lg hover:bg-gray-100">
                  <X className="h-5 w-5" style={{ color: 'var(--polaroid-text-muted)' }} />
                </button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: 'var(--polaroid-text)' }}>脚本名称</label>
                  <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="w-full rounded-lg border bg-white px-3 py-2 text-sm outline-none"
                    style={{ borderColor: 'var(--polaroid-border)' }} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1" style={{ color: 'var(--polaroid-text)' }}>框架</label>
                    <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as WebScriptItem['type'] })}
                      className="w-full rounded-lg border bg-white px-3 py-2 text-sm outline-none"
                      style={{ borderColor: 'var(--polaroid-border)' }}>
                      {Object.entries(FRAMEWORK_MAP).map(([label, value]) => (
                        <option key={value} value={value}>{label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1" style={{ color: 'var(--polaroid-text)' }}>状态</label>
                    <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as WebScriptItem['status'] })}
                      className="w-full rounded-lg border bg-white px-3 py-2 text-sm outline-none"
                      style={{ borderColor: 'var(--polaroid-border)' }}>
                      <option value="ready">启用</option>
                      <option value="draft">停用</option>
                    </select>
                  </div>
                </div>
              </div>
              <div className="flex justify-end gap-2 mt-6">
                <button onClick={() => setShowDialog(false)}
                  className="rounded-lg px-4 py-2 text-sm border transition-colors hover:bg-gray-50"
                  style={{ borderColor: 'var(--polaroid-border)', color: 'var(--polaroid-text-muted)' }}>取消</button>
                <button onClick={handleSave} disabled={saving}
                  className="flex items-center gap-2 rounded-lg px-4 py-2 text-sm text-white transition-opacity hover:opacity-90 disabled:opacity-50"
                  style={{ backgroundColor: 'var(--amber-primary)' }}>
                  {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                  保存
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
