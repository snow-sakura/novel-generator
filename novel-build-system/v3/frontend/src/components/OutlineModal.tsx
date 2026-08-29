import { useState } from 'react'
import { X, BookOpen, Clock, Lightbulb, Users, Globe, Layers, Zap, PenTool } from 'lucide-react'
import { cn } from '../lib/utils'
import { LABEL_MAP, flattenDict } from '../lib/constants'

const LAYER_TABS = [
  { key: 'strategy', icon: Lightbulb, label: '战略层' },
  { key: 'characters', icon: Users, label: '人物层' },
  { key: 'world', icon: Globe, label: '世界观层' },
  { key: 'plot_structure', icon: Layers, label: '结构层' },
  { key: 'rhythm', icon: Zap, label: '节奏层' },
  { key: 'style_tone', icon: PenTool, label: '风格层' },
]

const LAYER_META = {
  strategy: { label: '战略层', color: 'text-purple-700', bg: 'bg-purple-50', border: 'border-purple-200', dot: '#9333ea', icon: Lightbulb },
  characters: { label: '人物层', color: 'text-blue-700', bg: 'bg-blue-50', border: 'border-blue-200', dot: '#2563eb', icon: Users },
  world: { label: '世界观层', color: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-200', dot: '#059669', icon: Globe },
  plot_structure: { label: '结构层', color: 'text-amber-700', bg: 'bg-amber-50', border: 'border-amber-200', dot: '#d97706', icon: Layers },
  rhythm: { label: '节奏层', color: 'text-indigo-700', bg: 'bg-indigo-50', border: 'border-indigo-200', dot: '#6366f1', icon: Zap },
  style_tone: { label: '风格层', color: 'text-rose-700', bg: 'bg-rose-50', border: 'border-rose-200', dot: '#e11d48', icon: PenTool },
}

function LayerCard({ type, data }) {
  const meta = LAYER_META[type]
  if (!meta) return null
  const Icon = meta.icon
  const rows = flattenDict(data || {}, 0, 5)

  return (
    <div className={cn('rounded-xl border-2 inset-soft', meta.border, meta.bg)}>
      <div className={cn('flex items-center gap-2 px-4 py-3 border-b', meta.border)}>
        <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ backgroundColor: meta.dot + '18' }}>
          <Icon className="w-4 h-4" style={{ color: meta.dot }} />
        </div>
        <span className="text-sm font-semibold" style={{ color: meta.dot }}>{meta.label}</span>
        <span className="ml-auto text-[10px] text-gray-400 bg-white/80 px-2 py-0.5 rounded-full border border-gray-200">{rows.length} 项</span>
      </div>
      {rows.length > 0 ? (
        <div className="px-4 py-3">
          <div className="outline-card-grid">
            {rows.map((row, i) => {
              if (row.isSection) {
                return (
                  <div key={i} className="col-span-2 text-xs font-semibold text-gray-700 mt-2 mb-1 border-b border-gray-100 pb-1">
                    {row.key}
                  </div>
                )
              }
              if (row.isItemHeader) {
                return (
                  <div key={i} className="col-span-2 text-xs font-semibold text-gray-800 mt-1.5 mb-0.5 px-2 py-1 bg-gray-50 rounded border-l-2 border-gray-300">
                    {row.key}
                  </div>
                )
              }
              if (!row.key) {
                return (
                  <span key={i} className={`col-span-2 ock-val text-gray-400 italic ${row.indent ? 'pl-4' : ''}`}>
                    {typeof row.val === 'string' ? row.val : ''}
                  </span>
                )
              }
              return (
                <>
                  <span key={`k-${i}`} className={`ock-key ${row.indent ? 'pl-5' : ''}`}>{row.key}</span>
                  {row.isArray && Array.isArray(row.val) ? (
                    <div key={`v-${i}`} className="ock-val-array">
                      {row.val.map((item, j) => (
                        <span key={j} className="ock-chip">{item}</span>
                      ))}
                    </div>
                  ) : (
                    <span key={`v-${i}`} className={`ock-val ${row.indent ? '' : ''}`}>
                      {typeof row.val === 'string' ? row.val : ''}
                    </span>
                  )}
                </>
              )
            })}
          </div>
        </div>
      ) : (
        <div className="p-4 text-sm text-gray-400 text-center">暂无数据</div>
      )}
    </div>
  )
}

export default function OutlineModal({ outlineThinking, onClose, emotionCurve }) {
  function unwrapData(item) {
    if (!item?.data || typeof item.data !== 'object') return item
    if (Object.keys(item.data).length === 1 && item.data[item.type]) {
      return { ...item, data: item.data[item.type] }
    }
    return item
  }

  const layers = outlineThinking
    .filter(item => item?.type && item.type !== '_progress' && item.type !== 'chapter')
    .flatMap(item => {
      if (item.type === 'structure' && item.data) {
        return ['plot_structure', 'rhythm', 'style_tone']
          .filter(k => item.data[k])
          .map(k => unwrapData({ type: k, data: item.data[k] }))
      }
      return [unwrapData(item)]
    })

  const [activeTab, setActiveTab] = useState(() => {
    const first = layers[0]
    return first?.type || 'strategy'
  })

  const activeLayer = layers.find(l => l.type === activeTab)

  return (
    <div className="modal-overlay animate-fade-in" onClick={onClose}>
      <div className="bg-white rounded-2xl w-[90vw] max-w-3xl max-h-[85vh] flex flex-col shadow-2xl border border-gray-100 animate-scale-in" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 flex-shrink-0">
          <div className="flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-orange-500" />
            <h2 className="text-lg font-bold text-gray-900">大纲生成结果</h2>
            <span className="text-xs text-gray-400">（{layers.length} 层）</span>
          </div>
          <button onClick={onClose} className="btn-ghost p-1.5"><X className="w-5 h-5" /></button>
        </div>

        <div className="flex flex-shrink-0 border-b border-gray-100 overflow-x-auto px-4">
          {LAYER_TABS.map(tab => {
            const hasData = layers.some(l => l.type === tab.key)
            return (
              <button key={tab.key} onClick={() => setActiveTab(tab.key)}
                className={cn(
                  'flex items-center gap-2 px-4 py-3 text-xs font-medium border-b-2 transition-all whitespace-nowrap',
                  activeTab === tab.key
                    ? 'border-gray-900 text-gray-900'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                )}>
                <tab.icon className={cn('w-3.5 h-3.5', activeTab === tab.key ? 'text-gray-900' : 'text-gray-400')} />
                {tab.label}
                {hasData && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />}
              </button>
            )
          })}
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {activeLayer ? (
            <LayerCard key={activeLayer.type} type={activeLayer.type} data={activeLayer.data} />
          ) : (
            <div className="text-sm text-gray-400 py-8 text-center">暂无数据</div>
          )}
        </div>

        <div className="flex items-center justify-between flex-shrink-0 px-6 py-3 border-t border-gray-100 bg-gray-50/50 rounded-b-2xl">
          <span className="text-xs text-gray-400 flex items-center gap-1">
            <Clock className="w-3 h-3" />
            点击 tab 切换查看各层大纲
          </span>
        </div>
      </div>
    </div>
  )
}
