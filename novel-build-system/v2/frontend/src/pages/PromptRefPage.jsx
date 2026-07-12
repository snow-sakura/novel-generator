import { useState, useEffect } from 'react'
import { BookOpen, ChevronDown, ChevronRight, FileCode, Loader2, AlertCircle } from 'lucide-react'
import { cn } from '../lib/utils'

const API_BASE = '/api/v2'

const PROMPT_LABELS = {
  parse: '要素解析（原始版）',
  outline: '大纲规划（原始版）',
  chapter: '逐章写作（原始版）',
  title: '标题生成（原始版）',
}

const PROMPT_COLORS = {
  parse: { border: 'border-blue-200', bg: 'bg-blue-50', icon: 'text-blue-500' },
  outline: { border: 'border-purple-200', bg: 'bg-purple-50', icon: 'text-purple-500' },
  chapter: { border: 'border-orange-200', bg: 'bg-orange-50', icon: 'text-orange-500' },
  title: { border: 'border-emerald-200', bg: 'bg-emerald-50', icon: 'text-emerald-500' },
}

export default function PromptRefPage() {
  const [prompts, setPrompts] = useState([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState({})
  const [error, setError] = useState(null)

  useEffect(() => {
    fetch(`${API_BASE}/prompts`)
      .then((r) => r.json())
      .then((data) => {
        setPrompts(data)
        setExpanded({})
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  const toggle = (name) => setExpanded(prev => ({ [name]: !prev[name] }))

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-gray-400 gap-3">
        <div className="w-8 h-8 border-[3px] border-orange-400 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm animate-pulse-soft">加载中...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-20">
        <div className="w-16 h-16 rounded-2xl bg-red-50 flex items-center justify-center mx-auto mb-4">
          <AlertCircle className="w-8 h-8 text-red-400" />
        </div>
        <p className="text-red-500 font-medium mb-1">加载失败</p>
        <p className="text-sm text-gray-400">{error}</p>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl gradient-brand flex items-center justify-center shadow-sm">
            <BookOpen className="w-4 h-4 text-white" />
          </div>
          原始 Prompt 模板参考
        </h1>
        <p className="text-sm text-gray-400 mt-1 ml-10">
          此处展示生成管线使用的原始 Prompt 模板，仅供阅览参考，不可编辑，不参与实际生成。
        </p>
      </div>

      <div className="space-y-3">
        {prompts.map((p) => {
          const isOpen = expanded[p.name]
          const colors = PROMPT_COLORS[p.name] || { border: 'border-gray-200', bg: 'bg-gray-50', icon: 'text-gray-500' }
          return (
            <div key={p.name} className={cn(
              'bg-white rounded-xl border overflow-hidden transition-all card-hover-sm',
              isOpen ? `border-orange-300 shadow-sm` : `${colors.border}`
            )}>
              <button onClick={() => toggle(p.name)}
                className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-gray-50/50 transition-colors">
                <div className="flex items-center gap-3">
                  <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center', colors.bg)}>
                    <FileCode className={cn('w-4 h-4', colors.icon)} />
                  </div>
                  <div className="text-left">
                    <span className="font-medium text-gray-800">{PROMPT_LABELS[p.name] || p.name}</span>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[10px] text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">{p.name}</span>
                      {p.version && <span className="text-[10px] text-gray-400">{p.version}</span>}
                    </div>
                  </div>
                </div>
                <div className={cn('transition-transform duration-200', isOpen && 'rotate-180')}>
                  <ChevronDown className="w-4 h-4 text-gray-400" />
                </div>
              </button>
              {isOpen && (
                <div className="border-t border-gray-100">
                  <pre className="p-5 text-sm text-gray-700 font-mono leading-relaxed whitespace-pre-wrap overflow-x-auto max-h-[600px] overflow-y-auto bg-gray-50/30">
                    {p.content}
                  </pre>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {prompts.length === 0 && (
        <div className="text-center py-20">
          <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-4">
            <BookOpen className="w-8 h-8 text-gray-300" />
          </div>
          <p className="text-gray-400 font-medium">暂无模板数据</p>
        </div>
      )}
    </div>
  )
}