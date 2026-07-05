import { useEffect, useRef } from 'react'
import { Loader2 } from 'lucide-react'
import { useNovelStore } from '../stores/novelStore'

export default function NovelReader() {
  const { currentContent, chapters, generating } = useNovelStore()
  const bottomRef = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [currentContent])

  const isLoading = generating && !currentContent
  const isStreaming = generating && currentContent.length > 0

  return (
    <div className="bg-white rounded-xl border border-gray-200 min-h-[360px] max-h-[70vh] flex flex-col">
      {/* 章节标签 */}
      {chapters.length > 0 && (
        <div className="flex items-center gap-1.5 px-4 pt-4 pb-2 border-b border-gray-50 overflow-x-auto">
          {chapters.map((ch, i) => {
            const isActive = generating && i === chapters.length - 1
            return (
              <span
                key={i}
                className={`flex-shrink-0 text-xs px-2.5 py-1 rounded-full transition-colors ${
                  isActive
                    ? 'bg-orange-100 text-orange-700 font-medium'
                    : 'bg-gray-50 text-gray-500'
                }`}
              >
                {ch.title || `第${i + 1}章`}
                {isActive && (
                  <span className="inline-block ml-1 w-1 h-1 bg-orange-500 rounded-full animate-pulse" />
                )}
              </span>
            )
          })}
        </div>
      )}

      {/* 内容区域 */}
      <div className="flex-1 overflow-y-auto p-6">
        {/* 初始加载中 */}
        {isLoading && (
          <div className="flex flex-col items-center justify-center h-60 text-gray-400">
            <Loader2 className="w-8 h-8 animate-spin mb-3 text-orange-500" />
            <p className="text-sm">正在构思故事要素...</p>
            <p className="text-xs mt-1">AI 正在分析种子句并规划章节结构</p>
          </div>
        )}

        {/* 小说内容 */}
        {currentContent ? (
          <div
            className="novel-content"
            dangerouslySetInnerHTML={{ __html: renderMarkdown(currentContent) }}
          />
        ) : null}

        {/* 流式光标 */}
        {isStreaming && (
          <span className="inline-block w-0.5 h-5 bg-orange-500 animate-pulse ml-0.5 align-middle" />
        )}

        <div ref={bottomRef} />
      </div>
    </div>
  )
}

/** 简易 Markdown 转 HTML */
function renderMarkdown(text) {
  if (!text) return ''

  let html = text
    .replace(/^### (.+)$/gm, '<h3>$1</h3>')
    .replace(/^## (.+)$/gm, '<h2>$1</h2>')
    .replace(/^# (.+)$/gm, '<h1>$1</h1>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/\n\n/g, '</p><p>')
    .replace(/\n/g, '<br/>')

  return `<p>${html}</p>`
}
