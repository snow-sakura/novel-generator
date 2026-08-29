import { Sparkles, User, Loader2, Copy, Check } from 'lucide-react'
import { useState } from 'react'
import { cn, renderMarkdown } from '../lib/utils'

const renderMD = (text) => renderMarkdown(text, { size: 'sm', showBorders: true, showLists: true })

export default function ChatMessage({ message, isLast }) {
  const isUser = message.role === 'user'
  const isStreaming = isLast && message.streaming
  const [copied, setCopied] = useState(false)

  function handleCopy() {
    navigator.clipboard.writeText(message.content)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className={cn(
      'flex gap-3 px-5 py-4',
      isUser ? 'justify-end' : 'justify-start',
    )}>
      {/* AI头像 */}
      {!isUser && (
        <div className="flex-shrink-0 w-9 h-9 rounded-xl bg-gradient-to-br from-orange-400 to-rose-500 flex items-center justify-center shadow-sm">
          <Sparkles className="w-4 h-4 text-white" />
        </div>
      )}

      {/* 消息内容 */}
      <div className={cn(
        'max-w-[75%] rounded-2xl px-4 py-3',
        isUser
          ? 'bg-orange-500 text-white rounded-tr-md'
          : 'bg-gray-50 text-gray-800 rounded-tl-md border border-gray-100',
      )}>
        {isUser ? (
          <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>
        ) : (
          <div
            className="prose prose-sm max-w-none"
            dangerouslySetInnerHTML={{ __html: renderMD(message.content) }}
          />
        )}
        
        {/* 流式加载指示器 */}
        {isStreaming && (
          <div className="flex items-center gap-2 mt-2 text-orange-500">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span className="text-xs">正在生成...</span>
          </div>
        )}
      </div>

      {/* 用户头像 */}
      {isUser && (
        <div className="flex-shrink-0 w-9 h-9 rounded-xl bg-gray-700 flex items-center justify-center shadow-sm">
          <User className="w-4 h-4 text-white" />
        </div>
      )}

      {/* 复制按钮 - 仅AI消息显示 */}
      {!isUser && !isStreaming && message.content && (
        <div className="flex-shrink-0 self-end">
          <button onClick={handleCopy}
            className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-all"
            title="复制">
            {copied ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
          </button>
        </div>
      )}
    </div>
  )
}
