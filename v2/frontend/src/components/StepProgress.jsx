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
      <div className="flex items-center justify-center gap-1">
        {STEP_CONFIG.map((step, i) => {
          const isActive = i === currentIdx
          const isPast = i < currentIdx || (currentStep === STEPS.DONE && i < STEP_CONFIG.length)

          return (
            <div key={step.key} className="flex items-center gap-1 flex-1">
              <div className="flex items-center gap-1.5 flex-1 justify-center">
                <div
                  className={cn(
                    'flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-all',
                    isPast && 'bg-green-500 text-white',
                    isActive && 'bg-orange-500 text-white ring-2 ring-orange-200',
                    !isPast && !isActive && 'bg-gray-100 text-gray-400'
                  )}
                >
                  {isPast ? '✓' : i + 1}
                </div>
                <div className="flex flex-col items-center min-w-0">
                  <span
                    className={cn(
                      'text-xs font-medium transition-colors whitespace-nowrap',
                      isActive && 'text-orange-700',
                      isPast && 'text-green-700',
                      !isPast && !isActive && 'text-gray-400'
                    )}
                  >
                    {step.label}
                    {isActive && currentStep !== STEPS.DONE && (
                      <span className="inline-block ml-1 w-1.5 h-1.5 bg-orange-500 rounded-full animate-pulse align-middle" />
                    )}
                  </span>
                  <span className="text-[10px] text-gray-400 leading-tight">
                    {isActive ? (isWriting && chapters.length > 0 ? `已完成 ${chapters.length} 章` : step.desc) : step.desc}
                  </span>
                </div>
              </div>
              {i < STEP_CONFIG.length - 1 && (
                <div className={cn(
                  'h-px flex-1 mx-1',
                  i < currentIdx || (currentStep === STEPS.DONE && i < STEP_CONFIG.length)
                    ? 'bg-green-400'
                    : 'bg-gray-200'
                )} />
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
