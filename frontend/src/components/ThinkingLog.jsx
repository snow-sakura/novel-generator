import { useEffect, useRef } from 'react'
import { useNovelStore } from '../stores/novelStore'
import { cn } from '../lib/utils'

export default function ThinkingLog() {
  const { thinkingLogs, generating } = useNovelStore()
  const bottomRef = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [thinkingLogs.length])

  if (thinkingLogs.length === 0) return null

  return (
    <div className={cn(
      'bg-white rounded-xl border p-4',
      generating ? 'border-orange-200' : 'border-gray-200'
    )}>
      <h3 className="text-sm font-medium text-gray-700 mb-2">
        生成日志
        {generating && <span className="inline-block ml-1.5 w-1.5 h-1.5 bg-orange-500 rounded-full animate-pulse align-middle" />}
      </h3>
      <div className="thinking-log max-h-60 overflow-y-auto">
        {thinkingLogs.map((log, i) => (
          <span key={i} className="log-entry">
            <span className="log-time">{log.time}</span>
            <span className={`log-${log.type || 'info'}`}>{log.text}</span>
          </span>
        ))}
        <div ref={bottomRef} />
      </div>
    </div>
  )
}
