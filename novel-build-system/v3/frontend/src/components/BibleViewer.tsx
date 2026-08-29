import { useState } from 'react'
import { X, BookOpen, Users, Globe, Shield, Swords, Clock } from 'lucide-react'
import { cn } from '../lib/utils'

const TABS = [
  { key: 'characters', icon: Users, label: '角色', color: 'text-blue-600' },
  { key: 'locations', icon: Globe, label: '地点', color: 'text-emerald-600' },
  { key: 'world_rules', icon: Shield, label: '世界观规则', color: 'text-purple-600' },
  { key: 'key_items', icon: Swords, label: '关键物品', color: 'text-amber-600' },
  { key: 'timeline', icon: Clock, label: '时间线', color: 'text-rose-600' },
]

export default function BibleViewer({ bible, novelId, onClose }) {
  const [activeTab, setActiveTab] = useState('characters')
  const items = (bible || {})[activeTab] || []

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 w-full max-w-2xl max-h-[80vh] flex flex-col m-4 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100 flex-shrink-0">
          <div className="flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-indigo-500" />
            <span className="text-sm font-semibold text-gray-800">设定档案</span>
          </div>
          <button onClick={onClose} className="btn-ghost p-1" aria-label="关闭">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex gap-1 px-4 pt-3 pb-1 border-b border-gray-100 overflow-x-auto flex-shrink-0">
          {TABS.map(tab => (
            <button key={tab.key} onClick={() => setActiveTab(tab.key)}
              className={cn(
                'flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-lg transition-all whitespace-nowrap',
                activeTab === tab.key
                  ? 'bg-indigo-50 text-indigo-700'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              )}>
              <tab.icon className="w-3 h-3" />
              {tab.label}
              <span className="text-[10px] text-gray-400 ml-0.5">{(bible[tab.key] || []).length}</span>
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {items.length === 0 && (
            <div className="text-center py-8 text-xs text-gray-400">暂无数据</div>
          )}
          {activeTab === 'world_rules' && items.map((item, i) => (
            <div key={i} className="bg-gray-50 rounded-lg px-3 py-2 border border-gray-100">
              <span className="text-xs text-gray-600">{item}</span>
            </div>
          ))}
          {activeTab === 'timeline' && items.map((item, i) => (
            <div key={i} className="bg-gray-50 rounded-lg p-3 border border-gray-100">
              <div className="text-xs font-semibold text-gray-500 mb-1">第 {item.chapter || i + 1} 章</div>
              <p className="text-xs text-gray-600">{item.events || item.description || ''}</p>
            </div>
          ))}
          {['characters', 'locations', 'key_items'].includes(activeTab) && items.map((item, i) => (
            <div key={i} className="bg-gray-50 rounded-lg p-3 border border-gray-100">
              <div className="flex items-center gap-1.5 mb-2">
                <span className="text-sm font-semibold text-gray-700">
                  {item.name || (item.arc ? item.arc.slice(0, 20) + '...' : `条目 ${i + 1}`)}
                </span>
                {item.role && <span className="text-[10px] text-gray-400 bg-white px-1.5 py-0.5 rounded border">{item.role}</span>}
              </div>
              <div className="space-y-1">
                {item.traits && <div className="flex gap-1 text-xs"><span className="text-gray-400 w-8 flex-shrink-0">特征</span><span className="text-gray-600">{item.traits}</span></div>}
                {item.relationships && <div className="flex gap-1 text-xs"><span className="text-gray-400 w-8 flex-shrink-0">关系</span><span className="text-gray-600">{item.relationships}</span></div>}
                {item.description && <div className="flex gap-1 text-xs"><span className="text-gray-400 w-8 flex-shrink-0">描述</span><span className="text-gray-600">{item.description}</span></div>}
                {item.arc && <div className="flex gap-1 text-xs"><span className="text-gray-400 w-8 flex-shrink-0">弧光</span><span className="text-gray-600">{item.arc}</span></div>}
              </div>
            </div>
          ))}
        </div>

        <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 flex-shrink-0 bg-gray-50/50">
          <span className="text-[10px] text-gray-400">共 {(Object.values(bible || {}).flat()).length} 条记录</span>
          <span className="text-[10px] text-gray-400">仅展示 · 自动提取</span>
        </div>
      </div>
    </div>
  )
}