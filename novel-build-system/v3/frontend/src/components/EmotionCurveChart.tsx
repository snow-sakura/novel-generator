import { Activity } from 'lucide-react'

const PHASE_COLORS = {
  '起': { line: '#f59e0b', fill: '#fef3c7', dot: '#d97706', gradient: ['#fbbf24', '#f59e0b00'] },
  '承': { line: '#3b82f6', fill: '#eff6ff', dot: '#2563eb', gradient: ['#60a5fa', '#3b82f600'] },
  '转': { line: '#ef4444', fill: '#fef2f2', dot: '#dc2626', gradient: ['#f87171', '#ef444400'] },
  '合': { line: '#10b981', fill: '#ecfdf5', dot: '#059669', gradient: ['#34d399', '#10b98100'] },
}

const EMOTION_LABELS = {
  '平静': '😌 平静', '好奇': '🤔 好奇', '温暖': '🥰 温暖',
  '期待': '🎯 期待', '愉悦': '😊 愉悦', '温馨': '🏠 温馨', '热血': '🔥 热血',
  '紧张': '😰 紧张', '悲伤': '😢 悲伤', '愤怒': '😤 愤怒', '绝望': '💔 绝望', '震撼': '😲 震撼',
  '感动': '😭 感动', '释然': '😮‍💨 释然', '希望': '✨ 希望', '幸福': '🥹 幸福', '激动': '🎉 激动',
}

const PHASES = ['起', '承', '转', '合']

function ecgLine(points) {
  if (!points || points.length < 2) return { line: '', area: '' }
  if (points.length === 2) {
    const l = `M${points[0].x},${points[0].y} L${points[1].x},${points[1].y}`
    const a = `${l} L${points[1].x},${HEIGHT - PAD.bottom} L${points[0].x},${HEIGHT - PAD.bottom} Z`
    return { line: l, area: a }
  }
  let lineD = `M${points[0].x},${points[0].y}`
  let areaD = `M${points[0].x},${points[0].y}`
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
    areaD += ` C${cp1x},${cp1y} ${cp2x},${cp2y} ${p2.x},${p2.y}`
  }
  areaD += ` L${points[points.length - 1].x},${HEIGHT - PAD.bottom} L${points[0].x},${HEIGHT - PAD.bottom} Z`
  return { line: lineD, area: areaD }
}

const WIDTH = 720
const HEIGHT = 260
const PAD = { top: 30, right: 30, bottom: 50, left: 40 }
const innerH = HEIGHT - PAD.top - PAD.bottom

export default function EmotionCurveChart({ data = [] }) {
  if (!data || data.length === 0) return null

  const maxIntensity = 5
  const chapters = data.map(d => d.chapter)
  const minCh = Math.min(...chapters)
  const maxCh = Math.max(...chapters)
  const chRange = Math.max(1, maxCh - minCh)

  const xScale = (ch) => PAD.left + ((ch - minCh) / chRange) * (WIDTH - PAD.left - PAD.right)
  const yScale = (val) => PAD.top + innerH - ((val - 1) / (maxIntensity - 1)) * innerH

  const points = data.map((d) => ({
    ...d,
    x: xScale(d.chapter),
    y: yScale(d.intensity),
    color: PHASE_COLORS[d.phase] || PHASE_COLORS['起'],
  }))

  const { line: linePath, area: areaPath } = ecgLine(points)

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
      <div className="flex items-center gap-2 mb-4">
        <Activity className="w-5 h-5 text-emerald-600" />
        <h3 className="text-sm font-semibold text-gray-700">情感曲线</h3>
        <div className="flex items-center gap-3 ml-auto text-xs">
          {PHASES.map(ph => (
            <span key={ph} className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: PHASE_COLORS[ph].dot }} />
              {ph}
            </span>
          ))}
        </div>
      </div>

      <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="w-full" style={{ maxHeight: HEIGHT }}>
        <defs>
          {PHASES.map(ph => {
            const phasePoints = points.filter(p => p.phase === ph)
            if (phasePoints.length < 2) return null
            const x1 = phasePoints[0].x
            const x2 = phasePoints[phasePoints.length - 1].x
            const midX = (x1 + x2) / 2
            return (
              <linearGradient key={ph} id={`areaGrad-${ph}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={PHASE_COLORS[ph].gradient[0]} stopOpacity="0.35" />
                <stop offset="100%" stopColor={PHASE_COLORS[ph].gradient[1]} stopOpacity="0" />
              </linearGradient>
            )
          })}
        </defs>

        {/* Y axis grid lines */}
        {[1, 2, 3, 4, 5].map(v => (
          <g key={v}>
            <line x1={PAD.left} y1={yScale(v)} x2={WIDTH - PAD.right} y2={yScale(v)}
              stroke="#e5e7eb" strokeWidth="1" strokeDasharray="4,3" />
            <text x={PAD.left - 8} y={yScale(v) + 4} textAnchor="end"
              className="text-[10px] fill-gray-400">{v}</text>
          </g>
        ))}
        <text x={PAD.left - 4} y={PAD.top - 6} textAnchor="end"
          className="text-[10px] fill-gray-400">强度</text>

        {/* Phase background blocks with subtle gradient */}
        {PHASES.map(ph => {
          const phasePoints = points.filter(p => p.phase === ph)
          if (phasePoints.length === 0) return null
          const x1 = phasePoints[0].x
          const x2 = phasePoints[phasePoints.length - 1].x
          return (
            <g key={ph}>
              <rect x={x1} y={PAD.top} width={x2 - x1 + 6} height={innerH}
                fill={PHASE_COLORS[ph].fill} opacity="0.35" rx="4" />
              <line x1={x1} y1={PAD.top} x2={x1} y2={PAD.top + innerH}
                stroke={PHASE_COLORS[ph].dot} strokeWidth="2" strokeDasharray="5,3" opacity="0.25" />
            </g>
          )
        })}

        {/* ECG-style area fill under the curve */}
        {PHASES.map(ph => {
          const phasePoints = points.filter(p => p.phase === ph)
          if (phasePoints.length < 2) return null
          const x1 = phasePoints[0].x
          const x2 = phasePoints[phasePoints.length - 1].x
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
          if (area) {
            area += ` L${phasePoints[phasePoints.length - 1].x},${HEIGHT - PAD.bottom} L${phasePoints[0].x},${HEIGHT - PAD.bottom} Z`
            return <path key={ph} d={area} fill={`url(#areaGrad-${ph})`} />
          }
          return null
        })}

        {/* Main connecting line - bold, dramatic */}
        <path d={linePath} fill="none" stroke="#374151" strokeWidth="2.5" strokeLinejoin="round" opacity="0.85" />

        {/* Glowing line behind */}
        <path d={linePath} fill="none" stroke="#374151" strokeWidth="6" strokeLinejoin="round" opacity="0.08" />

        {/* Intensity peak bars (ECG-style) */}
        {points.map((p, i) => {
          const peakH = (p.intensity / maxIntensity) * 18
          return p.intensity >= 3 ? (
            <line key={`peak-${i}`} x1={p.x} y1={p.y - peakH} x2={p.x} y2={p.y}
              stroke={p.color.dot} strokeWidth="1.5" strokeLinecap="round" opacity="0.3" />
          ) : null
        })}

        {/* Data dots with pulse rings */}
        {points.map((p, i) => (
          <g key={i}>
            <circle cx={p.x} cy={p.y} r="6" fill={p.color.dot} stroke="white" strokeWidth="2.5"
              className="cursor-pointer" filter="url(#drop-shadow)">
              <title>{`第${p.chapter}章 · ${EMOTION_LABELS[p.emotion] || p.emotion} (${p.intensity}/5)`}</title>
            </circle>
            <circle cx={p.x} cy={p.y} r="10" fill="none" stroke={p.color.dot} strokeWidth="1" opacity="0.2" />
            <text x={p.x} y={HEIGHT - PAD.bottom + 16} textAnchor="middle"
              className="text-[10px] fill-gray-400">{p.chapter}</text>
          </g>
        ))}

        {/* X axis label */}
        <text x={WIDTH / 2} y={HEIGHT - 4} textAnchor="middle"
          className="text-[10px] fill-gray-400">章节</text>
      </svg>
    </div>
  )
}
