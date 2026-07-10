import { useState, useEffect } from 'react'
import { Cpu, Key, Globe, CheckCircle, Eye, EyeOff, RefreshCw } from 'lucide-react'
import { useNovelStore } from '../stores/novelStore'
import { cn } from '../lib/utils'

export default function ModelConfig({ models }) {
  const { customModel, setCustomModel, generating } = useNovelStore()

  const [selectedProvider, setSelectedProvider] = useState('')
  const [selectedModel, setSelectedModel] = useState('')
  const [apiKey, setApiKey] = useState('')
  const [showKey, setShowKey] = useState(false)

  useEffect(() => {
    if (models.length === 0) return
    if (customModel) {
      setSelectedProvider(customModel.provider || '')
      setSelectedModel(customModel.model || '')
      setApiKey(customModel.api_key || '')
    } else {
      setSelectedProvider('')
      setSelectedModel('')
      setApiKey('')
    }
  }, [models, customModel])

  function handleProviderChange(provider) {
    setSelectedProvider(provider)
    setApiKey('')
    const prov = models.find(m => m.provider === provider)
    if (prov && prov.models.length > 0) {
      const m = prov.models[0].id
      setSelectedModel(m)
      setCustomModel({
        provider,
        base_url: prov.base_url,
        model: m,
        api_key: '',
      })
    }
  }

  function handleModelChange(model) {
    setSelectedModel(model)
    const prov = models.find(m => m.provider === selectedProvider)
    if (prov) {
      setCustomModel({
        provider: selectedProvider,
        base_url: prov.base_url,
        model,
        api_key: apiKey,
      })
    }
  }

  function handleApiKeyChange(key) {
    setApiKey(key)
    const prov = models.find(m => m.provider === selectedProvider)
    if (prov && selectedModel) {
      setCustomModel({
        provider: selectedProvider,
        base_url: prov.base_url,
        model: selectedModel,
        api_key: key,
      })
    }
  }

  function handleUseDefault() {
    setSelectedProvider('')
    setSelectedModel('')
    setApiKey('')
    setCustomModel(null)
  }

  const currentProvider = models.find(m => m.provider === selectedProvider)

  if (models.length === 0) {
    return (
      <div className="text-xs text-gray-400 p-4 text-center bg-gray-50 rounded-lg border border-gray-200">
        后端未提供模型列表
      </div>
    )
  }

  if (!selectedProvider) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-1.5 text-xs text-gray-500 mb-1">
          <Cpu className="w-3.5 h-3.5" />
          国产大模型（OpenAI 兼容接口）
        </div>
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-700">
          当前使用后端 .env 默认模型配置。
        </div>
        <div>
          <label className="text-xs text-gray-500 mb-1.5 block font-medium">厂商</label>
          <select value="" onChange={e => handleProviderChange(e.target.value)}
            disabled={generating}
            className="w-full text-sm p-2.5 border border-gray-200 rounded-lg focus:border-orange-400 focus:ring-2 focus:ring-orange-100 outline-none bg-white">
            <option value="" disabled>选择自定义模型...</option>
            {models.map(m => (
              <option key={m.provider} value={m.provider}>{m.label}</option>
            ))}
          </select>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-1.5 text-xs text-gray-500 mb-1">
        <Cpu className="w-3.5 h-3.5" />
        国产大模型（OpenAI 兼容接口）
      </div>

      {/* 厂商选择 */}
      <div>
        <label className="text-xs text-gray-500 mb-1.5 block font-medium">厂商</label>
        <select value={selectedProvider} onChange={e => handleProviderChange(e.target.value)}
          disabled={generating}
          className="w-full text-sm p-2.5 border border-gray-200 rounded-lg focus:border-orange-400 focus:ring-2 focus:ring-orange-100 outline-none bg-white">
          {models.map(m => (
            <option key={m.provider} value={m.provider}>{m.label}</option>
          ))}
        </select>
      </div>

      {/* 模型选择 */}
      {currentProvider && (
        <div>
          <label className="text-xs text-gray-500 mb-1.5 block font-medium">模型</label>
          <select value={selectedModel} onChange={e => handleModelChange(e.target.value)}
            disabled={generating}
            className="w-full text-sm p-2.5 border border-gray-200 rounded-lg focus:border-orange-400 focus:ring-2 focus:ring-orange-100 outline-none bg-white">
            {currentProvider.models.map(m => (
              <option key={m.id} value={m.id}>{m.label}</option>
            ))}
          </select>
        </div>
      )}

      {/* API Key */}
      {currentProvider?.need_key && (
        <div>
          <label className="text-xs text-gray-500 flex items-center gap-1 mb-1.5 font-medium">
            <Key className="w-3 h-3" /> API Key
          </label>
          <div className="flex gap-2">
            <input type={showKey ? 'text' : 'password'} value={apiKey}
              onChange={e => handleApiKeyChange(e.target.value)}
              disabled={generating}
              placeholder={`输入 ${currentProvider.label} 的 API Key...`}
              className="flex-1 px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:border-orange-400 focus:ring-2 focus:ring-orange-100 outline-none" />
            <button type="button" onClick={() => setShowKey(!showKey)}
              className="px-3 py-2.5 text-xs text-gray-400 hover:text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
              {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>
      )}

      {/* API 地址 */}
      {currentProvider && (
        <div className="flex items-center gap-1.5 text-xs text-gray-400 bg-gray-50 p-2.5 rounded-lg border border-gray-100">
          <Globe className="w-3.5 h-3.5 flex-shrink-0" />
          <span className="truncate">{currentProvider.base_url}</span>
        </div>
      )}

      {/* 状态 */}
      {selectedProvider && selectedModel && (
        <div className="flex items-center gap-1.5 text-xs text-green-600 bg-green-50 p-2.5 rounded-lg border border-green-100">
          <CheckCircle className="w-3.5 h-3.5 flex-shrink-0" />
          已选择: {currentProvider?.label} — {selectedModel}
        </div>
      )}

      {/* 恢复默认 */}
      <button onClick={handleUseDefault}
        className="w-full text-xs text-gray-400 hover:text-orange-500 py-1.5 transition-colors text-center">
        恢复默认（使用 .env 配置）
      </button>
    </div>
  )
}
