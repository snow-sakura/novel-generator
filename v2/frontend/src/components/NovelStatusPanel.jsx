import { Layers, Users, Globe, Layout, Zap, PenTool, BookOpen, Loader2, FileText, Sparkles, ChevronRight } from 'lucide-react'
import { cn } from '../lib/utils'
import { STEP_CONFIG } from '../stores/novelStore'

const BRANCH_ICONS = {
  '1. 战略层': Layers, '2. 人物层': Users, '3. 设定层': Globe,
  '4. 结构层': Layout, '5. 节奏层': Zap, '6. 风格层': PenTool,
  '7. 章节细纲': BookOpen,
}

function getIconForTitle(title) {
  for (const [prefix, Icon] of Object.entries(BRANCH_ICONS)) {
    if (title.startsWith(prefix)) return Icon
  }
  return ChevronRight
}

function collectBranches(tree, depth = 0, maxDepth = 1) {
  const items = []
  for (const node of tree || []) {
    items.push({ title: node.title, node, depth })
    if (depth < maxDepth && node.children) {
      items.push(...collectBranches(node.children, depth + 1, maxDepth))
    }
  }
  return items
}

function ensureTree(outline) {
  if (!outline) return []
  if (outline._tree && Array.isArray(outline._tree)) return outline._tree
  return []
}

export default function NovelStatusPanel({ novelData }) {
  if (!novelData) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-6 h-full flex flex-col items-center justify-center text-gray-400">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-gray-100 to-gray-50 flex items-center justify-center mb-3">
          <BookOpen className="w-6 h-6 text-gray-300" />
        </div>
        <p className="text-sm font-medium text-gray-500">等待输入</p>
        <p className="text-xs text-gray-300 mt-1 text-center">输入故事灵感后，<br/>右侧将展示生成进度</p>
      </div>
    )
  }

  const { step, chapters, chapterTexts, outline, totalWords, seedText, gender, genre, style } = novelData
  const stepIdx = STEP_CONFIG.findIndex(s => s.key === step)
  const completedChapters = (chapterTexts || []).filter(t => t && t.trim().length > 50).length
  const totalChapters = (chapters || []).length
  const writing = step === 'writing'

  const tree = ensureTree(outline)
  const branches = collectBranches(tree)

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-4 shadow-sm">
      <div>
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-1">
          <Sparkles className="w-3 h-3 text-orange-400" />
          故事信息
        </h3>
        <div className="space-y-1.5">
          <p className="text-xs text-gray-700 truncate">
            <span className="text-gray-400">种子：</span>
            {seedText || '-'}
          </p>
          <div className="flex flex-wrap gap-1">
            {gender && <span className="px-1.5 py-0.5 bg-orange-50 text-orange-700 rounded text-[10px] font-medium border border-orange-200/50">{gender}</span>}
            {genre && <span className="px-1.5 py-0.5 bg-blue-50 text-blue-700 rounded text-[10px] font-medium border border-blue-200/50">{genre}</span>}
            {style && <span className="px-1.5 py-0.5 bg-purple-50 text-purple-700 rounded text-[10px] font-medium border border-purple-200/50">{style}</span>}
          </div>
        </div>
      </div>

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
                  isPast && 'bg-emerald-500 text-white',
                  isActive && 'bg-orange-500 text-white ring-2 ring-orange-200',
                  !isPast && !isActive && 'bg-gray-200 text-gray-400',
                )}>
                  {isPast ? '✓' : i + 1}
                </span>
                <span className={cn(
                  'text-[11px]',
                  isActive && 'text-orange-700 font-medium',
                  isPast && 'text-emerald-700',
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
                  done && 'bg-emerald-500 text-white',
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

      <div>
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-1">
          <FileText className="w-3 h-3 text-gray-400" />
          字数统计
        </h3>
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-gray-800">
            {(totalWords || 0).toLocaleString()} 字
          </span>
        </div>
      </div>

      {branches.length > 0 && (
        <div>
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">大纲结构</h3>
          <div className="space-y-0.5">
            {branches.map((b, i) => {
              const Icon = getIconForTitle(b.title)
              return (
                <div
                  key={i}
                  className="flex items-center gap-1.5 text-[10px] text-gray-600"
                  style={{ paddingLeft: `${b.depth * 12}px` }}
                >
                  <Icon className="w-3 h-3 text-gray-400 flex-shrink-0" />
                  <span className="truncate">{b.title}</span>
                  <span className="text-emerald-500 ml-auto flex-shrink-0">✓</span>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
