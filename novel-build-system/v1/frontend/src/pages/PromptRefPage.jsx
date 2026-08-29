import { useState, useEffect } from 'react'
import { BookOpen, ChevronDown, ChevronRight, FileCode, Copy, Check } from 'lucide-react'
import { cn } from '../lib/utils'

const API_BASE = '/api/v1'

const PROMPT_LABELS = {
  parse: '要素解析（原始版）',
  outline: '大纲规划（原始版）',
  chapter: '逐章写作（原始版）',
  title: '标题生成（原始版）',
}

export default function PromptRefPage() {
  const [prompts, setPrompts] = useState([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState({})
  const [error, setError] = useState(null)
  const [copied, setCopied] = useState(null)

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

  const toggle = (name) => setExpanded(prev => ({ ...prev, [name]: !prev[name] }))

  function handleCopy(content, name) {
    navigator.clipboard.writeText(content)
    setCopied(name)
    setTimeout(() => setCopied(null), 2000)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-gray-400">
        <div className="w-8 h-8 border-2 border-orange-400 border-t-transparent rounded-full animate-spin mr-3" />
        加载中...
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-20">
        <div className="w-16 h-16 rounded-2xl bg-red-100 flex items-center justify-center mx-auto mb-4">
          <FileCode className="w-8 h-8 text-red-500" />
        </div>
        <p className="text-red-500 font-medium mb-2">加载失败</p>
        <p className="text-sm text-gray-400">{error}</p>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-400 to-rose-500 flex items-center justify-center">
            <BookOpen className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">原始 Prompt 模板参考</h1>
            <p className="text-sm text-gray-400">
              生成管线使用的原始 Prompt 模板，仅供阅览参考
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        {prompts.map((p) => {
          const isOpen = expanded[p.name]
          return (
            <div key={p.name} className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-md transition-shadow">
              <button
                onClick={() => toggle(p.name)}
                className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className={cn(
                    'w-8 h-8 rounded-lg flex items-center justify-center transition-colors',
                    isOpen ? 'bg-orange-100 text-orange-600' : 'bg-gray-100 text-gray-500'
                  )}>
                    <FileCode className="w-4 h-4" />
                  </div>
                  <div className="text-left">
                    <span className="font-semibold text-gray-800 block">
                      {PROMPT_LABELS[p.name] || p.name}
                    </span>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-md font-mono">
                        {p.name}
                      </span>
                      <span className="text-xs text-gray-400">v{p.version}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {isOpen && (
                    <button onClick={(e) => { e.stopPropagation(); handleCopy(p.content, p.name) }}
                      className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                      title="复制">
                      {copied === p.name ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                    </button>
                  )}
                  {isOpen ? (
                    <ChevronDown className="w-5 h-5 text-gray-400" />
                  ) : (
                    <ChevronRight className="w-5 h-5 text-gray-400" />
                  )}
                </div>
              </button>
              {isOpen && (
                <div className="border-t border-gray-100 bg-gray-50/50">
                  <pre className="p-5 text-sm text-gray-700 font-mono leading-relaxed whitespace-pre-wrap overflow-x-auto max-h-[600px] overflow-y-auto">
                    {p.content}
                  </pre>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {prompts.length === 0 && (
        <div className="text-center py-16">
          <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-4">
            <BookOpen className="w-8 h-8 text-gray-300" />
          </div>
          <p className="text-gray-400 font-medium">暂无模板数据</p>
        </div>
      )}
    </div>
  )
}
