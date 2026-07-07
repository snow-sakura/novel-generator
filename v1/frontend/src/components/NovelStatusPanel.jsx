import { Layers, Users, Globe, Layout, Zap, PenTool, BookOpen, Loader2, FileText } from 'lucide-react'
import { cn } from '../lib/utils'
import { STEP_CONFIG } from '../stores/novelStore'

const OUTLINE_ICONS = {
  strategy: Layers, characters: Users, world: Globe,
  plot_structure: Layout, rhythm: Zap, style_tone: PenTool,
}

export default function NovelStatusPanel({ novelData }) {
  if (!novelData) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-6 h-full flex flex-col items-center justify-center text-gray-400">
        <BookOpen className="w-10 h-10 mb-3 text-gray-300" />
        <p className="text-sm">输入故事灵感，开始生成</p>
        <p className="text-xs text-gray-300 mt-1">右侧将实时展示生成进度</p>
      </div>
    )
  }

  const { step, chapters, chapterTexts, outline, totalWords, seedText, gender, genre, style } = novelData
  const stepIdx = STEP_CONFIG.findIndex(s => s.key === step)
  const completedChapters = (chapterTexts || []).filter(t => t && t.trim().length > 50).length
  const totalChapters = (chapters || []).length
  const writing = step === 'writing'

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-4">
      {/* 基本信息 */}
      <div>
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">故事信息</h3>
        <div className="space-y-1.5">
          <p className="text-xs text-gray-700 truncate">
            <span className="text-gray-400">种子：</span>
            {seedText || '-'}
          </p>
          <div className="flex flex-wrap gap-1">
            {gender && <span className="px-1.5 py-0.5 bg-orange-50 text-orange-700 rounded text-[10px] font-medium">{gender}</span>}
            {genre && <span className="px-1.5 py-0.5 bg-blue-50 text-blue-700 rounded text-[10px] font-medium">{genre}</span>}
            {style && <span className="px-1.5 py-0.5 bg-purple-50 text-purple-700 rounded text-[10px] font-medium">{style}</span>}
          </div>
        </div>
      </div>

      {/* 当前步骤 */}
      <div>
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">当前步骤</h3>
        <div className="space-y-1">
          {STEP_CONFIG.map((s, i) => {
            const isActive = i === stepIdx
            const isPast = i < stepIdx
            return (
              <div key={s.key} className="flex items-center gap-2">
                <span className={cn(
                  'flex-shrink-0 w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-bold',
                  isPast && 'bg-green-500 text-white',
                  isActive && 'bg-orange-500 text-white ring-2 ring-orange-200',
                  !isPast && !isActive && 'bg-gray-200 text-gray-400',
                )}>
                  {isPast ? '✓' : i + 1}
                </span>
                <span className={cn(
                  'text-[11px]',
                  isActive && 'text-orange-700 font-medium',
                  isPast && 'text-green-700',
                  !isPast && !isActive && 'text-gray-400',
                )}>
                  {s.label}
                </span>
                {isActive && writing && totalChapters > 0 && (
                  <span className="text-[10px] text-orange-500 ml-auto">
                    {completedChapters}/{totalChapters}章
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
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
            章节进度
            {writing && <span className="ml-1 text-orange-500">{completedChapters}/{totalChapters}</span>}
          </h3>
          <div className="flex flex-wrap gap-1">
            {chapters.map((ch, i) => {
              const done = (chapterTexts[i] || '').trim().length > 50
              const isActive = writing && i === completedChapters
              return (
                <span key={i} className={cn(
                  'w-5 h-5 rounded flex items-center justify-center text-[9px] font-bold',
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
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">字数统计</h3>
        <div className="flex items-center gap-2">
          <FileText className="w-3.5 h-3.5 text-gray-400" />
          <span className="text-sm font-medium text-gray-800">
            {(totalWords || 0).toLocaleString()} 字
          </span>
        </div>
      </div>

      {/* 大纲缩略 */}
      {outline && Object.keys(outline).length > 0 && (
        <div>
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">大纲结构</h3>
          <div className="space-y-1">
            {Object.entries(OUTLINE_ICONS).map(([key, Icon]) => {
              if (!outline[key]) return null
              return (
                <div key={key} className="flex items-center gap-1.5 text-[10px] text-gray-600">
                  <Icon className="w-3 h-3 text-gray-400" />
                  <span>{key === 'strategy' ? '战略' : key === 'characters' ? '人物' : key === 'world' ? '设定' : key === 'plot_structure' ? '结构' : key === 'rhythm' ? '节奏' : '风格'}</span>
                  <span className="text-green-500 ml-auto">✓</span>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
