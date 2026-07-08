import { useState } from 'react'
import { X, BookOpen, Clock, Lightbulb, Users, Globe, Layers, Zap, PenTool } from 'lucide-react'
import { cn } from '../lib/utils'

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

const LABEL_MAP = {
  strategy: '战略层', characters: '人物层', world: '世界观层',
  plot_structure: '结构层', rhythm: '节奏层', style_tone: '风格层',
  chapters: '章节细纲', core_idea: '核心立意', theme: '思想主题',
  ending: '结局预判', protagonist: '主角', supporting: '配角',
  antagonist: '反派', relationships: '人物关系', time_space: '时空背景',
  rules: '规则体系', factions: '势力格局', three_acts: '三幕式',
  beat_sheet: '节拍表', golden_three: '黄金三章',
  satisfaction_points: '爽点布局', emotional_peaks: '泪点/痛点',
  pace_curve: '节奏曲线', perspective: '叙事视角',
  language: '语言风格', atmosphere: '氛围基调',
  high_concept: '高概念设定', unique_selling_point: '独特卖点',
  core_question: '核心问题', values: '价值观',
  type: '结局类型', final_scene: '最终场景',
  desire: '核心欲望', flaw: '核心缺陷', traits: '性格特质',
  arc: '成长弧线', motive: '动机', threat: '压迫感',
  value_opposition: '价值对立', era: '时代', locations: '场景',
  world_rules: '世界规则', power_system: '力量体系',
  social_structure: '社会结构', act1: '第一幕·建置',
  act2: '第二幕·对抗', act3: '第三幕·结局',
  hook: '钩子', function: '功能定位', summary: '概要',
  cliffhanger: '悬念', word_count_estimate: '字数预估',
  description: '描述', alignment: '立场', role: '作用',
  name: '姓名', age: '年龄', identity: '身份',
  tone: '故事基调', initial_state: '初始状态',
  love_interest: '情感线', conflict_point: '冲突点',
  core_conflict_source: '核心冲突根源', devices: '设定与伏笔',
  power_rules: '力量规则', key_items: '核心道具',
  foreshadowing: '伏笔清单', item: '伏笔内容',
  planned_reveal: '揭示时机', scenes: '场景列表',
  time_era: '时代背景', conflict_type: '冲突类型',
  inciting_incident: '激励事件', development: '发展方向',
  resolution_tendency: '结局倾向', world_tone: '世界观基调',
  beat: '节拍', chapter: '章节', content: '内容',
  narrative_style: '叙事风格',
}

function flattenDict(obj, depth = 0, maxDepth = 5) {
  if (depth > maxDepth) return []
  const rows = []
  for (const [k, v] of Object.entries(obj)) {
    const label = LABEL_MAP[k] || k
    if (v === null || v === undefined) continue
    if (typeof v === 'string') {
      if (v.trim()) rows.push({ key: label, val: v })
    } else if (typeof v === 'number') {
      rows.push({ key: label, val: String(v) })
    } else if (Array.isArray(v)) {
      if (v.length > 0) {
        const items = v.slice(0, 10).map(item => {
          if (typeof item === 'string') return item
          if (typeof item === 'object') return item.title || item.name || item.beat || JSON.stringify(item).slice(0, 40)
          return String(item)
        })
        rows.push({ key: label, val: items, isArray: true })
        if (v.length > 10) rows.push({ key: '', val: `+${v.length - 10} 更多` })
      }
    } else if (typeof v === 'object') {
      const childRows = flattenDict(v, depth + 1, maxDepth)
      if (childRows.length > 0) {
        rows.push({ key: label, val: '', isSection: true })
        rows.push(...childRows)
      }
    }
  }
  return rows
}

function LayerCard({ type, data }) {
  const meta = LAYER_META[type]
  if (!meta) return null
  const Icon = meta.icon
  const rows = flattenDict(data || {}, 0, 5)

  return (
    <div className={cn('rounded-xl border-2 overflow-hidden', meta.border, meta.bg)}>
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
              return (
                <div key={i} className={cn('contents', !row.key && 'col-span-2')}>
                  {row.key && <span className="ock-key">{row.key}</span>}
                  {row.isArray ? (
                    <div className="ock-val-array">
                      {row.val.map((item, j) => (
                        <span key={j} className="ock-chip">{item}</span>
                      ))}
                    </div>
                  ) : (
                    <span className={cn('ock-val', !row.key && 'col-span-2 text-gray-400 italic')}>
                      {row.val || row.val === '' ? row.val : row}
                    </span>
                  )}
                </div>
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

export default function OutlineModal({ outlineThinking, onClose }) {
  const layers = outlineThinking.filter(item => item?.type && item.type !== '_progress' && item.type !== 'chapter')
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

        <div className="flex border-b border-gray-100 overflow-x-auto px-4">
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

        <div className="flex items-center justify-between px-6 py-3 border-t border-gray-100 bg-gray-50/50 rounded-b-2xl">
          <span className="text-xs text-gray-400 flex items-center gap-1">
            <Clock className="w-3 h-3" />
            点击 tab 切换查看各层大纲
          </span>
        </div>
      </div>
    </div>
  )
}
