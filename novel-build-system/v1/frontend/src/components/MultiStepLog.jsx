import { useEffect, useRef, useState } from 'react'
import { useNovelStore, STEPS, STEP_CONFIG } from '../stores/novelStore'
import { cn } from '../lib/utils'
import { ChevronDown, ChevronUp, Loader2, CheckCircle2, Clock, FileText, Lightbulb, Users, Globe, Layers, BookOpen } from 'lucide-react'

const STEP_KEYS = ['parsing', 'outlining', 'writing', 'titling']

const LAYER_META = {
  strategy: { icon: Lightbulb, label: '战略层', color: 'text-purple-600 bg-purple-50 border-purple-200' },
  characters: { icon: Users, label: '人物层', color: 'text-blue-600 bg-blue-50 border-blue-200' },
  world: { icon: Globe, label: '世界观层', color: 'text-emerald-600 bg-emerald-50 border-emerald-200' },
  structure: { icon: Layers, label: '情节风格层', color: 'text-amber-600 bg-amber-50 border-amber-200' },
  chapters: { icon: BookOpen, label: '章节细纲', color: 'text-rose-600 bg-rose-50 border-rose-200' },
}

function OutlineLayerCard({ type, data }) {
  const meta = LAYER_META[type]
  if (!meta) return null
  const Icon = meta.icon

  let content = ''
  try {
    if (type === 'strategy' && data?.strategy) {
      const s = data.strategy
      content = [
        s.core_idea?.high_concept && `【核心创意】${s.core_idea.high_concept}`,
        s.core_idea?.unique_selling_point && `【独特卖点】${s.core_idea.unique_selling_point}`,
        s.theme?.core_question && `【核心问题】${s.theme.core_question}`,
        s.ending?.type && `【结局】${s.ending.type}：${(s.ending.final_scene || '').slice(0, 120)}...`,
      ].filter(Boolean).join('\n\n')
    } else if (type === 'characters' && data?.characters) {
      const c = data.characters
      const p = c.protagonist
      content = [
        p?.name && `【主角】${p.name}（${p.identity || ''}）\n欲望：${(p.desire || '').slice(0, 100)}...\n缺陷：${p.flaw || ''}`,
        c.supporting?.length > 0 && `【配角】${c.supporting.map(s => s.name).join('、')}`,
        c.antagonist?.name && `【反派】${c.antagonist.name}：${(c.antagonist.motive || '').slice(0, 80)}...`,
      ].filter(Boolean).join('\n\n')
    } else if (type === 'world' && data?.world) {
      const w = data.world
      content = [
        w.time_space?.era && `【时代】${w.time_space.era}`,
        w.time_space?.locations && `【场景】${w.time_space.locations}`,
        w.rules?.world_rules && `【世界规则】${(w.rules.world_rules || '').slice(0, 120)}...`,
      ].filter(Boolean).join('\n\n')
    } else if (type === 'structure' && (data?.plot_structure || data?.rhythm || data?.style_tone)) {
      const parts = []
      if (data.plot_structure?.three_acts) {
        const ta = data.plot_structure.three_acts
        parts.push(`【三幕结构】\n起：${(ta.act1 || '').slice(0, 80)}...\n承：${(ta.act2 || '').slice(0, 80)}...\n转合：${(ta.act3 || '').slice(0, 80)}...`)
      }
      if (data.plot_structure?.golden_three?.length > 0) {
        parts.push(`【黄金三章】${data.plot_structure.golden_three.map(g => g.title).join('、')}`)
      }
      content = parts.join('\n\n')
    } else if (type === 'chapters' && data?.chapters?.length > 0) {
      content = data.chapters.map((ch, i) =>
        `第${i+1}章《${ch.title}》\n${(ch.summary || '').slice(0, 100)}...`
      ).join('\n\n')
    } else {
      content = JSON.stringify(data, null, 2).slice(0, 500)
    }
  } catch {
    content = JSON.stringify(data, null, 2).slice(0, 500)
  }

  if (!content) return null

  return (
    <div className={`rounded-lg border ${meta.color} p-3 mb-2`}>
      <div className="flex items-center gap-1.5 mb-2">
        <Icon className="w-4 h-4" />
        <span className="text-xs font-semibold">{meta.label}</span>
      </div>
      <pre className="text-xs text-gray-700 whitespace-pre-wrap font-sans leading-relaxed">
        {content}
      </pre>
    </div>
  )
}

function OutlineView({ outlineThinking }) {
  // 过滤出有实际内容的 outline thinking 事件（排除 _progress）
  const layers = outlineThinking.filter(item =>
    item?.type && item.type !== '_progress' && item.type !== 'chapter'
  )
  if (layers.length === 0) return null

  return (
    <div className="mt-2 space-y-1">
      {layers.map((item, i) => (
        <OutlineLayerCard key={i} type={item.type} data={item.data} />
      ))}
    </div>
  )
}

export default function MultiStepLog() {
  const { thinkingLogs, currentStep, generating, connecting, outlineThinking } = useNovelStore()
  const [expanded, setExpanded] = useState({})
  const bottomRefs = useRef({})

  useEffect(() => {
    const active = STEP_KEYS.findIndex(s => s === currentStep)
    setExpanded(prev => {
      const next = { ...prev }
      STEP_KEYS.forEach((s, i) => {
        next[s] = i <= active ? true : (prev[s] ?? false)
      })
      return next
    })
  }, [currentStep])

  useEffect(() => {
    const activeKey = currentStep
    if (activeKey && bottomRefs.current[activeKey]) {
      bottomRefs.current[activeKey]?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [thinkingLogs.length, currentStep])

  if (thinkingLogs.length === 0 && !generating) return null

  function toggle(key) {
    setExpanded(prev => ({ ...prev, [key]: !prev[key] }))
  }

  function getLogsForStep(stepKey) {
    return thinkingLogs.filter(l => {
      const s = l.step || l.type
      if (stepKey === 'writing') return s === 'writing' || s === 'chapter'
      return s === stepKey
    })
  }

  const stepIdx = STEP_KEYS.indexOf(currentStep)

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
      {connecting && (
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-blue-200 rounded-t-xl px-4 py-3 flex items-center gap-2">
          <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />
          <span className="text-sm text-blue-700 font-medium">正在连接后端服务...</span>
        </div>
      )}
      <div className="p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-orange-400 to-rose-500 flex items-center justify-center">
              <Clock className="w-4 h-4 text-white" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-gray-800">生成日志</h3>
              {generating && (
                <p className="text-xs text-gray-400">{thinkingLogs.length} 条日志</p>
              )}
            </div>
          </div>
        </div>
        <div className="space-y-2">
          {STEP_CONFIG.map((step, i) => {
            const key = step.key
            const logs = getLogsForStep(key)
            const isActive = key === currentStep && generating
            const isPast = i < stepIdx || (currentStep === STEPS.DONE)
            const isOpen = expanded[key] ?? isActive
            const hasLogs = logs.length > 0

            return (
              <div key={key} className={cn(
                'border-2 rounded-xl overflow-hidden transition-all',
                isActive && 'border-orange-300 bg-orange-50/50 shadow-sm',
                isPast && !isActive && 'border-green-200 bg-green-50/30',
                !isActive && !isPast && 'border-gray-100 bg-white',
              )}>
                <button
                  type="button"
                  onClick={() => toggle(key)}
                  className="flex items-center gap-3 w-full text-left px-4 py-3.5 hover:bg-gray-50/50 transition-colors"
                >
                  <span className={cn(
                    'flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold',
                    isPast && 'bg-gradient-to-br from-green-400 to-green-500 text-white shadow-sm',
                    isActive && 'bg-gradient-to-br from-orange-400 to-rose-500 text-white shadow-md',
                    !isPast && !isActive && 'bg-gray-200 text-gray-500',
                  )}>
                    {isPast ? <CheckCircle2 className="w-4 h-4" /> : i + 1}
                  </span>
                  <span className={cn(
                    'text-sm font-semibold flex-1',
                    isActive && 'text-orange-800',
                    isPast && 'text-green-800',
                    !isPast && !isActive && 'text-gray-600',
                  )}>
                    <span className="block leading-tight">{step.label}</span>
                    <span className={cn(
                      'text-xs font-normal mt-0.5 block',
                      isActive && 'text-orange-600',
                      isPast && 'text-green-600',
                      !isPast && !isActive && 'text-gray-400',
                    )}>{step.desc}</span>
                  </span>
                  {hasLogs && !isOpen && (
                    <span className="text-xs text-gray-500 bg-gray-100 px-2.5 py-1 rounded-full font-medium">
                      {logs.length}
                    </span>
                  )}
                  {isActive && (
                    <span className="w-2.5 h-2.5 bg-orange-500 rounded-full animate-pulse" />
                  )}
                  {isOpen
                    ? <ChevronUp className="w-4 h-4 text-gray-400 flex-shrink-0" />
                    : <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" />
                  }
                </button>
                {isOpen && (
                  <div className="px-4 pb-3">
                    {/* 大纲内容卡片（仅在 outlining 步骤） */}
                    {key === 'outlining' && <OutlineView outlineThinking={outlineThinking} />}

                    {/* 日志列表 */}
                    <div className={cn(
                      'overflow-y-auto',
                      key === 'writing' ? 'max-h-60' : 'max-h-48',
                    )}>
                      {hasLogs ? (
                        <div className="space-y-0.5">
                          {logs.map((log, idx) => (
                            <div key={idx} className="flex items-start gap-2 py-1 text-sm leading-relaxed">
                              <span className="text-[11px] text-gray-400 font-mono flex-shrink-0 mt-0.5 select-none">
                                {log.time}
                              </span>
                              <span className={cn(
                                'flex-1',
                                log.type === 'success' && 'text-green-700',
                                log.type === 'error' && 'text-red-600',
                                log.type === 'warn' && 'text-amber-700',
                                log.type === 'chapter' && 'text-orange-700',
                                !log.type || log.type === 'info' && 'text-gray-700',
                              )}>
                                {log.text}
                              </span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-gray-400 py-2 flex items-center gap-1.5">
                          {isActive ? (
                            <><Loader2 className="w-3.5 h-3.5 animate-spin" /> 等待中...</>
                          ) : '暂无日志'}
                        </p>
                      )}
                      <div ref={el => { bottomRefs.current[key] = el }} />
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}