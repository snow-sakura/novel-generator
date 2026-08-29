import { useNovelStore, STEPS, STEP_CONFIG } from '../stores/novelStore'
import { cn } from '../lib/utils'
import { CheckCircle2, Clock, Loader2 } from 'lucide-react'

export default function StepProgress() {
  const { currentStep, chapters } = useNovelStore()

  const currentIdx = STEP_CONFIG.findIndex((s) => s.key === currentStep)
  const isWriting = currentStep === STEPS.WRITING

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <div className="flex items-center gap-2 mb-4">
        <Clock className="w-4 h-4 text-orange-500" />
        <h3 className="text-sm font-semibold text-gray-800">生成进度</h3>
      </div>
      
      <div className="flex items-center justify-between gap-2">
        {STEP_CONFIG.map((step, i) => {
          const isActive = i === currentIdx
          const isPast = i < currentIdx || (currentStep === STEPS.DONE && i < STEP_CONFIG.length)

          return (
            <div key={step.key} className="flex items-center flex-1 last:flex-none">
              <div className="flex flex-col items-center gap-2">
                <div
                  className={cn(
                    'w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold transition-all shadow-sm',
                    isPast && 'bg-gradient-to-br from-green-400 to-green-500 text-white',
                    isActive && 'bg-gradient-to-br from-orange-400 to-rose-500 text-white ring-4 ring-orange-100',
                    !isPast && !isActive && 'bg-gray-100 text-gray-400'
                  )}
                >
                  {isPast ? (
                    <CheckCircle2 className="w-5 h-5" />
                  ) : isActive ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    i + 1
                  )}
                </div>
                <div className="text-center">
                  <p className={cn(
                    'text-xs font-semibold whitespace-nowrap',
                    isActive && 'text-orange-600',
                    isPast && 'text-green-600',
                    !isPast && !isActive && 'text-gray-400'
                  )}>
                    {step.label}
                  </p>
                  <p className={cn(
                    'text-[10px] mt-0.5 whitespace-nowrap',
                    isActive && 'text-orange-500',
                    isPast && 'text-green-500',
                    !isPast && !isActive && 'text-gray-300'
                  )}>
                    {isWriting && i === currentIdx && chapters.length > 0
                      ? `${chapters.length} 章`
                      : step.desc}
                  </p>
                </div>
              </div>
              {i < STEP_CONFIG.length - 1 && (
                <div className={cn(
                  'h-1 flex-1 mx-2 rounded-full transition-colors',
                  i < currentIdx || (currentStep === STEPS.DONE && i < STEP_CONFIG.length)
                    ? 'bg-gradient-to-r from-green-400 to-green-500'
                    : 'bg-gray-100'
                )} />
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
