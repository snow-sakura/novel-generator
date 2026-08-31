import { Layers, Users, Globe, Layout, Zap, PenTool, BookOpen, Loader2, FileText, Hash } from 'lucide-react'
import { cn } from '../lib/utils'
import { STEP_CONFIG } from '../stores/novelStore'

const OUTLINE_ICONS = {
  strategy: Layers, characters: Users, world: Globe,
  plot_structure: Layout, rhythm: Zap, style_tone: PenTool,
}

export default function NovelStatusPanel({ novelData }) {
  if (!novelData) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 h-full flex flex-col items-center justify-center text-gray-400 p-6">
        <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mb-4">
          <BookOpen className="w-8 h-8 text-gray-300" />
        </div>
        <p className="text-sm font-medium text-gray-500">输入故事灵感</p>
        <p className="text-xs text-gray-400 mt-1 text-center">右侧将实时展示生成进度</p>
      </div>
    )
  }

  const { step, chapters, chapterTexts, outline, totalWords, seedText, gender, genre, style, lastLog, failedStep } = novelData
  const isError = step === 'error'
  const failedStepIdx = isError && failedStep ? STEP_CONFIG.findIndex(s => s.key === failedStep) : -1
  const stepIdx = isError ? -1 : STEP_CONFIG.findIndex(s => s.key === step)
  const completedChapters = (chapterTexts || []).filter(t => t && t.trim().length > 50).length
  const totalChapters = (chapters || []).length
  const writing = step === 'writing'

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-5">
      {/* 基本信息 */}
      <div>
        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">故事信息</h3>
        <div className="space-y-2">
          <p className="text-sm text-gray-700 line-clamp-2 bg-gray-50 p-2.5 rounded-lg border border-gray-100">
            {seedText || '未设置'}
          </p>
          <div className="flex flex-wrap gap-1.5">
            {gender && <span className="px-2 py-1 bg-gradient-to-r from-orange-100 to-rose-100 text-orange-700 rounded-lg text-xs font-medium">{gender}</span>}
            {genre && <span className="px-2 py-1 bg-blue-50 text-blue-700 rounded-lg text-xs font-medium">{genre}</span>}
            {style && <span className="px-2 py-1 bg-purple-50 text-purple-700 rounded-lg text-xs font-medium">{style}</span>}
          </div>
        </div>
      </div>

      {/* 当前步骤 */}
      <div>
        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">生成步骤</h3>
        {isError && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-xl mb-3">
            <p className="text-xs text-red-600 font-medium">⚠️ 生成已中断</p>
            <p className="text-xs text-red-500 mt-1 break-words">{novelData.errorMessage || '请检查错误信息后重试'}</p>
          </div>
        )}
        <div className="space-y-1.5">
          {STEP_CONFIG.map((s, i) => {
            const isActive = !isError && i === stepIdx
            const isFailed = isError && i === failedStepIdx
            const isPast = i < stepIdx
            return (
              <div key={s.key} className={cn(
                'flex items-center gap-3 p-2 rounded-lg transition-colors',
                isActive && 'bg-orange-50',
                isFailed && 'bg-red-50',
                isPast && 'bg-green-50/50'
              )}>
                <span className={cn(
                  'w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0',
                  isPast && 'bg-green-500 text-white',
                  isActive && 'bg-orange-500 text-white',
                  isFailed && 'bg-red-500 text-white',
                  !isPast && !isActive && !isFailed && 'bg-gray-200 text-gray-400',
                )}>
                  {isPast ? '✓' : isFailed ? '✕' : i + 1}
                </span>
                <span className={cn(
                  'text-xs flex-1',
                  isActive && 'text-orange-700 font-semibold',
                  isFailed && 'text-red-700 font-semibold',
                  isPast && 'text-green-700',
                  !isPast && !isActive && !isFailed && 'text-gray-400',
                )}>
                  {s.label}
                </span>
                {isActive && writing && totalChapters > 0 && (
                  <span className="text-[10px] text-orange-500 font-medium">
                    {completedChapters}/{totalChapters}
                  </span>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* 章节进度 */}
      {totalChapters > 0 && (
        <div>
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
            章节进度
            {writing && <span className="ml-2 text-orange-500 font-medium">{completedChapters}/{totalChapters}</span>}
          </h3>
          <div className="flex flex-wrap gap-1.5">
            {chapters.map((ch, i) => {
              const done = (chapterTexts[i] || '').trim().length > 50
              const isActive = !isError && writing && i === completedChapters
              return (
                <span key={i} className={cn(
                  'w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold',
                  done && 'bg-green-500 text-white',
                  isActive && 'bg-orange-500 text-white animate-pulse',
                  !done && !isActive && 'bg-gray-100 text-gray-400',
                )}>
                  {done ? '✓' : i + 1}
                </span>
              )
            })}
          </div>
        </div>
      )}

      {/* 字数统计 */}
      <div>
        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">字数统计</h3>
        <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl border border-gray-100">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-400 to-rose-500 flex items-center justify-center">
            <Hash className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="text-lg font-bold text-gray-800">{(totalWords || 0).toLocaleString()}</p>
            <p className="text-xs text-gray-400">总字数</p>
          </div>
        </div>
      </div>

      {/* 实时日志 */}
      {lastLog && (
        <div className="bg-gradient-to-r from-orange-50 to-amber-50 border border-orange-200 rounded-xl p-3">
          <p className="text-xs text-orange-700 leading-relaxed break-words">{lastLog}</p>
        </div>
      )}

      {/* 大纲缩略 */}
      {outline && Object.keys(outline).length > 0 && (
        <div>
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">大纲结构</h3>
          <div className="space-y-1.5">
            {Object.entries(OUTLINE_ICONS).map(([key, Icon]) => {
              if (!outline[key]) return null
              return (
                <div key={key} className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg border border-gray-100">
                  <Icon className="w-3.5 h-3.5 text-gray-400" />
                  <span className="text-xs text-gray-600 flex-1">
                    {key === 'strategy' ? '战略层' : key === 'characters' ? '人物层' : key === 'world' ? '世界观' : key === 'plot_structure' ? '结构' : key === 'rhythm' ? '节奏' : '风格'}
                  </span>
                  <span className="w-5 h-5 rounded-full bg-green-100 flex items-center justify-center">
                    <span className="text-green-600 text-xs">✓</span>
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
