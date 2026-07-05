import { useNovelStore, STEPS } from '../stores/novelStore'
import { cn } from '../lib/utils'

const STEP_CONFIG = [
  { key: STEPS.PARSING, label: '要素解析', desc: '分析故事六要素' },
  { key: STEPS.OUTLINING, label: '大纲规划', desc: '构建章节结构' },
  { key: STEPS.WRITING, label: '逐章生成', desc: '创作小说正文' },
  { key: STEPS.TITLING, label: '生成标题', desc: '拟定小说标题' },
]

export default function StepProgress() {
  const { currentStep, chapters } = useNovelStore()

  const currentIdx = STEP_CONFIG.findIndex((s) => s.key === currentStep)
  const isWriting = currentStep === STEPS.WRITING

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <h3 className="text-sm font-medium text-gray-700 mb-3">生成进度</h3>
      <div className="space-y-2">
        {STEP_CONFIG.map((step, i) => {
          const isActive = i === currentIdx
          const isPast = i < currentIdx || (currentStep === STEPS.DONE && i < STEP_CONFIG.length)

          return (
            <div key={step.key} className="flex items-start gap-3">
              {/* 状态图标 */}
              <div
                className={cn(
                  'flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold mt-0.5 transition-all',
                  isPast && 'bg-green-500 text-white',
                  isActive && 'bg-orange-500 text-white ring-2 ring-orange-200',
                  !isPast && !isActive && 'bg-gray-100 text-gray-400'
                )}
              >
                {isPast ? '✓' : i + 1}
              </div>

              {/* 文字 */}
              <div className="flex-1 min-w-0">
                <p
                  className={cn(
                    'text-sm font-medium transition-colors',
                    isActive && 'text-orange-700',
                    isPast && 'text-green-700',
                    !isPast && !isActive && 'text-gray-400'
                  )}
                >
                  {step.label}
                  {isActive && currentStep !== STEPS.DONE && (
                    <span className="inline-block ml-1.5 w-1.5 h-1.5 bg-orange-500 rounded-full animate-pulse" />
                  )}
                </p>
                <p className="text-xs text-gray-400 mt-0.5">
                  {isActive ? (isWriting && chapters.length > 0 ? `已完成 ${chapters.length} 章` : step.desc) : step.desc}
                </p>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
