import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Edit2, Trash2, X, Save, Bell, Globe, Play, Loader2, ToggleLeft, ToggleRight } from 'lucide-react'
import { smokeTestApi, SmokeSuiteItem } from '../../lib/api-service'

interface TriggerConfig {
  enabled: boolean
  triggerOn: string[]
  environments: string[]
  notifyChannels: string[]
}

const TRIGGER_OPTIONS = [
  { value: 'deploy', label: '部署触发' },
  { value: 'schedule', label: '定时触发' },
  { value: 'demand', label: '手动触发' },
]

const ENV_OPTIONS = [
  { value: 'dev', label: '开发环境 (Dev)' },
  { value: 'staging', label: '预发布环境 (Staging)' },
  { value: 'prod', label: '生产环境 (Prod)' },
]

const NOTIFY_OPTIONS = [
  { value: 'email', label: '邮件通知' },
  { value: 'slack', label: 'Slack 通知' },
  { value: 'wechat', label: '企业微信通知' },
]

export default function SmokeTestPage() {
  const [activeTab, setActiveTab] = useState<'smoke-cases' | 'smoke-auto'>('smoke-cases')
  const [suites, setSuites] = useState<SmokeSuiteItem[]>([])
  const [showDialog, setShowDialog] = useState(false)
  const [editItem, setEditItem] = useState<SmokeSuiteItem | null>(null)
  const [form, setForm] = useState({ name: '', description: '', criticalPath: '' })
  const [config, setConfig] = useState<TriggerConfig>({
    enabled: true,
    triggerOn: ['deploy'],
    environments: ['staging'],
    notifyChannels: ['slack'],
  })
  const [savingConfig, setSavingConfig] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const loadData = async () => {
      setLoading(true)
      setError(null)
      try {
        const res = await smokeTestApi.list({ page: 1, page_size: 100 })
        const items = res.data.items || []
        setSuites(items)
        // Initialize trigger config from first suite with auto_trigger
        const autoSuite = items.find(s => s.auto_trigger)
        if (autoSuite && autoSuite.trigger_config) {
          const tc = autoSuite.trigger_config as Record<string, unknown>
          setConfig({
            enabled: autoSuite.auto_trigger,
            triggerOn: (tc.triggerOn as string[]) || ['deploy'],
            environments: (tc.environments as string[]) || ['staging'],
            notifyChannels: (tc.notifyChannels as string[]) || ['slack'],
          })
        }
      } catch (e) {
        console.error('Failed to load smoke suites', e)
        setError(e instanceof Error ? e.message : 'Failed to load smoke suites')
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [])

  const tabs = [
    { key: 'smoke-cases', label: '冒烟用例' },
    { key: 'smoke-auto', label: '自动触发' },
  ]

  const openCreate = () => {
    setEditItem(null)
    setForm({ name: '', description: '', criticalPath: '' })
    setShowDialog(true)
  }

  const openEdit = (c: SmokeSuiteItem) => {
    setEditItem(c)
    setForm({ name: c.name, description: c.description || '', criticalPath: '' })
    setShowDialog(true)
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      if (editItem) {
        const res = await smokeTestApi.update(editItem.id, {
          name: form.name,
          description: form.description,
        })
        setSuites(prev => prev.map(c => c.id === editItem.id ? res.data : c))
      } else {
        const res = await smokeTestApi.create({
          name: form.name,
          description: form.description,
        })
        setSuites(prev => [...prev, res.data])
      }
      setShowDialog(false)
    } catch {
      console.error('Failed to save smoke suite')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: number) => {
    if (!window.confirm('确定删除该用例？')) return
    try {
      await smokeTestApi.delete(id)
      setSuites(prev => prev.filter(c => c.id !== id))
    } catch {
      console.error('Failed to delete smoke suite')
    }
  }

  const handleSaveConfig = async () => {
    setSavingConfig(true)
    try {
      // Update auto-trigger on the first suite or create a placeholder
      if (suites.length > 0) {
        const targetId = suites[0].id
        const res = await smokeTestApi.updateAutoTrigger(targetId, {
          auto_trigger: config.enabled,
          trigger_config: {
            triggerOn: config.triggerOn,
            environments: config.environments,
            notifyChannels: config.notifyChannels,
          },
        })
        setSuites(prev => prev.map(s => s.id === targetId ? res.data : s))
      }
    } catch {
      console.error('Failed to save trigger config')
    } finally {
      setSavingConfig(false)
    }
  }

  const toggleArrayItem = (field: keyof TriggerConfig, value: string) => {
    setConfig(prev => {
      const arr = prev[field] as string[]
      if (arr.includes(value)) {
        return { ...prev, [field]: arr.filter(v => v !== value) }
      }
      return { ...prev, [field]: [...arr, value] }
    })
  }

  const getStatusBadge = (status: string) => {
    const map: Record<string, { label: string; class: string }> = {
      ready: { label: '通过', class: 'bg-green-50 text-green-600' },
      passed: { label: '通过', class: 'bg-green-50 text-green-600' },
      failed: { label: '失败', class: 'bg-red-50 text-red-600' },
      draft: { label: '待测试', class: 'bg-gray-100 text-gray-500' },
    }
    const s = map[status] || { label: '待测试', class: 'bg-gray-100 text-gray-500' }
    return <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${s.class}`}>{s.label}</span>
  }

  const CheckboxOption = ({ label, checked, onChange }: { label: string; checked: boolean; onChange: () => void }) => (
    <label className="flex items-center gap-2 cursor-pointer">
      <input type="checkbox" checked={checked} onChange={onChange}
        className="h-4 w-4 rounded border-gray-300" style={{ accentColor: 'var(--amber-primary)' }} />
      <span className="text-sm" style={{ color: 'var(--polaroid-text)' }}>{label}</span>
    </label>
  )

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

      {/* 冒烟用例 */}
      {activeTab === 'smoke-cases' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button onClick={openCreate}
              className="flex items-center gap-2 rounded-lg px-4 py-2 text-sm text-white transition-opacity hover:opacity-90"
              style={{ backgroundColor: 'var(--amber-primary)' }}>
              <Plus className="h-4 w-4" /> 新增用例
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
                    <th className="px-4 py-3 text-left font-medium" style={{ color: 'var(--polaroid-text)' }}>用例名称</th>
                    <th className="px-4 py-3 text-left font-medium" style={{ color: 'var(--polaroid-text)' }}>描述</th>
                    <th className="px-4 py-3 text-left font-medium" style={{ color: 'var(--polaroid-text)' }}>状态</th>
                    <th className="px-4 py-3 text-left font-medium" style={{ color: 'var(--polaroid-text)' }}>上次运行</th>
                    <th className="px-4 py-3 text-right font-medium" style={{ color: 'var(--polaroid-text)' }}>操作</th>
                  </tr>
                </thead>
                <tbody>
                  {suites.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-sm" style={{ color: 'var(--polaroid-text-muted)' }}>暂无用例</td>
                    </tr>
                  ) : (
                    suites.map((c) => (
                      <tr key={c.id} className="border-t hover:bg-gray-50/50" style={{ borderColor: 'var(--polaroid-border)' }}>
                        <td className="px-4 py-3 font-medium" style={{ color: 'var(--polaroid-text)' }}>{c.name}</td>
                        <td className="px-4 py-3 text-xs" style={{ color: 'var(--polaroid-text-muted)' }}>{c.description || '-'}</td>
                        <td className="px-4 py-3">{getStatusBadge(c.status)}</td>
                        <td className="px-4 py-3 text-xs" style={{ color: 'var(--polaroid-text-muted)' }}>
                          {c.last_run_at ? new Date(c.last_run_at).toLocaleString('zh-CN') : '从未运行'}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button onClick={() => openEdit(c)} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
                            <Edit2 className="h-4 w-4" style={{ color: 'var(--polaroid-text-muted)' }} />
                          </button>
                          <button onClick={() => handleDelete(c.id)} className="p-1.5 rounded-lg hover:bg-red-50 transition-colors">
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

      {/* 自动触发 */}
      {activeTab === 'smoke-auto' && (
        <div className="space-y-4">
          {/* Enable toggle */}
          <div className="rounded-xl border p-5" style={{ borderColor: 'var(--polaroid-border)', backgroundColor: 'var(--polaroid-white)' }}>
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-medium" style={{ color: 'var(--polaroid-text)' }}>自动触发开关</h3>
                <p className="text-xs mt-0.5" style={{ color: 'var(--polaroid-text-muted)' }}>开启后将在满足条件时自动执行冒烟测试</p>
              </div>
              <button onClick={() => setConfig(prev => ({ ...prev, enabled: !prev.enabled }))}
                className="transition-opacity hover:opacity-80">
                {config.enabled
                  ? <ToggleRight className="h-8 w-8" style={{ color: 'var(--amber-primary)' }} />
                  : <ToggleLeft className="h-8 w-8" style={{ color: 'var(--polaroid-text-muted)' }} />
                }
              </button>
            </div>
          </div>

          {/* Trigger conditions */}
          <div className="rounded-xl border p-5" style={{ borderColor: 'var(--polaroid-border)', backgroundColor: 'var(--polaroid-white)' }}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Play className="h-4 w-4" style={{ color: 'var(--amber-primary)' }} />
                <h3 className="text-sm font-medium" style={{ color: 'var(--polaroid-text)' }}>触发条件</h3>
              </div>
            </div>
            <div className="space-y-2">
              {TRIGGER_OPTIONS.map((opt) => (
                <CheckboxOption key={opt.value} label={opt.label}
                  checked={config.triggerOn.includes(opt.value)}
                  onChange={() => toggleArrayItem('triggerOn', opt.value)} />
              ))}
            </div>
            <div className="flex justify-end mt-4">
              <button onClick={handleSaveConfig} disabled={savingConfig}
                className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs border transition-colors hover:bg-gray-50 disabled:opacity-50"
                style={{ borderColor: 'var(--polaroid-border)', color: 'var(--polaroid-text-muted)' }}>
                {savingConfig ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />} 保存
              </button>
            </div>
          </div>

          {/* Environment selection */}
          <div className="rounded-xl border p-5" style={{ borderColor: 'var(--polaroid-border)', backgroundColor: 'var(--polaroid-white)' }}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Globe className="h-4 w-4" style={{ color: 'var(--amber-primary)' }} />
                <h3 className="text-sm font-medium" style={{ color: 'var(--polaroid-text)' }}>运行环境</h3>
              </div>
            </div>
            <div className="space-y-2">
              {ENV_OPTIONS.map((opt) => (
                <CheckboxOption key={opt.value} label={opt.label}
                  checked={config.environments.includes(opt.value)}
                  onChange={() => toggleArrayItem('environments', opt.value)} />
              ))}
            </div>
            <div className="flex justify-end mt-4">
              <button onClick={handleSaveConfig} disabled={savingConfig}
                className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs border transition-colors hover:bg-gray-50 disabled:opacity-50"
                style={{ borderColor: 'var(--polaroid-border)', color: 'var(--polaroid-text-muted)' }}>
                {savingConfig ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />} 保存
              </button>
            </div>
          </div>

          {/* Notification settings */}
          <div className="rounded-xl border p-5" style={{ borderColor: 'var(--polaroid-border)', backgroundColor: 'var(--polaroid-white)' }}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Bell className="h-4 w-4" style={{ color: 'var(--amber-primary)' }} />
                <h3 className="text-sm font-medium" style={{ color: 'var(--polaroid-text)' }}>通知设置</h3>
              </div>
            </div>
            <div className="space-y-2">
              {NOTIFY_OPTIONS.map((opt) => (
                <CheckboxOption key={opt.value} label={opt.label}
                  checked={config.notifyChannels.includes(opt.value)}
                  onChange={() => toggleArrayItem('notifyChannels', opt.value)} />
              ))}
            </div>
            <div className="flex justify-end mt-4">
              <button onClick={handleSaveConfig} disabled={savingConfig}
                className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs border transition-colors hover:bg-gray-50 disabled:opacity-50"
                style={{ borderColor: 'var(--polaroid-border)', color: 'var(--polaroid-text-muted)' }}>
                {savingConfig ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />} 保存
              </button>
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
                  {editItem ? '编辑用例' : '新增用例'}
                </h3>
                <button onClick={() => setShowDialog(false)} className="p-1 rounded-lg hover:bg-gray-100">
                  <X className="h-5 w-5" style={{ color: 'var(--polaroid-text-muted)' }} />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: 'var(--polaroid-text)' }}>用例名称</label>
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
      </AnimatePresence>
    </div>
  )
}
