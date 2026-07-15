import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Trash2, X, Workflow, Bell, Plug } from 'lucide-react'

interface CicdConfig {
  id: number
  name: string
  type: string
  webhook_url: string
  status: 'active' | 'inactive'
}

interface NotifyChannel {
  id: number
  name: string
  type: string
  config: Record<string, string>
  status: 'active' | 'inactive'
}

interface ExternalTool {
  id: number
  name: string
  type: string
  config: Record<string, string>
  status: 'active' | 'inactive'
}

const MOCK_CICD: CicdConfig[] = [
  { id: 1, name: 'GitHub Actions', type: 'github', webhook_url: 'https://api.github.com/repos/...', status: 'active' },
  { id: 2, name: 'Jenkins', type: 'jenkins', webhook_url: 'https://jenkins.example.com/...', status: 'active' },
]

const MOCK_NOTIFY: NotifyChannel[] = [
  { id: 1, name: '邮件通知', type: 'email', config: { smtp: 'smtp.example.com' }, status: 'active' },
  { id: 2, name: '钉钉机器人', type: 'dingtalk', config: { webhook: 'https://oapi.dingtalk.com/...' }, status: 'active' },
]

const MOCK_TOOLS: ExternalTool[] = [
  { id: 1, name: 'Jira', type: 'jira', config: { url: 'https://jira.example.com' }, status: 'active' },
]

const CICD_TYPES = [
  { value: 'github', label: 'GitHub Actions' },
  { value: 'jenkins', label: 'Jenkins' },
  { value: 'gitlab', label: 'GitLab CI' },
]

const NOTIFY_TYPES = [
  { value: 'email', label: '邮件' },
  { value: 'dingtalk', label: '钉钉' },
  { value: 'feishu', label: '飞书' },
  { value: 'slack', label: 'Slack' },
]

const TOOL_TYPES = [
  { value: 'jira', label: 'Jira' },
  { value: 'zentao', label: '禅道' },
  { value: 'git', label: 'Git仓库' },
]

export default function IntegrationPage() {
  const [activeTab, setActiveTab] = useState<'cicd' | 'notify' | 'tools'>('cicd')
  const [cicdConfigs, setCicdConfigs] = useState(MOCK_CICD)
  const [notifyChannels, setNotifyChannels] = useState(MOCK_NOTIFY)
  const [externalTools, setExternalTools] = useState(MOCK_TOOLS)
  const [showDialog, setShowDialog] = useState(false)
  const [dialogType, setDialogType] = useState<'cicd' | 'notify' | 'tools'>('cicd')
  const [form, setForm] = useState<Record<string, string>>({})

  const tabs: { key: 'cicd' | 'notify' | 'tools'; label: string; icon: typeof Workflow }[] = [
    { key: 'cicd', label: 'CI/CD集成', icon: Workflow },
    { key: 'notify', label: '通知渠道', icon: Bell },
    { key: 'tools', label: '外部工具', icon: Plug },
  ]

  const openCreate = (type: 'cicd' | 'notify' | 'tools') => {
    setDialogType(type)
    setForm(type === 'cicd' ? { name: '', type: 'github', webhook_url: '' } :
           type === 'notify' ? { name: '', type: 'email', config_key: '' } :
           { name: '', type: 'jira', config_key: '' })
    setShowDialog(true)
  }

  const handleSave = () => {
    if (dialogType === 'cicd') {
      setCicdConfigs(prev => [...prev, { id: Date.now(), name: form.name, type: form.type, webhook_url: form.webhook_url, status: 'active' }])
    } else if (dialogType === 'notify') {
      setNotifyChannels(prev => [...prev, { id: Date.now(), name: form.name, type: form.type, config: { key: form.config_key }, status: 'active' }])
    } else {
      setExternalTools(prev => [...prev, { id: Date.now(), name: form.name, type: form.type, config: { url: form.config_key }, status: 'active' }])
    }
    setShowDialog(false)
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

      {/* CI/CD集成 */}
      {activeTab === 'cicd' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button onClick={() => openCreate('cicd')}
              className="flex items-center gap-2 rounded-lg px-4 py-2 text-sm text-white"
              style={{ backgroundColor: 'var(--amber-primary)' }}>
              <Plus className="h-4 w-4" /> 添加配置
            </button>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {cicdConfigs.map((config) => (
              <div key={config.id} className="rounded-xl border p-5" style={{ borderColor: 'var(--polaroid-border)', backgroundColor: 'var(--polaroid-white)' }}>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg flex items-center justify-center bg-green-50">
                      <Workflow className="h-5 w-5 text-green-500" />
                    </div>
                    <div>
                      <h3 className="font-medium" style={{ color: 'var(--polaroid-text)' }}>{config.name}</h3>
                      <p className="text-xs" style={{ color: 'var(--polaroid-text-muted)' }}>{config.type}</p>
                    </div>
                  </div>
                  <span className={`h-2 w-2 rounded-full ${config.status === 'active' ? 'bg-green-500' : 'bg-gray-400'}`} />
                </div>
                <p className="text-xs truncate mb-3" style={{ color: 'var(--polaroid-text-muted)' }}>{config.webhook_url}</p>
                <div className="flex gap-2 pt-3 border-t" style={{ borderColor: 'var(--polaroid-border)' }}>
                  <button onClick={() => setCicdConfigs(prev => prev.filter(x => x.id !== config.id))} className="p-1.5 rounded-lg hover:bg-red-50">
                    <Trash2 className="h-4 w-4 text-red-400" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 通知渠道 */}
      {activeTab === 'notify' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button onClick={() => openCreate('notify')}
              className="flex items-center gap-2 rounded-lg px-4 py-2 text-sm text-white"
              style={{ backgroundColor: 'var(--amber-primary)' }}>
              <Plus className="h-4 w-4" /> 添加渠道
            </button>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {notifyChannels.map((ch) => (
              <div key={ch.id} className="rounded-xl border p-5" style={{ borderColor: 'var(--polaroid-border)', backgroundColor: 'var(--polaroid-white)' }}>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg flex items-center justify-center bg-amber-50">
                      <Bell className="h-5 w-5 text-amber-500" />
                    </div>
                    <div>
                      <h3 className="font-medium" style={{ color: 'var(--polaroid-text)' }}>{ch.name}</h3>
                      <p className="text-xs" style={{ color: 'var(--polaroid-text-muted)' }}>{ch.type}</p>
                    </div>
                  </div>
                  <span className={`h-2 w-2 rounded-full ${ch.status === 'active' ? 'bg-green-500' : 'bg-gray-400'}`} />
                </div>
                <div className="flex gap-2 pt-3 border-t" style={{ borderColor: 'var(--polaroid-border)' }}>
                  <button className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs border" style={{ borderColor: 'var(--polaroid-border)' }}>
                    测试推送
                  </button>
                  <div className="flex-1" />
                  <button onClick={() => setNotifyChannels(prev => prev.filter(x => x.id !== ch.id))} className="p-1.5 rounded-lg hover:bg-red-50">
                    <Trash2 className="h-4 w-4 text-red-400" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 外部工具 */}
      {activeTab === 'tools' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button onClick={() => openCreate('tools')}
              className="flex items-center gap-2 rounded-lg px-4 py-2 text-sm text-white"
              style={{ backgroundColor: 'var(--amber-primary)' }}>
              <Plus className="h-4 w-4" /> 添加工具
            </button>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {externalTools.map((tool) => (
              <div key={tool.id} className="rounded-xl border p-5" style={{ borderColor: 'var(--polaroid-border)', backgroundColor: 'var(--polaroid-white)' }}>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg flex items-center justify-center bg-blue-50">
                      <Plug className="h-5 w-5 text-blue-500" />
                    </div>
                    <div>
                      <h3 className="font-medium" style={{ color: 'var(--polaroid-text)' }}>{tool.name}</h3>
                      <p className="text-xs" style={{ color: 'var(--polaroid-text-muted)' }}>{tool.type}</p>
                    </div>
                  </div>
                  <span className={`h-2 w-2 rounded-full ${tool.status === 'active' ? 'bg-green-500' : 'bg-gray-400'}`} />
                </div>
                <div className="flex gap-2 pt-3 border-t" style={{ borderColor: 'var(--polaroid-border)' }}>
                  <button onClick={() => setExternalTools(prev => prev.filter(x => x.id !== tool.id))} className="p-1.5 rounded-lg hover:bg-red-50">
                    <Trash2 className="h-4 w-4 text-red-400" />
                  </button>
                </div>
              </div>
            ))}
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
                  {dialogType === 'cicd' ? '添加CI/CD配置' : dialogType === 'notify' ? '添加通知渠道' : '添加外部工具'}
                </h3>
                <button onClick={() => setShowDialog(false)} className="p-1 rounded-lg hover:bg-gray-100">
                  <X className="h-5 w-5" style={{ color: 'var(--polaroid-text-muted)' }} />
                </button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: 'var(--polaroid-text)' }}>名称</label>
                  <input value={form.name || ''} onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="w-full rounded-lg border bg-white px-3 py-2 text-sm outline-none"
                    style={{ borderColor: 'var(--polaroid-border)' }} />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: 'var(--polaroid-text)' }}>类型</label>
                  <select value={form.type || ''} onChange={(e) => setForm({ ...form, type: e.target.value })}
                    className="w-full rounded-lg border bg-white px-3 py-2 text-sm outline-none"
                    style={{ borderColor: 'var(--polaroid-border)' }}>
                    {(dialogType === 'cicd' ? CICD_TYPES : dialogType === 'notify' ? NOTIFY_TYPES : TOOL_TYPES).map(t => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: 'var(--polaroid-text)' }}>
                    {dialogType === 'cicd' ? 'Webhook URL' : '配置'}
                  </label>
                  <input value={form.config_key || form.webhook_url || ''} onChange={(e) => setForm({ ...form, webhook_url: e.target.value, config_key: e.target.value })}
                    className="w-full rounded-lg border bg-white px-3 py-2 text-sm outline-none"
                    style={{ borderColor: 'var(--polaroid-border)' }} />
                </div>
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
