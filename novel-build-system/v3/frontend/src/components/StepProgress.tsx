import { useNovelStore, STEPS, STEP_CONFIG } from '../stores/novelStore'
import { cn } from '../lib/utils'
import { CheckCircle2, Loader2 } from 'lucide-react'

export default function StepProgress() {
  const { currentStep, chapters } = useNovelStore()
  const currentIdx = STEP_CONFIG.findIndex(s => s.key === currentStep)
  const isWriting = currentStep === STEPS.WRITING

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm animate-fade-in-down">
      <div className="flex items-center justify-between gap-2">
        {STEP_CONFIG.map((step, i) => {
          const isActive = i === currentIdx
          const isPast = i < currentIdx || (currentStep === STEPS.DONE && i < STEP_CONFIG.length)

          return (
            <div key={step.key} className="flex items-center gap-2 flex-1">
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <div className={cn(
                  'flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300',
                  isPast && 'bg-emerald-500 text-white shadow-sm',
                  isActive && 'bg-orange-500 text-white ring-2 ring-orange-200 shadow-sm',
                  !isPast && !isActive && 'bg-gray-100 text-gray-400'
                )}>
                  {isPast ? <CheckCircle2 className="w-4 h-4" /> : isActive ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : i + 1}
                </div>

                <div className="flex flex-col min-w-0">
                  <span className={cn(
                    'text-xs font-semibold transition-colors whitespace-nowrap',
                    isActive && 'text-orange-700',
                    isPast && 'text-emerald-700',
                    !isPast && !isActive && 'text-gray-400'
                  )}>
                    {step.label}
                  </span>
                  <span className="text-[10px] text-gray-400 leading-tight">
                    {isActive ? (
                      isWriting && chapters.length > 0
                        ? `已完成 ${chapters.length} 章`
                        : step.desc
                    ) : step.desc}
                  </span>
                </div>
              </div>

              {i < STEP_CONFIG.length - 1 && (
                <div className={cn(
                  'h-0.5 flex-1 mx-1 rounded-full transition-all duration-500',
                  i < currentIdx || (currentStep === STEPS.DONE && i < STEP_CONFIG.length)
                    ? 'bg-emerald-400'
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