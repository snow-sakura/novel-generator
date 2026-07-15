import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Trash2, X, Database, Shield, Server, BrainCircuit } from 'lucide-react'

interface DataSource {
  id: number
  name: string
  type: 'database' | 'csv' | 'api' | 'mock'
  config: Record<string, string>
  status: 'connected' | 'disconnected'
}

interface MaskingRule {
  id: number
  name: string
  field_pattern: string
  strategy: string
}

interface MockService {
  id: number
  name: string
  endpoint: string
  status: 'running' | 'stopped'
}

const MOCK_DATASOURCES: DataSource[] = [
  { id: 1, name: '测试数据库', type: 'database', config: { host: 'localhost', port: '3306', database: 'test_db' }, status: 'connected' },
  { id: 2, name: '用户数据CSV', type: 'csv', config: { file: '/data/users.csv' }, status: 'connected' },
]

const MOCK_MASKING: MaskingRule[] = [
  { id: 1, name: '手机号脱敏', field_pattern: 'phone', strategy: '中间4位替换为*' },
  { id: 2, name: '身份证脱敏', field_pattern: 'id_card', strategy: '保留前3后4位' },
  { id: 3, name: '邮箱脱敏', field_pattern: 'email', strategy: '用户名部分替换' },
]

const MOCK_MOCKS: MockService[] = [
  { id: 1, name: '用户服务Mock', endpoint: '/mock/users', status: 'running' },
  { id: 2, name: '订单服务Mock', endpoint: '/mock/orders', status: 'stopped' },
]

export default function TestDataConfigPage() {
  const [activeTab, setActiveTab] = useState<'sources' | 'masking' | 'mock' | 'ai-gen'>('sources')
  const [dataSources, setDataSources] = useState(MOCK_DATASOURCES)
  const [maskingRules, setMaskingRules] = useState(MOCK_MASKING)
  const [mockServices, setMockServices] = useState(MOCK_MOCKS)
  const [showDialog, setShowDialog] = useState(false)
  const [dialogType, setDialogType] = useState<'source' | 'masking' | 'mock'>('source')
  const [form, setForm] = useState<Record<string, string>>({})
  const [aiPrompt, setAiPrompt] = useState('')
  const [aiResult, setAiResult] = useState('')
  const [generating, setGenerating] = useState(false)

  const tabs = [
    { key: 'sources', label: '数据源管理', icon: Database },
    { key: 'masking', label: '数据脱敏', icon: Shield },
    { key: 'mock', label: 'Mock服务', icon: Server },
    { key: 'ai-gen', label: 'AI数据生成', icon: BrainCircuit },
  ]

  const openCreate = (type: 'source' | 'masking' | 'mock') => {
    setDialogType(type)
    setForm(type === 'source' ? { name: '', type: 'database', host: '', port: '', database: '' } :
           type === 'masking' ? { name: '', field_pattern: '', strategy: '' } :
           { name: '', endpoint: '' })
    setShowDialog(true)
  }

  const handleSave = () => {
    if (dialogType === 'source') {
      setDataSources(prev => [...prev, { id: Date.now(), name: form.name, type: form.type as DataSource['type'], config: { host: form.host, port: form.port, database: form.database }, status: 'disconnected' }])
    } else if (dialogType === 'masking') {
      setMaskingRules(prev => [...prev, { id: Date.now(), name: form.name, field_pattern: form.field_pattern, strategy: form.strategy }])
    } else {
      setMockServices(prev => [...prev, { id: Date.now(), name: form.name, endpoint: form.endpoint, status: 'stopped' }])
    }
    setShowDialog(false)
  }

  const handleAiGenerate = () => {
    if (!aiPrompt.trim()) return
    setGenerating(true)
    setTimeout(() => {
      setAiResult(`基于提示："${aiPrompt}"\n\n生成的测试数据：\n[\n  { "id": 1, "name": "张三", "phone": "138****8001", "email": "zhang***@example.com" },\n  { "id": 2, "name": "李四", "phone": "139****8002", "email": "li****@example.com" },\n  ...\n]\n\n[模拟输出 - 实际版本将调用真实 LLM]`)
      setGenerating(false)
    }, 2000)
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-1 p-1 rounded-lg" style={{ backgroundColor: 'var(--polaroid-warm)' }}>
        {tabs.map((t) => {
          const Icon = t.icon
          return (
            <button key={t.key} onClick={() => setActiveTab(t.key as typeof activeTab)}
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

      {/* 数据源管理 */}
      {activeTab === 'sources' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button onClick={() => openCreate('source')}
              className="flex items-center gap-2 rounded-lg px-4 py-2 text-sm text-white"
              style={{ backgroundColor: 'var(--amber-primary)' }}>
              <Plus className="h-4 w-4" /> 添加数据源
            </button>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {dataSources.map((ds) => (
              <div key={ds.id} className="rounded-xl border p-5" style={{ borderColor: 'var(--polaroid-border)', backgroundColor: 'var(--polaroid-white)' }}>
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg flex items-center justify-center bg-blue-50">
                      <Database className="h-5 w-5 text-blue-500" />
                    </div>
                    <div>
                      <h3 className="font-medium" style={{ color: 'var(--polaroid-text)' }}>{ds.name}</h3>
                      <p className="text-xs" style={{ color: 'var(--polaroid-text-muted)' }}>{ds.type}</p>
                    </div>
                  </div>
                  <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${ds.status === 'connected' ? 'bg-green-50 text-green-600' : 'bg-gray-100 text-gray-500'}`}>
                    {ds.status === 'connected' ? '已连接' : '未连接'}
                  </span>
                </div>
                <div className="text-xs space-y-1" style={{ color: 'var(--polaroid-text-muted)' }}>
                  {Object.entries(ds.config).map(([k, v]) => (
                    <div key={k}><span className="font-medium">{k}:</span> {v}</div>
                  ))}
                </div>
                <div className="flex gap-2 mt-3 pt-3 border-t" style={{ borderColor: 'var(--polaroid-border)' }}>
                  <button onClick={() => setDataSources(prev => prev.filter(x => x.id !== ds.id))}
                    className="p-1.5 rounded-lg hover:bg-red-50"><Trash2 className="h-4 w-4 text-red-400" /></button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 数据脱敏 */}
      {activeTab === 'masking' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button onClick={() => openCreate('masking')}
              className="flex items-center gap-2 rounded-lg px-4 py-2 text-sm text-white"
              style={{ backgroundColor: 'var(--amber-primary)' }}>
              <Plus className="h-4 w-4" /> 添加规则
            </button>
          </div>
          <div className="rounded-xl border overflow-hidden" style={{ borderColor: 'var(--polaroid-border)' }}>
            <table className="w-full text-sm">
              <thead>
                <tr style={{ backgroundColor: 'var(--polaroid-warm)' }}>
                  <th className="px-4 py-3 text-left font-medium" style={{ color: 'var(--polaroid-text)' }}>规则名称</th>
                  <th className="px-4 py-3 text-left font-medium" style={{ color: 'var(--polaroid-text)' }}>字段模式</th>
                  <th className="px-4 py-3 text-left font-medium" style={{ color: 'var(--polaroid-text)' }}>脱敏策略</th>
                  <th className="px-4 py-3 text-right font-medium" style={{ color: 'var(--polaroid-text)' }}>操作</th>
                </tr>
              </thead>
              <tbody>
                {maskingRules.map((rule) => (
                  <tr key={rule.id} className="border-t" style={{ borderColor: 'var(--polaroid-border)' }}>
                    <td className="px-4 py-3 font-medium" style={{ color: 'var(--polaroid-text)' }}>{rule.name}</td>
                    <td className="px-4 py-3"><code className="bg-gray-100 px-2 py-0.5 rounded text-xs">{rule.field_pattern}</code></td>
                    <td className="px-4 py-3 text-sm" style={{ color: 'var(--polaroid-text-muted)' }}>{rule.strategy}</td>
                    <td className="px-4 py-3 text-right">
                      <button onClick={() => setMaskingRules(prev => prev.filter(x => x.id !== rule.id))} className="p-1.5 rounded-lg hover:bg-red-50">
                        <Trash2 className="h-4 w-4 text-red-400" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Mock服务 */}
      {activeTab === 'mock' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button onClick={() => openCreate('mock')}
              className="flex items-center gap-2 rounded-lg px-4 py-2 text-sm text-white"
              style={{ backgroundColor: 'var(--amber-primary)' }}>
              <Plus className="h-4 w-4" /> 添加Mock
            </button>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {mockServices.map((mock) => (
              <div key={mock.id} className="rounded-xl border p-5" style={{ borderColor: 'var(--polaroid-border)', backgroundColor: 'var(--polaroid-white)' }}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg flex items-center justify-center bg-purple-50">
                      <Server className="h-5 w-5 text-purple-500" />
                    </div>
                    <div>
                      <h3 className="font-medium" style={{ color: 'var(--polaroid-text)' }}>{mock.name}</h3>
                      <p className="text-xs font-mono" style={{ color: 'var(--polaroid-text-muted)' }}>{mock.endpoint}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`h-2 w-2 rounded-full ${mock.status === 'running' ? 'bg-green-500' : 'bg-gray-400'}`} />
                    <button onClick={() => setMockServices(prev => prev.map(m => m.id === mock.id ? { ...m, status: m.status === 'running' ? 'stopped' : 'running' } : m))}
                      className="text-xs px-2 py-1 rounded border" style={{ borderColor: 'var(--polaroid-border)' }}>
                      {mock.status === 'running' ? '停止' : '启动'}
                    </button>
                    <button onClick={() => setMockServices(prev => prev.filter(x => x.id !== mock.id))} className="p-1.5 rounded-lg hover:bg-red-50">
                      <Trash2 className="h-4 w-4 text-red-400" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* AI数据生成 */}
      {activeTab === 'ai-gen' && (
        <div className="grid grid-cols-2 gap-6">
          <div className="space-y-4">
            <h3 className="font-medium" style={{ color: 'var(--polaroid-text)' }}>生成配置</h3>
            <div>
              <label className="block text-sm mb-1" style={{ color: 'var(--polaroid-text-muted)' }}>数据描述</label>
              <textarea value={aiPrompt} onChange={(e) => setAiPrompt(e.target.value)}
                placeholder="描述你需要的测试数据，如：生成10条用户数据，包含姓名、手机号、邮箱..."
                rows={6}
                className="w-full rounded-lg border bg-white px-3 py-2 text-sm outline-none resize-none"
                style={{ borderColor: 'var(--polaroid-border)' }} />
            </div>
            <button onClick={handleAiGenerate} disabled={generating}
              className="flex items-center gap-2 rounded-lg px-4 py-2 text-sm text-white disabled:opacity-50"
              style={{ backgroundColor: 'var(--amber-primary)' }}>
              <BrainCircuit className="h-4 w-4" />
              {generating ? '生成中...' : 'AI 生成'}
            </button>
          </div>
          <div className="space-y-4">
            <h3 className="font-medium" style={{ color: 'var(--polaroid-text)' }}>生成结果</h3>
            <div className="rounded-lg border bg-gray-50 p-4 min-h-[250px] font-mono text-sm"
              style={{ borderColor: 'var(--polaroid-border)', color: 'var(--polaroid-text)' }}>
              {aiResult || <span style={{ color: 'var(--polaroid-text-muted)' }}>等待生成...</span>}
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
                  {dialogType === 'source' ? '添加数据源' : dialogType === 'masking' ? '添加脱敏规则' : '添加Mock服务'}
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
                {dialogType === 'source' && (
                  <>
                    <div>
                      <label className="block text-sm font-medium mb-1" style={{ color: 'var(--polaroid-text)' }}>类型</label>
                      <select value={form.type || 'database'} onChange={(e) => setForm({ ...form, type: e.target.value })}
                        className="w-full rounded-lg border bg-white px-3 py-2 text-sm outline-none"
                        style={{ borderColor: 'var(--polaroid-border)' }}>
                        <option value="database">数据库</option>
                        <option value="csv">CSV文件</option>
                        <option value="api">API接口</option>
                        <option value="mock">Mock数据</option>
                      </select>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium mb-1" style={{ color: 'var(--polaroid-text)' }}>主机</label>
                        <input value={form.host || ''} onChange={(e) => setForm({ ...form, host: e.target.value })}
                          className="w-full rounded-lg border bg-white px-3 py-2 text-sm outline-none"
                          style={{ borderColor: 'var(--polaroid-border)' }} />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1" style={{ color: 'var(--polaroid-text)' }}>端口</label>
                        <input value={form.port || ''} onChange={(e) => setForm({ ...form, port: e.target.value })}
                          className="w-full rounded-lg border bg-white px-3 py-2 text-sm outline-none"
                          style={{ borderColor: 'var(--polaroid-border)' }} />
                      </div>
                    </div>
                  </>
                )}
                {dialogType === 'masking' && (
                  <>
                    <div>
                      <label className="block text-sm font-medium mb-1" style={{ color: 'var(--polaroid-text)' }}>字段模式</label>
                      <input value={form.field_pattern || ''} onChange={(e) => setForm({ ...form, field_pattern: e.target.value })}
                        placeholder="如：phone, email, id_card"
                        className="w-full rounded-lg border bg-white px-3 py-2 text-sm outline-none"
                        style={{ borderColor: 'var(--polaroid-border)' }} />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1" style={{ color: 'var(--polaroid-text)' }}>脱敏策略</label>
                      <input value={form.strategy || ''} onChange={(e) => setForm({ ...form, strategy: e.target.value })}
                        placeholder="如：中间4位替换为*"
                        className="w-full rounded-lg border bg-white px-3 py-2 text-sm outline-none"
                        style={{ borderColor: 'var(--polaroid-border)' }} />
                    </div>
                  </>
                )}
                {dialogType === 'mock' && (
                  <div>
                    <label className="block text-sm font-medium mb-1" style={{ color: 'var(--polaroid-text)' }}>Endpoint</label>
                    <input value={form.endpoint || ''} onChange={(e) => setForm({ ...form, endpoint: e.target.value })}
                      placeholder="/mock/api"
                      className="w-full rounded-lg border bg-white px-3 py-2 text-sm outline-none font-mono"
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
