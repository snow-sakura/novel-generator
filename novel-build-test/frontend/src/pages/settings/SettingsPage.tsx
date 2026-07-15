import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Save, Trash2, Settings as SettingsIcon, Loader2, X } from 'lucide-react'
import { settingsApi, type SettingItem } from '@/lib/api-service'

export default function SettingsPage() {
  const [settings, setSettings] = useState<SettingItem[]>([])
  const [loading, setLoading] = useState(true)
  const [editingValues, setEditingValues] = useState<Record<string, string>>({})
  const [showNewForm, setShowNewForm] = useState(false)
  const [newKey, setNewKey] = useState('')
  const [newValue, setNewValue] = useState('')
  const [newDesc, setNewDesc] = useState('')
  const [savingKey, setSavingKey] = useState<string | null>(null)

  const fetchSettings = async () => {
    setLoading(true)
    try {
      const res = await settingsApi.list()
      const data = res.data
      setSettings(data)
      const values: Record<string, string> = {}
      for (const s of data) {
        values[s.key] = s.value
      }
      setEditingValues(values)
    } catch (err) {
      console.error('Failed to fetch settings:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchSettings()
  }, [])

  const handleSave = async (key: string) => {
    setSavingKey(key)
    try {
      await settingsApi.update(key, { value: editingValues[key] })
      await fetchSettings()
    } catch (err) {
      console.error('Failed to save setting:', err)
    } finally {
      setSavingKey(null)
    }
  }

  const handleDelete = async (key: string) => {
    if (!window.confirm(`确定删除设置 "${key}"？`)) return
    try {
      await settingsApi.delete(key)
      await fetchSettings()
    } catch (err) {
      console.error('Failed to delete setting:', err)
    }
  }

  const handleCreate = async () => {
    if (!newKey.trim() || !newValue.trim()) return
    try {
      await settingsApi.create({
        key: newKey.trim(),
        value: newValue.trim(),
        description: newDesc.trim() || undefined,
      })
      setNewKey('')
      setNewValue('')
      setNewDesc('')
      setShowNewForm(false)
      await fetchSettings()
    } catch (err) {
      console.error('Failed to create setting:', err)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin" style={{ color: 'var(--amber-primary)' }} />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold" style={{ color: 'var(--polaroid-text)' }}>
            系统设置
          </h1>
          <p className="text-sm" style={{ color: 'var(--polaroid-text-muted)' }}>管理系统配置项（键值对存储）</p>
        </div>
        <button
          onClick={() => setShowNewForm(!showNewForm)}
          className="flex items-center gap-2 rounded-lg px-4 py-2 text-sm text-white transition-opacity hover:opacity-90"
          style={{ backgroundColor: 'var(--amber-primary)' }}
        >
          <Plus className="h-4 w-4" />
          新增设置
        </button>
      </div>

      {/* New Setting Form */}
      <AnimatePresence>
        {showNewForm && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="rounded-xl border p-5 space-y-4" style={{ borderColor: 'var(--polaroid-border)', backgroundColor: 'var(--polaroid-white)' }}>
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium" style={{ color: 'var(--polaroid-text)' }}>新增配置项</h3>
                <button onClick={() => setShowNewForm(false)} className="p-1 rounded-lg hover:bg-gray-100">
                  <X className="h-4 w-4" style={{ color: 'var(--polaroid-text-muted)' }} />
                </button>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="mb-1.5 block text-sm font-medium" style={{ color: 'var(--polaroid-text)' }}>
                    键名 <span className="text-red-500">*</span>
                  </label>
                  <input
                    value={newKey}
                    onChange={(e) => setNewKey(e.target.value)}
                    placeholder="例如: llm.default_model"
                    className="w-full rounded-lg border bg-white px-3 py-2 text-sm outline-none font-mono focus:border-[var(--amber-primary)]"
                    style={{ borderColor: 'var(--polaroid-border)' }}
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium" style={{ color: 'var(--polaroid-text)' }}>
                    值 <span className="text-red-500">*</span>
                  </label>
                  <input
                    value={newValue}
                    onChange={(e) => setNewValue(e.target.value)}
                    placeholder="设置值"
                    className="w-full rounded-lg border bg-white px-3 py-2 text-sm outline-none focus:border-[var(--amber-primary)]"
                    style={{ borderColor: 'var(--polaroid-border)' }}
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium" style={{ color: 'var(--polaroid-text)' }}>说明</label>
                  <input
                    value={newDesc}
                    onChange={(e) => setNewDesc(e.target.value)}
                    placeholder="可选：设置说明"
                    className="w-full rounded-lg border bg-white px-3 py-2 text-sm outline-none focus:border-[var(--amber-primary)]"
                    style={{ borderColor: 'var(--polaroid-border)' }}
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <button
                  onClick={handleCreate}
                  disabled={!newKey.trim() || !newValue.trim()}
                  className="flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm text-white transition-opacity hover:opacity-90 disabled:opacity-50"
                  style={{ backgroundColor: 'var(--amber-primary)' }}
                >
                  <Save className="h-4 w-4" />
                  创建
                </button>
                <button
                  onClick={() => setShowNewForm(false)}
                  className="rounded-lg px-4 py-2 text-sm border transition-colors hover:bg-gray-50"
                  style={{ borderColor: 'var(--polaroid-border)', color: 'var(--polaroid-text-muted)' }}
                >
                  取消
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Settings List */}
      {settings.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20" style={{ color: 'var(--polaroid-text-muted)' }}>
          <SettingsIcon className="mb-3 h-12 w-12 opacity-30" />
          <p className="text-lg font-medium">暂无设置</p>
          <p className="mt-1 text-sm">点击"新增设置"开始添加</p>
        </div>
      ) : (
        <div className="space-y-3">
          {settings.map((setting) => (
            <div key={setting.key} className="rounded-xl border p-5" style={{ borderColor: 'var(--polaroid-border)', backgroundColor: 'var(--polaroid-white)' }}>
              <div className="space-y-3">
                {/* Key + Description */}
                <div className="flex items-start justify-between">
                  <div>
                    <code className="rounded-lg px-2 py-1 font-mono text-sm font-medium" style={{ backgroundColor: 'var(--polaroid-warm)', color: 'var(--polaroid-text)' }}>
                      {setting.key}
                    </code>
                    {setting.description && (
                      <p className="mt-1 text-xs" style={{ color: 'var(--polaroid-text-muted)' }}>{setting.description}</p>
                    )}
                  </div>
                  <button
                    onClick={() => handleDelete(setting.key)}
                    className="p-2 rounded-lg hover:bg-red-50 transition-colors"
                  >
                    <Trash2 className="h-4 w-4 text-red-400" />
                  </button>
                </div>

                {/* Value Editor */}
                <div className="flex items-center gap-2">
                  <input
                    value={editingValues[setting.key] ?? ''}
                    onChange={(e) =>
                      setEditingValues((v) => ({ ...v, [setting.key]: e.target.value }))
                    }
                    className="flex-1 rounded-lg border bg-white px-3 py-2 text-sm outline-none font-mono focus:border-[var(--amber-primary)]"
                    style={{ borderColor: 'var(--polaroid-border)' }}
                  />
                  <button
                    onClick={() => handleSave(setting.key)}
                    disabled={savingKey === setting.key || editingValues[setting.key] === setting.value}
                    className="flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm border transition-colors hover:bg-gray-50 disabled:opacity-50"
                    style={{ borderColor: 'var(--polaroid-border)', color: 'var(--polaroid-text-muted)' }}
                  >
                    {savingKey === setting.key ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Save className="h-4 w-4" />
                    )}
                    {savingKey === setting.key ? '保存中...' : '保存'}
                  </button>
                </div>

                {/* Updated At */}
                <p className="text-xs" style={{ color: 'var(--polaroid-text-muted)' }}>
                  最后更新: {new Date(setting.updated_at).toLocaleString('zh-CN')}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
