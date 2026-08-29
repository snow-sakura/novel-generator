import { useState, useEffect } from 'react'
import { Sparkles, AlertTriangle, ChevronDown, ChevronUp, ChevronRight, Tags, X, BookOpen, Settings, Hash } from 'lucide-react'
import { useNovelStore } from '../stores/novelStore'
import { cn } from '../lib/utils'
import { fetchGenres } from '../services/api'

/* Demo 模式硬编码的题材列表 */
const DEMO_GENRES_MALE = ['东方玄幻', '异世大陆', '高武世界', '西方奇幻', '修真文明', '都市异能', '都市重生', '架空历史', '末世危机', '电子竞技', '传统武侠', '悬疑推理', '动漫同人']
const DEMO_GENRES_FEMALE = ['古代言情', '架空历史', '宫斗宅斗', '穿越奇情', '现代言情', '豪门世家', '青春校园', '玄幻言情', '仙侠奇缘', '悬疑推理', '快穿系统']
const DEMO_GENRES_ALL = ['东方玄幻', '异世大陆', '高武世界', '西方奇幻', '修真文明', '都市异能', '古代言情', '现代言情', '玄幻言情', '仙侠奇缘', '悬疑推理', '末世危机', '电子竞技', '传统武侠', '快穿系统']
const DEMO_STYLES = ['轻松搞笑', '热血燃系', '悬疑烧脑', '甜宠治愈', '暗黑深沉', '沙雕吐槽', '文艺致郁', '极简写实', '快节奏爽文', '慢热细腻', '脑洞大开', '硬核技术流']

const TABS = [
  { key: 'basic', label: '基础', icon: Settings },
  { key: 'genres', label: '题材', icon: Tags },
  { key: 'styles', label: '风格', icon: BookOpen },
  { key: 'words', label: '字数', icon: Hash },
]

export default function NovelForm({ onGenerate }) {
  const { params, setParams, generating, configChecked, configOk, configInfo, demoMode, customModel } = useNovelStore()
  const [error, setError] = useState('')
  const [genres, setGenres] = useState([])
  const [styles, setStyles] = useState([])
  const [activeTab, setActiveTab] = useState('basic')

  /* 加载题材列表 */
  useEffect(() => {
    if (!demoMode) {
      fetchGenres(params.gender).then(data => { setGenres(data.genres || []); setStyles(data.styles || []) })
    }
  }, [params.gender, demoMode])

  /* 切换频道时自动重置题材 */
  function handleGenderChange(gender) {
    setParams({ gender, selectedGenres: [], genre: '' })
    if (!demoMode) {
      fetchGenres(gender).then(data => {
        const gs = data.genres || []
        setGenres(gs)
        if (data.styles) setStyles(data.styles)
      })
    }
  }

  /* 切换题材（多选） */
  function toggleGenre(genre) {
    const current = params.selectedGenres || []
    const idx = current.indexOf(genre)
    let next
    if (idx >= 0) {
      next = current.filter(g => g !== genre)
    } else {
      next = [...current, genre]
    }
    setParams({ selectedGenres: next, genre: next.join('+') })
  }

  function toggleStyle(style) {
    const current = params.selectedStyles || ['轻松搞笑']
    const idx = current.indexOf(style)
    let next
    if (idx >= 0) {
      next = current.filter(s => s !== style)
      if (next.length === 0) next = [style] // 至少选一个
    } else {
      next = [...current, style]
    }
    setParams({ selectedStyles: next, style: next.join('+') })
  }

  function handleSubmit(e) {
    e.preventDefault(); setError('')
    if (!params.seed_text.trim()) { setError('请输入一句话作为种子'); return }
    if (params.seed_text.trim().length < 4) { setError('种子句至少4个字'); return }
    if (configChecked && !configOk && !demoMode && !customModel) { setError('模型未配置'); return }
    if (params.per_chapter_min > params.per_chapter_max) { setError('每章最小字数不能大于最大字数'); return }
    // 提交时确保 style 字段
    if (params.selectedStyles && params.selectedStyles.length > 0) {
      setParams({ style: params.selectedStyles.join('+') })
    }
    onGenerate()
  }

  /* ---- 反应式数字更新 ---- */
  function handleChapterCountChange(cc) {
    const safe = Math.max(1, Math.min(200, cc || 1))
    const avg = (params.per_chapter_min + params.per_chapter_max) / 2
    setParams({
      chapter_count: safe,
      word_count: Math.round(safe * avg),
    })
  }

  function handlePerChapterChange(min, max) {
    const newMin = Math.max(100, min || 100)
    const newMax = Math.max(newMin + 1, max || newMin + 1000)
    const avg = (newMin + newMax) / 2
    setParams({
      per_chapter_min: newMin,
      per_chapter_max: newMax,
      word_count: Math.round(params.chapter_count * avg),
    })
  }

  /* Demo 模式下的题材数据 */
  const displayGenres = [...new Set(
    genres.length > 0 ? genres
      : demoMode ? (params.gender === '男频' ? DEMO_GENRES_MALE : params.gender === '女频' ? DEMO_GENRES_FEMALE : DEMO_GENRES_ALL) : []
  )]
  const displayStyles = [...new Set(styles.length > 0 ? styles : demoMode ? DEMO_STYLES : [])]

  /* 选中数量统计 */
  const selectedGenresCount = (params.selectedGenres || []).length
  const selectedStylesCount = (params.selectedStyles || []).length

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* 配置警告 */}
      {configChecked && !configOk && !customModel && (
        <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-700">
          <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium">模型未配置</p>
            <p className="mt-0.5">{configInfo.error}</p>
            <p className="mt-1">点击顶部「设置」按钮配置模型</p>
          </div>
        </div>
      )}

      {/* TAB 导航 */}
      <div className="flex gap-1 p-1 bg-gray-100 rounded-xl">
        {TABS.map(tab => {
          const Icon = tab.icon
          const isActive = activeTab === tab.key
          let badge = null
          if (tab.key === 'genres' && selectedGenresCount > 0) badge = selectedGenresCount
          if (tab.key === 'styles' && selectedStylesCount > 0) badge = selectedStylesCount
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={cn(
                'flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-sm font-medium transition-all relative',
                isActive
                  ? 'bg-white text-orange-600 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              )}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
              {badge && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-orange-500 text-white text-[10px] rounded-full flex items-center justify-center">
                  {badge}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* TAB 内容 */}
      <div className="min-h-[180px]">
        {/* 基础 TAB */}
        {activeTab === 'basic' && (
          <div className="space-y-4">
            {/* 种子句 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">种子句 <span className="text-red-500">*</span></label>
              <textarea value={params.seed_text} onChange={e => setParams({ seed_text: e.target.value })}
                placeholder="例如：一个少年在废弃图书馆发现了一本会发光的书..."
                rows={3}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-orange-400 focus:ring-2 focus:ring-orange-100 outline-none resize-none transition-all"
                disabled={generating} />
            </div>

            {/* 频道选择 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">频道</label>
              <div className="flex gap-2">
                {[{ value: '男频', icon: '♂', label: '男频' }, { value: '女频', icon: '♀', label: '女频' }, { value: '无频', icon: '📚', label: '通用' }].map(g => (
                  <button key={g.value} type="button" onClick={() => handleGenderChange(g.value)} disabled={generating}
                    className={cn('flex-1 py-2.5 rounded-xl text-sm font-medium border transition-all',
                      params.gender === g.value
                        ? 'bg-gradient-to-r from-orange-500 to-rose-500 text-white border-transparent shadow-sm'
                        : 'bg-white text-gray-600 border-gray-200 hover:border-orange-300')}>
                    {g.icon} {g.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* 题材 TAB */}
        {activeTab === 'genres' && (
          <div className="space-y-3">
            <div className="grid grid-cols-3 gap-1.5 max-h-48 overflow-y-auto">
              {displayGenres.map(g => {
                const selected = (params.selectedGenres || []).includes(g)
                return (
                  <button key={g} type="button" onClick={() => toggleGenre(g)} disabled={generating}
                    className={cn('px-2 py-1.5 rounded-lg text-xs border transition-all text-center',
                      selected
                        ? 'bg-orange-500 text-white border-orange-500 shadow-sm'
                        : 'bg-white text-gray-600 border-gray-200 hover:border-orange-300')}>
                    {g}
                  </button>
                )
              })}
            </div>
            {(params.selectedGenres || []).length > 0 && (
              <div className="flex flex-wrap gap-1">
                {params.selectedGenres.map(g => (
                  <span key={g} className="inline-flex items-center gap-1 px-2 py-0.5 bg-orange-100 text-orange-700 rounded-full text-xs">
                    {g}
                    <button type="button" onClick={() => toggleGenre(g)}
                      className="hover:text-orange-900"><X className="w-3 h-3" /></button>
                  </span>
                ))}
              </div>
            )}
          </div>
        )}

        {/* 风格 TAB */}
        {activeTab === 'styles' && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-1.5">
              {displayStyles.map(s => {
                const selected = (params.selectedStyles || ['轻松搞笑']).includes(s)
                return (
                  <button key={s} type="button" onClick={() => toggleStyle(s)} disabled={generating}
                    className={cn('px-2 py-1.5 rounded-lg text-xs border transition-all text-center',
                      selected
                        ? 'bg-orange-500 text-white border-orange-500 shadow-sm'
                        : 'bg-white text-gray-600 border-gray-200 hover:border-orange-300')}>
                    {s}
                  </button>
                )
              })}
            </div>
            <div className="flex flex-wrap gap-1">
              {(params.selectedStyles || []).map(s => (
                <span key={s} className="inline-flex items-center gap-1 px-2 py-0.5 bg-orange-100 text-orange-700 rounded-full text-xs">
                  {s}
                  <button type="button" onClick={() => toggleStyle(s)}
                    className="hover:text-orange-900"><X className="w-3 h-3" /></button>
                </span>
              ))}
            </div>
          </div>
        )}

        {/* 字数 TAB */}
        {activeTab === 'words' && (
          <div className="space-y-4">
            {/* 章节数 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">章节数</label>
              <div className="flex items-center gap-2">
                <input type="number" min={1}
                  value={params.chapter_count}
                  onChange={e => handleChapterCountChange(Number(e.target.value))}
                  disabled={generating}
                  className="w-24 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:border-orange-400 outline-none text-center font-medium" />
                <span className="text-xs text-gray-400">章</span>
                <span className="text-xs text-gray-400 ml-auto">
                  每章约 {Math.round((params.per_chapter_min + params.per_chapter_max) / 2).toLocaleString()} 字
                </span>
              </div>
            </div>

            {/* 每章字数范围 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">每章字数范围</label>
              <div className="flex items-center gap-2">
                <input type="number" min={100}
                  value={params.per_chapter_min}
                  onChange={e => handlePerChapterChange(Number(e.target.value), params.per_chapter_max)}
                  disabled={generating}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:border-orange-400 outline-none text-center font-medium" />
                <span className="text-gray-400 flex-shrink-0">~</span>
                <input type="number" min={params.per_chapter_min + 1}
                  value={params.per_chapter_max}
                  onChange={e => handlePerChapterChange(params.per_chapter_min, Number(e.target.value))}
                  disabled={generating}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:border-orange-400 outline-none text-center font-medium" />
              </div>
              {params.per_chapter_min >= params.per_chapter_max && (
                <p className="text-xs text-red-500 mt-1">每章最小字数必须小于最大字数</p>
              )}
            </div>

            {/* 目标字数（只读） */}
            <div className="pt-2 border-t border-gray-200">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-gray-700">目标总字数</label>
                <span className="text-orange-600 font-bold text-lg">{params.word_count.toLocaleString()} 字</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 错误 */}
      {error && <p className="text-red-500 text-sm flex items-start gap-1.5"><AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" /><span>{error}</span></p>}

      {/* 提交 */}
      <button type="submit" disabled={generating}
        className={cn(
          'w-full py-3 rounded-xl font-medium transition-all flex items-center justify-center gap-2 shadow-sm',
          generating
            ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
            : configChecked && !configOk && !customModel
            ? 'bg-amber-400 hover:bg-amber-500 text-white'
            : 'bg-gradient-to-r from-orange-500 to-rose-500 hover:from-orange-600 hover:to-rose-600 text-white')}>
        <Sparkles className="w-5 h-5" />
        {generating ? '生成中...' : '✨ 开始生成小说'}
      </button>
    </form>
  )
}
