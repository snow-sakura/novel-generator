import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Trash2, X, MessageSquare, Globe, Shield, Send } from 'lucide-react'

interface Channel {
  id: number
  name: string
  platform: string
  status: 'active' | 'inactive'
  config: Record<string, string>
}

interface Permission {
  id: number
  request_type: string
  status: 'pending' | 'approved' | 'denied'
  created_at: string
}

const PLATFORMS = [
  { value: 'telegram', label: 'Telegram', color: 'bg-blue-50 text-blue-600' },
  { value: 'discord', label: 'Discord', color: 'bg-indigo-50 text-indigo-600' },
  { value: 'slack', label: 'Slack', color: 'bg-green-50 text-green-600' },
  { value: 'custom', label: '自定义', color: 'bg-gray-100 text-gray-500' },
]

const MOCK_CHANNELS: Channel[] = [
  { id: 1, name: '测试通知群', platform: 'telegram', status: 'active', config: { bot_token: '***', chat_id: '123456' } },
  { id: 2, name: '开发团队', platform: 'discord', status: 'active', config: { webhook_url: 'https://discord.com/api/webhooks/...' } },
]

const MOCK_PERMISSIONS: Permission[] = [
  { id: 1, request_type: 'execute_browser', status: 'pending', created_at: '2026-07-14 10:30' },
  { id: 2, request_type: 'send_message', status: 'approved', created_at: '2026-07-14 09:15' },
]

export default function HermesConfigPage() {
  const [activeTab, setActiveTab] = useState<'channels' | 'conversations' | 'permissions'>('channels')
  const [channels, setChannels] = useState<Channel[]>(MOCK_CHANNELS)
  const [permissions, setPermissions] = useState<Permission[]>(MOCK_PERMISSIONS)
  const [showDialog, setShowDialog] = useState(false)
  const [form, setForm] = useState({ name: '', platform: 'telegram', bot_token: '', chat_id: '', webhook_url: '' })

  const tabs: { key: 'channels' | 'conversations' | 'permissions'; label: string; icon: typeof Globe }[] = [
    { key: 'channels', label: '通道管理', icon: Globe },
    { key: 'conversations', label: '会话管理', icon: MessageSquare },
    { key: 'permissions', label: '权限审批', icon: Shield },
  ]

  const handleSave = () => {
    setChannels(prev => [...prev, { id: Date.now(), name: form.name, platform: form.platform, status: 'active', config: { bot_token: form.bot_token, chat_id: form.chat_id, webhook_url: form.webhook_url } }])
    setShowDialog(false)
  }

  const handlePermission = (id: number, status: 'approved' | 'denied') => {
    setPermissions(prev => prev.map(p => p.id === id ? { ...p, status } : p))
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-1 p-1 rounded-lg" style={{ backgroundColor: 'var(--polaroid-warm)' }}>
        {tabs.map((t) => {
          const Icon = t.icon
          return (
            <button key={t.key} onClick={() => setActiveTab(t.key)}
              className="flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all"
              style={{
                backgroundColor: activeTab === t.key ? 'var(--polaroid-white)' : 'transparent',
                color: activeTab === t.key ? 'var(--amber-primary)' : 'var(--polaroid-text-muted)',
                boxShadow: activeTab === t.key ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
              }}>
              <Icon className="h-4 w-4" />
              {t.label}
            </button>
          )
        })}
      </div>

      {/* 通道管理 */}
      {activeTab === 'channels' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button onClick={() => setShowDialog(true)}
              className="flex items-center gap-2 rounded-lg px-4 py-2 text-sm text-white"
              style={{ backgroundColor: 'var(--amber-primary)' }}>
              <Plus className="h-4 w-4" /> 添加通道
            </button>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {channels.map((ch) => (
              <div key={ch.id} className="rounded-xl border p-5" style={{ borderColor: 'var(--polaroid-border)', backgroundColor: 'var(--polaroid-white)' }}>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: 'rgba(13, 148, 136, 0.1)' }}>
                      <Globe className="h-5 w-5 text-teal-500" />
                    </div>
                    <div>
                      <h3 className="font-medium" style={{ color: 'var(--polaroid-text)' }}>{ch.name}</h3>
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${PLATFORMS.find(p => p.value === ch.platform)?.color || ''}`}>
                        {PLATFORMS.find(p => p.value === ch.platform)?.label || ch.platform}
                      </span>
                    </div>
                  </div>
                  <span className={`h-2 w-2 rounded-full ${ch.status === 'active' ? 'bg-green-500' : 'bg-gray-400'}`} />
                </div>
                <div className="text-xs space-y-1 mb-3" style={{ color: 'var(--polaroid-text-muted)' }}>
                  {Object.entries(ch.config).map(([k, v]) => (
                    <div key={k}><span className="font-medium">{k}:</span> {v.substring(0, 30)}...</div>
                  ))}
                </div>
                <div className="flex gap-2 pt-3 border-t" style={{ borderColor: 'var(--polaroid-border)' }}>
                  <button className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs border" style={{ borderColor: 'var(--polaroid-border)' }}>
                    <Send className="h-3 w-3" /> 测试
                  </button>
                  <div className="flex-1" />
                  <button onClick={() => setChannels(prev => prev.filter(x => x.id !== ch.id))} className="p-1.5 rounded-lg hover:bg-red-50">
                    <Trash2 className="h-4 w-4 text-red-400" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 会话管理 */}
      {activeTab === 'conversations' && (
        <div className="rounded-xl border p-8 text-center" style={{ borderColor: 'var(--polaroid-border)', backgroundColor: 'var(--polaroid-white)' }}>
          <MessageSquare className="h-12 w-12 mx-auto mb-3 opacity-30" style={{ color: 'var(--polaroid-text-muted)' }} />
          <p className="text-lg font-medium" style={{ color: 'var(--polaroid-text)' }}>会话管理</p>
          <p className="text-sm mt-1" style={{ color: 'var(--polaroid-text-muted)' }}>实时查看和管理活跃对话会话</p>
          <p className="text-xs mt-4" style={{ color: 'var(--polaroid-text-muted)' }}>需要连接Hermes服务后使用</p>
        </div>
      )}

      {/* 权限审批 */}
      {activeTab === 'permissions' && (
        <div className="rounded-xl border overflow-hidden" style={{ borderColor: 'var(--polaroid-border)' }}>
          <table className="w-full text-sm">
            <thead>
              <tr style={{ backgroundColor: 'var(--polaroid-warm)' }}>
                <th className="px-4 py-3 text-left font-medium" style={{ color: 'var(--polaroid-text)' }}>请求类型</th>
                <th className="px-4 py-3 text-left font-medium" style={{ color: 'var(--polaroid-text)' }}>状态</th>
                <th className="px-4 py-3 text-left font-medium" style={{ color: 'var(--polaroid-text)' }}>时间</th>
                <th className="px-4 py-3 text-right font-medium" style={{ color: 'var(--polaroid-text)' }}>操作</th>
              </tr>
            </thead>
            <tbody>
              {permissions.map((p) => (
                <tr key={p.id} className="border-t" style={{ borderColor: 'var(--polaroid-border)' }}>
                  <td className="px-4 py-3 font-medium" style={{ color: 'var(--polaroid-text)' }}>{p.request_type}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                      p.status === 'pending' ? 'bg-yellow-50 text-yellow-600' :
                      p.status === 'approved' ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'
                    }`}>
                      {p.status === 'pending' ? '待审批' : p.status === 'approved' ? '已批准' : '已拒绝'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs" style={{ color: 'var(--polaroid-text-muted)' }}>{p.created_at}</td>
                  <td className="px-4 py-3 text-right">
                    {p.status === 'pending' && (
                      <div className="flex gap-1 justify-end">
                        <button onClick={() => handlePermission(p.id, 'approved')} className="px-2 py-1 text-xs rounded bg-green-50 text-green-600 hover:bg-green-100">批准</button>
                        <button onClick={() => handlePermission(p.id, 'denied')} className="px-2 py-1 text-xs rounded bg-red-50 text-red-600 hover:bg-red-100">拒绝</button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* 添加通道弹窗 */}
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
                <h3 className="text-lg font-semibold" style={{ color: 'var(--polaroid-text)' }}>添加通道</h3>
                <button onClick={() => setShowDialog(false)} className="p-1 rounded-lg hover:bg-gray-100">
                  <X className="h-5 w-5" style={{ color: 'var(--polaroid-text-muted)' }} />
                </button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: 'var(--polaroid-text)' }}>通道名称</label>
                  <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="w-full rounded-lg border bg-white px-3 py-2 text-sm outline-none"
                    style={{ borderColor: 'var(--polaroid-border)' }} />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: 'var(--polaroid-text)' }}>平台</label>
                  <select value={form.platform} onChange={(e) => setForm({ ...form, platform: e.target.value })}
                    className="w-full rounded-lg border bg-white px-3 py-2 text-sm outline-none"
                    style={{ borderColor: 'var(--polaroid-border)' }}>
                    {PLATFORMS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                  </select>
                </div>
                {form.platform === 'telegram' && (
                  <>
                    <div>
                      <label className="block text-sm font-medium mb-1" style={{ color: 'var(--polaroid-text)' }}>Bot Token</label>
                      <input value={form.bot_token} onChange={(e) => setForm({ ...form, bot_token: e.target.value })}
                        className="w-full rounded-lg border bg-white px-3 py-2 text-sm outline-none"
                        style={{ borderColor: 'var(--polaroid-border)' }} />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1" style={{ color: 'var(--polaroid-text)' }}>Chat ID</label>
                      <input value={form.chat_id} onChange={(e) => setForm({ ...form, chat_id: e.target.value })}
                        className="w-full rounded-lg border bg-white px-3 py-2 text-sm outline-none"
                        style={{ borderColor: 'var(--polaroid-border)' }} />
                    </div>
                  </>
                )}
                {(form.platform === 'discord' || form.platform === 'slack') && (
                  <div>
                    <label className="block text-sm font-medium mb-1" style={{ color: 'var(--polaroid-text)' }}>Webhook URL</label>
                    <input value={form.webhook_url} onChange={(e) => setForm({ ...form, webhook_url: e.target.value })}
                      className="w-full rounded-lg border bg-white px-3 py-2 text-sm outline-none"
                      style={{ borderColor: 'var(--polaroid-border)' }} />
                  </div>
                )}
              </div>
              <div className="flex justify-end gap-2 mt-6">
                <button onClick={() => setShowDialog(false)}
                  className="rounded-lg px-4 py-2 text-sm border transition-colors hover:bg-gray-50"
                  style={{ borderColor: 'var(--polaroid-border)', color: 'var(--polaroid-text-muted)' }}>取消</button>
                <button onClick={handleSave}
                  className="rounded-lg px-4 py-2 text-sm text-white transition-opacity hover:opacity-90"
                  style={{ backgroundColor: 'var(--amber-primary)' }}>保存</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
