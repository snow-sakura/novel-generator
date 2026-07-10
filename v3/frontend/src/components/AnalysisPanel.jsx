import React, { useState, useEffect } from 'react'
import { X, Loader2, BarChart3, FileText, Clock, Users, TrendingUp, ListOrdered, AlignLeft, BookOpen } from 'lucide-react'
import { analyzeNovel } from '../services/api'

function ecgLine(points, w, h, pad) {
  if (!points || points.length < 2) return { line: '', area: '' }
  if (points.length === 2) {
    const l = `M${points[0].x},${points[0].y} L${points[1].x},${points[1].y}`
    return { line: l, area: `${l} L${points[1].x},${h - pad.bottom} L${points[0].x},${h - pad.bottom} Z` }
  }
  let lineD = `M${points[0].x},${points[0].y}`
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = i === 0 ? points[0] : points[i - 1]
    const p1 = points[i]
    const p2 = points[i + 1]
    const p3 = i + 2 < points.length ? points[i + 2] : points[i + 1]
    const tension = 0.5
    const cp1x = p1.x + (p2.x - p0.x) * tension / 3
    const cp1y = p1.y + (p2.y - p0.y) * tension / 3
    const cp2x = p2.x - (p3.x - p1.x) * tension / 3
    const cp2y = p2.y - (p3.y - p1.y) * tension / 3
    lineD += ` C${cp1x},${cp1y} ${cp2x},${cp2y} ${p2.x},${p2.y}`
  }
  return { line: lineD, area: '' }
}

export default function AnalysisPanel({ novelId, demoMode, onClose }) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('stats')

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      try {
        const result = await analyzeNovel(novelId)
        if (!cancelled) setData(result)
      } catch (e) {
        if (!cancelled) console.error('分析失败', e)
      }
      if (!cancelled) setLoading(false)
    }
    load()
    return () => { cancelled = true }
  }, [novelId])

  const tabs = [
    { key: 'stats', label: '基础统计', icon: BarChart3 },
    { key: 'words', label: '词频', icon: AlignLeft },
    { key: 'characters', label: '角色出场', icon: Users },
    { key: 'emotion', label: '情感曲线', icon: TrendingUp },
  ]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden m-4" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-emerald-500" />
            <h2 className="text-lg font-bold text-gray-900">统计分析</h2>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors">
            <X className="w-4 h-4 text-gray-400" />
          </button>
        </div>

        <div className="flex border-b border-gray-100 px-6">
          {tabs.map(t => (
            <button key={t.key} onClick={() => setActiveTab(t.key)}
              className={`flex items-center gap-1.5 px-4 py-3 text-xs font-medium border-b-2 transition-colors ${activeTab === t.key ? 'text-emerald-600 border-emerald-500' : 'text-gray-500 border-transparent hover:text-gray-700'}`}>
              <t.icon className="w-3.5 h-3.5" />
              {t.label}
            </button>
          ))}
        </div>

        <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
          {loading ? (
            <div className="flex items-center justify-center py-16 text-gray-400">
              <Loader2 className="w-5 h-5 animate-spin mr-2" /> 分析中...
            </div>
          ) : !data ? (
            <div className="text-center py-16 text-gray-400 text-sm">分析失败</div>
          ) : (
            <>
              {activeTab === 'stats' && <StatsTab data={data} />}
              {activeTab === 'words' && <WordFreqTab data={data.word_frequency} />}
              {activeTab === 'characters' && <CharTab data={data.char_appearances} totalChapters={data.basic_stats?.chapter_count || 0} />}
              {activeTab === 'emotion' && <EmotionTab data={data.emotion_curve} />}
            </>
          )}
        </div>
      </div>
    </div>
  )
}

function StatsTab({ data }) {
  const s = data.basic_stats || {}
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
      {[
        { icon: FileText, label: '总字数', value: s.total_words?.toLocaleString() || 0, color: 'text-blue-600', bg: 'bg-blue-50' },
        { icon: ListOrdered, label: '章节数', value: s.chapter_count || 0, color: 'text-purple-600', bg: 'bg-purple-50' },
        { icon: Clock, label: '阅读时间', value: `${s.reading_time_min || 0} 分钟`, color: 'text-amber-600', bg: 'bg-amber-50' },
        { icon: Users, label: '角色统计', value: `${data.char_appearances?.length || 0} 个角色`, color: 'text-rose-600', bg: 'bg-rose-50' },
      ].map((item, i) => (
        <div key={i} className={`${item.bg} rounded-xl p-4 border border-gray-100`}>
          <item.icon className={`w-5 h-5 ${item.color} mb-2`} />
          <div className="text-2xl font-bold text-gray-900">{item.value}</div>
          <div className="text-xs text-gray-500 mt-1">{item.label}</div>
        </div>
      ))}

      {s.chapter_word_counts?.length > 0 && (
        <div className="col-span-full mt-2">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">每章字数分布</h3>
          <div className="flex items-end gap-1.5 h-28">
            {s.chapter_word_counts.map((wc, i) => {
              const max = Math.max(...s.chapter_word_counts, 1)
              const pct = (wc / max) * 100
              return (
                <div key={i} className="flex-1 flex flex-col items-center gap-1">
                  <span className="text-[10px] text-gray-400">{wc}</span>
                  <div className="w-full rounded-t bg-gradient-to-t from-emerald-400 to-emerald-300"
                    style={{ height: `${Math.max(pct, 4)}%`, minHeight: '8px' }} />
                  <span className="text-[10px] text-gray-400 truncate w-full text-center">{i + 1}</span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {s.chapter_titles?.length > 0 && (
        <div className="col-span-full mt-2">
          <h3 className="text-sm font-semibold text-gray-700 mb-2">章节列表</h3>
          <div className="space-y-1">
            {s.chapter_titles.map((t, i) => (
              <div key={i} className="flex items-center gap-2 text-xs text-gray-500">
                <span className="w-5 h-5 rounded bg-gray-100 flex items-center justify-center text-[10px] font-medium">{i + 1}</span>
                {t}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function WordFreqTab({ data }) {
  if (!data?.length) return <div className="text-center py-8 text-gray-400 text-sm">暂无数据</div>
  const maxCount = data[0]?.count || 1
  return (
    <div className="space-y-1.5">
      {data.map((item, i) => (
        <div key={i} className="flex items-center gap-3">
          <span className="w-6 text-right text-[10px] text-gray-400">{i + 1}</span>
          <span className="w-20 text-sm font-medium text-gray-700 truncate">{item.word}</span>
          <div className="flex-1 h-5 bg-gray-100 rounded-full overflow-hidden">
            <div className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-emerald-300 flex items-center justify-end px-2 text-[10px] text-white font-medium"
              style={{ width: `${(item.count / maxCount) * 100}%`, minWidth: item.count > 0 ? '20px' : 0 }}>
              {item.count}
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

function CharTab({ data, totalChapters }) {
  if (!data?.length) return <div className="text-center py-8 text-gray-400 text-sm">暂无角色数据（请先在设定档案中添加角色）</div>
  const maxTotal = Math.max(...data.map(d => d.total), 1)
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {data.map((ch, i) => (
        <div key={i} className="bg-gray-50 rounded-xl p-4 border border-gray-100">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="w-8 h-8 rounded-lg bg-gradient-to-br from-rose-400 to-rose-500 text-white flex items-center justify-center text-xs font-bold shadow-sm">
                {ch.name?.[0] || '?'}
              </span>
              <div>
                <h3 className="text-sm font-bold text-gray-800">{ch.name}</h3>
                <span className="text-[10px] text-gray-400">{totalChapters > 0 ? `${Math.round((ch.total / totalChapters) * 100)}% 出场率` : ''}</span>
              </div>
            </div>
            <span className="text-lg font-bold text-rose-500">{ch.total}<span className="text-[10px] text-gray-400 font-normal ml-0.5">次</span></span>
          </div>
          {ch.per_chapter?.length > 0 && (
            <div className="space-y-1">
              <div className="flex items-center gap-1.5 h-8">
                {ch.per_chapter.map((count, ci) => {
                  const maxCh = Math.max(...ch.per_chapter, 1)
                  const pct = (count / maxCh) * 100
                  return (
                    <div key={ci} className="flex-1 flex flex-col items-center justify-end relative group">
                      <span className="text-[8px] text-gray-400 mb-0.5 opacity-0 group-hover:opacity-100 transition-opacity">{count}</span>
                      <div className="w-full rounded-t bg-gradient-to-t from-rose-400 to-rose-300 transition-all hover:from-rose-500"
                        style={{ height: `${Math.max(pct, 3)}%`, minHeight: count > 0 ? '3px' : 0 }}
                        title={`第${ci+1}章: ${count}次`} />
                    </div>
                  )
                })}
              </div>
              <div className="flex justify-between text-[8px] text-gray-300">
                <span>第1章</span>
                <span>第{ch.per_chapter.length}章</span>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

const PHASE_COLORS = {
  '起': { line: '#f59e0b', fill: '#fef3c7', dot: '#d97706' },
  '承': { line: '#3b82f6', fill: '#eff6ff', dot: '#2563eb' },
  '转': { line: '#ef4444', fill: '#fef2f2', dot: '#dc2626' },
  '合': { line: '#10b981', fill: '#ecfdf5', dot: '#059669' },
}

const EMOTION_LABELS = {
  '平静': '😌 平静', '好奇': '🤔 好奇', '温暖': '🥰 温暖',
  '期待': '🎯 期待', '愉悦': '😊 愉悦', '温馨': '🏠 温馨', '热血': '🔥 热血',
  '紧张': '😰 紧张', '悲伤': '😢 悲伤', '愤怒': '😤 愤怒', '绝望': '💔 绝望', '震撼': '😲 震撼',
  '感动': '😭 感动', '释然': '😮‍💨 释然', '希望': '✨ 希望', '幸福': '🥹 幸福', '激动': '🎉 激动',
}

const PHASES = ['起', '承', '转', '合']

function EmotionTab({ data }) {
  if (!data?.length) return <div className="text-center py-8 text-gray-400 text-sm">暂无情感曲线数据</div>

  const hasStructured = data.some(d => d.phase && d.intensity)
  if (hasStructured) {
    const WIDTH = 600; const HEIGHT = 220
    const PAD = { top: 24, right: 20, bottom: 40, left: 36 }
    const innerW = WIDTH - PAD.left - PAD.right
    const innerH = HEIGHT - PAD.top - PAD.bottom
    const maxIntensity = 5
    const chapters = data.map(d => d.chapter)
    const minCh = Math.min(...chapters); const maxCh = Math.max(...chapters)
    const chRange = Math.max(1, maxCh - minCh)
    const xScale = (ch) => PAD.left + ((ch - minCh) / chRange) * innerW
    const yScale = (val) => PAD.top + innerH - ((val - 1) / (maxIntensity - 1)) * innerH
    const points = data.map(d => ({ ...d, x: xScale(d.chapter), y: yScale(d.intensity), color: PHASE_COLORS[d.phase] || PHASE_COLORS['起'] }))
    const { line: linePath } = ecgLine(points, WIDTH, HEIGHT, PAD)

    return (
      <div>
        <div className="flex items-center gap-3 mb-3 text-xs">
          {PHASES.map(ph => (
            <span key={ph} className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: PHASE_COLORS[ph].dot }} />
              {ph}
            </span>
          ))}
        </div>
        <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="w-full" style={{ maxHeight: HEIGHT }}>
          <defs>
            {PHASES.map(ph => (
              <linearGradient key={ph} id={`emotion-area-${ph}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={PHASE_COLORS[ph].dot} stopOpacity="0.25" />
                <stop offset="100%" stopColor={PHASE_COLORS[ph].dot} stopOpacity="0" />
              </linearGradient>
            ))}
          </defs>
          {[1, 2, 3, 4, 5].map(v => (
            <g key={v}>
              <line x1={PAD.left} y1={yScale(v)} x2={WIDTH - PAD.right} y2={yScale(v)} stroke="#e5e7eb" strokeWidth="1" strokeDasharray="3,2" />
              <text x={PAD.left - 6} y={yScale(v) + 3} textAnchor="end" className="text-[9px] fill-gray-400">{v}</text>
            </g>
          ))}
          {PHASES.map(ph => {
            const phasePoints = points.filter(p => p.phase === ph)
            if (phasePoints.length < 2) return null
            const x1 = phasePoints[0].x; const x2 = phasePoints[phasePoints.length - 1].x
            const firstIdx = points.indexOf(phasePoints[0])
            const lastIdx = points.indexOf(phasePoints[phasePoints.length - 1])
            let area = ''
            for (let i = firstIdx; i <= lastIdx; i++) {
              if (i === firstIdx) area += `M${points[i].x},${points[i].y}`
              else {
                const p0 = points[Math.max(firstIdx, i - 2)]
                const p1 = points[i - 1]
                const p2 = points[i]
                const p3 = points[Math.min(lastIdx, i + 1)]
                const tension = 0.5
                const cp1x = p1.x + (p2.x - p0.x) * tension / 3
                const cp1y = p1.y + (p2.y - p0.y) * tension / 3
                const cp2x = p2.x - (p3.x - p1.x) * tension / 3
                const cp2y = p2.y - (p3.y - p1.y) * tension / 3
                area += ` C${cp1x},${cp1y} ${cp2x},${cp2y} ${p2.x},${p2.y}`
              }
            }
            area += ` L${phasePoints[phasePoints.length - 1].x},${HEIGHT - PAD.bottom} L${phasePoints[0].x},${HEIGHT - PAD.bottom} Z`
            return (
              <g key={ph}>
                <rect x={x1} y={PAD.top} width={x2 - x1 + 6} height={innerH} fill={PHASE_COLORS[ph].fill} opacity="0.25" rx="4" />
                <path d={area} fill={`url(#emotion-area-${ph})`} />
              </g>
            )
          })}
          <path d={linePath} fill="none" stroke="#374151" strokeWidth="2" strokeLinejoin="round" opacity="0.85" />
          <path d={linePath} fill="none" stroke="#374151" strokeWidth="5" strokeLinejoin="round" opacity="0.08" />
          {points.map((p, i) => (
            <g key={i}>
              <circle cx={p.x} cy={p.y} r="5" fill={p.color.dot} stroke="white" strokeWidth="2" className="cursor-pointer">
                <title>{`第${p.chapter}章 · ${EMOTION_LABELS[p.emotion] || p.emotion} (${p.intensity}/5)`}</title>
              </circle>
              <circle cx={p.x} cy={p.y} r="8" fill="none" stroke={p.color.dot} strokeWidth="1" opacity="0.15" />
              <text x={p.x} y={HEIGHT - PAD.bottom + 14} textAnchor="middle" className="text-[9px] fill-gray-400">{p.chapter}</text>
            </g>
          ))}
        </svg>
        <p className="text-center text-[10px] text-gray-400 mt-1">起承转合 · 每章情感强度 1-5</p>
      </div>
    )
  }

  const values = data.map(d => typeof d === 'number' ? d : (d.value ?? d.score ?? 0))
  const maxVal = Math.max(...values.map(Math.abs), 0.1)
  return (
    <div>
      <div className="flex items-end gap-1 h-40 mb-2">
        {values.map((v, i) => {
          const pct = (v / maxVal) * 100
          const isPositive = v >= 0
          return (
            <div key={i} className="flex-1 flex flex-col items-center justify-end gap-0.5">
              <span className="text-[9px] text-gray-400">{v.toFixed(1)}</span>
              <div className="w-full rounded-t"
                style={{
                  height: `${Math.abs(pct)}%`,
                  minHeight: Math.abs(v) > 0 ? '4px' : 0,
                  background: isPositive ? 'linear-gradient(to top, #34d399, #10b981)' : 'linear-gradient(to top, #f87171, #ef4444)',
                }} />
              <span className="text-[9px] text-gray-400">{i + 1}</span>
            </div>
          )
        })}
      </div>
      <p className="text-center text-[10px] text-gray-400">每章情感值（正 = 积极，负 = 消极）</p>
    </div>
  )
}
