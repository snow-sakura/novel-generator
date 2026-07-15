import { useState, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import { Plus, Edit2, Trash2, X, Play, Loader2 } from 'lucide-react'
import { perfTestApi, PerfScriptItem, PerfMonitorItem } from '../../lib/api-service'

const STATUS_MAP: Record<string, { label: string; class: string }> = {
  draft: { label: '就绪', class: 'bg-blue-50 text-blue-600' },
  ready: { label: '就绪', class: 'bg-blue-50 text-blue-600' },
  running: { label: '运行中', class: 'bg-green-50 text-green-600' },
  passed: { label: '已完成', class: 'bg-gray-100 text-gray-500' },
  failed: { label: '失败', class: 'bg-red-50 text-red-600' },
}

export default function PerformanceTestPage() {
  const [activeTab, setActiveTab] = useState<'perf-scripts' | 'perf-monitor'>('perf-scripts')
  const [scripts, setScripts] = useState<PerfScriptItem[]>([])
  const [monitorData, setMonitorData] = useState<PerfMonitorItem | null>(null)
  const [monitorHistory, setMonitorHistory] = useState<PerfMonitorItem[]>([])
  const [showDialog, setShowDialog] = useState(false)
  const [editItem, setEditItem] = useState<PerfScriptItem | null>(null)
  const [form, setForm] = useState({ name: '', description: '' })
  const [runningId, setRunningId] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [selectedScriptId, setSelectedScriptId] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)

  const tabs = [
    { key: 'perf-scripts', label: '压测脚本' },
    { key: 'perf-monitor', label: '实时监控' },
  ]

  const loadMonitor = async (scriptId: number) => {
    setError(null)
    try {
      const [monRes, histRes] = await Promise.all([
        perfTestApi.monitor(scriptId),
        perfTestApi.monitorHistory(scriptId),
      ])
      setMonitorData(monRes.data)
      setMonitorHistory(histRes.data || [])
    } catch (e) {
      console.error('Failed to load monitor data', e)
      setError(e instanceof Error ? e.message : 'Failed to load monitor data')
    }
  }

  useEffect(() => {
    const loadScripts = async () => {
      setLoading(true)
      setError(null)
      try {
        const res = await perfTestApi.list({ page: 1, page_size: 100 })
        setScripts(res.data.items || [])
      } catch (e) {
        console.error('Failed to load perf scripts', e)
        setError(e instanceof Error ? e.message : 'Failed to load perf scripts')
      } finally {
        setLoading(false)
      }
    }
    loadScripts()
  }, [])

  useEffect(() => {
    if (activeTab === 'perf-monitor' && selectedScriptId) {
      loadMonitor(selectedScriptId)
    }
  }, [activeTab, selectedScriptId])

  const openCreate = () => {
    setEditItem(null)
    setForm({ name: '', description: '' })
    setShowDialog(true)
  }

  const openEdit = (s: PerfScriptItem) => {
    setEditItem(s)
    setForm({ name: s.name, description: s.description || '' })
    setShowDialog(true)
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      if (editItem) {
        const res = await perfTestApi.update(editItem.id, {
          name: form.name,
          description: form.description,
        })
        setScripts(prev => prev.map(s => s.id === editItem.id ? res.data : s))
      } else {
        const res = await perfTestApi.create({
          name: form.name,
          description: form.description,
        })
        setScripts(prev => [...prev, res.data])
      }
      setShowDialog(false)
    } catch {
      console.error('Failed to save perf script')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: number) => {
    if (!window.confirm('确定删除该脚本？')) return
    try {
      await perfTestApi.delete(id)
      setScripts(prev => prev.filter(s => s.id !== id))
    } catch {
      console.error('Failed to delete perf script')
    }
  }

  const pollRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  useEffect(() => {
    return () => { if (pollRef.current) clearTimeout(pollRef.current) }
  }, [])

  const handleRun = async (id: number) => {
    setRunningId(id)
    setError(null)
    try {
      await perfTestApi.run(id)
      setScripts(prev => prev.map(s => s.id === id ? { ...s, status: 'running' as const } : s))
      // Poll for completion
      let attempts = 0
      const poll = async () => {
        attempts++
        try {
          const listRes = await perfTestApi.list({ page: 1, page_size: 100 })
          const updated = listRes.data.items?.find((s: PerfScriptItem) => s.id === id)
          if (updated && (updated.status === 'passed' || updated.status === 'failed')) {
            setScripts(prev => prev.map(s => s.id === id ? updated : s))
            setRunningId(null)
            return
          }
        } catch {
          // ignore
        }
        if (attempts < 20) {
          pollRef.current = setTimeout(poll, 2000)
        } else {
          setRunningId(null)
        }
      }
      pollRef.current = setTimeout(poll, 2000)
    } catch {
      console.error('Failed to run perf script')
      setRunningId(null)
    }
  }

  const getStatusBadge = (status: string) => {
    const s = STATUS_MAP[status] || STATUS_MAP.draft
    return <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${s.class}`}>{s.label}</span>
  }

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

      {/* 压测脚本 */}
      {activeTab === 'perf-scripts' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button onClick={openCreate}
              className="flex items-center gap-2 rounded-lg px-4 py-2 text-sm text-white transition-opacity hover:opacity-90"
              style={{ backgroundColor: 'var(--amber-primary)' }}>
              <Plus className="h-4 w-4" /> 新建脚本
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
                    <th className="px-4 py-3 text-left font-medium" style={{ color: 'var(--polaroid-text)' }}>脚本名称</th>
                    <th className="px-4 py-3 text-left font-medium" style={{ color: 'var(--polaroid-text)' }}>描述</th>
                    <th className="px-4 py-3 text-left font-medium" style={{ color: 'var(--polaroid-text)' }}>类型</th>
                    <th className="px-4 py-3 text-left font-medium" style={{ color: 'var(--polaroid-text)' }}>状态</th>
                    <th className="px-4 py-3 text-right font-medium" style={{ color: 'var(--polaroid-text)' }}>操作</th>
                  </tr>
                </thead>
                <tbody>
                  {scripts.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-sm" style={{ color: 'var(--polaroid-text-muted)' }}>暂无脚本</td>
                    </tr>
                  ) : (
                    scripts.map((s) => (
                      <tr key={s.id} className="border-t hover:bg-gray-50/50" style={{ borderColor: 'var(--polaroid-border)' }}>
                        <td className="px-4 py-3 font-medium" style={{ color: 'var(--polaroid-text)' }}>{s.name}</td>
                        <td className="px-4 py-3 text-sm" style={{ color: 'var(--polaroid-text-muted)' }}>{s.description || '-'}</td>
                        <td className="px-4 py-3 text-sm" style={{ color: 'var(--polaroid-text-muted)' }}>{s.type}</td>
                        <td className="px-4 py-3">{getStatusBadge(s.status)}</td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button onClick={() => handleRun(s.id)} disabled={runningId === s.id || s.status === 'running'}
                              className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs border transition-colors hover:bg-gray-50 disabled:opacity-50"
                              style={{ borderColor: 'var(--polaroid-border)' }}>
                              {runningId === s.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Play className="h-3 w-3" />}
                              运行
                            </button>
                            <button onClick={() => openEdit(s)} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
                              <Edit2 className="h-4 w-4" style={{ color: 'var(--polaroid-text-muted)' }} />
                            </button>
                            <button onClick={() => handleDelete(s.id)} className="p-1.5 rounded-lg hover:bg-red-50 transition-colors">
                              <Trash2 className="h-4 w-4 text-red-400" />
                            </button>
                          </div>
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

      {/* 实时监控 */}
      {activeTab === 'perf-monitor' && (
        <div className="space-y-4">
          {/* Script selector */}
          <div className="rounded-xl border p-4" style={{ borderColor: 'var(--polaroid-border)', backgroundColor: 'var(--polaroid-white)' }}>
            <label className="block text-sm font-medium mb-2" style={{ color: 'var(--polaroid-text)' }}>选择压测脚本</label>
            <select
              value={selectedScriptId || ''}
              onChange={(e) => setSelectedScriptId(e.target.value ? parseInt(e.target.value) : null)}
              className="w-full max-w-xs rounded-lg border bg-white px-3 py-2 text-sm outline-none"
              style={{ borderColor: 'var(--polaroid-border)' }}
            >
              <option value="">请选择脚本...</option>
              {scripts.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>

          {monitorData ? (
            <>
              {/* Stat Cards */}
              <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
                <div className="rounded-xl border p-5" style={{ borderColor: 'var(--polaroid-border)', backgroundColor: 'var(--polaroid-white)' }}>
                  <p className="text-xs font-medium mb-1" style={{ color: 'var(--polaroid-text-muted)' }}>TPS</p>
                  <p className="text-2xl font-bold" style={{ color: 'var(--polaroid-text)' }}>{monitorData.tps?.toLocaleString() || 'N/A'}</p>
                  <p className="text-xs mt-1" style={{ color: 'var(--polaroid-text-muted)' }}>当前吞吐量</p>
                </div>
                <div className="rounded-xl border p-5" style={{ borderColor: 'var(--polaroid-border)', backgroundColor: 'var(--polaroid-white)' }}>
                  <p className="text-xs font-medium mb-1" style={{ color: 'var(--polaroid-text-muted)' }}>平均响应时间</p>
                  <p className="text-2xl font-bold" style={{ color: 'var(--polaroid-text)' }}>{monitorData.avg_response_time ? `${monitorData.avg_response_time}ms` : 'N/A'}</p>
                  <p className="text-xs mt-1" style={{ color: 'var(--polaroid-text-muted)' }}>P99 等待估算</p>
                </div>
                <div className="rounded-xl border p-5" style={{ borderColor: 'var(--polaroid-border)', backgroundColor: 'var(--polaroid-white)' }}>
                  <p className="text-xs font-medium mb-1" style={{ color: 'var(--polaroid-text-muted)' }}>错误率</p>
                  <p className="text-2xl font-bold" style={{ color: monitorData.error_rate > 5 ? '#ef4444' : 'var(--polaroid-text)' }}>{monitorData.error_rate ? `${monitorData.error_rate.toFixed(2)}%` : 'N/A'}</p>
                  <p className="text-xs mt-1" style={{ color: 'var(--polaroid-text-muted)' }}>累计错误</p>
                </div>
                <div className="rounded-xl border p-5" style={{ borderColor: 'var(--polaroid-border)', backgroundColor: 'var(--polaroid-white)' }}>
                  <p className="text-xs font-medium mb-1" style={{ color: 'var(--polaroid-text-muted)' }}>CPU / 内存</p>
                  <p className="text-2xl font-bold" style={{ color: 'var(--polaroid-text)' }}>{monitorData.cpu_usage || 'N/A'}% / {monitorData.memory_usage || 'N/A'}%</p>
                  <p className="text-xs mt-1" style={{ color: 'var(--polaroid-text-muted)' }}>资源使用率</p>
                </div>
              </div>

              {/* Monitor History */}
              {monitorHistory.length > 0 && (
                <div className="rounded-xl border p-5" style={{ borderColor: 'var(--polaroid-border)', backgroundColor: 'var(--polaroid-white)' }}>
                  <h3 className="text-sm font-medium mb-3" style={{ color: 'var(--polaroid-text)' }}>监控历史</h3>
                  <table className="w-full text-sm">
                    <thead>
                      <tr style={{ backgroundColor: 'var(--polaroid-warm)' }}>
                        <th className="px-3 py-2 text-left font-medium" style={{ color: 'var(--polaroid-text)' }}>时间</th>
                        <th className="px-3 py-2 text-left font-medium" style={{ color: 'var(--polaroid-text)' }}>TPS</th>
                        <th className="px-3 py-2 text-left font-medium" style={{ color: 'var(--polaroid-text)' }}>平均响应时间</th>
                        <th className="px-3 py-2 text-left font-medium" style={{ color: 'var(--polaroid-text)' }}>错误率</th>
                        <th className="px-3 py-2 text-left font-medium" style={{ color: 'var(--polaroid-text)' }}>CPU</th>
                        <th className="px-3 py-2 text-left font-medium" style={{ color: 'var(--polaroid-text)' }}>内存</th>
                      </tr>
                    </thead>
                    <tbody>
                      {monitorHistory.map((r, i) => (
                        <tr key={r.id || i} className="border-t" style={{ borderColor: 'var(--polaroid-border)' }}>
                          <td className="px-3 py-2 text-xs" style={{ color: 'var(--polaroid-text-muted)' }}>{r.timestamp ? new Date(r.timestamp).toLocaleString() : '-'}</td>
                          <td className="px-3 py-2 text-xs" style={{ color: 'var(--polaroid-text)' }}>{r.tps ?? '-'}</td>
                          <td className="px-3 py-2 text-xs" style={{ color: 'var(--polaroid-text-muted)' }}>{r.avg_response_time ? `${r.avg_response_time}ms` : '-'}</td>
                          <td className="px-3 py-2 text-xs" style={{ color: r.error_rate > 5 ? '#ef4444' : 'var(--polaroid-text-muted)' }}>{r.error_rate != null ? `${r.error_rate.toFixed(2)}%` : '-'}</td>
                          <td className="px-3 py-2 text-xs" style={{ color: 'var(--polaroid-text-muted)' }}>{r.cpu_usage != null ? `${r.cpu_usage}%` : '-'}</td>
                          <td className="px-3 py-2 text-xs" style={{ color: 'var(--polaroid-text-muted)' }}>{r.memory_usage != null ? `${r.memory_usage}%` : '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          ) : selectedScriptId ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin" style={{ color: 'var(--amber-primary)' }} />
            </div>
          ) : (
            <div className="rounded-xl border p-8 text-center" style={{ borderColor: 'var(--polaroid-border)' }}>
              <p className="text-sm" style={{ color: 'var(--polaroid-text-muted)' }}>请选择一个压测脚本来查看监控数据</p>
            </div>
          )}
        </div>
      )}

      {/* 弹窗 */}
      {showDialog && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
          onClick={() => setShowDialog(false)}>
          <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl"
            style={{ border: '1px solid var(--polaroid-border)' }}>
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-semibold" style={{ color: 'var(--polaroid-text)' }}>
                {editItem ? '编辑脚本' : '新建脚本'}
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
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: 'var(--polaroid-text)' }}>描述</label>
                <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
                  rows={2}
                  className="w-full rounded-lg border bg-white px-3 py-2 text-sm outline-none resize-none"
                  style={{ borderColor: 'var(--polaroid-border)' }} />
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
    </div>
  )
}
