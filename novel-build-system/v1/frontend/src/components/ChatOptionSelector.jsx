import { useState, useEffect } from 'react'
import { Sparkles, Check, X } from 'lucide-react'
import { cn } from '../lib/utils'
import { fetchGenres } from '../services/api'

export default function ChatOptionSelector({ seedText, onConfirm, onCancel }) {
  const [gender, setGender] = useState('男频')
  const [selectedGenres, setSelectedGenres] = useState(['都市脑洞'])
  const [selectedStyles, setSelectedStyles] = useState(['轻松搞笑'])
  const [chapterCount, setChapterCount] = useState(2)
  const [perChapterMin, setPerChapterMin] = useState(800)
  const [perChapterMax, setPerChapterMax] = useState(2500)
  const [genres, setGenres] = useState([])
  const [styles, setStyles] = useState([])

  useEffect(() => {
    fetchGenres(gender).then(data => {
      setGenres(data.genres || [])
      setStyles(data.styles || [])
    })
  }, [gender])

  function handleGenderChange(g) {
    setGender(g)
    setSelectedGenres([])
    fetchGenres(g).then(data => {
      const gs = data.genres || []
      setGenres(gs)
      if (data.styles) setStyles(data.styles)
    })
  }

  function toggleGenre(genre) {
    setSelectedGenres(prev => {
      const idx = prev.indexOf(genre)
      if (idx >= 0) {
        return prev.filter(g => g !== genre)
      }
      return [...prev, genre]
    })
  }

  function toggleStyle(style) {
    setSelectedStyles(prev => {
      const idx = prev.indexOf(style)
      if (idx >= 0) {
        const next = prev.filter(s => s !== style)
        return next.length === 0 ? [style] : next
      }
      return [...prev, style]
    })
  }

  const wordCount = Math.round(chapterCount * (perChapterMin + perChapterMax) / 2)

  function handleConfirm() {
    onConfirm({
      seed_text: seedText,
      gender,
      genre: selectedGenres.join('+'),
      selectedGenres,
      style: selectedStyles.join('+'),
      selectedStyles,
      chapter_count: chapterCount,
      per_chapter_min: perChapterMin,
      per_chapter_max: perChapterMax,
      word_count: wordCount,
    })
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-2xl overflow-hidden max-h-[85vh] flex flex-col">
      {/* 标题栏 */}
      <div className="px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-orange-50 to-rose-50 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-400 to-rose-500 flex items-center justify-center shadow-sm">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-base font-bold text-gray-900">创作参数设置</h3>
              <p className="text-xs text-gray-500 mt-0.5">调整参数后开始创作</p>
            </div>
          </div>
          <button onClick={onCancel}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-white/80 rounded-xl transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="p-5 space-y-5 overflow-y-auto flex-1">
        {/* 频道选择 */}
        <div>
          <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2.5 block">频道</label>
          <div className="flex gap-2">
            {[{ value: '男频', icon: '♂', label: '男频' }, { value: '女频', icon: '♀', label: '女频' }, { value: '无频', icon: '📚', label: '通用' }].map(g => (
              <button key={g.value} type="button" onClick={() => handleGenderChange(g.value)}
                className={cn(
                  'flex-1 py-3 rounded-xl text-sm font-semibold border-2 transition-all flex items-center justify-center gap-1.5',
                  gender === g.value
                    ? 'bg-gradient-to-br from-orange-400 to-rose-500 text-white border-transparent shadow-md'
                    : 'bg-white text-gray-600 border-gray-200 hover:border-orange-300 hover:bg-orange-50'
                )}>
                <span className="text-lg">{g.icon}</span>
                {g.label}
              </button>
            ))}
          </div>
        </div>

        {/* 题材选择 */}
        <div>
          <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2.5 block">
            题材 <span className="text-orange-500 normal-case font-medium">（可多选）</span>
          </label>
          <div className="grid grid-cols-4 gap-2 max-h-36 overflow-y-auto pr-1">
            {[...new Set(genres.length > 0 ? genres : ['东方玄幻', '异世大陆', '高武世界', '修真文明', '都市异能', '古代言情', '现代言情', '玄幻言情'])].map(g => {
              const selected = selectedGenres.includes(g)
              return (
                <button key={g} type="button" onClick={() => toggleGenre(g)}
                  className={cn(
                    'px-2 py-2.5 rounded-xl text-xs font-medium border-2 transition-all text-center flex items-center justify-center gap-1',
                    selected
                      ? 'bg-orange-500 text-white border-orange-500 shadow-sm'
                      : 'bg-white text-gray-600 border-gray-100 hover:border-orange-300 hover:bg-orange-50'
                  )}>
                  {selected && <Check className="w-3 h-3" />}
                  {g}
                </button>
              )
            })}
          </div>
          {selectedGenres.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-3">
              {selectedGenres.map(g => (
                <span key={g} className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-gradient-to-r from-orange-100 to-rose-100 text-orange-700 rounded-lg text-xs font-medium">
                  {g}
                  <button type="button" onClick={() => toggleGenre(g)} className="hover:text-orange-900 ml-0.5">×</button>
                </span>
              ))}
            </div>
          )}
        </div>

        {/* 风格选择 */}
        <div>
          <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2.5 block">
            风格 <span className="text-orange-500 normal-case font-medium">（可多选）</span>
          </label>
          <div className="grid grid-cols-3 gap-2 max-h-28 overflow-y-auto pr-1">
            {[...new Set(styles.length > 0 ? styles : ['轻松搞笑', '热血燃系', '悬疑烧脑', '甜宠治愈', '暗黑深沉', '沙雕吐槽'])].map(s => {
              const selected = selectedStyles.includes(s)
              return (
                <button key={s} type="button" onClick={() => toggleStyle(s)}
                  className={cn(
                    'px-2 py-2.5 rounded-xl text-xs font-medium border-2 transition-all text-center flex items-center justify-center gap-1',
                    selected
                      ? 'bg-orange-500 text-white border-orange-500 shadow-sm'
                      : 'bg-white text-gray-600 border-gray-100 hover:border-orange-300 hover:bg-orange-50'
                  )}>
                  {selected && <Check className="w-3 h-3" />}
                  {s}
                </button>
              )
            })}
          </div>
          {selectedStyles.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-3">
              {selectedStyles.map(s => (
                <span key={s} className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-gradient-to-r from-orange-100 to-rose-100 text-orange-700 rounded-lg text-xs font-medium">
                  {s}
                  <button type="button" onClick={() => toggleStyle(s)} className="hover:text-orange-900 ml-0.5">×</button>
                </span>
              ))}
            </div>
          )}
        </div>

        {/* 字数设置 */}
        <div className="bg-gradient-to-r from-gray-50 to-gray-100/50 rounded-xl p-4 border border-gray-200">
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1.5 block">章节数</label>
              <input type="number" min={1} value={chapterCount}
                onChange={e => setChapterCount(Math.max(1, Number(e.target.value)))}
                className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:border-orange-400 focus:ring-2 focus:ring-orange-100 outline-none text-center font-semibold bg-white" />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1.5 block">每章最小字数</label>
              <input type="number" min={100} value={perChapterMin}
                onChange={e => setPerChapterMin(Math.max(100, Number(e.target.value)))}
                className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:border-orange-400 focus:ring-2 focus:ring-orange-100 outline-none text-center font-semibold bg-white" />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1.5 block">每章最大字数</label>
              <input type="number" min={perChapterMin} value={perChapterMax}
                onChange={e => setPerChapterMax(Math.max(perChapterMin + 1, Number(e.target.value)))}
                className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:border-orange-400 focus:ring-2 focus:ring-orange-100 outline-none text-center font-semibold bg-white" />
            </div>
          </div>
          {perChapterMin >= perChapterMax && (
            <p className="text-xs text-red-500 mt-2 flex items-center gap-1">
              <span>⚠</span> 每章最小字数必须小于最大字数
            </p>
          )}
          <div className="mt-3 pt-3 border-t border-gray-200 flex items-center justify-between">
            <span className="text-xs text-gray-500">目标总字数</span>
            <span className="text-sm font-bold text-orange-600">{wordCount.toLocaleString()} 字</span>
          </div>
        </div>
      </div>

      {/* 底部按钮 */}
      <div className="px-5 py-4 border-t border-gray-100 bg-gradient-to-r from-gray-50 to-gray-100/50 flex-shrink-0">
        <button onClick={handleConfirm}
          className="w-full py-3 bg-gradient-to-r from-orange-500 to-rose-500 text-white rounded-xl font-semibold hover:from-orange-600 hover:to-rose-600 transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2 text-sm">
          <Sparkles className="w-4 h-4" />
          开始生成小说
        </button>
      </div>
    </div>
  )
}
