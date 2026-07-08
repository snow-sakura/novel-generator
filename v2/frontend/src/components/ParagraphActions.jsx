import { useState } from 'react'
import { RefreshCw, Expand, Minimize2, History } from 'lucide-react'
import { cn } from '../lib/utils'

const ACTION_CONFIG = {
  rewrite: { icon: RefreshCw, label: '重写', color: 'text-blue-600 hover:bg-blue-50' },
  expand: { icon: Expand, label: '扩写', color: 'text-green-600 hover:bg-green-50' },
  compress: { icon: Minimize2, label: '精简', color: 'text-orange-600 hover:bg-orange-50' },
}

export default function ParagraphActions({ onRefine, onViewHistory, disabled }) {
  const [loading, setLoading] = useState(null)

  async function handleClick(action) {
    if (disabled || loading) return
    setLoading(action)
    try {
      await onRefine(action)
    } finally {
      setLoading(null)
    }
  }

  return (
    <div className="flex items-center gap-1">
      {Object.entries(ACTION_CONFIG).map(([action, config]) => {
        const Icon = config.icon
        const isLoading = loading === action
        return (
          <button
            key={action}
            type="button"
            onClick={() => handleClick(action)}
            disabled={disabled || loading !== null}
            className={cn(
              'flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium transition-all',
              config.color,
              isLoading && 'opacity-50 cursor-wait',
              disabled && 'opacity-40 cursor-not-allowed'
            )}
            title={config.label}
          >
            <Icon className={cn('w-3.5 h-3.5', isLoading && 'animate-spin')} />
            {isLoading ? '处理中...' : config.label}
          </button>
        )
      })}
      <button
        type="button"
        onClick={onViewHistory}
        disabled={disabled}
        className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium text-gray-500 hover:bg-gray-50 transition-all ml-1"
        title="版本历史"
      >
        <History className="w-3.5 h-3.5" />
        历史
      </button>
    </div>
  )
}
