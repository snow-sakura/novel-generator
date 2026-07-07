import { useState, useEffect } from 'react'
import { Sparkles, AlertTriangle, ChevronDown, ChevronRight, Tags, X, BookOpen } from 'lucide-react'
import { useNovelStore } from '../stores/novelStore'
import { cn } from '../lib/utils'
import { fetchGenres } from '../services/api'

/* Demo 模式硬编码的题材列表 */
const DEMO_GENRES_MALE = ['科幻末世', '都市脑洞', '玄幻脑洞', '修仙仙侠', '神医赘婿', '末日求生', '游戏竞技', '穿越历史', '悬疑推理', '无敌爽文']
const DEMO_GENRES_FEMALE = ['古代言情', '现代言情', '幻想言情', '重生逆袭', '豪门总裁', '宫斗宅斗', '仙侠奇缘', '甜宠恋爱']
const DEMO_STYLES = ['轻松搞笑', '热血燃系', '悬疑烧脑', '甜宠治愈', '暗黑深沉', '沙雕吐槽', '文艺致郁', '极简写实']

export default function NovelForm({ onGenerate }) {
  const { params, setParams, generating, configChecked, configOk, configInfo, demoMode } = useNovelStore()
  const [error, setError] = useState('')
  const [genres, setGenres] = useState([])
  const [styles, setStyles] = useState([])
  const [expandedSection, setExpandedSection] = useState(null) // null | 'genres' | 'styles'

  /* 加载题材列表 */
  useEffect(() => {
    if (!demoMode) {
      fetchGenres(params.gender).then(data => { setGenres(data.genres || []); setStyles(data.styles || []) })
    }
  }, [params.gender, demoMode])

  /* 切换频道时自动重置题材 */
  function handleGenderChange(gender) {
    setParams({ gender })
    if (!demoMode) {
      fetchGenres(gender).then(data => {
        const gs = data.genres || []
        setGenres(gs)
        if (gs.length > 0 && !gs.includes(params.genre)) setParams({ genre: gs[0] })
        if (data.styles) setStyles(data.styles)
      })
    }
  }

  function toggleSection(section) {
    setExpandedSection(prev => prev === section ? null : section)
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
    if (configChecked && !configOk && !demoMode && !useNovelStore.getState().customModel) { setError('模型未配置'); return }
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
    const newMin = min || 200
    const newMax = max || 20000
    if (newMin > newMax) return
    const avg = (newMin + newMax) / 2
    setParams({
      per_chapter_min: newMin,
      per_chapter_max: newMax,
      word_count: Math.round(params.chapter_count * avg),
    })
  }

  /* Demo 模式下的题材数据 */
  const displayGenres = genres.length > 0 ? genres
    : demoMode ? (params.gender === '男频' ? DEMO_GENRES_MALE : DEMO_GENRES_FEMALE) : []
  const displayStyles = styles.length > 0 ? styles
    : demoMode ? DEMO_STYLES : []

  const minTotal = params.chapter_count * params.per_chapter_min
  const maxTotal = params.chapter_count * params.per_chapter_max

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* 配置警告 */}
      {configChecked && !configOk && !useNovelStore.getState().customModel && (
        <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-700">
          <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium">模型未配置</p>
            <p className="mt-0.5">{configInfo.error}</p>
            <p className="mt-1">点击顶部「设置」按钮配置模型</p>
          </div>
        </div>
      )}

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
          {['男频', '女频'].map(g => (
            <button key={g} type="button" onClick={() => handleGenderChange(g)} disabled={generating}
              className={cn('flex-1 py-2.5 rounded-xl text-sm font-medium border transition-all',
                params.gender === g
                  ? 'bg-gradient-to-r from-orange-500 to-rose-500 text-white border-transparent shadow-sm'
                  : 'bg-white text-gray-600 border-gray-200 hover:border-orange-300')}>
              {g === '男频' ? '♂ ' : '♀ '}{g}
            </button>
          ))}
        </div>
      </div>

      {/* 题材（可折叠网格）与风格互斥折叠 */}
      <div>
        <button type="button" onClick={() => toggleSection('genres')}
          className="flex items-center gap-1.5 text-sm font-medium text-gray-700 mb-1.5 w-full text-left hover:text-gray-900 transition-colors">
          <Tags className="w-4 h-4" />
          题材
          <span className="text-xs text-gray-400 font-normal">（{displayGenres.length} 种）</span>
          {expandedSection === 'genres' ? <ChevronDown className="w-3.5 h-3.5 ml-auto" /> : <ChevronRight className="w-3.5 h-3.5 ml-auto" />}
        </button>
        {expandedSection === 'genres' && (
          <div className="grid grid-cols-3 gap-1.5 max-h-64 overflow-y-auto">
            {displayGenres.map(g => (
              <button key={g} type="button" onClick={() => setParams({ genre: g })} disabled={generating}
                className={cn('px-2 py-1.5 rounded-lg text-xs border transition-all text-center',
                  params.genre === g
                    ? 'bg-orange-500 text-white border-orange-500 shadow-sm'
                    : 'bg-white text-gray-600 border-gray-200 hover:border-orange-300')}>
                {g}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* 风格（可折叠网格，多选） */}
      {displayStyles.length > 0 && (
        <div>
          <button type="button" onClick={() => toggleSection('styles')}
            className="flex items-center gap-1.5 text-sm font-medium text-gray-700 mb-1.5 w-full text-left hover:text-gray-900 transition-colors">
            <BookOpen className="w-4 h-4" />
            风格 <span className="text-xs text-orange-500 font-normal">（可多选）</span>
            <span className="text-xs text-gray-400 font-normal">（{displayStyles.length} 种）</span>
            {expandedSection === 'styles' ? <ChevronDown className="w-3.5 h-3.5 ml-auto" /> : <ChevronRight className="w-3.5 h-3.5 ml-auto" />}
          </button>
          {expandedSection === 'styles' && (
            <div>
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
              <div className="flex flex-wrap gap-1 mt-2">
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
        </div>
      )}

      {/* ── V2 新增：叙事视角 ── */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">叙事视角</label>
        <select value={params.pov} onChange={e => setParams({ pov: e.target.value })} disabled={generating}
          className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:border-orange-400 focus:ring-2 focus:ring-orange-100 outline-none">
          <option value="第一人称">第一人称 — 以「我」叙述，代入感强</option>
          <option value="第三人称有限">第三人称有限 — 跟随主角视角</option>
          <option value="上帝视角">上帝视角 — 全知视角，可切换多角色</option>
        </select>
      </div>

      {/* ── V2 新增：节奏模式 ── */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">节奏模式</label>
        <div className="flex gap-2">
          {['紧凑型', '标准型', '舒缓型'].map(p => (
            <button key={p} type="button" onClick={() => setParams({ pacing: p })} disabled={generating}
              className={cn('flex-1 py-2 rounded-xl text-xs font-medium border transition-all',
                params.pacing === p
                  ? 'bg-orange-500 text-white border-orange-500 shadow-sm'
                  : 'bg-white text-gray-600 border-gray-200 hover:border-orange-300')}>
              {p === '紧凑型' ? '⚡ 紧凑' : p === '标准型' ? '⚖️ 标准' : '🌿 舒缓'}
            </button>
          ))}
        </div>
      </div>

      {/* ── V2 新增：风格强度（仅在选择风格时显示） ── */}
      {(params.selectedStyles || []).length > 0 && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">风格强度</label>
          <div className="flex gap-2">
            {['轻度', '中度', '重度'].map(i => (
              <button key={i} type="button" onClick={() => setParams({ style_intensity: i })} disabled={generating}
                className={cn('flex-1 py-2 rounded-xl text-xs font-medium border transition-all',
                  params.style_intensity === i
                    ? 'bg-orange-500 text-white border-orange-500 shadow-sm'
                    : 'bg-white text-gray-600 border-gray-200 hover:border-orange-300')}>
                {i === '轻度' ? '轻' : i === '中度' ? '中' : '重'}
              </button>
            ))}
          </div>
          <p className="text-xs text-gray-400 mt-1">
            {params.style_intensity === '轻度' ? '偶尔体现风格特征' :
             params.style_intensity === '中度' ? '适度体现，默认推荐' : '通篇强化风格表现'}
          </p>
        </div>
      )}

      {/* ── V2 新增：叙事张力 ── */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">叙事张力</label>
        <div className="flex gap-3">
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={params.enable_suspense}
              onChange={e => setParams({ enable_suspense: e.target.checked })}
              disabled={generating}
              className="w-4 h-4 text-orange-500 border-gray-300 rounded focus:ring-orange-400" />
            <span className="text-sm text-gray-600">启用悬念</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={params.enable_twist}
              onChange={e => setParams({ enable_twist: e.target.checked })}
              disabled={generating}
              className="w-4 h-4 text-orange-500 border-gray-300 rounded focus:ring-orange-400" />
            <span className="text-sm text-gray-600">启用反转</span>
          </label>
        </div>
      </div>

      {/* ── 核心参数：章节数 → 每章范围 → 目标字数（自动计算） ── */}
      <div className="bg-gradient-to-br from-orange-50 to-rose-50 rounded-xl p-4 border border-orange-100 space-y-3">
        {/* 章节数（最上方） */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">章节数</label>
          <div className="flex items-center gap-3">
            <input type="range" min={1} max={200} step={1}
              value={params.chapter_count}
              onChange={e => handleChapterCountChange(Number(e.target.value))}
              disabled={generating}
              className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-orange-500" />
            <input type="number" min={1} max={200}
              value={params.chapter_count}
              onChange={e => handleChapterCountChange(Number(e.target.value))}
              disabled={generating}
              className="w-16 px-2 py-1 text-sm text-center border border-gray-200 rounded-lg focus:border-orange-400 outline-none" />
            <span className="text-xs text-gray-400 flex-shrink-0">章</span>
          </div>
          <p className="text-xs text-gray-400 mt-1">
            每章约 {Math.round((params.per_chapter_min + params.per_chapter_max) / 2).toLocaleString()} 字
          </p>
        </div>

        {/* 每章字数范围（中间） */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">每章字数范围</label>
          <div className="flex items-center gap-2">
            <input type="number" min={200} max={params.per_chapter_max}
              value={params.per_chapter_min}
              onChange={e => handlePerChapterChange(Number(e.target.value), params.per_chapter_max)}
              disabled={generating}
              className="w-full px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:border-orange-400 outline-none" />
            <span className="text-gray-400 flex-shrink-0">~</span>
            <input type="number" min={params.per_chapter_min} max={20000}
              value={params.per_chapter_max}
              onChange={e => handlePerChapterChange(params.per_chapter_min, Number(e.target.value))}
              disabled={generating}
              className="w-full px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:border-orange-400 outline-none" />
          </div>
          <div className="flex justify-between text-xs text-gray-400 mt-1">
            <span>最少 {params.per_chapter_min} 字/章</span>
            <span>最多 {params.per_chapter_max} 字/章</span>
          </div>
        </div>

        {/* 目标字数（最下方，只读） */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-sm font-medium text-gray-700">目标字数 <span className="text-xs text-gray-400 font-normal">（自动计算）</span></label>
            <span className="text-orange-600 font-bold text-sm">{params.word_count.toLocaleString()} 字</span>
          </div>
          <div className="w-full h-2 bg-gray-200 rounded-lg relative">
            <div className="h-full bg-gradient-to-r from-orange-300 to-orange-500 rounded-lg"
              style={{ width: `${Math.min(100, (params.word_count / maxTotal) * 100)}%` }} />
          </div>
          <div className="flex justify-between text-xs text-gray-400 mt-1">
            <span>{minTotal.toLocaleString()} 字</span>
            <span>{maxTotal.toLocaleString()} 字（上限）</span>
          </div>
        </div>
      </div>

      {/* 错误 */}
      {error && <p className="text-red-500 text-sm flex items-start gap-1.5"><AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" /><span>{error}</span></p>}

      {/* 提交 */}
      <button type="submit" disabled={generating}
        className={cn(
          'w-full py-3 rounded-xl font-medium transition-all flex items-center justify-center gap-2 shadow-sm',
          generating
            ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
            : configChecked && !configOk && !useNovelStore.getState().customModel
            ? 'bg-amber-400 hover:bg-amber-500 text-white'
            : 'bg-gradient-to-r from-orange-500 to-rose-500 hover:from-orange-600 hover:to-rose-600 text-white')}>
        <Sparkles className="w-5 h-5" />
        {generating ? '生成中...' : '✨ 开始生成小说'}
      </button>
    </form>
  )
}
