import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Edit2, Trash2, X, Smartphone, CheckCircle2, Loader2 } from 'lucide-react'
import { appTestApi, AppScriptItem, AppDeviceItem } from '../../lib/api-service'

const PLATFORM_MAP: Record<string, AppScriptItem['platform']> = {
  iOS: 'ios',
  Android: 'android',
}

const PLATFORM_REVERSE: Record<string, string> = {
  ios: 'iOS',
  android: 'Android',
}

const STATUS_LABELS: Record<string, string> = {
  online: '空闲',
  busy: '占用中',
  offline: '离线',
}

export default function AppAutoTestPage() {
  const [activeTab, setActiveTab] = useState<'app-scripts' | 'app-devices'>('app-scripts')
  const [scripts, setScripts] = useState<AppScriptItem[]>([])
  const [devices, setDevices] = useState<AppDeviceItem[]>([])
  const [showDialog, setShowDialog] = useState(false)
  const [editItem, setEditItem] = useState<AppScriptItem | null>(null)
  const [form, setForm] = useState({ name: '', platform: 'ios' as AppScriptItem['platform'], description: '', status: 'ready' as AppScriptItem['status'] })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const loadData = async () => {
      setLoading(true)
      setError(null)
      try {
        const [scriptsRes, devicesRes] = await Promise.all([
          appTestApi.listScripts({ page: 1, page_size: 100 }),
          appTestApi.listDevices({ page: 1, page_size: 100 }),
        ])
        setScripts(scriptsRes.data.items || [])
        setDevices(devicesRes.data.items || [])
      } catch (e) {
        console.error('Failed to load data', e)
        setError(e instanceof Error ? e.message : 'Failed to load data')
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [])

  const openCreate = () => {
    setEditItem(null)
    setForm({ name: '', platform: 'ios', description: '', status: 'ready' })
    setShowDialog(true)
  }

  const openEdit = (s: AppScriptItem) => {
    setEditItem(s)
    setForm({ name: s.name, platform: s.platform, description: s.description || '', status: s.status })
    setShowDialog(true)
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      if (editItem) {
        const res = await appTestApi.updateScript(editItem.id, {
          name: form.name,
          platform: form.platform,
          description: form.description,
          status: form.status,
        })
        setScripts(prev => prev.map(s => s.id === editItem.id ? res.data : s))
      } else {
        const res = await appTestApi.createScript({
          name: form.name,
          platform: form.platform,
          description: form.description,
          status: form.status,
        })
        setScripts(prev => [...prev, res.data])
      }
      setShowDialog(false)
    } catch {
      console.error('Failed to save script')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: number) => {
    if (!window.confirm('确定删除该脚本？')) return
    try {
      await appTestApi.deleteScript(id)
      setScripts(prev => prev.filter(s => s.id !== id))
    } catch {
      console.error('Failed to delete script')
    }
  }

  const tabs = [
    { key: 'app-scripts', label: '脚本管理' },
    { key: 'app-devices', label: '设备管理' },
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
      {activeTab === 'app-scripts' && (
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
                    <th className="px-4 py-3 text-left font-medium" style={{ color: 'var(--polaroid-text)' }}>平台</th>
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
                          <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${s.platform === 'ios' ? 'bg-gray-100 text-gray-700' : 'bg-green-50 text-green-600'}`}>
                            <Smartphone className="h-3 w-3" />
                            {PLATFORM_REVERSE[s.platform] || s.platform}
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

      {/* 设备管理 */}
      {activeTab === 'app-devices' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            {loading ? (
              <Loader2 className="h-5 w-5 animate-spin" style={{ color: 'var(--amber-primary)' }} />
            ) : (
              <p className="text-sm" style={{ color: 'var(--polaroid-text-muted)' }}>
                共 {devices.length} 台设备，
                空闲 {devices.filter(d => d.status === 'online').length} 台，
                占用中 {devices.filter(d => d.status === 'busy').length} 台，
                离线 {devices.filter(d => d.status === 'offline').length} 台
              </p>
            )}
          </div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {devices.length === 0 && !loading ? (
              <div className="col-span-full text-center py-12 text-sm" style={{ color: 'var(--polaroid-text-muted)' }}>暂无设备</div>
            ) : (
              devices.map((device) => (
                <motion.div key={device.id} whileHover={{ y: -2 }}
                  className="rounded-xl border p-5 space-y-3"
                  style={{ borderColor: 'var(--polaroid-border)', backgroundColor: 'var(--polaroid-white)' }}>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${device.platform === 'ios' ? 'bg-gray-100' : 'bg-green-50'}`}>
                        <Smartphone className={`h-5 w-5 ${device.platform === 'ios' ? 'text-gray-600' : 'text-green-600'}`} />
                      </div>
                      <div>
                        <h3 className="font-medium text-sm" style={{ color: 'var(--polaroid-text)' }}>{device.name}</h3>
                        <p className="text-xs" style={{ color: 'var(--polaroid-text-muted)' }}>{device.version}</p>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span style={{ color: 'var(--polaroid-text-muted)' }}>{device.udid?.substring(0, 16)}...</span>
                    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
                      device.status === 'online' ? 'bg-green-50 text-green-600' :
                      device.status === 'busy' ? 'bg-yellow-50 text-yellow-600' :
                      'bg-gray-100 text-gray-500'
                    }`}>
                      {device.status === 'online' && <CheckCircle2 className="h-3 w-3" />}
                      {device.status === 'busy' && <Loader2 className="h-3 w-3 animate-spin" />}
                      {STATUS_LABELS[device.status]}
                    </span>
                  </div>
                </motion.div>
              ))
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
                    <label className="block text-sm font-medium mb-1" style={{ color: 'var(--polaroid-text)' }}>平台</label>
                    <select value={form.platform} onChange={(e) => setForm({ ...form, platform: e.target.value as AppScriptItem['platform'] })}
                      className="w-full rounded-lg border bg-white px-3 py-2 text-sm outline-none"
                      style={{ borderColor: 'var(--polaroid-border)' }}>
                      {Object.entries(PLATFORM_MAP).map(([label, value]) => (
                        <option key={value} value={value}>{label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1" style={{ color: 'var(--polaroid-text)' }}>状态</label>
                    <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as AppScriptItem['status'] })}
                      className="w-full rounded-lg border bg-white px-3 py-2 text-sm outline-none"
                      style={{ borderColor: 'var(--polaroid-border)' }}>
                      <option value="ready">启用</option>
                      <option value="draft">停用</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: 'var(--polaroid-text)' }}>描述</label>
                  <input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
                    placeholder="脚本描述"
                    className="w-full rounded-lg border bg-white px-3 py-2 text-sm outline-none"
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
