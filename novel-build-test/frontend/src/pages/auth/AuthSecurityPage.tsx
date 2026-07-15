import { useState, useEffect } from 'react'
import { Trash2, Shield, User, ToggleLeft, Save, Loader2 } from 'lucide-react'
import { userApi, settingsApi } from '../../lib/api-service'
import type { UserItem, SettingItem } from '../../lib/api-service'

export default function AuthSecurityPage() {
  const [activeTab, setActiveTab] = useState<'users' | 'security'>('users')
  const [users, setUsers] = useState<UserItem[]>([])
  const [loadingUsers, setLoadingUsers] = useState(true)
  const [security, setSecurity] = useState<SettingItem[]>([])
  const [loadingSettings, setLoadingSettings] = useState(true)
  const [savingId, setSavingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const loadUsers = async () => {
      try {
        setLoadingUsers(true)
        setError(null)
        const res = await userApi.list({ page_size: 100 })
        setUsers(res.data.items)
      } catch (e) {
        console.error('Failed to load users', e)
        setError(e instanceof Error ? e.message : 'Failed to load users')
      } finally {
        setLoadingUsers(false)
      }
    }

    const loadSettings = async () => {
      try {
        setLoadingSettings(true)
        const res = await settingsApi.list()
        setSecurity(res.data)
      } catch (e) {
        console.error('Failed to load settings', e)
        setError(e instanceof Error ? e.message : 'Failed to load settings')
      } finally {
        setLoadingSettings(false)
      }
    }

    loadUsers()
    loadSettings()
  }, [])

  const tabs = [
    { key: 'users', label: '用户管理', icon: User },
    { key: 'security', label: '安全设置', icon: Shield },
  ]

  const handleDeleteUser = async (id: number) => {
    if (!window.confirm('确定删除该用户？此操作不可恢复。')) return
    try {
      await userApi.delete(id)
      setUsers(prev => prev.filter(u => u.id !== id))
    } catch {
      // silently fail
    }
  }

  const handleToggleStatus = async (user: UserItem) => {
    try {
      const res = await userApi.updateStatus(user.id, !user.is_active)
      setUsers(prev => prev.map(u => u.id === user.id ? res.data : u))
    } catch {
      // silently fail
    }
  }

  const handleSaveSetting = async (item: SettingItem, newValue: string) => {
    setSavingId(item.key)
    try {
      const res = await settingsApi.update(item.key, { value: newValue })
      setSecurity(prev => prev.map(s => s.key === item.key ? res.data : s))
    } catch {
      // silently fail
    } finally {
      setSavingId(null)
    }
  }

  const updateSettingLocally = (key: string, newValue: string) => {
    setSecurity(prev => prev.map(s => s.key === key ? { ...s, value: newValue } : s))
  }

  const isToggle = (item: SettingItem) => {
    return item.value === 'true' || item.value === 'false'
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
            <t.icon className="h-4 w-4" />
            {t.label}
          </button>
        ))}
      </div>

      {/* 用户管理 */}
      {activeTab === 'users' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm" style={{ color: 'var(--polaroid-text-muted)' }}>
              共 {users.length} 个用户
            </p>
          </div>
          {loadingUsers ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin" style={{ color: 'var(--amber-primary)' }} />
            </div>
          ) : (
          <div className="rounded-xl border overflow-hidden" style={{ borderColor: 'var(--polaroid-border)' }}>
            <table className="w-full text-sm">
              <thead>
                <tr style={{ backgroundColor: 'var(--polaroid-warm)' }}>
                  <th className="px-4 py-3 text-left font-medium" style={{ color: 'var(--polaroid-text)' }}>用户</th>
                  <th className="px-4 py-3 text-left font-medium" style={{ color: 'var(--polaroid-text)' }}>邮箱</th>
                  <th className="px-4 py-3 text-left font-medium" style={{ color: 'var(--polaroid-text)' }}>角色</th>
                  <th className="px-4 py-3 text-left font-medium" style={{ color: 'var(--polaroid-text)' }}>状态</th>
                  <th className="px-4 py-3 text-left font-medium" style={{ color: 'var(--polaroid-text)' }}>创建时间</th>
                  <th className="px-4 py-3 text-right font-medium" style={{ color: 'var(--polaroid-text)' }}>操作</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id} className="border-t hover:bg-gray-50/50" style={{ borderColor: 'var(--polaroid-border)' }}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold text-white"
                          style={{ backgroundColor: u.is_active ? 'var(--amber-primary)' : '#9CA3AF' }}>
                          {u.username.charAt(0).toUpperCase()}
                        </div>
                        <span className="font-medium" style={{ color: 'var(--polaroid-text)' }}>{u.username}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3" style={{ color: 'var(--polaroid-text-muted)' }}>{u.email}</td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium bg-blue-50 text-blue-600">
                        <Shield className="h-3 w-3" /> {u.role}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
                        u.is_active ? 'bg-green-50 text-green-600' : 'bg-gray-100 text-gray-500'
                      }`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${u.is_active ? 'bg-green-500' : 'bg-gray-400'}`} />
                        {u.is_active ? '启用' : '禁用'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs" style={{ color: 'var(--polaroid-text-muted)' }}>{u.created_at}</td>
                    <td className="px-4 py-3 text-right">
                      <button onClick={() => handleToggleStatus(u)} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors" title={u.is_active ? '禁用' : '启用'}>
                        <ToggleLeft className="h-4 w-4" style={{ color: 'var(--polaroid-text-muted)' }} />
                      </button>
                      <button onClick={() => handleDeleteUser(u.id)} className="p-1.5 rounded-lg hover:bg-red-50 transition-colors">
                        <Trash2 className="h-4 w-4 text-red-400" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          )}
        </div>
      )}

      {/* 安全设置 */}
      {activeTab === 'security' && (
        <div className="space-y-4">
          <p className="text-sm" style={{ color: 'var(--polaroid-text-muted)' }}>配置系统安全策略，包括密码策略、会话管理和访问控制</p>
          {loadingSettings ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin" style={{ color: 'var(--amber-primary)' }} />
            </div>
          ) : (
          <div className="grid gap-4">
            {security.map((item) => {
              const isTog = isToggle(item)
              const boolVal = item.value === 'true'
              return (
                <div key={item.key} className="rounded-xl border p-5" style={{ borderColor: 'var(--polaroid-border)', backgroundColor: 'var(--polaroid-white)' }}>
                  <div className="flex items-start gap-4">
                    <div className="h-10 w-10 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: 'rgba(245, 158, 11, 0.1)' }}>
                      <Shield className="h-5 w-5" style={{ color: 'var(--amber-primary)' }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-sm" style={{ color: 'var(--polaroid-text)' }}>{item.key}</h3>
                      <p className="text-xs mt-0.5" style={{ color: 'var(--polaroid-text-muted)' }}>{item.description}</p>
                    </div>
                  </div>
                  <div className="mt-4 flex items-center gap-3">
                    {isTog ? (
                      <button onClick={() => updateSettingLocally(item.key, boolVal ? 'false' : 'true')}
                        className="relative h-6 w-11 rounded-full transition-colors"
                        style={{ backgroundColor: boolVal ? 'var(--amber-primary)' : '#D1D5DB' }}>
                        <span className="absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform"
                          style={{ transform: boolVal ? 'translateX(20px)' : 'translateX(0)' }} />
                      </button>
                    ) : (
                      <input value={item.value} onChange={(e) => updateSettingLocally(item.key, e.target.value)}
                        className="flex-1 rounded-lg border bg-white px-3 py-2 text-sm outline-none font-mono focus:border-[var(--amber-primary)]"
                        style={{ borderColor: 'var(--polaroid-border)' }} />
                    )}
                    <div className="flex-1" />
                    <button onClick={() => handleSaveSetting(item, item.value)} disabled={savingId === item.key}
                      className="flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm border transition-colors hover:bg-gray-50 disabled:opacity-50"
                      style={{ borderColor: 'var(--polaroid-border)', color: 'var(--polaroid-text-muted)' }}>
                      {savingId === item.key ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                      {savingId === item.key ? '保存中...' : '保存'}
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
          )}
        </div>
      )}
    </div>
  )
}
