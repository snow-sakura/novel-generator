import { useEffect, useRef, useState } from 'react'
import { useNovelStore, STEPS, STEP_CONFIG } from '../stores/novelStore'
import { cn } from '../lib/utils'
import {
  ChevronDown, ChevronUp, Loader2, CheckCircle2, Clock,
  Lightbulb, Users, Globe, Layers, BookOpen, ListChecks,
  Circle, XCircle, AlertTriangle, Info, ArrowDown, Eye,
} from 'lucide-react'
import OutlineModal from './OutlineModal'

const STEP_KEYS = ['parsing', 'outlining', 'writing', 'titling']

const LAYER_META = {
  strategy: { icon: Lightbulb, label: '战略层', color: 'text-purple-600 bg-purple-50 border-purple-200', dot: '#9333ea' },
  characters: { icon: Users, label: '人物层', color: 'text-blue-600 bg-blue-50 border-blue-200', dot: '#2563eb' },
  world: { icon: Globe, label: '世界观层', color: 'text-emerald-600 bg-emerald-50 border-emerald-200', dot: '#059669' },
  structure: { icon: Layers, label: '情节风格层', color: 'text-amber-600 bg-amber-50 border-amber-200', dot: '#d97706' },
  chapters: { icon: ListChecks, label: '章节细纲', color: 'text-rose-600 bg-rose-50 border-rose-200', dot: '#e11d48' },
}

const LOG_META = {
  info: { icon: Info, dot: '#9ca3af', line: '#e5e7eb', text: 'text-gray-600' },
  success: { icon: CheckCircle2, dot: '#10b981', line: '#a7f3d0', text: 'text-emerald-700' },
  error: { icon: XCircle, dot: '#ef4444', line: '#fca5a5', text: 'text-red-600' },
  warn: { icon: AlertTriangle, dot: '#f59e0b', line: '#fcd34d', text: 'text-amber-700' },
  chapter: { icon: BookOpen, dot: '#f97316', line: '#fed7aa', text: 'text-orange-700' },
}

const LABEL_MAP = {
  strategy: '战略层', characters: '人物层', world: '世界观层',
  plot_structure: '结构层', rhythm: '节奏层', style_tone: '风格层',
  chapters: '章节细纲', core_idea: '核心立意', theme: '思想主题',
  ending: '结局预判', protagonist: '主角', supporting: '配角',
  antagonist: '反派', relationships: '人物关系', time_space: '时空背景',
  rules: '规则体系', factions: '势力格局', three_acts: '三幕式',
  beat_sheet: '节拍表', golden_three: '黄金三章',
  satisfaction_points: '爽点布局', emotional_peaks: '泪点/痛点',
  pace_curve: '节奏曲线', perspective: '叙事视角',
  language: '语言风格', atmosphere: '氛围基调',
  high_concept: '高概念设定', unique_selling_point: '独特卖点',
  core_question: '核心问题', values: '价值观',
  type: '结局类型', final_scene: '最终场景',
  desire: '核心欲望', flaw: '核心缺陷', traits: '性格特质',
  arc: '成长弧线', motive: '动机', threat: '压迫感',
  value_opposition: '价值对立', era: '时代', locations: '场景',
  world_rules: '世界规则', power_system: '力量体系',
  social_structure: '社会结构', act1: '第一幕·建置',
  act2: '第二幕·对抗', act3: '第三幕·结局',
  hook: '钩子', function: '功能定位', summary: '概要',
  cliffhanger: '悬念', word_count_estimate: '字数预估',
  description: '描述', alignment: '立场', role: '作用',
  name: '姓名', age: '年龄', identity: '身份',
  tone: '故事基调', initial_state: '初始状态',
  love_interest: '情感线', conflict_point: '冲突点',
  core_conflict_source: '核心冲突根源', devices: '设定与伏笔',
  power_rules: '力量规则', key_items: '核心道具',
  foreshadowing: '伏笔清单', item: '伏笔内容',
  planned_reveal: '揭示时机', scenes: '场景列表',
  time_era: '时代背景', conflict_type: '冲突类型',
  inciting_incident: '激励事件', development: '发展方向',
  resolution_tendency: '结局倾向', world_tone: '世界观基调',
  beat: '节拍', chapter: '章节', content: '内容',
  narrative_style: '叙事风格',
  relationship: '关系', goal: '目标', background: '背景',
  conflict: '冲突', state: '状态', appearance: '外貌',
  ability: '能力', personality: '性格', speciality: '特长',
  weakness: '弱点', climax: '高潮', turning_point: '转折点',
  event: '事件', significance: '意义', growth: '成长',
  transformation: '蜕变', overview: '概览', style: '风格',
  setting: '设定', element: '元素', structure: '结构',
  character: '角色', story: '故事', worldview: '世界观',
  plot: '情节', intro: '简介', introduction: '简介',
  detail: '细节', info: '信息', status: '状态',
  position: '立场', emotion: '情感', relation: '关系',
  role_type: '角色类型', importance: '重要性',
  character_growth: '角色成长', character_arc: '角色弧线',
  chapter_range: '章节范围',
}

function formatTime(timeStr) {
  const parts = timeStr.split(':')
  if (parts.length === 3) {
    return { hour: `${parts[0]}:${parts[1]}`, sec: `:${parts[2]}`, sep: ':' }
  }
  return { hour: timeStr, sec: '', sep: '' }
}

function LogEntry({ log, isLatest }) {
  const meta = LOG_META[log.type] || LOG_META.info
  const Icon = meta.icon
  const { hour, sec, sep } = formatTime(log.time)
  const text = log.text || ''

  let detail = ''
  let metaItems = []
  if (log.type === 'chapter') {
    const match = text.match(/^(第\d+章《.+?》)/)
    if (match) {
      const rest = text.slice(match[1].length).replace(/^[：:]\s*/, '')
      detail = rest
    }
  }
  if (log.type === 'success' && text.includes('字')) {
    const wc = text.match(/(\d[\d,]*)\s*字/)
    if (wc) metaItems.push(`${wc[1]}字`)
  }

  return (
    <div className={cn('log-timeline-entry', isLatest && 'opacity-90')}>
      <div className="log-timeline-time">
        <span className="hour">{hour}</span>
        {sep && <span className="time-sep">{sep}</span>}
        <span className="sec">{sec}</span>
      </div>
      <div className="log-timeline-dot-col">
        <div className="log-timeline-line" style={{ backgroundColor: meta.line }} />
        <div className="log-timeline-dot" style={{ backgroundColor: meta.dot }}>
          <Icon className="w-3 h-3 text-white" style={{ display: 'none' }} />
        </div>
        <div className="log-timeline-line" style={{ backgroundColor: meta.line }} />
      </div>
      <div className="log-timeline-content">
        <div className={cn('log-title', meta.text)}>
          <Icon className={cn('w-3.5 h-3.5 icon-wrap')} style={{ color: meta.dot }} />
          <span>{detail ? text.slice(0, text.indexOf(detail)).replace(/[：:]\s*$/, '') : text}</span>
        </div>
        {detail && <div className="log-detail text-gray-500">{detail}</div>}
        {metaItems.length > 0 && (
          <div className="log-meta">
            {metaItems.map((m, i) => <span key={i} className="inline-flex items-center gap-1">{m}</span>)}
          </div>
        )}
      </div>
    </div>
  )
}

function addItemRows(item, label, idx, rows) {
  const itemName = item.name || item.姓名 || `${label} ${idx + 1}`
  rows.push({ key: itemName, val: '', isItemHeader: true })
  for (const [sk, sv] of Object.entries(item)) {
    if (sk === 'name' || sk === '姓名') continue
    if (sv === null || sv === undefined) continue
    const s = String(sv).trim()
    if (!s) continue
    const sl = LABEL_MAP[sk] || sk
    rows.push({ key: sl, val: s.replace(/^#+\s*/gm, '').trim(), indent: 1 })
  }
}

function flattenDict(obj, depth = 0, maxDepth = 4) {
  if (depth > maxDepth) return []
  const rows = []
  const seenKeys = new Set()
  for (const [k, v] of Object.entries(obj)) {
    if (/^\d+$/.test(k) && (typeof v !== 'object' || v === null)) continue
    const label = LABEL_MAP[k] || k
    if (v === null || v === undefined) continue
    if (seenKeys.has(label)) continue
    seenKeys.add(label)
    if (typeof v === 'string') {
      if (v.trim()) rows.push({ key: label, val: v.replace(/^#+\s*/gm, '').trim() })
    } else if (typeof v === 'number') {
      rows.push({ key: label, val: String(v) })
    } else if (Array.isArray(v)) {
      if (v.length > 0) {
        if (typeof v[0] === 'object' && v[0] !== null) {
          if (label !== v[0].name) {
            rows.push({ key: label, val: '', isSection: true })
          }
          v.slice(0, 6).forEach((item, idx) => addItemRows(item, label, idx, rows))
          if (v.length > 6) rows.push({ key: '', val: `+${v.length - 6} 项` })
        } else {
          const items = v.slice(0, 6).map(item => {
            if (typeof item === 'string') return item.replace(/^#+\s*/gm, '').trim()
            if (typeof item === 'object') return Object.entries(item).map(([sk, sv]) => `${LABEL_MAP[sk] || sk}: ${String(sv).replace(/^#+\s*/gm, '').trim()}`).join(' | ')
            return String(item)
          })
          rows.push({ key: label, val: items, isArray: true })
          if (v.length > 6) rows.push({ key: '', val: `+${v.length - 6} 项` })
        }
      }
    } else if (typeof v === 'object') {
      const vKeys = Object.keys(v)
      if (vKeys.length > 0 && vKeys.every(kk => /^\d+$/.test(kk))) {
        rows.push({ key: label, val: '', isSection: true })
        vKeys.sort((a, b) => Number(a) - Number(b)).slice(0, 6).forEach((itemKey, idx) => {
          const item = v[itemKey]
          if (typeof item === 'object' && item !== null && !Array.isArray(item)) {
            addItemRows(item, label, idx, rows)
          } else if (typeof item === 'string' && item.trim()) {
            rows.push({ key: `${idx + 1}`, val: item.replace(/^#+\s*/gm, '').trim(), isItemHeader: true })
          }
        })
        if (vKeys.length > 6) rows.push({ key: '', val: `+${vKeys.length - 6} 项` })
      } else {
        const childRows = flattenDict(v, depth + 1, maxDepth)
        if (childRows.length > 0) {
          rows.push({ key: label, val: '', isSection: true })
          rows.push(...childRows)
        }
      }
    }
  }
  return rows
}

function OutlineLayerCard({ type, data }) {
  const meta = LAYER_META[type]
  if (!meta) return null
  const Icon = meta.icon

  let rows = []
  if (type === 'structure') {
    if (data?.plot_structure) rows.push(...flattenDict({ plot_structure: data.plot_structure }))
    if (data?.rhythm) rows.push(...flattenDict({ rhythm: data.rhythm }))
    if (data?.style_tone) rows.push(...flattenDict({ style_tone: data.style_tone }))
    } else if (type === 'chapters') {
    const chs = data?.chapters || []
    rows = chs.slice(0, 8).map((ch, i) => ({
      key: `第${i+1}章`,
      val: ((ch.title || '') + '').replace(/^#+\s*/gm, '').trim(),
      sub: [
        ch.summary ? `概要: ${ch.summary.replace(/^#+\s*/gm, '').trim().slice(0, 80)}` : '',
        ch.hook ? `钩子: ${ch.hook.replace(/^#+\s*/gm, '').trim().slice(0, 40)}` : '',
        ch.cliffhanger ? `悬念: ${ch.cliffhanger.replace(/^#+\s*/gm, '').trim().slice(0, 40)}` : '',
      ].filter(Boolean).join(' · '),
    }))
    if (chs.length > 8) rows.push({ key: '', val: `+${chs.length - 8} 章` })
  } else {
    rows = flattenDict(data || {})
  }

  return (
    <div className={cn('rounded-xl border', meta.color, 'p-4 mb-2 shadow-sm')}>
      <div className="flex items-center gap-2 mb-3">
        <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ backgroundColor: meta.dot + '15' }}>
          <Icon className="w-4 h-4" style={{ color: meta.dot }} />
        </div>
        <span className="text-sm font-semibold" style={{ color: meta.dot }}>{meta.label}</span>
        {rows.length > 0 && (
          <span className="ml-auto text-[10px] text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded-full">{rows.length} 项</span>
        )}
      </div>
      {rows.length > 0 && (
        <div className="outline-card-grid">
          {rows.map((row, i) => {
            if (row.isSection) {
              return (
                <div key={i} className="col-span-2 text-xs font-semibold text-gray-700 mt-2 mb-1 border-b border-gray-100 pb-1">
                  {row.key}
                </div>
              )
            }
            if (row.isItemHeader) {
              return (
                <div key={i} className="col-span-2 text-xs font-semibold text-gray-800 mt-1.5 mb-0.5 px-2 py-1 bg-gray-50 rounded border-l-2 border-gray-300">
                  {row.key}
                </div>
              )
            }
            if (!row.key) {
              return (
                <span key={i} className={`col-span-2 ock-val text-gray-400 italic ${row.indent ? 'pl-4' : ''}`}>
                  {row.val || row.val === '' ? row.val : row}
                  {row.sub && <span className="block text-gray-400 text-[11px] mt-0.5">{row.sub}</span>}
                </span>
              )
            }
            return (
              <>
                <span key={`k-${i}`} className={`ock-key ${row.indent ? 'pl-5' : ''}`}>{row.key}</span>
                {row.isArray ? (
                  <div key={`v-${i}`} className="ock-val-array">
                    {row.val.map((item, j) => (
                      <span key={j} className="ock-chip">{item}</span>
                    ))}
                  </div>
                ) : (
                  <span key={`v-${i}`} className="ock-val">
                    {row.val || row.val === '' ? row.val : row}
                    {row.sub && <span className="block text-gray-400 text-[11px] mt-0.5">{row.sub}</span>}
                  </span>
                )}
              </>
            )
          })}
        </div>
      )}
    </div>
  )
}

function OutlineButtons({ outlineThinking, layersCount, showOutlineModal, chaptersOpen, onToggleChapters }) {
  const layers = outlineThinking.filter(item => item?.type && item.type !== '_progress' && item.type !== 'chapter')
  const hasOutline = layersCount > 0
  const chapterItems = outlineThinking.filter(item => item?.type === 'chapter')
  return (
    <>
      <div className="flex flex-wrap gap-2 mb-3">
        <button onClick={showOutlineModal}
          disabled={!hasOutline}
          className={cn(
            'inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium border rounded-xl transition-all',
            hasOutline
              ? 'bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100 hover:shadow-sm'
              : 'bg-gray-50 text-gray-400 border-gray-200 cursor-not-allowed'
          )}>
          <Eye className="w-3.5 h-3.5" />
          大纲生成结果{hasOutline ? ` (${layersCount})` : ''}
        </button>
        <button onClick={onToggleChapters}
          disabled={chapterItems.length === 0}
          className={cn(
            'inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium border rounded-xl transition-all',
            chapterItems.length > 0
              ? chaptersOpen
                ? 'bg-rose-100 text-rose-800 border-rose-300 shadow-sm'
                : 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100 hover:shadow-sm'
              : 'bg-gray-50 text-gray-400 border-gray-200 cursor-not-allowed'
          )}>
          <ListChecks className="w-3.5 h-3.5" />
          章节细纲 {chapterItems.length > 0 ? `(${chapterItems.length})` : ''}
        </button>
      </div>
      {chaptersOpen && chapterItems.length > 0 && (
        <div className="space-y-2.5 mb-3 animate-fade-in-down">
          {chapterItems.map((ch, i) => (
            <div key={i} className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="flex items-center gap-3 px-4 py-3 bg-gradient-to-r from-rose-50 to-orange-50 border-b border-gray-100">
                <span className="flex-shrink-0 w-7 h-7 rounded-full bg-rose-500 text-white flex items-center justify-center text-xs font-bold shadow-sm">{(ch.index != null ? ch.index : i) + 1}</span>
                <span className="text-sm font-semibold text-gray-800">{ch.title || `第${i + 1}章`}</span>
              </div>
              {ch.summary && (
                <div className="px-4 py-2.5 text-xs text-gray-600 leading-relaxed">
                  {ch.summary.replace(/^#+\s*/gm, '').trim()}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </>
  )
}

export default function MultiStepLog() {
  const { thinkingLogs, currentStep, generating, connecting, outlineThinking, chapters, chapterTexts, emotionCurve } = useNovelStore()
  const [expanded, setExpanded] = useState({})
  const [userScrolled, setUserScrolled] = useState({})
  const bottomRefs = useRef({})
  const logContainerRefs = useRef({})
  const [showOutlineModal, setShowOutlineModal] = useState(false)
  const [chaptersOpen, setChaptersOpen] = useState(false)

  useEffect(() => {
    const active = STEP_KEYS.findIndex(s => s === currentStep)
    setExpanded(prev => {
      const next = { ...prev }
      STEP_KEYS.forEach((s, i) => { next[s] = i <= active ? true : (prev[s] ?? false) })
      return next
    })
  }, [currentStep])

  useEffect(() => {
    const activeKey = currentStep
    if (activeKey && bottomRefs.current[activeKey]) {
      if (!userScrolled[activeKey]) {
        bottomRefs.current[activeKey]?.scrollIntoView({ behavior: 'smooth' })
      }
    }
  }, [thinkingLogs.length, currentStep, userScrolled])

  if (thinkingLogs.length === 0 && !generating) return null

  function toggle(key) {
    setExpanded(prev => ({ ...prev, [key]: !prev[key] }))
  }

  function getLogsForStep(stepKey) {
    return thinkingLogs.filter((l: any) => {
      const s = l.step || l.type
      if (stepKey === 'writing') return s === 'writing' || s === 'chapter'
      return s === stepKey
    })
  }

  function handleScroll(stepKey, e) {
    const el = e.target
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 40
    setUserScrolled(prev => ({ ...prev, [stepKey]: !atBottom }))
  }

  function scrollToBottom(stepKey) {
    bottomRefs.current[stepKey]?.scrollIntoView({ behavior: 'smooth' })
    setUserScrolled(prev => ({ ...prev, [stepKey]: false }))
  }

  const layersCount = outlineThinking
    .filter((item: any) => item?.type && item.type !== '_progress' && item.type !== 'chapter')
    .flatMap((item: any) => item.type === 'structure' && item.data
      ? ['plot_structure', 'rhythm', 'style_tone'].filter(k => item.data[k])
      : [item])
    .length
  const stepIdx = STEP_KEYS.indexOf(currentStep)

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden animate-fade-in-up shadow-sm">
      {connecting && (
        <div className="bg-blue-50 border-b border-blue-200 px-5 py-3 flex items-center gap-2.5">
          <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />
          <span className="text-sm text-blue-700 font-medium">正在连接后端服务...</span>
        </div>
      )}

      <div className="p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-semibold text-gray-700 flex items-center gap-2">
            <Clock className="w-4 h-4 text-orange-500" />
            生成日志
            {generating && <span className="text-xs font-normal text-gray-400">（{thinkingLogs.length} 条）</span>}
          </h3>
          {generating && (
            <span className="flex items-center gap-1.5 text-xs text-orange-600 bg-orange-50 px-2.5 py-1 rounded-full font-medium">
              <Loader2 className="w-3 h-3 animate-spin" />
              进行中
            </span>
          )}
        </div>

        <div className="space-y-3">
          {STEP_CONFIG.map((step, i) => {
            const key = step.key
            const logs = getLogsForStep(key)
            const isActive = key === currentStep && generating
            const isPast = i < stepIdx || currentStep === STEPS.DONE
            const isOpen = expanded[key] ?? isActive
            const hasLogs = logs.length > 0

            return (
              <div key={key} className={cn(
                'rounded-xl overflow-hidden transition-all duration-200',
                'border-l-[3px]',
                isActive && 'border-l-orange-500 bg-orange-50/30 border border-orange-200 border-l-[3px]',
                isPast && !isActive && 'border-l-emerald-500 bg-emerald-50/20 border border-emerald-200 border-l-[3px]',
                !isActive && !isPast && 'border-l-gray-300 bg-gray-50/30 border border-gray-200 border-l-[3px]',
              )}>
                <button type="button" onClick={() => toggle(key)}
                  className="flex items-center gap-3 w-full text-left px-5 py-3 hover:bg-black/[0.02] transition-colors">
                  <span className={cn(
                    'flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all',
                    isPast && 'bg-emerald-500 text-white shadow-sm',
                    isActive && 'bg-orange-500 text-white ring-2 ring-orange-200 shadow-sm',
                    !isPast && !isActive && 'bg-gray-200 text-gray-500',
                  )}>
                    {isPast ? <CheckCircle2 className="w-4 h-4" /> : isActive ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : i + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <span className={cn('text-sm font-semibold block leading-tight',
                      isActive && 'text-orange-800', isPast && 'text-emerald-800', !isPast && !isActive && 'text-gray-600'
                    )}>{step.label}</span>
                    <span className={cn('text-xs block mt-0.5',
                      isActive && 'text-orange-600', isPast && 'text-emerald-600', !isPast && !isActive && 'text-gray-400'
                    )}>
                      {isActive && key === 'writing'
                        ? `已完成 ${logs.length} 步`
                        : isActive && key === 'outlining'
                          ? `已生成 ${outlineThinking.filter((o: any) => o.type && o.type !== '_progress' && o.type !== 'chapter').flatMap((o: any) => o.type === 'structure' && o.data ? ['plot_structure', 'rhythm', 'style_tone'].filter(k => o.data[k]) : [o]).length}/5 层`
                          : step.desc}
                    </span>
                  </div>
                  {hasLogs && !isOpen && (
                    <span className="text-[10px] text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full font-medium">{logs.length}</span>
                  )}
                  {isActive && <span className="w-2 h-2 bg-orange-500 rounded-full animate-pulse flex-shrink-0" />}
                  <ChevronDown className={cn('w-4 h-4 text-gray-400 flex-shrink-0 transition-transform', isOpen && 'rotate-180')} />
                </button>

                {isOpen && (
                  <div className="px-5 pb-4 animate-fade-in-down">
                    {key === 'outlining' && (
                      <OutlineButtons
                        outlineThinking={outlineThinking}
                        layersCount={layersCount}
                        showOutlineModal={() => setShowOutlineModal(true)}
                        chaptersOpen={chaptersOpen}
                        onToggleChapters={() => setChaptersOpen(prev => !prev)}
                      />
                    )}

                    {hasLogs ? (
                      <div className={cn(
                        'log-scroll-fade rounded-xl border border-gray-100 bg-white',
                        key === 'writing' ? 'max-h-72' : 'max-h-56'
                      )}>
                        <div
                          ref={el => { logContainerRefs.current[key] = el }}
                          onScroll={(e) => handleScroll(key, e)}
                          className="overflow-y-auto px-4 py-2"
                          style={{ maxHeight: key === 'writing' ? '18rem' : '14rem' }}
                        >
                          {logs.map((log, idx) => (
                            <LogEntry key={idx} log={log} isLatest={idx === logs.length - 1} />
                          ))}
                          <div ref={el => { bottomRefs.current[key] = el }} />
                        </div>
                        {userScrolled[key] && (
                          <div className="log-jump-bottom">
                            <button onClick={() => scrollToBottom(key)}
                              className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium bg-white border border-gray-200 rounded-full shadow-sm hover:bg-gray-50 hover:shadow transition-all">
                              <ArrowDown className="w-3 h-3" />
                              跳至最新
                            </button>
                          </div>
                        )}
                      </div>
                    ) : (
                      <p className="text-xs text-gray-400 py-2 flex items-center gap-1.5">
                        {isActive ? <><Loader2 className="w-3 h-3 animate-spin" /> 等待中...</> : '暂无日志'}
                      </p>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* 大纲弹窗 */}
      {showOutlineModal && (
        <OutlineModal outlineThinking={outlineThinking} onClose={() => setShowOutlineModal(false)} emotionCurve={emotionCurve} />
      )}
    </div>
  )
}
