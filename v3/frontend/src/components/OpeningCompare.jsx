import { useState } from 'react'
import { Sparkles, Check, Loader2, Columns, SplitSquareHorizontal, X } from 'lucide-react'
import { cn } from '../lib/utils'

const TAG_COLORS = {
  '当前设置': 'bg-orange-100 text-orange-700 border-orange-200',
  '视角': 'bg-blue-100 text-blue-700 border-blue-200',
  '探索': 'bg-purple-100 text-purple-700 border-purple-200',
}

export default function OpeningCompare({ openings, loading, onSelect, onCancel }) {
  const [selected, setSelected] = useState(null)
  const [viewMode, setViewMode] = useState('card') // 'card' | 'side-by-side'
  const [sideBySidePair, setSideBySidePair] = useState([0, 1]) // side-by-side 对比的两个索引

  function renderText(text) {
    if (!text) return ''
    return text
      .split('\n')
      .filter(Boolean)
      .map((line, i) => <p key={i} className="text-sm leading-relaxed text-gray-700 mb-2">{line}</p>)
  }

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm animate-fade-in">
        <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 w-full max-w-lg p-8 text-center">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-500 mx-auto mb-4" />
          <p className="text-sm text-gray-500">正在生成多个开头版本供选择...</p>
          <p className="text-xs text-gray-400 mt-2">每个版本使用不同的视角和节奏</p>
        </div>
      </div>
    )
  }

  if (!openings || openings.length === 0) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 w-full max-w-5xl max-h-[90vh] flex flex-col m-4 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100 flex-shrink-0">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-indigo-500" />
            <span className="text-sm font-semibold text-gray-800">选择开头风格</span>
            <span className="text-xs text-gray-400">共 {openings.length} 个版本</span>
          </div>
          <div className="flex items-center gap-2">
            {/* View mode toggle */}
            <div className="flex items-center bg-gray-100 rounded-lg p-0.5">
              <button onClick={() => setViewMode('card')}
                className={cn(
                  'flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-md transition-all',
                  viewMode === 'card' ? 'bg-white text-gray-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                )}>
                <SplitSquareHorizontal className="w-3 h-3" /> 卡片
              </button>
              {openings.length >= 2 && (
                <button onClick={() => setViewMode('side-by-side')}
                  className={cn(
                    'flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-md transition-all',
                    viewMode === 'side-by-side' ? 'bg-white text-gray-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                  )}>
                  <Columns className="w-3 h-3" /> 并排
                </button>
              )}
            </div>
            <button onClick={onCancel} className="text-xs text-gray-400 hover:text-gray-600 px-2 py-1">跳过</button>
          </div>
        </div>

        {/* Card view */}
        {viewMode === 'card' && (
          <div className="flex-1 overflow-y-auto p-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {openings.map((op, i) => (
                <div key={i} onClick={() => setSelected(i)}
                  className={cn(
                    'relative border-2 rounded-xl p-4 cursor-pointer transition-all flex flex-col min-h-[320px]',
                    selected === i
                      ? 'border-indigo-500 bg-indigo-50/30 shadow-md'
                      : 'border-gray-200 hover:border-indigo-300 hover:shadow-sm bg-white'
                  )}>
                  {selected === i && (
                    <div className="absolute top-3 right-3 w-6 h-6 bg-indigo-500 rounded-full flex items-center justify-center">
                      <Check className="w-3.5 h-3.5 text-white" />
                    </div>
                  )}
                  <div className="flex items-center gap-2 mb-2">
                    <span className={cn(
                      'w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold',
                      selected === i ? 'bg-indigo-500 text-white' : 'bg-gray-100 text-gray-500'
                    )}>{i + 1}</span>
                    <div className="flex-1 min-w-0">
                      <span className="text-sm font-semibold text-gray-800 block truncate">{op.label}</span>
                      <span className="text-[10px] text-gray-400">{op.text?.length || 0}字</span>
                    </div>
                  </div>
                  {/* Tags */}
                  <div className="flex items-center gap-1.5 mb-2 flex-wrap">
                    {op.tag && (
                      <span className={cn(
                        'text-[10px] px-1.5 py-0.5 rounded border font-medium',
                        TAG_COLORS[op.tag] || 'bg-gray-100 text-gray-600 border-gray-200'
                      )}>{op.tag}</span>
                    )}
                    {op.pov && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-50 text-gray-500 border border-gray-200">
                        {op.pov}
                      </span>
                    )}
                    {op.pacing && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-50 text-gray-500 border border-gray-200">
                        {op.pacing}
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-gray-400 mb-2">{op.desc}</p>
                  <div className="flex-1 overflow-hidden relative">
                    <div className="text-xs text-gray-600 leading-relaxed line-clamp-[12]">
                      {renderText(op.text)}
                    </div>
                    <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-white to-transparent" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Side-by-side view */}
        {viewMode === 'side-by-side' && (
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Version selectors */}
            <div className="flex items-center gap-2 px-4 pt-3 pb-2 flex-shrink-0">
              <span className="text-xs text-gray-500 flex-shrink-0">对比：</span>
              <select value={sideBySidePair[0]}
                onChange={e => setSideBySidePair([Number(e.target.value), sideBySidePair[1]])}
                className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 bg-white text-gray-700 min-w-[140px]">
                {openings.map((op, i) => (
                  <option key={i} value={i}>版本 {i + 1}: {op.label}</option>
                ))}
              </select>
              <span className="text-xs text-gray-400">vs</span>
              <select value={sideBySidePair[1]}
                onChange={e => setSideBySidePair([sideBySidePair[0], Number(e.target.value)])}
                className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 bg-white text-gray-700 min-w-[140px]">
                {openings.map((op, i) => (
                  <option key={i} value={i}>版本 {i + 1}: {op.label}</option>
                ))}
              </select>
              {selected !== null && (
                <span className="ml-auto text-[10px] text-indigo-500 font-medium">
                  已选：版本 {selected + 1}
                </span>
              )}
            </div>

            {/* Two columns */}
            <div className="flex-1 flex overflow-hidden">
              {sideBySidePair.map((idx, col) => {
                const op = openings[idx]
                if (!op) return <div key={col} className="flex-1 p-4 text-center text-xs text-gray-400">无内容</div>
                return (
                  <div key={col} className={cn(
                    'flex-1 flex flex-col overflow-hidden',
                    col === 0 ? 'border-r border-gray-100' : ''
                  )}>
                    {/* Column header */}
                    <div className="px-4 py-2 border-b border-gray-100 bg-gray-50/50 flex items-center justify-between flex-shrink-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-gray-700">版本 {idx + 1}</span>
                        <span className="text-xs text-gray-400">{op.label}</span>
                        {op.tag && (
                          <span className={cn(
                            'text-[10px] px-1.5 py-0.5 rounded border font-medium',
                            TAG_COLORS[op.tag] || 'bg-gray-100 text-gray-600 border-gray-200'
                          )}>{op.tag}</span>
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        <button onClick={() => { setSelected(idx) }}
                          className={cn(
                            'flex items-center gap-1 px-2 py-1 text-[10px] font-medium rounded-md transition-all',
                            selected === idx
                              ? 'bg-indigo-500 text-white'
                              : 'bg-gray-100 text-gray-500 hover:bg-indigo-50 hover:text-indigo-600'
                          )}>
                          {selected === idx ? <Check className="w-3 h-3" /> : null}
                          {selected === idx ? '已选' : '选择'}
                        </button>
                      </div>
                    </div>
                    {/* Content */}
                    <div className="flex-1 overflow-y-auto p-4">
                      <div className="text-xs text-gray-600 leading-relaxed space-y-2">
                        {renderText(op.text)}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100 flex-shrink-0">
          <span className="text-xs text-gray-400">选择你最喜欢的开头，后续将以此为基础续写全文</span>
          <div className="flex items-center gap-2">
            <button onClick={onCancel}
              className="px-3 py-1.5 text-xs text-gray-500 hover:text-gray-700 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
              跳过（使用默认风格）
            </button>
            <button onClick={() => { onSelect(openings[selected]) }}
              disabled={selected === null}
              className={cn(
                'flex items-center gap-1 px-4 py-1.5 text-xs font-medium text-white rounded-lg transition-all',
                selected !== null ? 'bg-indigo-500 hover:bg-indigo-600' : 'bg-gray-300 cursor-not-allowed'
              )}>
              <Check className="w-3 h-3" />
              选择此开头
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
