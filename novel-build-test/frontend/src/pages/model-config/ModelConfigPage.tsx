import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Edit2, Trash2, X, Cpu, Check, AlertCircle, Loader2 } from 'lucide-react'

interface Provider {
  id: number
  name: string
  type: string
  base_url: string
  status: 'active' | 'inactive'
  api_key_set: boolean
}

interface Model {
  id: number
  provider_id: number
  name: string
  display_name: string
  max_tokens: number
  input_price: number
  output_price: number
  status: 'active' | 'inactive'
}

const PROVIDER_TYPES = [
  { value: 'openai', label: 'OpenAI' },
  { value: 'anthropic', label: 'Anthropic' },
  { value: 'deepseek', label: 'DeepSeek' },
  { value: 'qwen', label: '通义千问' },
  { value: 'glm', label: 'GLM-4' },
  { value: 'moonshot', label: 'Moonshot' },
  { value: 'custom', label: '自定义' },
]

const MOCK_PROVIDERS: Provider[] = [
  { id: 1, name: 'DeepSeek', type: 'deepseek', base_url: 'https://api.deepseek.com/v1', status: 'active', api_key_set: true },
  { id: 2, name: '通义千问', type: 'qwen', base_url: 'https://dashscope.aliyuncs.com/compatible-mode/v1', status: 'active', api_key_set: true },
  { id: 3, name: 'GLM-4', type: 'glm', base_url: 'https://open.bigmodel.cn/api/paas/v4', status: 'active', api_key_set: true },
]

const MOCK_MODELS: Model[] = [
  { id: 1, provider_id: 1, name: 'deepseek-v4-flash', display_name: 'DeepSeek V4 Flash', max_tokens: 32768, input_price: 0.001, output_price: 0.002, status: 'active' },
  { id: 2, provider_id: 1, name: 'deepseek-v4-pro', display_name: 'DeepSeek V4 Pro', max_tokens: 32768, input_price: 0.002, output_price: 0.004, status: 'active' },
  { id: 3, provider_id: 2, name: 'qwen3-max', display_name: 'Qwen3 Max', max_tokens: 32768, input_price: 0.002, output_price: 0.006, status: 'active' },
  { id: 4, provider_id: 2, name: 'glm-5', display_name: 'GLM-5', max_tokens: 16384, input_price: 0.001, output_price: 0.002, status: 'active' },
]

const TIERS = [
  { id: 'L1', name: 'L1 - 轻量', models: ['deepseek-v4-flash'], desc: '简单任务、快速响应' },
  { id: 'L2', name: 'L2 - 标准', models: ['glm-5'], desc: '常规测试任务' },
  { id: 'L3', name: 'L3 - 专业', models: ['deepseek-v4-pro'], desc: '复杂分析、架构设计' },
  { id: 'L4', name: 'L4 - 高级', models: ['qwen3-max'], desc: '高精度需求' },
  { id: 'L5', name: 'L5 - 旗舰', models: ['qwen3-max'], desc: '最高质量输出' },
]

export default function ModelConfigPage() {
  const [activeTab, setActiveTab] = useState<'providers' | 'models' | 'tiers' | 'cost'>('providers')
  const [providers, setProviders] = useState<Provider[]>(MOCK_PROVIDERS)
  const [models, setModels] = useState<Model[]>(MOCK_MODELS)
  const [showDialog, setShowDialog] = useState(false)
  const [dialogType, setDialogType] = useState<'provider' | 'model'>('provider')
  const [editItem, setEditItem] = useState<Provider | Model | null>(null)
  const [providerForm, setProviderForm] = useState({ name: '', type: 'deepseek', base_url: '', api_key: '' })
  const [modelForm, setModelForm] = useState({ provider_id: '', name: '', display_name: '', max_tokens: '32768', input_price: '0.001', output_price: '0.002' })
  const [testingId, setTestingId] = useState<number | null>(null)

  const openCreateProvider = () => {
    setDialogType('provider')
    setEditItem(null)
    setProviderForm({ name: '', type: 'deepseek', base_url: '', api_key: '' })
    setShowDialog(true)
  }

  const openEditProvider = (p: Provider) => {
    setDialogType('provider')
    setEditItem(p)
    setProviderForm({ name: p.name, type: p.type, base_url: p.base_url, api_key: '' })
    setShowDialog(true)
  }

  const openCreateModel = () => {
    setDialogType('model')
    setEditItem(null)
    setModelForm({ provider_id: providers[0]?.id?.toString() || '', name: '', display_name: '', max_tokens: '32768', input_price: '0.001', output_price: '0.002' })
    setShowDialog(true)
  }

  const openEditModel = (m: Model) => {
    setDialogType('model')
    setEditItem(m)
    setModelForm({
      provider_id: m.provider_id.toString(),
      name: m.name,
      display_name: m.display_name,
      max_tokens: m.max_tokens.toString(),
      input_price: m.input_price.toString(),
      output_price: m.output_price.toString(),
    })
    setShowDialog(true)
  }

  const handleSave = () => {
    if (dialogType === 'provider') {
      if (editItem) {
        setProviders(prev => prev.map(p => p.id === (editItem as Provider).id ? { ...p, ...providerForm } as Provider : p))
      } else {
        setProviders(prev => [...prev, { id: Date.now(), ...providerForm, status: 'active', api_key_set: !!providerForm.api_key }])
      }
    } else {
      const newModel: Model = {
        id: Date.now(),
        provider_id: parseInt(modelForm.provider_id),
        name: modelForm.name,
        display_name: modelForm.display_name,
        max_tokens: parseInt(modelForm.max_tokens),
        input_price: parseFloat(modelForm.input_price),
        output_price: parseFloat(modelForm.output_price),
        status: 'active',
      }
      if (editItem) {
        setModels(prev => prev.map(m => m.id === (editItem as Model).id ? { ...newModel, id: editItem.id } : m))
      } else {
        setModels(prev => [...prev, newModel])
      }
    }
    setShowDialog(false)
  }

  const handleTest = async (id: number) => {
    setTestingId(id)
    setTimeout(() => {
      alert('连通性测试成功！')
      setTestingId(null)
    }, 1000)
  }

  const tabs = [
    { key: 'providers', label: 'Provider 管理' },
    { key: 'models', label: '模型列表' },
    { key: 'tiers', label: '分级策略' },
    { key: 'cost', label: '成本监控' },
  ]

  return (
    <div className="space-y-4">
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

      {/* Provider 管理 */}
      {activeTab === 'providers' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button onClick={openCreateProvider}
              className="flex items-center gap-2 rounded-lg px-4 py-2 text-sm text-white transition-opacity hover:opacity-90"
              style={{ backgroundColor: 'var(--amber-primary)' }}>
              <Plus className="h-4 w-4" /> 添加 Provider
            </button>
          </div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {providers.map((p) => (
              <motion.div key={p.id} whileHover={{ y: -2 }}
                className="rounded-xl border p-5 space-y-3" style={{ borderColor: 'var(--polaroid-border)', backgroundColor: 'var(--polaroid-white)' }}>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: 'rgba(37, 99, 235, 0.1)' }}>
                      <Cpu className="h-5 w-5 text-blue-500" />
                    </div>
                    <div>
                      <h3 className="font-medium" style={{ color: 'var(--polaroid-text)' }}>{p.name}</h3>
                      <p className="text-xs" style={{ color: 'var(--polaroid-text-muted)' }}>{p.type}</p>
                    </div>
                  </div>
                  <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${p.status === 'active' ? 'bg-green-50 text-green-600' : 'bg-gray-100 text-gray-500'}`}>
                    {p.api_key_set ? <Check className="h-3 w-3" /> : <AlertCircle className="h-3 w-3" />}
                    {p.api_key_set ? '已配置' : '未配置'}
                  </span>
                </div>
                <p className="text-xs truncate" style={{ color: 'var(--polaroid-text-muted)' }}>{p.base_url}</p>
                <div className="flex items-center gap-2 pt-2 border-t" style={{ borderColor: 'var(--polaroid-border)' }}>
                  <button onClick={() => handleTest(p.id)} disabled={testingId === p.id}
                    className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs border transition-colors hover:bg-gray-50 disabled:opacity-50"
                    style={{ borderColor: 'var(--polaroid-border)' }}>
                    {testingId === p.id ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
                    测试连接
                  </button>
                  <div className="flex-1" />
                  <button onClick={() => openEditProvider(p)} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
                    <Edit2 className="h-4 w-4" style={{ color: 'var(--polaroid-text-muted)' }} />
                  </button>
                  <button onClick={() => setProviders(prev => prev.filter(x => x.id !== p.id))} className="p-1.5 rounded-lg hover:bg-red-50 transition-colors">
                    <Trash2 className="h-4 w-4 text-red-400" />
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* 模型列表 */}
      {activeTab === 'models' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button onClick={openCreateModel}
              className="flex items-center gap-2 rounded-lg px-4 py-2 text-sm text-white transition-opacity hover:opacity-90"
              style={{ backgroundColor: 'var(--amber-primary)' }}>
              <Plus className="h-4 w-4" /> 添加模型
            </button>
          </div>
          <div className="rounded-xl border overflow-hidden" style={{ borderColor: 'var(--polaroid-border)' }}>
            <table className="w-full text-sm">
              <thead>
                <tr style={{ backgroundColor: 'var(--polaroid-warm)' }}>
                  <th className="px-4 py-3 text-left font-medium" style={{ color: 'var(--polaroid-text)' }}>模型名称</th>
                  <th className="px-4 py-3 text-left font-medium" style={{ color: 'var(--polaroid-text)' }}>Provider</th>
                  <th className="px-4 py-3 text-left font-medium" style={{ color: 'var(--polaroid-text)' }}>最大Token</th>
                  <th className="px-4 py-3 text-left font-medium" style={{ color: 'var(--polaroid-text)' }}>输入价格</th>
                  <th className="px-4 py-3 text-left font-medium" style={{ color: 'var(--polaroid-text)' }}>输出价格</th>
                  <th className="px-4 py-3 text-right font-medium" style={{ color: 'var(--polaroid-text)' }}>操作</th>
                </tr>
              </thead>
              <tbody>
                {models.map((m) => (
                  <tr key={m.id} className="border-t hover:bg-gray-50/50" style={{ borderColor: 'var(--polaroid-border)' }}>
                    <td className="px-4 py-3 font-medium" style={{ color: 'var(--polaroid-text)' }}>{m.display_name}</td>
                    <td className="px-4 py-3 text-sm" style={{ color: 'var(--polaroid-text-muted)' }}>
                      {providers.find(p => p.id === m.provider_id)?.name || '-'}
                    </td>
                    <td className="px-4 py-3 text-sm" style={{ color: 'var(--polaroid-text-muted)' }}>{m.max_tokens.toLocaleString()}</td>
                    <td className="px-4 py-3 text-sm" style={{ color: 'var(--polaroid-text-muted)' }}>¥{m.input_price}/1K</td>
                    <td className="px-4 py-3 text-sm" style={{ color: 'var(--polaroid-text-muted)' }}>¥{m.output_price}/1K</td>
                    <td className="px-4 py-3 text-right">
                      <button onClick={() => openEditModel(m)} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
                        <Edit2 className="h-4 w-4" style={{ color: 'var(--polaroid-text-muted)' }} />
                      </button>
                      <button onClick={() => setModels(prev => prev.filter(x => x.id !== m.id))} className="p-1.5 rounded-lg hover:bg-red-50 transition-colors">
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

      {/* 分级策略 */}
      {activeTab === 'tiers' && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {TIERS.map((tier) => (
            <div key={tier.id} className="rounded-xl border p-5" style={{ borderColor: 'var(--polaroid-border)', backgroundColor: 'var(--polaroid-white)' }}>
              <div className="flex items-center gap-3 mb-3">
                <div className="h-10 w-10 rounded-lg flex items-center justify-center text-white font-bold" style={{ backgroundColor: 'var(--amber-primary)' }}>
                  {tier.id}
                </div>
                <div>
                  <h3 className="font-medium" style={{ color: 'var(--polaroid-text)' }}>{tier.name}</h3>
                  <p className="text-xs" style={{ color: 'var(--polaroid-text-muted)' }}>{tier.desc}</p>
                </div>
              </div>
              <div className="space-y-1">
                {tier.models.map((model, i) => (
                  <span key={i} className="inline-block rounded-full bg-gray-100 px-2 py-0.5 text-xs mr-1" style={{ color: 'var(--polaroid-text-muted)' }}>
                    {model}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 成本监控 */}
      {activeTab === 'cost' && (
        <div className="grid gap-4 md:grid-cols-4">
          <div className="rounded-xl border p-5" style={{ borderColor: 'var(--polaroid-border)', backgroundColor: 'var(--polaroid-white)' }}>
            <p className="text-sm" style={{ color: 'var(--polaroid-text-muted)' }}>本月总费用</p>
            <p className="text-2xl font-bold mt-1" style={{ color: 'var(--polaroid-text)' }}>¥128.50</p>
          </div>
          <div className="rounded-xl border p-5" style={{ borderColor: 'var(--polaroid-border)', backgroundColor: 'var(--polaroid-white)' }}>
            <p className="text-sm" style={{ color: 'var(--polaroid-text-muted)' }}>本月Token数</p>
            <p className="text-2xl font-bold mt-1" style={{ color: 'var(--polaroid-text)' }}>2.5M</p>
          </div>
          <div className="rounded-xl border p-5" style={{ borderColor: 'var(--polaroid-border)', backgroundColor: 'var(--polaroid-white)' }}>
            <p className="text-sm" style={{ color: 'var(--polaroid-text-muted)' }}>调用次数</p>
            <p className="text-2xl font-bold mt-1" style={{ color: 'var(--polaroid-text)' }}>1,234</p>
          </div>
          <div className="rounded-xl border p-5" style={{ borderColor: 'var(--polaroid-border)', backgroundColor: 'var(--polaroid-white)' }}>
            <p className="text-sm" style={{ color: 'var(--polaroid-text-muted)' }}>日均费用</p>
            <p className="text-2xl font-bold mt-1" style={{ color: 'var(--polaroid-text)' }}>¥4.28</p>
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
                  {dialogType === 'provider' ? (editItem ? '编辑 Provider' : '添加 Provider') : (editItem ? '编辑模型' : '添加模型')}
                </h3>
                <button onClick={() => setShowDialog(false)} className="p-1 rounded-lg hover:bg-gray-100">
                  <X className="h-5 w-5" style={{ color: 'var(--polaroid-text-muted)' }} />
                </button>
              </div>

              {dialogType === 'provider' ? (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-1" style={{ color: 'var(--polaroid-text)' }}>名称</label>
                    <input value={providerForm.name} onChange={(e) => setProviderForm({ ...providerForm, name: e.target.value })}
                      className="w-full rounded-lg border bg-white px-3 py-2 text-sm outline-none"
                      style={{ borderColor: 'var(--polaroid-border)' }} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1" style={{ color: 'var(--polaroid-text)' }}>类型</label>
                    <select value={providerForm.type} onChange={(e) => setProviderForm({ ...providerForm, type: e.target.value })}
                      className="w-full rounded-lg border bg-white px-3 py-2 text-sm outline-none"
                      style={{ borderColor: 'var(--polaroid-border)' }}>
                      {PROVIDER_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1" style={{ color: 'var(--polaroid-text)' }}>Base URL</label>
                    <input value={providerForm.base_url} onChange={(e) => setProviderForm({ ...providerForm, base_url: e.target.value })}
                      className="w-full rounded-lg border bg-white px-3 py-2 text-sm outline-none font-mono"
                      style={{ borderColor: 'var(--polaroid-border)' }} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1" style={{ color: 'var(--polaroid-text)' }}>API Key</label>
                    <input type="password" value={providerForm.api_key} onChange={(e) => setProviderForm({ ...providerForm, api_key: e.target.value })}
                      placeholder={editItem ? '留空表示不修改' : ''}
                      className="w-full rounded-lg border bg-white px-3 py-2 text-sm outline-none"
                      style={{ borderColor: 'var(--polaroid-border)' }} />
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-1" style={{ color: 'var(--polaroid-text)' }}>Provider</label>
                    <select value={modelForm.provider_id} onChange={(e) => setModelForm({ ...modelForm, provider_id: e.target.value })}
                      className="w-full rounded-lg border bg-white px-3 py-2 text-sm outline-none"
                      style={{ borderColor: 'var(--polaroid-border)' }}>
                      {providers.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-1" style={{ color: 'var(--polaroid-text)' }}>模型ID</label>
                      <input value={modelForm.name} onChange={(e) => setModelForm({ ...modelForm, name: e.target.value })}
                        className="w-full rounded-lg border bg-white px-3 py-2 text-sm outline-none font-mono"
                        style={{ borderColor: 'var(--polaroid-border)' }} />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1" style={{ color: 'var(--polaroid-text)' }}>显示名称</label>
                      <input value={modelForm.display_name} onChange={(e) => setModelForm({ ...modelForm, display_name: e.target.value })}
                        className="w-full rounded-lg border bg-white px-3 py-2 text-sm outline-none"
                        style={{ borderColor: 'var(--polaroid-border)' }} />
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-1" style={{ color: 'var(--polaroid-text)' }}>最大Token</label>
                      <input value={modelForm.max_tokens} onChange={(e) => setModelForm({ ...modelForm, max_tokens: e.target.value })}
                        className="w-full rounded-lg border bg-white px-3 py-2 text-sm outline-none"
                        style={{ borderColor: 'var(--polaroid-border)' }} />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1" style={{ color: 'var(--polaroid-text)' }}>输入价格</label>
                      <input value={modelForm.input_price} onChange={(e) => setModelForm({ ...modelForm, input_price: e.target.value })}
                        className="w-full rounded-lg border bg-white px-3 py-2 text-sm outline-none"
                        style={{ borderColor: 'var(--polaroid-border)' }} />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1" style={{ color: 'var(--polaroid-text)' }}>输出价格</label>
                      <input value={modelForm.output_price} onChange={(e) => setModelForm({ ...modelForm, output_price: e.target.value })}
                        className="w-full rounded-lg border bg-white px-3 py-2 text-sm outline-none"
                        style={{ borderColor: 'var(--polaroid-border)' }} />
                    </div>
                  </div>
                </div>
              )}

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
