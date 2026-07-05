import { useState, useEffect } from 'react'
import { Sparkles, AlertTriangle, ChevronDown, ChevronUp, ChevronRight, Settings, BookOpen, Cpu, Tags } from 'lucide-react'
import { useNovelStore, calcChapterCount, calcWordCount } from '../stores/novelStore'
import { cn } from '../lib/utils'
import { fetchGenres, fetchModels } from '../services/api'
import ModelConfig from './ModelConfig'
import PromptDisplay from './PromptDisplay'

/* Demo 模式硬编码的题材列表 */
const DEMO_GENRES_MALE = ['科幻末世', '都市脑洞', '玄幻脑洞', '修仙仙侠', '神医赘婿', '末日求生', '游戏竞技', '穿越历史', '悬疑推理', '无敌爽文']
const DEMO_GENRES_FEMALE = ['古代言情', '现代言情', '幻想言情', '重生逆袭', '豪门总裁', '宫斗宅斗', '仙侠奇缘', '甜宠恋爱']
const DEMO_STYLES = ['轻松搞笑', '热血燃系', '悬疑烧脑', '甜宠治愈', '暗黑深沉', '沙雕吐槽', '文艺致郁', '极简写实']

export default function NovelForm({ onGenerate }) {
  const { params, setParams, generating, configChecked, configOk, configInfo, demoMode } = useNovelStore()
  const [error, setError] = useState('')
  const [genres, setGenres] = useState([])
  const [styles, setStyles] = useState([])
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [showGenres, setShowGenres] = useState(false)
  const [showStyles, setShowStyles] = useState(false)
  const [models, setModels] = useState([])

  /* 加载题材列表 */
  useEffect(() => {
    if (!demoMode) {
      fetchGenres(params.gender).then(data => { setGenres(data.genres || []); setStyles(data.styles || []) })
    }
  }, [params.gender, demoMode])

  useEffect(() => {
    if (!demoMode) {
      fetchModels().then(data => setModels(data.models || []))
    }
  }, [demoMode])

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

  function handleSubmit(e) {
    e.preventDefault(); setError('')
    if (!params.seed_text.trim()) { setError('请输入一句话作为种子'); return }
    if (params.seed_text.trim().length < 4) { setError('种子句至少4个字'); return }
    if (configChecked && !configOk && !demoMode && !useNovelStore.getState().customModel) { setError('模型未配置'); return }
    if (params.per_chapter_min > params.per_chapter_max) { setError('每章最小字数不能大于最大字数'); return }
    onGenerate()
  }

  /* ---- 反应式数字更新 ---- */
  function handleWordCountChange(wc) {
    setParams({ word_count: wc, chapter_count: calcChapterCount({ word_count: wc, per_chapter_min: params.per_chapter_min, per_chapter_max: params.per_chapter_max }) })
  }

  function handleChapterCountChange(cc) {
    const safe = Math.max(1, Math.min(200, cc || 1))
    setParams({ chapter_count: safe, word_count: calcWordCount({ chapter_count: safe, per_chapter_min: params.per_chapter_min, per_chapter_max: params.per_chapter_max }) })
  }

  function handlePerChapterChange(min, max) {
    const newMin = min || 200
    const newMax = max || 20000
    if (newMin > newMax) return
    setParams({
      per_chapter_min: newMin,
      per_chapter_max: newMax,
      chapter_count: calcChapterCount({ word_count: params.word_count, per_chapter_min: newMin, per_chapter_max: newMax }),
    })
  }

  /* 字数范围标记 */
  const wordCountMarks = [
    { v: 500, l: '500' }, { v: 2000, l: '2K' }, { v: 5000, l: '5K' },
    { v: 10000, l: '1万' }, { v: 50000, l: '5万' }, { v: 100000, l: '10万' },
    { v: 500000, l: '50万' },
  ]

  /* Demo 模式下的题材数据 */
  const displayGenres = genres.length > 0 ? genres
    : demoMode ? (params.gender === '男频' ? DEMO_GENRES_MALE : DEMO_GENRES_FEMALE) : []
  const displayStyles = styles.length > 0 ? styles
    : demoMode ? DEMO_STYLES : []

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* 配置警告 */}
      {configChecked && !configOk && !useNovelStore.getState().customModel && (
        <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-700">
          <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium">模型未配置</p>
            <p className="mt-0.5">{configInfo.error}</p>
            <p className="mt-1">展开「高级设置 → 模型配置」手动配置</p>
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

      {/* 题材（可折叠网格） */}
      <div>
        <button type="button" onClick={() => setShowGenres(!showGenres)}
          className="flex items-center gap-1.5 text-sm font-medium text-gray-700 mb-1.5 w-full text-left hover:text-gray-900 transition-colors">
          <Tags className="w-4 h-4" />
          题材
          <span className="text-xs text-gray-400 font-normal">（{displayGenres.length} 种）</span>
          {showGenres ? <ChevronDown className="w-3.5 h-3.5 ml-auto" /> : <ChevronRight className="w-3.5 h-3.5 ml-auto" />}
        </button>
        {showGenres && (
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

      {/* 风格（可折叠网格） */}
      {displayStyles.length > 0 && (
        <div>
          <button type="button" onClick={() => setShowStyles(!showStyles)}
            className="flex items-center gap-1.5 text-sm font-medium text-gray-700 mb-1.5 w-full text-left hover:text-gray-900 transition-colors">
            <BookOpen className="w-4 h-4" />
            风格
            <span className="text-xs text-gray-400 font-normal">（{displayStyles.length} 种）</span>
            {showStyles ? <ChevronDown className="w-3.5 h-3.5 ml-auto" /> : <ChevronRight className="w-3.5 h-3.5 ml-auto" />}
          </button>
          {showStyles && (
            <div className="grid grid-cols-2 gap-1.5">
              {displayStyles.map(s => (
                <button key={s} type="button" onClick={() => setParams({ style: s })} disabled={generating}
                  className={cn('px-2 py-1.5 rounded-lg text-xs border transition-all text-center',
                    params.style === s
                      ? 'bg-orange-500 text-white border-orange-500 shadow-sm'
                      : 'bg-white text-gray-600 border-gray-200 hover:border-orange-300')}>
                  {s}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── 核心参数：目标字数 + 章节数 ── */}
      <div className="bg-gradient-to-br from-orange-50 to-rose-50 rounded-xl p-4 border border-orange-100 space-y-3">
        {/* 目标字数 */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-sm font-medium text-gray-700">目标字数</label>
            <span className="text-orange-600 font-bold text-sm">{params.word_count.toLocaleString()} 字</span>
          </div>
          <input type="range" min={500} max={500000} step={100}
            value={params.word_count}
            onChange={e => handleWordCountChange(Number(e.target.value))}
            disabled={generating}
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-orange-500" />
          <div className="flex justify-between text-xs text-gray-400 mt-1">
            {wordCountMarks.map(m => <span key={m.v}>{m.l}</span>)}
          </div>
        </div>

        {/* 章节数 */}
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
            每章约 {Math.round(params.word_count / params.chapter_count).toLocaleString()} 字
          </p>
        </div>

        {/* 每章字数范围 */}
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
      </div>

      {/* ── 高级设置（section 卡片） ── */}
      <div>
        <button type="button" onClick={() => setShowAdvanced(!showAdvanced)}
          className="flex items-center gap-1.5 text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors">
          <Settings className="w-4 h-4" />
          {showAdvanced ? '收起' : '展开'}高级设置
          {showAdvanced ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>

        {showAdvanced && (
          <div className="mt-3 space-y-3">
            {/* Section 1: 章节设置 */}
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <div className="flex items-center gap-2 mb-3 pb-2 border-b border-gray-100">
                <BookOpen className="w-4 h-4 text-orange-500" />
                <span className="text-sm font-medium text-gray-800">章节设置</span>
              </div>
              <div className="space-y-3">
                <div>
                  <label className="text-xs text-gray-500">章节数</label>
                  <input type="number" min={1} max={200}
                    value={params.chapter_count}
                    onChange={e => handleChapterCountChange(Number(e.target.value))}
                    disabled={generating}
                    className="w-full px-3 py-1.5 text-sm border border-gray-200 rounded-lg mt-1 focus:border-orange-400 outline-none" />
                </div>
                <div>
                  <label className="text-xs text-gray-500">每章字数范围</label>
                  <div className="flex items-center gap-2 mt-1">
                    <input type="number" min={200} max={params.per_chapter_max}
                      value={params.per_chapter_min}
                      onChange={e => handlePerChapterChange(Number(e.target.value), params.per_chapter_max)}
                      disabled={generating}
                      className="w-full px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:border-orange-400 outline-none" />
                    <span className="text-gray-400">~</span>
                    <input type="number" min={params.per_chapter_min} max={20000}
                      value={params.per_chapter_max}
                      onChange={e => handlePerChapterChange(params.per_chapter_min, Number(e.target.value))}
                      disabled={generating}
                      className="w-full px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:border-orange-400 outline-none" />
                  </div>
                </div>
                <p className="text-xs text-gray-400">
                  调整后将重新计算总字数（当前 {params.word_count.toLocaleString()} 字 / {params.chapter_count} 章）
                </p>
              </div>
            </div>

            {/* Section 2: 模型配置 */}
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <div className="flex items-center gap-2 mb-3 pb-2 border-b border-gray-100">
                <Cpu className="w-4 h-4 text-orange-500" />
                <span className="text-sm font-medium text-gray-800">模型配置</span>
              </div>
              <ModelConfig models={models} />
            </div>

            {/* Section 3: 提示词 */}
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <div className="flex items-center gap-2 mb-3 pb-2 border-b border-gray-100">
                <BookOpen className="w-4 h-4 text-orange-500" />
                <span className="text-sm font-medium text-gray-800">提示词</span>
              </div>
              <PromptDisplay gender={params.gender} genre={params.genre} style={params.style} />
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
            : configChecked && !configOk && !useNovelStore.getState().customModel
            ? 'bg-amber-400 hover:bg-amber-500 text-white'
            : 'bg-gradient-to-r from-orange-500 to-rose-500 hover:from-orange-600 hover:to-rose-600 text-white')}>
        <Sparkles className="w-5 h-5" />
        {generating ? '生成中...' : '✨ 开始生成小说'}
      </button>
    </form>
  )
}
