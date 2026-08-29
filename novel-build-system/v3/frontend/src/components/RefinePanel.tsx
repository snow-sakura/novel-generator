import { useState } from 'react'
import { X, RotateCcw, Clock, RefreshCw, Expand, Minimize2 } from 'lucide-react'
import { cn } from '../lib/utils'

const ACTION_LABELS = {
  rewrite: { label: '重写', icon: RefreshCw, color: 'text-blue-600 bg-blue-50' },
  expand: { label: '扩写', icon: Expand, color: 'text-green-600 bg-green-50' },
  compress: { label: '精简', icon: Minimize2, color: 'text-orange-600 bg-orange-50' },
}

export default function RefinePanel({ versions, onSelect, onClose }) {
  const [selectedVersion, setSelectedVersion] = useState(null)

  if (!versions || versions.length === 0) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={onClose}>
        <div className="bg-white rounded-2xl w-[90vw] max-w-md p-6 text-center shadow-2xl" onClick={e => e.stopPropagation()}>
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 flex items-center justify-center">
            <Clock className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-bold text-gray-900 mb-2">暂无润色历史</h3>
          <p className="text-sm text-gray-500 mb-4">对该段落执行润色操作后，版本历史将显示在这里</p>
          <button onClick={onClose} className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-medium transition-colors">
            关闭
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-2xl w-[90vw] max-w-2xl max-h-[80vh] flex flex-col shadow-2xl" onClick={e => e.stopPropagation()}>
        {/* 头部 */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-400 to-rose-500 flex items-center justify-center">
              <Clock className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">版本历史</h2>
              <p className="text-xs text-gray-500">共 {versions.length} 个版本</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors" aria-label="关闭">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 版本列表 */}
        <div className="flex-1 overflow-y-auto p-6 space-y-3">
          {versions.map((v, idx) => {
            const actionConfig = ACTION_LABELS[v.action] || { label: v.action, icon: RefreshCw, color: 'text-gray-600 bg-gray-50' }
            const ActionIcon = actionConfig.icon
            return (
              <div
                key={v.id}
                className={cn(
                  'border rounded-xl p-4 cursor-pointer transition-all',
                  selectedVersion === v.id
                    ? 'border-orange-400 bg-orange-50 shadow-sm'
                    : 'border-gray-200 hover:border-gray-300 hover:shadow-sm'
                )}
                onClick={() => setSelectedVersion(v.id)}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className={cn(
                      'flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium',
                      actionConfig.color
                    )}>
                      <ActionIcon className="w-3 h-3" />
                      {actionConfig.label}
                    </span>
                    <span className="text-xs text-gray-400">版本 {v.version}</span>
                  </div>
                  <span className="text-xs text-gray-400">
                    {new Date(v.created_at).toLocaleString('zh-CN')}
                  </span>
                </div>
                <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{v.content}</p>
                {idx === 0 && (
                  <div className="mt-2 pt-2 border-t border-gray-100">
                    <span className="text-[10px] text-orange-500 font-medium">最新版本</span>
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* 底部操作 */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100 bg-gray-50/50">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-200 rounded-lg transition-colors font-medium">
            取消
          </button>
          <button
            onClick={() => {
              const v = versions.find(v => v.id === selectedVersion)
              if (v) onSelect(v)
            }}
            disabled={!selectedVersion}
            className={cn(
              'px-4 py-2 text-sm rounded-lg flex items-center gap-2 font-medium transition-all',
              selectedVersion
                ? 'gradient-brand text-white gradient-brand-hover shadow-sm'
                : 'bg-gray-200 text-gray-400 cursor-not-allowed'
            )}
          >
            <RotateCcw className="w-4 h-4" />
            使用此版本
          </button>
        </div>
      </div>
    </div>
  )
}
