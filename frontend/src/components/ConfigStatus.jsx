import { useState, useEffect } from 'react'
import { AlertCircle, CheckCircle, Cpu, RefreshCw } from 'lucide-react'
import { checkConfig } from '../services/api'
import { useNovelStore } from '../stores/novelStore'
import { cn } from '../lib/utils'

export default function ConfigStatus() {
  const { configChecked, configOk, configInfo, setConfigStatus, generating } = useNovelStore()
  const [checking, setChecking] = useState(false)

  useEffect(() => {
    if (!configChecked) {
      doCheck()
    }
  }, [])

  async function doCheck() {
    setChecking(true)
    const info = await checkConfig()
    setConfigStatus(true, info.configured, info)
    setChecking(false)
  }

  if (checking) {
    return (
      <div className="flex items-center gap-2 text-xs text-gray-400">
        <RefreshCw className="w-3 h-3 animate-spin" />
        检测模型配置...
      </div>
    )
  }

  if (!configChecked) return null

  return (
    <div
      className={cn(
        'flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs',
        configOk
          ? 'bg-green-50 text-green-700'
          : 'bg-red-50 text-red-600'
      )}
    >
      {configOk ? (
        <>
          <CheckCircle className="w-3.5 h-3.5 flex-shrink-0" />
          <span>
            {configInfo.provider === 'openai'
              ? 'OpenAI'
              : configInfo.provider === 'anthropic'
              ? 'Anthropic'
              : configInfo.provider === 'opencode'
              ? 'OpenCode'
              : configInfo.provider === 'ollama'
              ? 'Ollama'
              : configInfo.provider}{' '}
            已配置
          </span>
          {configInfo.model && (
            <span className="text-gray-400 ml-1">({configInfo.model})</span>
          )}
        </>
      ) : (
        <>
          <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
          <span className="truncate max-w-[240px]">{configInfo.error}</span>
          <button
            onClick={doCheck}
            disabled={generating}
            className="ml-auto text-red-500 hover:text-red-700 underline flex-shrink-0"
          >
            重试
          </button>
        </>
      )}
    </div>
  )
}
