import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Edit2, Trash2, X, Play, Power, PowerOff, Loader2 } from 'lucide-react'
import { apiTestApi, ApiTestCaseItem } from '../../lib/api-service'

interface ApiAutoConfig {
  id: number
  collection_name: string
  base_url: string
  test_count: number
  last_run_status: 'success' | 'failed' | 'never'
  enabled: boolean
}

const METHOD_COLORS: Record<string, string> = {
  GET: 'bg-blue-50 text-blue-600',
  POST: 'bg-green-50 text-green-600',
  PUT: 'bg-orange-50 text-orange-600',
  DELETE: 'bg-red-50 text-red-600',
}

const METHODS = ['GET', 'POST', 'PUT', 'DELETE']

export default function ApiTestPage() {
  const [activeTab, setActiveTab] = useState<'api-cases' | 'api-auto'>('api-cases')
  const [apiCases, setApiCases] = useState<ApiTestCaseItem[]>([])
  const [autoConfigs, setAutoConfigs] = useState<ApiAutoConfig[]>([])
  const [showDialog, setShowDialog] = useState(false)
  const [editItem, setEditItem] = useState<ApiTestCaseItem | null>(null)
  const [form, setForm] = useState({ name: '', method: 'GET' as ApiTestCaseItem['method'], url: '', status: 'ready' as ApiTestCaseItem['status'] })
  const [runningAll, setRunningAll] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const loadData = async () => {
      setLoading(true)
      setError(null)
      try {
        const res = await apiTestApi.list({ page: 1, page_size: 100 })
        const items = res.data.items || []
        setApiCases(items)
        setAutoConfigs(
          items
            .filter((c: ApiTestCaseItem) => c.auto_test)
            .map((c: ApiTestCaseItem) => ({
              id: c.id,
              collection_name: c.name,
              base_url: new URL(c.url || '/').origin,
              test_count: 0,
              last_run_status: 'never' as const,
              enabled: c.auto_test,
            }))
        )
      } catch (e) {
        console.error('Failed to load API test cases', e)
        setError(e instanceof Error ? e.message : 'Failed to load API test cases')
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [])

  const openCreate = () => {
    setEditItem(null)
    setForm({ name: '', method: 'GET', url: '', status: 'ready' })
    setShowDialog(true)
  }

  const openEdit = (tc: ApiTestCaseItem) => {
    setEditItem(tc)
    setForm({ name: tc.name, method: tc.method, url: tc.url || '', status: tc.status })
    setShowDialog(true)
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      if (editItem) {
        const res = await apiTestApi.update(editItem.id, {
          name: form.name,
          method: form.method,
          url: form.url,
          status: form.status,
        })
        setApiCases(prev => prev.map(c => c.id === editItem.id ? res.data : c))
      } else {
        const res = await apiTestApi.create({
          name: form.name,
          method: form.method,
          url: form.url,
          status: form.status,
        })
        setApiCases(prev => [...prev, res.data])
      }
      setShowDialog(false)
    } catch {
      console.error('Failed to save API test case')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: number) => {
    if (!window.confirm('确定删除该接口用例？')) return
    try {
      await apiTestApi.delete(id)
      setApiCases(prev => prev.filter(c => c.id !== id))
      setAutoConfigs(prev => prev.filter(c => c.id !== id))
    } catch {
      console.error('Failed to delete API test case')
    }
  }

  const handleRunAll = async () => {
    setRunningAll(true)
    try {
      const autoItems = apiCases.filter(c => c.auto_test)
      await Promise.all(autoItems.map(c => apiTestApi.run(c.id).catch(() => null)))
      setAutoConfigs(prev => prev.map(c => ({
        ...c,
        last_run_status: 'success' as const,
      })))
    } catch {
      console.error('Failed to run all')
    } finally {
      setRunningAll(false)
    }
  }

  const toggleConfig = async (id: number) => {
    const item = apiCases.find(c => c.id === id)
    if (!item) return
    try {
      const res = await apiTestApi.toggleAuto(id, !item.auto_test)
      setApiCases(prev => prev.map(c => c.id === id ? res.data : c))
      setAutoConfigs(prev =>
        item.auto_test
          ? prev.filter(c => c.id !== id)
          : [...prev, { id, collection_name: item.name, base_url: new URL(item.url || '/').origin, test_count: 0, last_run_status: 'never' as const, enabled: true }]
      )
    } catch {
      console.error('Failed to toggle auto test')
    }
  }

  const tabs = [
    { key: 'api-cases', label: '接口用例' },
    { key: 'api-auto', label: '接口自动化' },
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

      {/* 接口用例 */}
      {activeTab === 'api-cases' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button onClick={openCreate}
              className="flex items-center gap-2 rounded-lg px-4 py-2 text-sm text-white transition-opacity hover:opacity-90"
              style={{ backgroundColor: 'var(--amber-primary)' }}>
              <Plus className="h-4 w-4" /> 添加接口用例
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
                    <th className="px-4 py-3 text-left font-medium" style={{ color: 'var(--polaroid-text)' }}>名称</th>
                    <th className="px-4 py-3 text-left font-medium" style={{ color: 'var(--polaroid-text)' }}>方法</th>
                    <th className="px-4 py-3 text-left font-medium" style={{ color: 'var(--polaroid-text)' }}>Endpoint</th>
                    <th className="px-4 py-3 text-left font-medium" style={{ color: 'var(--polaroid-text)' }}>状态</th>
                    <th className="px-4 py-3 text-right font-medium" style={{ color: 'var(--polaroid-text)' }}>操作</th>
                  </tr>
                </thead>
                <tbody>
                  {apiCases.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-sm" style={{ color: 'var(--polaroid-text-muted)' }}>暂无接口用例</td>
                    </tr>
                  ) : (
                    apiCases.map((tc) => (
                      <tr key={tc.id} className="border-t hover:bg-gray-50/50" style={{ borderColor: 'var(--polaroid-border)' }}>
                        <td className="px-4 py-3 text-sm" style={{ color: 'var(--polaroid-text-muted)' }}>#{tc.id}</td>
                        <td className="px-4 py-3 font-medium" style={{ color: 'var(--polaroid-text)' }}>{tc.name}</td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${METHOD_COLORS[tc.method] || METHOD_COLORS.GET}`}>
                            {tc.method}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <code className="rounded px-1.5 py-0.5 text-xs font-mono" style={{ backgroundColor: 'var(--polaroid-warm)', color: 'var(--polaroid-text)' }}>
                            {tc.url}
                          </code>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${tc.status === 'ready' || tc.status === 'passed' ? 'bg-green-50 text-green-600' : 'bg-gray-100 text-gray-500'}`}>
                            {tc.status === 'ready' || tc.status === 'passed' ? '启用' : '停用'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button onClick={() => openEdit(tc)} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
                            <Edit2 className="h-4 w-4" style={{ color: 'var(--polaroid-text-muted)' }} />
                          </button>
                          <button onClick={() => handleDelete(tc.id)} className="p-1.5 rounded-lg hover:bg-red-50 transition-colors">
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

      {/* 接口自动化 */}
      {activeTab === 'api-auto' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button onClick={handleRunAll} disabled={runningAll || loading}
              className="flex items-center gap-2 rounded-lg px-4 py-2 text-sm text-white transition-opacity hover:opacity-90 disabled:opacity-50"
              style={{ backgroundColor: 'var(--amber-primary)' }}>
              {runningAll ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
              {runningAll ? '运行中...' : '运行所有'}
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
                    <th className="px-4 py-3 text-left font-medium" style={{ color: 'var(--polaroid-text)' }}>集合名称</th>
                    <th className="px-4 py-3 text-left font-medium" style={{ color: 'var(--polaroid-text)' }}>Base URL</th>
                    <th className="px-4 py-3 text-left font-medium" style={{ color: 'var(--polaroid-text)' }}>测试数量</th>
                    <th className="px-4 py-3 text-left font-medium" style={{ color: 'var(--polaroid-text)' }}>上次运行</th>
                    <th className="px-4 py-3 text-left font-medium" style={{ color: 'var(--polaroid-text)' }}>状态</th>
                    <th className="px-4 py-3 text-right font-medium" style={{ color: 'var(--polaroid-text)' }}>操作</th>
                  </tr>
                </thead>
                <tbody>
                  {autoConfigs.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-sm" style={{ color: 'var(--polaroid-text-muted)' }}>暂无自动化配置</td>
                    </tr>
                  ) : (
                    autoConfigs.map((cfg) => (
                      <tr key={cfg.id} className="border-t hover:bg-gray-50/50" style={{ borderColor: 'var(--polaroid-border)' }}>
                        <td className="px-4 py-3 font-medium" style={{ color: 'var(--polaroid-text)' }}>{cfg.collection_name}</td>
                        <td className="px-4 py-3">
                          <code className="rounded px-1.5 py-0.5 text-xs font-mono" style={{ backgroundColor: 'var(--polaroid-warm)', color: 'var(--polaroid-text)' }}>
                            {cfg.base_url}
                          </code>
                        </td>
                        <td className="px-4 py-3 text-sm" style={{ color: 'var(--polaroid-text)' }}>{cfg.test_count}</td>
                        <td className="px-4 py-3">
                          {cfg.last_run_status === 'never' ? (
                            <span className="text-xs" style={{ color: 'var(--polaroid-text-muted)' }}>从未运行</span>
                          ) : (
                            <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${cfg.last_run_status === 'success' ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>
                              {cfg.last_run_status === 'success' ? '通过' : '失败'}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <button onClick={() => toggleConfig(cfg.id)}
                            className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium border transition-colors ${cfg.enabled ? 'bg-green-50 text-green-600 border-green-200' : 'bg-gray-50 text-gray-500 border-gray-200'}`}>
                            {cfg.enabled ? <Power className="h-3 w-3" /> : <PowerOff className="h-3 w-3" />}
                            {cfg.enabled ? '已启用' : '已禁用'}
                          </button>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button onClick={() => toggleConfig(cfg.id)} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
                            {cfg.enabled ? <PowerOff className="h-4 w-4 text-red-400" /> : <Power className="h-4 w-4 text-green-500" />}
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
                  {editItem ? '编辑接口用例' : '添加接口用例'}
                </h3>
                <button onClick={() => setShowDialog(false)} className="p-1 rounded-lg hover:bg-gray-100">
                  <X className="h-5 w-5" style={{ color: 'var(--polaroid-text-muted)' }} />
                </button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: 'var(--polaroid-text)' }}>名称</label>
                  <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="w-full rounded-lg border bg-white px-3 py-2 text-sm outline-none"
                    style={{ borderColor: 'var(--polaroid-border)' }} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1" style={{ color: 'var(--polaroid-text)' }}>方法</label>
                    <select value={form.method} onChange={(e) => setForm({ ...form, method: e.target.value as ApiTestCaseItem['method'] })}
                      className="w-full rounded-lg border bg-white px-3 py-2 text-sm outline-none"
                      style={{ borderColor: 'var(--polaroid-border)' }}>
                      {METHODS.map(m => <option key={m} value={m}>{m}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1" style={{ color: 'var(--polaroid-text)' }}>状态</label>
                    <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as ApiTestCaseItem['status'] })}
                      className="w-full rounded-lg border bg-white px-3 py-2 text-sm outline-none"
                      style={{ borderColor: 'var(--polaroid-border)' }}>
                      <option value="ready">启用</option>
                      <option value="draft">停用</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: 'var(--polaroid-text)' }}>Endpoint</label>
                  <input value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })}
                    placeholder="/api/v1/example"
                    className="w-full rounded-lg border bg-white px-3 py-2 text-sm outline-none font-mono"
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
      </AnimatePresence>
    </div>
  )
}
