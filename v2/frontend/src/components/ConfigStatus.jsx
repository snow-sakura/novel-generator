import { useState, useEffect } from 'react'
import { AlertCircle, CheckCircle, Cpu, RefreshCw } from 'lucide-react'
import { checkConfig } from '../services/api'
import { useNovelStore } from '../stores/novelStore'
import { cn } from '../lib/utils'

export default function ConfigStatus() {
  const { configChecked, configOk, configInfo, setConfigStatus, customModel, generating } = useNovelStore()
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

  if (customModel && customModel.provider && customModel.model) {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50 rounded-lg text-xs text-emerald-700 border border-emerald-200/50">
        <CheckCircle className="w-3.5 h-3.5 flex-shrink-0" />
        <span>{customModel.provider === 'opencode' ? 'OpenCode' : customModel.provider}</span>
        <span className="text-gray-400 ml-1">({customModel.model})</span>
      </div>
    )
  }

  if (checking) {
    return (
      <div className="flex items-center gap-2 text-xs text-gray-400 bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-200/50">
        <RefreshCw className="w-3 h-3 animate-spin" />
        检测模型配置...
      </div>
    )
  }

  if (!configChecked) return null

  return (
    <div
      className={cn(
        'flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs border',
        configOk
          ? 'bg-emerald-50 text-emerald-700 border-emerald-200/50'
          : 'bg-red-50 text-red-600 border-red-200/50'
      )}
    >
      {configOk ? (
        <>
          <CheckCircle className="w-3.5 h-3.5 flex-shrink-0" />
          <span>{configInfo.provider}</span>
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
            className="ml-auto text-red-500 hover:text-red-700 underline flex-shrink-0 font-medium"
          >
            重试
          </button>
        </>
      )}
    </div>
  )
}