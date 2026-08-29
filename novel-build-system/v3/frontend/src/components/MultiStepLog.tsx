import { useEffect, useRef, useState } from 'react'
import { useNovelStore, STEPS, STEP_CONFIG } from '../stores/novelStore'
import { cn } from '../lib/utils'
import { LABEL_MAP, flattenDict } from '../lib/constants'
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
