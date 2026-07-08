import { useState, useEffect } from 'react'
import { Sparkles, AlertTriangle, ChevronDown, ChevronRight, Tags, X, BookOpen, Eye, Zap, Sliders, Shield, PenLine, Type, Layers, StopCircle } from 'lucide-react'
import { useNovelStore } from '../stores/novelStore'
import { cn } from '../lib/utils'
import { fetchGenres } from '../services/api'

const DEMO_GENRES_MALE = ['科幻末世', '都市脑洞', '玄幻脑洞', '修仙仙侠', '神医赘婿', '末日求生', '游戏竞技', '穿越历史', '悬疑推理', '无敌爽文']
const DEMO_GENRES_FEMALE = ['古代言情', '现代言情', '幻想言情', '重生逆袭', '豪门总裁', '宫斗宅斗', '仙侠奇缘', '甜宠恋爱']
const DEMO_STYLES = ['轻松搞笑', '热血燃系', '悬疑烧脑', '甜宠治愈', '暗黑深沉', '沙雕吐槽', '文艺致郁', '极简写实']

function SectionHeader({ icon: Icon, label, count, badge, expanded, onToggle, color = 'orange' }) {
  const colorMap = { orange: 'text-orange-600 bg-orange-50', purple: 'text-purple-600 bg-purple-50', blue: 'text-blue-600 bg-blue-50' }
  const c = colorMap[color] || colorMap.orange
  return (
    <button type="button" onClick={onToggle} className="section-toggle">
      <span className={cn('section-toggle-icon', c)}>
        <Icon className="w-3.5 h-3.5" />
      </span>
      <span className="section-toggle-label">{label}</span>
      {badge && <span className="text-[10px] text-orange-500 bg-orange-50 px-1.5 py-0.5 rounded-full font-medium">{badge}</span>}
      {count != null && <span className="text-[11px] text-gray-400">({count})</span>}
      <span className={cn('ml-auto transition-transform duration-200', expanded && 'rotate-180')}>
        <ChevronDown className="w-3.5 h-3.5 text-gray-300" />
      </span>
    </button>
  )
}

function ChipGrid({ items, selected, onSelect, color = 'orange', columns = 3 }) {
  const colorMap = {
    orange: { active: 'bg-orange-500 text-white border-orange-500 shadow-sm', inactive: 'bg-white text-gray-600 border-gray-200 hover:border-orange-300 hover:text-orange-600 hover:shadow-sm' },
    purple: { active: 'bg-purple-500 text-white border-purple-500 shadow-sm', inactive: 'bg-white text-gray-600 border-gray-200 hover:border-purple-300 hover:text-purple-600 hover:shadow-sm' },
    blue: { active: 'bg-blue-500 text-white border-blue-500 shadow-sm', inactive: 'bg-white text-gray-600 border-gray-200 hover:border-blue-300 hover:text-blue-600 hover:shadow-sm' },
  }
  const c = colorMap[color] || colorMap.orange
  const isSelected = (item) => Array.isArray(selected) ? selected.includes(item) : selected === item
  const handleClick = (item) => {
    if (Array.isArray(selected)) {
      const current = selected
      const idx = current.indexOf(item)
      let next
      if (idx >= 0) {
        next = current.filter(s => s !== item)
        if (next.length === 0) next = [item]
      } else {
        next = [...current, item]
      }
      onSelect(next)
    } else {
      onSelect(item)
    }
  }
  return (
    <div className="grid gap-1.5" style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}>
      {items.map(item => (
        <button key={item} type="button" onClick={() => handleClick(item)}
          className={cn('chip', isSelected(item) ? c.active : c.inactive)}>
          {item}
        </button>
      ))}
    </div>
  )
}

function Section({ icon, label, badge, count, color, expanded, onToggle, children, className }) {
  return (
    <div className={cn('space-y-2', className)}>
      <SectionHeader icon={icon} label={label} badge={badge} count={count} color={color} expanded={expanded} onToggle={onToggle} />
      {expanded && <div className="animate-fade-in-down">{children}</div>}
    </div>
  )
}

export default function NovelForm({ onGenerate, onStop }) {
  const { params, setParams, generating, configChecked, configOk, configInfo, demoMode } = useNovelStore()
  const [error, setError] = useState('')
  const [genres, setGenres] = useState([])
  const [styles, setStyles] = useState([])
  const [expandedSection, setExpandedSection] = useState('genres')

  useEffect(() => {
    if (!demoMode) {
      fetchGenres(params.gender).then(data => { setGenres(data.genres || []); setStyles(data.styles || []) })
    }
  }, [params.gender, demoMode])

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

  function handleStyleSelect(next) {
    setParams({ selectedStyles: next, style: next.join('+') })
  }

  function submit(e) {
    e.preventDefault(); setError('')
    if (!params.seed_text.trim()) { setError('请输入一句话作为种子'); return }
    if (params.seed_text.trim().length < 4) { setError('种子句至少 4 个字'); return }
    if (configChecked && !configOk && !demoMode && !useNovelStore.getState().customModel) { setError('模型未配置，请点击右上角「设置」'); return }
    if (params.per_chapter_min > params.per_chapter_max) { setError('每章最小字数不能大于最大字数'); return }
    if (params.selectedStyles && params.selectedStyles.length > 0) {
      setParams({ style: params.selectedStyles.join('+') })
    }
    onGenerate()
  }

  function handleChapterCountChange(cc) {
    const safe = Math.max(1, Math.min(200, cc || 1))
    const avg = (params.per_chapter_min + params.per_chapter_max) / 2
    setParams({ chapter_count: safe, word_count: Math.round(safe * avg) })
  }

  function handlePerChapterChange(min, max) {
    const newMin = min || 200
    const newMax = max || 20000
    if (newMin > newMax) return
    const avg = (newMin + newMax) / 2
    setParams({ per_chapter_min: newMin, per_chapter_max: newMax, word_count: Math.round(params.chapter_count * avg) })
  }

  const displayGenres = genres.length > 0 ? genres
    : demoMode ? (params.gender === '男频' ? DEMO_GENRES_MALE : DEMO_GENRES_FEMALE) : []
  const displayStyles = styles.length > 0 ? styles : demoMode ? DEMO_STYLES : []
  const minTotal = params.chapter_count * params.per_chapter_min
  const maxTotal = params.chapter_count * params.per_chapter_max

  return (
    <form onSubmit={submit} className="space-y-4">
      {/* 模型未配置警告 */}
      {configChecked && !configOk && !useNovelStore.getState().customModel && (
        <div className="flex items-start gap-3 p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 animate-fade-in-down">
          <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5 text-amber-500" />
          <div>
            <p className="font-medium">模型未配置</p>
            <p className="mt-0.5 text-amber-600">{configInfo.error}</p>
            <p className="mt-0.5 text-amber-600">点击右上角「设置」按钮配置模型</p>
          </div>
        </div>
      )}

      {/* 种子句 */}
      <div>
        <label className="flex items-center gap-1.5 text-sm font-medium text-gray-700 mb-1.5">
          <PenLine className="w-3.5 h-3.5 text-orange-500" />
          种子句 <span className="text-red-400">*</span>
        </label>
        <textarea value={params.seed_text} onChange={e => setParams({ seed_text: e.target.value })}
          placeholder="例如：一个少年在废弃图书馆发现了一本会发光的书..."
          rows={3}
          className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-orange-400 focus:ring-2 focus:ring-orange-100/60 outline-none resize-none transition-all duration-200 bg-white placeholder:text-gray-300 text-sm"
          disabled={generating} />
      </div>

      {/* 频道选择 */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">频道</label>
        <div className="flex gap-2">
          {['男频', '女频'].map(g => (
            <button key={g} type="button" onClick={() => handleGenderChange(g)} disabled={generating}
              className={cn(
                'flex-1 py-2.5 rounded-xl text-sm font-medium border transition-all duration-200',
                params.gender === g
                  ? 'gradient-brand text-white border-transparent shadow-sm'
                  : 'bg-white text-gray-600 border-gray-200 hover:border-orange-300 hover:text-orange-600'
              )}>
              {g === '男频' ? '♂ ' : '♀ '}{g}
            </button>
          ))}
        </div>
      </div>

      {/* 题材 */}
      <Section icon={Tags} label="题材" count={displayGenres.length} color="orange"
        expanded={expandedSection === 'genres'} onToggle={() => toggleSection('genres')}>
        <div className="max-h-56 overflow-y-auto scrollbar-hide">
          <ChipGrid items={displayGenres} selected={params.genre} onSelect={(val) => setParams({ genre: val })} color="orange" columns={3} />
        </div>
      </Section>

      {/* 风格 */}
      {displayStyles.length > 0 && (
        <Section icon={BookOpen} label="风格" badge="多选" count={displayStyles.length} color="purple"
          expanded={expandedSection === 'styles'} onToggle={() => toggleSection('styles')}>
          <ChipGrid items={displayStyles} selected={params.selectedStyles || ['轻松搞笑']} onSelect={handleStyleSelect} color="purple" columns={2} />
          {(params.selectedStyles || []).length > 0 && (
            <div className="flex flex-wrap gap-1.5 pt-1">
              {(params.selectedStyles || []).map(s => (
                <span key={s} className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-purple-50 text-purple-700 rounded-full text-xs font-medium border border-purple-200">
                  {s}
                  <button type="button" onClick={() => {
                    const next = params.selectedStyles.filter(x => x !== s)
                    if (next.length === 0) return
                    handleStyleSelect(next)
                  }} className="hover:text-purple-900 transition-colors"><X className="w-3 h-3" /></button>
                </span>
              ))}
            </div>
          )}
        </Section>
      )}

      {/* V2 叙事设置区 */}
      <div className="bg-gradient-to-br from-orange-50/60 to-rose-50/60 rounded-xl p-4 border border-orange-100/60 space-y-3">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-orange-700 uppercase tracking-wider">
          <Layers className="w-3.5 h-3.5" />
          叙事设置
        </div>

        <div>
          <label className="flex items-center gap-1.5 text-xs font-medium text-gray-600 mb-1.5">
            <Eye className="w-3.5 h-3.5 text-orange-400" />
            叙事视角
          </label>
          <select value={params.pov} onChange={e => setParams({ pov: e.target.value })} disabled={generating}
            className="w-full px-3 py-2 text-xs border border-gray-200 rounded-xl bg-white focus:border-orange-400 focus:ring-2 focus:ring-orange-100/60 outline-none transition-all">
            <option value="第一人称">第一人称 — 以「我」叙述，代入感强</option>
            <option value="第三人称有限">第三人称有限 — 跟随主角视角</option>
            <option value="上帝视角">上帝视角 — 全知视角，可切换多角色</option>
          </select>
        </div>

        <div>
          <label className="flex items-center gap-1.5 text-xs font-medium text-gray-600 mb-1.5">
            <Zap className="w-3.5 h-3.5 text-orange-400" />
            节奏模式
          </label>
          <div className="flex gap-1.5">
            {['紧凑型', '标准型', '舒缓型'].map(p => (
              <button key={p} type="button" onClick={() => setParams({ pacing: p })} disabled={generating}
                className={cn(
                  'flex-1 py-2 rounded-xl text-xs font-medium border transition-all duration-150',
                  params.pacing === p
                    ? 'bg-orange-500 text-white border-orange-500 shadow-sm'
                    : 'bg-white text-gray-500 border-gray-200 hover:border-orange-300 hover:text-orange-600'
                )}>
                {p === '紧凑型' ? '⚡ 紧凑' : p === '标准型' ? '⚖️ 标准' : '🌿 舒缓'}
              </button>
            ))}
          </div>
        </div>

        {(params.selectedStyles || []).length > 0 && (
          <div>
            <label className="flex items-center gap-1.5 text-xs font-medium text-gray-600 mb-1.5">
              <Sliders className="w-3.5 h-3.5 text-orange-400" />
              风格强度
            </label>
            <div className="flex gap-1.5">
              {['轻度', '中度', '重度'].map(i => (
                <button key={i} type="button" onClick={() => setParams({ style_intensity: i })} disabled={generating}
                  className={cn(
                    'flex-1 py-2 rounded-xl text-xs font-medium border transition-all duration-150',
                    params.style_intensity === i
                      ? 'bg-orange-500 text-white border-orange-500 shadow-sm'
                      : 'bg-white text-gray-500 border-gray-200 hover:border-orange-300 hover:text-orange-600'
                  )}>
                  {i}
                </button>
              ))}
            </div>
            <p className="text-[10px] text-gray-400 mt-1">
              {params.style_intensity === '轻度' ? '偶尔体现风格特征' :
               params.style_intensity === '中度' ? '适度体现，默认推荐' : '通篇强化风格表现'}
            </p>
          </div>
        )}

        <div>
          <label className="flex items-center gap-1.5 text-xs font-medium text-gray-600 mb-1.5">
            <Shield className="w-3.5 h-3.5 text-orange-400" />
            叙事张力
          </label>
          <div className="flex gap-4">
            <label className="flex items-center gap-1.5 cursor-pointer group">
              <input type="checkbox" checked={params.enable_suspense}
                onChange={e => setParams({ enable_suspense: e.target.checked })} disabled={generating}
                className="w-3.5 h-3.5 text-orange-500 border-gray-300 rounded focus:ring-orange-400 transition-colors" />
              <span className="text-xs text-gray-500 group-hover:text-gray-700">启用悬念</span>
            </label>
            <label className="flex items-center gap-1.5 cursor-pointer group">
              <input type="checkbox" checked={params.enable_twist}
                onChange={e => setParams({ enable_twist: e.target.checked })} disabled={generating}
                className="w-3.5 h-3.5 text-orange-500 border-gray-300 rounded focus:ring-orange-400 transition-colors" />
              <span className="text-xs text-gray-500 group-hover:text-gray-700">启用反转</span>
            </label>
          </div>
        </div>
      </div>

      {/* 字数配置区 */}
      <div className="bg-gradient-to-br from-amber-50/60 to-orange-50/60 rounded-xl p-4 border border-amber-100/60 space-y-3">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-700 uppercase tracking-wider">
          <Type className="w-3.5 h-3.5" />
          字数配置
        </div>

        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-xs font-medium text-gray-600">章节数</label>
            <span className="text-xs font-bold text-orange-600">{params.chapter_count} 章</span>
          </div>
          <input type="range" min={1} max={200} step={1}
            value={params.chapter_count} onChange={e => handleChapterCountChange(Number(e.target.value))} disabled={generating}
            className="w-full h-1.5 bg-gray-200 rounded-full appearance-none cursor-pointer accent-orange-500" />
          <p className="text-[10px] text-gray-400 mt-0.5">
            每章约 {Math.round((params.per_chapter_min + params.per_chapter_max) / 2).toLocaleString()} 字
          </p>
        </div>

        <div>
          <label className="text-xs font-medium text-gray-600 mb-1 block">每章字数范围</label>
          <div className="flex items-center gap-2">
            <input type="number" min={200} max={params.per_chapter_max}
              value={params.per_chapter_min} onChange={e => handlePerChapterChange(Number(e.target.value), params.per_chapter_max)} disabled={generating}
              className="w-full px-2.5 py-1.5 text-xs border border-gray-200 rounded-lg bg-white focus:border-orange-400 outline-none transition-all" />
            <span className="text-gray-300 flex-shrink-0 text-xs">~</span>
            <input type="number" min={params.per_chapter_min} max={20000}
              value={params.per_chapter_max} onChange={e => handlePerChapterChange(params.per_chapter_min, Number(e.target.value))} disabled={generating}
              className="w-full px-2.5 py-1.5 text-xs border border-gray-200 rounded-lg bg-white focus:border-orange-400 outline-none transition-all" />
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-medium text-gray-600">目标字数</span>
            <span className="text-sm font-bold gradient-text">{params.word_count.toLocaleString()} 字</span>
          </div>
          <div className="w-full h-1.5 bg-gray-200 rounded-full overflow-hidden">
            <div className="h-full gradient-brand rounded-full transition-all duration-300"
              style={{ width: `${Math.min(100, (params.word_count / Math.max(maxTotal, 1)) * 100)}%` }} />
          </div>
          <div className="flex justify-between text-[10px] text-gray-400 mt-0.5">
            <span>{minTotal.toLocaleString()} 字</span>
            <span>{maxTotal.toLocaleString()} 字（上限）</span>
          </div>
        </div>
      </div>

      {/* 错误 */}
      {error && (
        <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-xl animate-fade-in-down">
          <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
          <span className="text-xs text-red-700">{error}</span>
        </div>
      )}

      {/* 提交/停止按钮 */}
      <div className="flex gap-2">
        <button type="submit" disabled={generating}
          className={cn(
            'flex-1 py-3 rounded-xl font-semibold transition-all duration-200 flex items-center justify-center gap-2 shadow-sm text-sm',
            generating
              ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
              : configChecked && !configOk && !useNovelStore.getState().customModel
              ? 'bg-amber-400 hover:bg-amber-500 text-white shadow-amber-200'
              : 'gradient-brand hover:shadow-md text-white'
          )}>
          <><Sparkles className="w-4 h-4" /> 开始生成</>
        </button>
        {generating && (
          <button type="button" onClick={onStop}
            className="flex-1 py-3 rounded-xl font-semibold transition-all duration-200 flex items-center justify-center gap-2 shadow-sm text-sm bg-red-500 hover:bg-red-600 active:bg-red-700 text-white">
            <StopCircle className="w-4 h-4" />
            停止
          </button>
        )}
      </div>
    </form>
  )
}