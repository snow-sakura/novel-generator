"use client"

import { useEffect, useState } from "react"
import { settingsApi, type SettingItem } from "@/lib/api-service"
import PolaroidCard from "@/components/polaroid/PolaroidCard"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Save, Plus, Trash2, Settings as SettingsIcon } from "lucide-react"

export default function SettingsPage() {
  const [settings, setSettings] = useState<SettingItem[]>([])
  const [loading, setLoading] = useState(true)
  const [editingValues, setEditingValues] = useState<Record<string, string>>({})
  const [showNewForm, setShowNewForm] = useState(false)
  const [newKey, setNewKey] = useState("")
  const [newValue, setNewValue] = useState("")
  const [newDesc, setNewDesc] = useState("")
  const [savingKey, setSavingKey] = useState<string | null>(null)

  const fetchSettings = async () => {
    setLoading(true)
    try {
      const res = await settingsApi.list()
      const data = res.data
      setSettings(data)
      // 初始化编辑值
      const values: Record<string, string> = {}
      for (const s of data) {
        values[s.key] = s.value
      }
      setEditingValues(values)
    } catch (err) {
      console.error("Failed to fetch settings:", err)
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
      // 刷新列表
      await fetchSettings()
    } catch (err) {
      console.error("Failed to save setting:", err)
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
      console.error("Failed to delete setting:", err)
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
      setNewKey("")
      setNewValue("")
      setNewDesc("")
      setShowNewForm(false)
      await fetchSettings()
    } catch (err) {
      console.error("Failed to create setting:", err)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-amber-200 border-t-amber-500" />
      </div>
    )
  }

  return (
    <div className="animate-fade-in space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-serif text-3xl font-bold tracking-tight text-stone-800">
            系统设置
          </h1>
          <p className="mt-1 text-sm text-stone-500">管理系统配置项（键值对存储）</p>
        </div>
        <Button
          onClick={() => setShowNewForm(!showNewForm)}
          className="bg-amber-500 text-white shadow-md hover:bg-amber-600"
        >
          <Plus className="mr-1.5 h-4 w-4" />
          新增设置
        </Button>
      </div>

      {/* New Setting Form */}
      {showNewForm && (
        <PolaroidCard className="max-w-xl">
          <div className="space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-stone-700">
                键名 <span className="text-red-500">*</span>
              </label>
              <Input
                value={newKey}
                onChange={(e) => setNewKey(e.target.value)}
                placeholder="例如: llm.default_model"
                className="border-stone-200 bg-white font-mono text-sm text-stone-700"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-stone-700">
                值 <span className="text-red-500">*</span>
              </label>
              <Input
                value={newValue}
                onChange={(e) => setNewValue(e.target.value)}
                placeholder="设置值"
                className="border-stone-200 bg-white text-stone-700"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-stone-700">说明</label>
              <Input
                value={newDesc}
                onChange={(e) => setNewDesc(e.target.value)}
                placeholder="可选：设置说明"
                className="border-stone-200 bg-white text-stone-700"
              />
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={handleCreate}
                disabled={!newKey.trim() || !newValue.trim()}
                className="bg-amber-500 text-white hover:bg-amber-600"
              >
                <Save className="mr-1.5 h-4 w-4" />
                创建
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowNewForm(false)}
                className="border-stone-200 text-stone-600"
              >
                取消
              </Button>
            </div>
          </div>
        </PolaroidCard>
      )}

      {/* Settings List */}
      {settings.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-stone-400">
          <SettingsIcon className="mb-3 h-12 w-12" />
          <p className="text-lg font-medium">暂无设置</p>
          <p className="mt-1 text-sm">点击"新增设置"开始添加</p>
        </div>
      ) : (
        <div className="space-y-3">
          {settings.map((setting) => (
            <PolaroidCard key={setting.key} className="w-full">
              <div className="space-y-3">
                {/* Key + Description */}
                <div className="flex items-start justify-between">
                  <div>
                    <code className="rounded bg-stone-100 px-2 py-0.5 font-mono text-sm font-medium text-stone-800">
                      {setting.key}
                    </code>
                    {setting.description && (
                      <p className="mt-1 text-xs text-stone-500">{setting.description}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(setting.key)}
                      className="h-8 text-red-400 hover:text-red-600"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {/* Value Editor */}
                <div className="flex items-center gap-2">
                  <Input
                    value={editingValues[setting.key] ?? ""}
                    onChange={(e) =>
                      setEditingValues((v) => ({ ...v, [setting.key]: e.target.value }))
                    }
                    className="flex-1 border-stone-200 bg-white font-mono text-sm text-stone-700"
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleSave(setting.key)}
                    disabled={savingKey === setting.key}
                    className="border-stone-200 text-stone-600"
                  >
                    <Save className={`mr-1.5 h-4 w-4 ${savingKey === setting.key ? "animate-spin" : ""}`} />
                    {savingKey === setting.key ? "保存中..." : "保存"}
                  </Button>
                </div>

                {/* Updated At */}
                <p className="text-xs text-stone-400">
                  最后更新: {new Date(setting.updated_at).toLocaleString("zh-CN")}
                </p>
              </div>
            </PolaroidCard>
          ))}
        </div>
      )}
    </div>
  )
}
