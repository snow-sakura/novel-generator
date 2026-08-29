import { useState, useEffect } from 'react'
import { X, Quote, BookOpen, Sparkles, Hash, Loader2, ChevronRight, Heart, Copy, Check } from 'lucide-react'
import { fetchQuotes } from '../services/api'

const QUOTE_COLORS = [
  { bg: 'bg-amber-50', border: 'border-amber-200', icon: 'text-amber-500', quote: 'text-amber-800' },
  { bg: 'bg-rose-50', border: 'border-rose-200', icon: 'text-rose-500', quote: 'text-rose-800' },
  { bg: 'bg-sky-50', border: 'border-sky-200', icon: 'text-sky-500', quote: 'text-sky-800' },
  { bg: 'bg-emerald-50', border: 'border-emerald-200', icon: 'text-emerald-500', quote: 'text-emerald-800' },
  { bg: 'bg-violet-50', border: 'border-violet-200', icon: 'text-violet-500', quote: 'text-violet-800' },
  { bg: 'bg-orange-50', border: 'border-orange-200', icon: 'text-orange-500', quote: 'text-orange-800' },
]

export default function GoldenQuotesPanel({ novelId, demoMode, onClose }) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [expandedChapter, setExpandedChapter] = useState(null)
  const [favorites, setFavorites] = useState(() => {
    try { return JSON.parse(sessionStorage.getItem('quoteFavorites') || '[]') } catch { return [] }
  })
  const [copiedId, setCopiedId] = useState(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      try {
        const result = await fetchQuotes(novelId)
        if (!cancelled) setData(result)
      } catch (e) {
        if (!cancelled) console.error('获取金句失败', e)
      }
      if (!cancelled) setLoading(false)
    }
    load()
    return () => { cancelled = true }
  }, [novelId])

  useEffect(() => {
    sessionStorage.setItem('quoteFavorites', JSON.stringify(favorites))
  }, [favorites])

  const toggleFavorite = (quoteId) => {
    setFavorites(prev =>
      prev.includes(quoteId) ? prev.filter(id => id !== quoteId) : [...prev, quoteId]
    )
  }

  const handleCopy = async (text, id) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedId(id)
      setTimeout(() => setCopiedId(null), 2000)
    } catch (e) {
      console.error('复制金句失败:', e)
    }
  }

  const allQuotes = data?.chapters?.flatMap(ch =>
    ch.quotes.map(q => ({ ...q, chapterTitle: ch.chapter_title, chapterIndex: ch.chapter_index }))
  ) || []

  const favoriteQuotes = allQuotes.filter(q => favorites.includes(q.id))

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden m-4" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-amber-500" />
            <h2 className="text-lg font-bold text-gray-900">金句集</h2>
            {data?.stats && (
              <span className="text-xs text-gray-400 ml-1">共 {data.stats.total_quotes} 句</span>
            )}
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors" aria-label="关闭">
            <X className="w-4 h-4 text-gray-400" />
          </button>
        </div>

        {data?.stats && (
          <div className="flex gap-4 px-6 py-3 bg-gray-50 border-b border-gray-100">
            <div className="flex items-center gap-1.5 text-xs text-gray-500">
              <Hash className="w-3 h-3" />
              总计 <span className="font-semibold text-gray-700">{data.stats.total_quotes}</span> 句
            </div>
            <div className="flex items-center gap-1.5 text-xs text-gray-500">
              <BookOpen className="w-3 h-3" />
              覆盖 <span className="font-semibold text-gray-700">{data.stats.coverage}</span> 章
            </div>
            <div className="flex items-center gap-1.5 text-xs text-gray-500">
              <Heart className="w-3 h-3" />
              收藏 <span className="font-semibold text-gray-700">{favoriteQuotes.length}</span> 句
            </div>
          </div>
        )}

        <div className="p-6 overflow-y-auto max-h-[calc(90vh-180px)]">
          {loading ? (
            <div className="flex items-center justify-center py-16 text-gray-400">
              <Loader2 className="w-5 h-5 animate-spin mr-2" /> 加载中...
            </div>
          ) : !data || !data.chapters?.length ? (
            <div className="text-center py-16">
              <Quote className="w-12 h-12 text-gray-200 mx-auto mb-3" />
              <p className="text-gray-400 text-sm">暂无金句</p>
              <p className="text-gray-300 text-xs mt-1">生成小说时 AI 会在关键位置自动插入金句</p>
            </div>
          ) : (
            <div className="space-y-4">
              {favoriteQuotes.length > 0 && (
                <div>
                  <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                    <Heart className="w-3 h-3 text-rose-400" /> 收藏 ({favoriteQuotes.length})
                  </h3>
                  <div className="space-y-2 mb-6">
                    {favoriteQuotes.map(q => (
                      <QuoteCard key={q.id} quote={q} colorIndex={q.id % QUOTE_COLORS.length}
                        favorites={favorites} onToggle={toggleFavorite}
                        copiedId={copiedId} onCopy={handleCopy} />
                    ))}
                  </div>
                  <hr className="border-gray-100 mb-4" />
                </div>
              )}

              {data.chapters.map((ch, ci) => (
                <div key={ch.chapter_index} className="border border-gray-100 rounded-xl overflow-hidden">
                  <button onClick={() => setExpandedChapter(expandedChapter === ch.chapter_index ? null : ch.chapter_index)}
                    className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded bg-gray-200 flex items-center justify-center text-[10px] font-medium text-gray-600">{ch.chapter_index + 1}</span>
                      <span className="text-sm font-medium text-gray-700">{ch.chapter_title}</span>
                      <span className="text-[10px] text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">{ch.quotes.length} 句</span>
                    </div>
                    <ChevronRight className={`w-4 h-4 text-gray-400 transition-transform ${expandedChapter === ch.chapter_index ? 'rotate-90' : ''}`} />
                  </button>
                  {expandedChapter === ch.chapter_index && (
                    <div className="p-4 space-y-3">
                      {ch.quotes.map((q, qi) => {
                        const colorIdx = (qi + ch.chapter_index * 3) % QUOTE_COLORS.length
                        const qWithChapter = { ...q, chapterTitle: ch.chapter_title, chapterIndex: ch.chapter_index }
                        return (
                          <QuoteCard key={q.id} quote={qWithChapter} colorIndex={colorIdx}
                            favorites={favorites} onToggle={toggleFavorite}
                            copiedId={copiedId} onCopy={handleCopy} />
                        )
                      })}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function QuoteCard({ quote, colorIndex, favorites, onToggle, copiedId, onCopy }) {
  const c = QUOTE_COLORS[colorIndex % QUOTE_COLORS.length]
  const isFav = favorites.includes(quote.id)
  return (
    <div className={`${c.bg} ${c.border} border rounded-xl p-4 relative group`}>
      <div className="flex items-start gap-3">
        <Quote className={`w-4 h-4 ${c.icon} flex-shrink-0 mt-0.5 opacity-60`} />
        <div className="flex-1 min-w-0">
          <p className={`text-sm ${c.quote} leading-relaxed italic`}>
            “{quote.text}”
          </p>
          <p className="text-[10px] text-gray-400 mt-1.5">
            {quote.chapterTitle}
          </p>
        </div>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button onClick={() => onCopy(quote.text, quote.id)}
            className="p-1 hover:bg-white/60 rounded transition-colors" title="复制" aria-label="复制">
            {copiedId === quote.id
              ? <Check className="w-3.5 h-3.5 text-emerald-500" />
              : <Copy className="w-3.5 h-3.5 text-gray-400" />}
          </button>
          <button onClick={() => onToggle(quote.id)}
            className="p-1 hover:bg-white/60 rounded transition-colors" title="收藏" aria-label="收藏">
            <Heart className={`w-3.5 h-3.5 ${isFav ? 'text-rose-500 fill-rose-500' : 'text-gray-400'}`} />
          </button>
        </div>
      </div>
    </div>
  )
}
