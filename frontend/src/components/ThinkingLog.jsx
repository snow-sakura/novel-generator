import { useEffect, useRef } from 'react'
import { useNovelStore } from '../stores/novelStore'

export default function ThinkingLog() {
  const { thinkingLogs } = useNovelStore()
  const bottomRef = useRef(null)

  // 新日志时自动滚到底部
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [thinkingLogs.length])

  if (thinkingLogs.length === 0) return null

  return (
    <div>
      <h3 className="text-sm font-medium text-gray-700 mb-2">思考日志</h3>
      <div className="thinking-log">
        {thinkingLogs.map((log, i) => (
          <span key={i} className="log-entry">
            <span className="log-time">{log.time}</span>
            <span className={`log-${log.type}`}>{log.text}</span>
          </span>
        ))}
        <div ref={bottomRef} />
      </div>
    </div>
  )
}
