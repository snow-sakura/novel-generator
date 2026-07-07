import { useState, useEffect } from 'react'
import { X, Check, RotateCcw } from 'lucide-react'
import { cn } from '../lib/utils'

const ACTION_LABELS = {
  rewrite: '重写',
  expand: '扩写',
  compress: '精简',
}

export default function RefinePanel({ versions, onSelect, onClose }) {
  const [selectedVersion, setSelectedVersion] = useState(null)

  if (!versions || versions.length === 0) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={onClose}>
        <div className="bg-white rounded-2xl w-[90vw] max-w-md p-6 text-center" onClick={e => e.stopPropagation()}>
          <p className="text-gray-500">暂无润色历史</p>
          <button onClick={onClose} className="mt-4 px-4 py-2 bg-gray-100 rounded-lg text-sm">关闭</button>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-2xl w-[90vw] max-w-2xl max-h-[80vh] flex flex-col shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-900">版本历史</h2>
          <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {versions.map((v, idx) => (
            <div
              key={v.id}
              className={cn(
                'border rounded-xl p-4 cursor-pointer transition-all',
                selectedVersion === v.id
                  ? 'border-orange-400 bg-orange-50'
                  : 'border-gray-200 hover:border-gray-300'
              )}
              onClick={() => setSelectedVersion(v.id)}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 bg-gray-100 rounded text-xs font-medium">
                    {ACTION_LABELS[v.action] || v.action}
                  </span>
                  <span className="text-xs text-gray-400">版本 {v.version}</span>
                </div>
                <span className="text-xs text-gray-400">
                  {new Date(v.created_at).toLocaleString()}
                </span>
              </div>
              <p className="text-sm text-gray-700 whitespace-pre-wrap">{v.content}</p>
            </div>
          ))}
        </div>

        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg">
            取消
          </button>
          <button
            onClick={() => {
              const v = versions.find(v => v.id === selectedVersion)
              if (v) onSelect(v)
            }}
            disabled={!selectedVersion}
            className={cn(
              'px-4 py-2 text-sm rounded-lg flex items-center gap-2',
              selectedVersion
                ? 'bg-orange-500 text-white hover:bg-orange-600'
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
