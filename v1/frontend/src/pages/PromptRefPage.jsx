import { useState, useEffect } from 'react'
import { BookOpen, ChevronDown, ChevronRight, FileCode } from 'lucide-react'

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

  const toggle = (name) => setExpanded({ [name]: !expanded[name] })

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-gray-400">
        <div className="animate-spin w-6 h-6 border-2 border-orange-400 border-t-transparent rounded-full mr-3" />
        加载中...
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-20">
        <p className="text-red-500 mb-2">加载失败</p>
        <p className="text-sm text-gray-400">{error}</p>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-800 flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-orange-500" />
          原始 Prompt 模板参考
        </h1>
        <p className="text-sm text-gray-400 mt-1">
          此处展示生成管线使用的原始 Prompt 模板，仅供阅览参考，不可编辑，不参与实际生成。
        </p>
      </div>

      <div className="space-y-3">
        {prompts.map((p) => {
          const isOpen = expanded[p.name]
          return (
            <div key={p.name} className="bg-white rounded-lg border border-gray-200 overflow-hidden">
              <button
                onClick={() => toggle(p.name)}
                className="w-full flex items-center justify-between px-5 py-3 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <FileCode className="w-4 h-4 text-orange-400" />
                  <span className="font-medium text-gray-800">
                    {PROMPT_LABELS[p.name] || p.name}
                  </span>
                  <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded">
                    {p.name}
                  </span>
                  <span className="text-xs text-gray-400">{p.version}</span>
                </div>
                {isOpen ? (
                  <ChevronDown className="w-4 h-4 text-gray-400" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-gray-400" />
                )}
              </button>
              {isOpen && (
                <div className="border-t border-gray-100">
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
        <div className="text-center py-16 text-gray-400">
          暂无模板数据
        </div>
      )}
    </div>
  )
}
