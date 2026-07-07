import { useState, useEffect } from 'react'
import { Tags, BookOpen, ChevronDown, ChevronRight, X, Sparkles, Loader2 } from 'lucide-react'
import { cn } from '../lib/utils'
import { fetchGenres } from '../services/api'

const DEMO_GENRES_MALE = ['科幻末世', '都市脑洞', '玄幻脑洞', '修仙仙侠', '神医赘婿', '末日求生', '游戏竞技', '穿越历史', '悬疑推理', '无敌爽文']
const DEMO_GENRES_FEMALE = ['古代言情', '现代言情', '幻想言情', '重生逆袭', '豪门总裁', '宫斗宅斗', '仙侠奇缘', '甜宠恋爱']
const DEMO_STYLES = ['轻松搞笑', '热血燃系', '悬疑烧脑', '甜宠治愈', '暗黑深沉', '沙雕吐槽', '文艺致郁', '极简写实']

export default function ChatOptionSelector({ seedText, onConfirm, onCancel }) {
  const [gender, setGender] = useState('男频')
  const [genre, setGenre] = useState('都市脑洞')
  const [selectedStyles, setSelectedStyles] = useState(['轻松搞笑'])
  const [chapterCount, setChapterCount] = useState(2)
  const [perChapterMin, setPerChapterMin] = useState(800)
  const [perChapterMax, setPerChapterMax] = useState(2500)
  const [genres, setGenres] = useState([])
  const [styles, setStyles] = useState([])
  const [expandedSection, setExpandedSection] = useState('genres')

  useEffect(() => {
    fetchGenres(gender).then(data => {
      setGenres(data.genres || [])
      setStyles(data.styles || [])
    })
  }, [gender])

  function handleGenderChange(g) {
    setGender(g)
    fetchGenres(g).then(data => {
      const gs = data.genres || []
      setGenres(gs)
      if (gs.length > 0) setGenre(gs[0])
      if (data.styles) setStyles(data.styles)
    })
  }

  function toggleSection(section) {
    setExpandedSection(prev => prev === section ? null : section)
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

  const displayGenres = genres.length > 0 ? genres : (gender === '男频' ? DEMO_GENRES_MALE : DEMO_GENRES_FEMALE)
  const displayStyles = styles.length > 0 ? styles : DEMO_STYLES

  function handleConfirm() {
    onConfirm({
      seed_text: seedText,
      gender,
      genre,
      style: selectedStyles.join('+'),
      selectedStyles,
      chapter_count: chapterCount,
      per_chapter_min: perChapterMin,
      per_chapter_max: perChapterMax,
      word_count: wordCount,
    })
  }

  return (
    <div className="bg-white rounded-2xl border border-orange-200 shadow-sm overflow-hidden">
      <div className="bg-gradient-to-r from-orange-50 to-rose-50 px-4 py-3 border-b border-orange-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-orange-500" />
          <span className="text-sm font-semibold text-gray-800">选择创作参数</span>
        </div>
        <button onClick={onCancel} className="p-1 text-gray-400 hover:text-gray-600 hover:bg-white/50 rounded-lg transition-all">
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="p-4 space-y-4 max-h-[400px] overflow-y-auto">
        <div className="flex gap-2">
          {['男频', '女频'].map(g => (
            <button key={g} type="button" onClick={() => handleGenderChange(g)}
              className={cn('flex-1 py-2 rounded-xl text-sm font-medium border transition-all',
                gender === g
                  ? 'bg-gradient-to-r from-orange-500 to-rose-500 text-white border-transparent shadow-sm'
                  : 'bg-white text-gray-600 border-gray-200 hover:border-orange-300')}>
              {g === '男频' ? '♂ ' : '♀ '}{g}
            </button>
          ))}
        </div>

        <div>
          <button type="button" onClick={() => toggleSection('genres')}
            className="flex items-center gap-1.5 text-sm font-medium text-gray-700 mb-1.5 w-full text-left hover:text-gray-900 transition-colors">
            <Tags className="w-4 h-4" />
            题材
            {expandedSection === 'genres' ? <ChevronDown className="w-3.5 h-3.5 ml-auto" /> : <ChevronRight className="w-3.5 h-3.5 ml-auto" />}
          </button>
          {expandedSection === 'genres' && (
            <div className="grid grid-cols-3 gap-1.5 max-h-40 overflow-y-auto">
              {displayGenres.map(g => (
                <button key={g} type="button" onClick={() => setGenre(g)}
                  className={cn('px-2 py-1.5 rounded-lg text-xs border transition-all text-center',
                    genre === g
                      ? 'bg-orange-500 text-white border-orange-500 shadow-sm'
                      : 'bg-white text-gray-600 border-gray-200 hover:border-orange-300')}>
                  {g}
                </button>
              ))}
            </div>
          )}
        </div>

        <div>
          <button type="button" onClick={() => toggleSection('styles')}
            className="flex items-center gap-1.5 text-sm font-medium text-gray-700 mb-1.5 w-full text-left hover:text-gray-900 transition-colors">
            <BookOpen className="w-4 h-4" />
            风格 <span className="text-xs text-orange-500 font-normal">（可多选）</span>
            {expandedSection === 'styles' ? <ChevronDown className="w-3.5 h-3.5 ml-auto" /> : <ChevronRight className="w-3.5 h-3.5 ml-auto" />}
          </button>
          {expandedSection === 'styles' && (
            <div>
              <div className="grid grid-cols-2 gap-1.5">
                {displayStyles.map(s => {
                  const selected = selectedStyles.includes(s)
                  return (
                    <button key={s} type="button" onClick={() => toggleStyle(s)}
                      className={cn('px-2 py-1.5 rounded-lg text-xs border transition-all text-center',
                        selected
                          ? 'bg-orange-500 text-white border-orange-500 shadow-sm'
                          : 'bg-white text-gray-600 border-gray-200 hover:border-orange-300')}>
                      {s}
                    </button>
                  )
                })}
              </div>
              <div className="flex flex-wrap gap-1 mt-2">
                {selectedStyles.map(s => (
                  <span key={s} className="inline-flex items-center gap-1 px-2 py-0.5 bg-orange-100 text-orange-700 rounded-full text-xs">
                    {s}
                    <button type="button" onClick={() => toggleStyle(s)} className="hover:text-orange-900"><X className="w-3 h-3" /></button>
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="bg-gradient-to-br from-orange-50 to-rose-50 rounded-xl p-3 border border-orange-100 space-y-2">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">章节数</label>
            <div className="flex items-center gap-2">
              <input type="range" min={1} max={50} value={chapterCount}
                onChange={e => setChapterCount(Number(e.target.value))}
                className="flex-1 h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-orange-500" />
              <span className="text-sm font-medium text-orange-600 w-8 text-right">{chapterCount}</span>
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">每章字数</label>
            <div className="flex items-center gap-2">
              <input type="number" min={200} max={perChapterMax} value={perChapterMin}
                onChange={e => setPerChapterMin(Number(e.target.value))}
                className="w-full px-2 py-1 text-xs border border-gray-200 rounded-lg focus:border-orange-400 outline-none" />
              <span className="text-gray-400 text-xs">~</span>
              <input type="number" min={perChapterMin} max={20000} value={perChapterMax}
                onChange={e => setPerChapterMax(Number(e.target.value))}
                className="w-full px-2 py-1 text-xs border border-gray-200 rounded-lg focus:border-orange-400 outline-none" />
            </div>
          </div>
          <div className="flex items-center justify-between text-xs text-gray-500 pt-1 border-t border-orange-100">
            <span>目标字数</span>
            <span className="font-bold text-orange-600">{wordCount.toLocaleString()} 字</span>
          </div>
        </div>
      </div>

      <div className="border-t border-gray-100 p-3">
        <button onClick={handleConfirm}
          className="w-full py-2.5 bg-gradient-to-r from-orange-500 to-rose-500 text-white rounded-xl font-medium hover:from-orange-600 hover:to-rose-600 transition-all shadow-sm flex items-center justify-center gap-2 text-sm">
          <Sparkles className="w-4 h-4" />
          开始生成
        </button>
      </div>
    </div>
  )
}