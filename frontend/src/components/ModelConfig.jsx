import { useState } from 'react'
import { Cpu, Key, Globe, CheckCircle, ChevronDown, ChevronUp } from 'lucide-react'
import { useNovelStore } from '../stores/novelStore'
import { cn } from '../lib/utils'

const OPENCODE_DEFAULT = {
  provider: 'opencode',
  label: 'OpenCode（推荐）',
  base_url: 'https://opencode.ai/zen/v1',
  model: 'deepseek-v4-flash-free',
}

export default function ModelConfig({ models }) {
  const { customModel, setCustomModel, defaultApiKey, setDefaultApiKey, generating } = useNovelStore()
  const [useDefault, setUseDefault] = useState(customModel === null)
  const [showCustom, setShowCustom] = useState(customModel !== null)
  const [selectedProvider, setSelectedProvider] = useState('')
  const [selectedModel, setSelectedModel] = useState('')

  function handleProviderChange(provider) {
    setSelectedProvider(provider)
    setSelectedModel('')
    const prov = models.find(m => m.provider === provider)
    if (prov && prov.models.length > 0) {
      setSelectedModel(prov.models[0].id)
    }
  }

  function handleUseDefault() {
    setUseDefault(true)
    setShowCustom(false)
    setCustomModel(null)
  }

  function handleUseCustom() {
    setUseDefault(false)
    setShowCustom(true)
  }

  function handleApplyCustom() {
    const prov = models.find(m => m.provider === selectedProvider)
    if (!prov) return
    setCustomModel({
      provider: selectedProvider,
      base_url: prov.base_url,
      model: selectedModel,
      api_key: '',
    })
  }

  function handleClearCustom() {
    setCustomModel(null)
    setSelectedProvider('')
    setSelectedModel('')
    handleUseDefault()
  }

  return (
    <div className="space-y-3">
      {/* 默认 OpenCode */}
      <div className={cn(
        'rounded-lg border p-3 transition-all',
        useDefault ? 'border-orange-300 bg-orange-50' : 'border-gray-200 bg-white'
      )}>
        <label className="flex items-start gap-2 cursor-pointer">
          <input type="radio" name="modelMode" checked={useDefault}
            onChange={handleUseDefault} className="mt-0.5 accent-orange-500" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <Cpu className="w-3.5 h-3.5 text-orange-500" />
              <span className="text-sm font-medium text-gray-800">{OPENCODE_DEFAULT.label}</span>
              {useDefault && <CheckCircle className="w-3.5 h-3.5 text-green-500" />}
            </div>
            <p className="text-xs text-gray-400 mt-0.5">{OPENCODE_DEFAULT.model}</p>
          </div>
        </label>

        {useDefault && (
          <div className="mt-2 space-y-2">
            <div>
              <label className="text-xs text-gray-500 flex items-center gap-1 mb-1">
                <Key className="w-3 h-3" /> API Key
              </label>
              <input type="text" value={defaultApiKey}
                onChange={e => setDefaultApiKey(e.target.value)}
                placeholder="输入你的 OpenCode API Key..."
                className="w-full px-3 py-2 text-xs border border-gray-200 rounded-lg focus:border-orange-400 focus:ring-2 focus:ring-orange-100 outline-none" />
            </div>
            <div className="flex items-center gap-1 text-xs text-gray-400">
              <Globe className="w-3 h-3" />
              <span>{OPENCODE_DEFAULT.base_url}</span>
            </div>
          </div>
        )}
      </div>

      {/* 自定义模型 */}
      <div className={cn(
        'rounded-lg border p-3 transition-all',
        !useDefault ? 'border-orange-300 bg-orange-50' : 'border-gray-200 bg-white'
      )}>
        <div className="flex items-center justify-between">
          <label className="flex items-start gap-2 cursor-pointer flex-1 min-w-0">
            <input type="radio" name="modelMode" checked={!useDefault}
              onChange={handleUseCustom} className="mt-0.5 accent-orange-500" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <Cpu className="w-3.5 h-3.5 text-gray-500" />
                <span className="text-sm font-medium text-gray-800">自定义模型</span>
                {!useDefault && <CheckCircle className="w-3.5 h-3.5 text-green-500" />}
              </div>
              {customModel && (
                <p className="text-xs text-gray-500 mt-0.5 truncate">
                  {models.find(m => m.provider === customModel.provider)?.label || customModel.provider} ({customModel.model})
                </p>
              )}
            </div>
          </label>
          {!useDefault && customModel && (
            <button type="button" onClick={handleClearCustom}
              className="text-xs text-red-400 hover:text-red-600 flex-shrink-0 ml-2">清除</button>
          )}
        </div>

        {/* 自定义配置展开 */}
        {!useDefault && (
          <>
            <button type="button" onClick={() => setShowCustom(!showCustom)}
              className="flex items-center gap-1 text-xs text-gray-400 mt-2 hover:text-gray-600">
              {showCustom ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              {showCustom ? '收起配置' : '展开配置'}
            </button>

            {showCustom && !customModel && (
              <div className="mt-2 space-y-2 border-t border-gray-100 pt-2">
                <select value={selectedProvider} onChange={e => handleProviderChange(e.target.value)}
                  className="w-full text-xs p-2 border border-gray-200 rounded-lg focus:border-orange-400 outline-none">
                  <option value="">选择厂商...</option>
                  {models.map(m => <option key={m.provider} value={m.provider}>{m.label}</option>)}
                </select>

                {selectedProvider && (
                  <select value={selectedModel} onChange={e => setSelectedModel(e.target.value)}
                    className="w-full text-xs p-2 border border-gray-200 rounded-lg focus:border-orange-400 outline-none">
                    {models.find(m => m.provider === selectedProvider)?.models.map(mo => (
                      <option key={mo.id} value={mo.id}>{mo.label}</option>
                    ))}
                  </select>
                )}

                <div className="text-xs text-gray-400 flex items-center gap-1">
                  <Key className="w-3 h-3" /> API Key 在 .env 中配置
                </div>

                {selectedProvider && selectedModel && (
                  <button type="button" onClick={handleApplyCustom}
                    className="w-full py-1.5 text-xs bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors">
                    应用此模型
                  </button>
                )}
              </div>
            )}

            {customModel && (
              <div className="mt-2 text-xs text-gray-500 bg-green-50 p-2 rounded-lg border border-green-100">
                已配置自定义模型
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
