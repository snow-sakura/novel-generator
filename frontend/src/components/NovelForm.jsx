import { useState, useEffect } from 'react'
import { Sparkles, AlertTriangle, ChevronDown, ChevronUp, Settings, BookOpen } from 'lucide-react'
import { useNovelStore } from '../stores/novelStore'
import { cn } from '../lib/utils'
import { fetchGenres, fetchModels } from '../services/api'
import ModelConfig from './ModelConfig'
import PromptDisplay from './PromptDisplay'

export default function NovelForm({ onGenerate }) {
  const { params, setParams, generating, configChecked, configOk, configInfo, demoMode } = useNovelStore()
  const [error, setError] = useState('')
  const [genres, setGenres] = useState([])
  const [styles, setStyles] = useState([])
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [showPrompts, setShowPrompts] = useState(false)
  const [models, setModels] = useState([])

  // 加载题材列表
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

  // 切换频道时自动重置题材为第一个可用
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

  // 字数范围（对数分布：500~500000）
  const wordCountMarks = [
    { v: 500, l: '500' }, { v: 2000, l: '2K' }, { v: 5000, l: '5K' },
    { v: 10000, l: '1万' }, { v: 50000, l: '5万' }, { v: 100000, l: '10万' },
    { v: 500000, l: '50万' },
  ]

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* 配置警告 */}
      {configChecked && !configOk && !useNovelStore.getState().customModel && (
        <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-700">
          <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium">模型未配置</p>
            <p className="mt-0.5">{configInfo.error}</p>
            <p className="mt-1">可展开「自定义模型」手动配置，或修改 .env 后重启后端</p>
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

      {/* 第一步：频道选择（男频/女频） */}
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

      {/* 题材 */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">题材</label>
        <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto">
          {(genres.length > 0 ? genres : demoMode ? ['科幻末世', '都市脑洞', '玄幻脑洞'] : []).map(g => (
            <button key={g} type="button" onClick={() => setParams({ genre: g })} disabled={generating}
              className={cn('px-2.5 py-1.5 rounded-lg text-xs border transition-all',
                params.genre === g
                  ? 'bg-orange-500 text-white border-orange-500'
                  : 'bg-white text-gray-600 border-gray-200 hover:border-orange-300')}>
              {g}
            </button>
          ))}
        </div>
      </div>

      {/* 风格 */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">风格</label>
        <div className="flex flex-wrap gap-1.5">
          {(styles.length > 0 ? styles : []).map(s => (
            <button key={s} type="button" onClick={() => setParams({ style: s })} disabled={generating}
              className={cn('px-2.5 py-1.5 rounded-lg text-xs border transition-all',
                params.style === s
                  ? 'bg-orange-500 text-white border-orange-500'
                  : 'bg-white text-gray-600 border-gray-200 hover:border-orange-300')}>
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* 目标字数 */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">
          目标字数：<span className="text-orange-600 font-bold">{params.word_count.toLocaleString()}</span>
        </label>
        <input type="range" min={500} max={500000} step={100}
          value={params.word_count}
          onChange={e => {
            const wc = Number(e.target.value)
            setParams({ word_count: wc, per_chapter_max: Math.min(wc, Math.max(params.per_chapter_max, 800)) })
          }}
          disabled={generating}
          className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-orange-500" />
        <div className="flex justify-between text-xs text-gray-400 mt-1">
          {wordCountMarks.map(m => <span key={m.v}>{m.l}</span>)}
        </div>
      </div>

      {/* 每章字数范围（展开高级设置） */}
      <div>
        <button type="button" onClick={() => setShowAdvanced(!showAdvanced)}
          className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 transition-colors">
          <Settings className="w-3.5 h-3.5" />
          {showAdvanced ? '收起' : '展开'}高级设置
          {showAdvanced ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
        </button>
        {showAdvanced && (
          <div className="mt-3 space-y-3 p-3 bg-gray-50 rounded-xl">
            <div>
              <label className="text-xs text-gray-500">每章字数范围</label>
              <div className="flex items-center gap-3 mt-1">
                <input type="number" min={200} max={params.per_chapter_max}
                  value={params.per_chapter_min}
                  onChange={e => setParams({ per_chapter_min: Number(e.target.value) })}
                  disabled={generating}
                  className="w-full px-3 py-1.5 text-sm border rounded-lg" />
                <span className="text-gray-400">~</span>
                <input type="number" min={params.per_chapter_min} max={20000}
                  value={params.per_chapter_max}
                  onChange={e => setParams({ per_chapter_max: Number(e.target.value) })}
                  disabled={generating}
                  className="w-full px-3 py-1.5 text-sm border rounded-lg" />
              </div>
              <div className="flex justify-between text-xs text-gray-400 mt-1">
                <span>最小 {params.per_chapter_min} 字</span>
                <span>最大 {params.per_chapter_max} 字</span>
              </div>
            </div>
            {/* 自定义模型配置 */}
            <ModelConfig models={models} />
          </div>
        )}
      </div>

      {/* 提示词展示 */}
      <div>
        <button type="button" onClick={() => setShowPrompts(!showPrompts)}
          className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 transition-colors">
          <BookOpen className="w-3.5 h-3.5" />
          {showPrompts ? '收起' : '查看'}默认提示词
          {showPrompts ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
        </button>
        {showPrompts && <div className="mt-2"><PromptDisplay gender={params.gender} genre={params.genre} style={params.style} /></div>}
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
