import { useState } from 'react'
import { Cpu, Key, Globe, CheckCircle } from 'lucide-react'
import { useNovelStore } from '../stores/novelStore'

export default function ModelConfig({ models }) {
  const { customModel, setCustomModel, generating } = useNovelStore()
  const [expanded, setExpanded] = useState(customModel !== null)
  const [selectedProvider, setSelectedProvider] = useState('')
  const [selectedModel, setSelectedModel] = useState('')

  if (!models || models.length === 0) {
    return (
      <div className="text-xs text-gray-400">
        加载模型列表失败，请确保后端已启动
      </div>
    )
  }

  function handleProviderChange(provider) {
    setSelectedProvider(provider)
    setSelectedModel('')
    const prov = models.find(m => m.provider === provider)
    if (prov && prov.models.length > 0) {
      setSelectedModel(prov.models[0].id)
    }
  }

  function handleApply() {
    const prov = models.find(m => m.provider === selectedProvider)
    if (!prov) return
    setCustomModel({
      provider: selectedProvider,
      base_url: prov.base_url,
      model: selectedModel,
      api_key: '',
    })
  }

  function handleClear() {
    setCustomModel(null)
    setSelectedProvider('')
    setSelectedModel('')
  }

  const isConfigured = customModel !== null

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-xs text-gray-500 flex items-center gap-1">
          <Cpu className="w-3 h-3" /> 自定义模型
          {isConfigured && <CheckCircle className="w-3 h-3 text-green-500" />}
        </label>
        {isConfigured ? (
          <button type="button" onClick={handleClear} disabled={generating}
            className="text-xs text-red-400 hover:text-red-600">清除配置</button>
        ) : (
          <button type="button" onClick={() => setExpanded(!expanded)}
            className="text-xs text-orange-400 hover:text-orange-600">{expanded ? '收起' : '配置'}</button>
        )}
      </div>

      {isConfigured && (
        <div className="text-xs text-gray-500 bg-green-50 p-2 rounded-lg border border-green-100">
          已配置：{models.find(m => m.provider === customModel.provider)?.label || customModel.provider}
          ({customModel.model})
        </div>
      )}

      {expanded && !isConfigured && (
        <div className="space-y-2 p-2 bg-white border rounded-lg">
          {/* 厂商选择 */}
          <select value={selectedProvider} onChange={e => handleProviderChange(e.target.value)}
            className="w-full text-xs p-2 border rounded-lg">
            <option value="">选择厂商...</option>
            {models.map(m => <option key={m.provider} value={m.provider}>{m.label}</option>)}
          </select>

          {/* 模型选择 */}
          {selectedProvider && (
            <select value={selectedModel} onChange={e => setSelectedModel(e.target.value)}
              className="w-full text-xs p-2 border rounded-lg">
              {models.find(m => m.provider === selectedProvider)?.models.map(mo => (
                <option key={mo.id} value={mo.id}>{mo.label}</option>
              ))}
            </select>
          )}

          {/* API Key */}
          <div className="flex items-center gap-1 text-xs text-gray-400">
            <Key className="w-3 h-3" />
            <span>API Key 在 .env 中配置</span>
          </div>

          {/* 应用按钮 */}
          {selectedProvider && selectedModel && (
            <button type="button" onClick={handleApply}
              className="w-full py-1.5 text-xs bg-orange-500 text-white rounded-lg hover:bg-orange-600">
              应用此模型
            </button>
          )}
        </div>
      )}
    </div>
  )
}
