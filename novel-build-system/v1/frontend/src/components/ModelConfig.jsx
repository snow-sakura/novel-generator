import { useState, useEffect } from 'react'
import { Cpu, Key, Globe, CheckCircle, Eye, EyeOff, ChevronDown, Info } from 'lucide-react'
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
        label: prov.label,
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
        label: prov.label,
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
        label: prov.label,
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
      <div className="text-center py-12">
        <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-4">
          <Cpu className="w-8 h-8 text-gray-400" />
        </div>
        <p className="text-sm text-gray-500 mb-2">后端未提供模型列表</p>
        <p className="text-xs text-gray-400">请检查后端配置</p>
      </div>
    )
  }

  if (!selectedProvider) {
    return (
      <div className="space-y-4">
        {/* 默认配置提示 */}
        <div className="p-4 bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-xl">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center flex-shrink-0">
              <Info className="w-4 h-4 text-amber-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-amber-800">当前使用默认配置</p>
              <p className="text-xs text-amber-600 mt-1">模型信息来自后端 .env 文件，如需自定义请从下方选择厂商。</p>
            </div>
          </div>
        </div>

        {/* 厂商选择 */}
        <div>
          <label className="text-sm font-medium text-gray-700 mb-2 block">选择模型厂商</label>
          <div className="relative">
            <select value="" onChange={e => handleProviderChange(e.target.value)}
              disabled={generating}
              className="w-full px-4 py-3 pr-10 border border-gray-200 rounded-xl focus:border-orange-400 focus:ring-2 focus:ring-orange-100 outline-none bg-white text-sm appearance-none cursor-pointer hover:border-gray-300 transition-colors">
              <option value="" disabled>点击选择自定义模型...</option>
              {models.map(m => (
                <option key={m.provider} value={m.provider}>{m.label}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {/* 厂商选择 */}
      <div>
        <label className="text-sm font-medium text-gray-700 mb-2 block">模型厂商</label>
        <div className="relative">
          <select value={selectedProvider} onChange={e => handleProviderChange(e.target.value)}
            disabled={generating}
            className="w-full px-4 py-3 pr-10 border border-gray-200 rounded-xl focus:border-orange-400 focus:ring-2 focus:ring-orange-100 outline-none bg-white text-sm appearance-none cursor-pointer hover:border-gray-300 transition-colors">
            {models.map(m => (
              <option key={m.provider} value={m.provider}>{m.label}</option>
            ))}
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
        </div>
      </div>

      {/* 模型选择 */}
      {currentProvider && (
        <div>
          <label className="text-sm font-medium text-gray-700 mb-2 block">模型</label>
          <div className="relative">
            <select value={selectedModel} onChange={e => handleModelChange(e.target.value)}
              disabled={generating}
              className="w-full px-4 py-3 pr-10 border border-gray-200 rounded-xl focus:border-orange-400 focus:ring-2 focus:ring-orange-100 outline-none bg-white text-sm appearance-none cursor-pointer hover:border-gray-300 transition-colors">
              {currentProvider.models.map(m => (
                <option key={m.id} value={m.id}>{m.label}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          </div>
        </div>
      )}

      {/* API Key */}
      {currentProvider?.need_key && (
        <div>
          <label className="text-sm font-medium text-gray-700 flex items-center gap-2 mb-2">
            <Key className="w-4 h-4 text-gray-500" />
            API Key
          </label>
          <div className="flex gap-2">
            <div className="flex-1 relative">
              <input type={showKey ? 'text' : 'password'} value={apiKey}
                onChange={e => handleApiKeyChange(e.target.value)}
                disabled={generating}
                placeholder={`输入 ${currentProvider.label} 的 API Key...`}
                className="w-full px-4 py-3 pr-10 border border-gray-200 rounded-xl focus:border-orange-400 focus:ring-2 focus:ring-orange-100 outline-none text-sm" />
              <button type="button" onClick={() => setShowKey(!showKey)}
                aria-label={showKey ? '隐藏密钥' : '显示密钥'}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors">
                {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* API 地址 */}
      {currentProvider && (
        <div className="p-3 bg-gray-50 rounded-xl border border-gray-100">
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <Globe className="w-3.5 h-3.5 flex-shrink-0" />
            <span className="font-medium">API 地址：</span>
            <span className="text-gray-600 truncate">{currentProvider.base_url}</span>
          </div>
        </div>
      )}

      {/* 已选择状态 */}
      {selectedProvider && selectedModel && (
        <div className="p-3 bg-green-50 rounded-xl border border-green-100">
          <div className="flex items-center gap-2 text-sm text-green-700">
            <CheckCircle className="w-4 h-4 flex-shrink-0" />
            <span className="font-medium">已选择：{currentProvider?.label} — {selectedModel}</span>
          </div>
        </div>
      )}

      {/* 恢复默认按钮 */}
      <button onClick={handleUseDefault}
        className="w-full py-2.5 text-sm text-gray-500 hover:text-orange-500 border border-gray-200 hover:border-orange-200 rounded-xl transition-all">
        恢复默认配置（使用 .env）
      </button>
    </div>
  )
}
