import { Sparkles, User, Loader2 } from 'lucide-react'
import { cn } from '../lib/utils'

function renderMD(text) {
  if (!text) return ''
  let html = text
    .replace(/^### (.+)$/gm, '<h3 class="text-base font-bold my-2 text-gray-800">$1</h3>')
    .replace(/^## (.+)$/gm, '<h2 class="text-lg font-bold my-3 text-gray-900">$1</h2>')
    .replace(/^# (.+)$/gm, '<h1 class="text-xl font-bold my-4 text-gray-900">$1</h1>')
    .replace(/\*\*(.+?)\*\*/g, '<strong class="font-semibold">$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/\n\n/g, '</p><p class="text-sm leading-relaxed mb-3 text-gray-700">')
    .replace(/\n/g, '<br/>')
  return '<p class="text-sm leading-relaxed mb-3 text-gray-700">' + html + '</p>'
}

export default function ChatMessage({ message, isLast }) {
  const isUser = message.role === 'user'
  const isStreaming = isLast && message.streaming

  return (
    <div className={cn(
      'flex gap-3 px-4 py-3 animate-fade-in-up group',
      isUser ? 'justify-end' : 'justify-start',
    )}>
      {!isUser && (
        <div className="flex-shrink-0 w-8 h-8 rounded-xl gradient-brand flex items-center justify-center shadow-sm">
          <Sparkles className="w-4 h-4 text-white" />
        </div>
      )}

      <div className={cn(
        'max-w-[80%] rounded-2xl px-4 py-3 shadow-sm',
        isUser
          ? 'bg-gradient-to-br from-orange-500 to-rose-500 text-white rounded-tr-md'
          : 'bg-gray-100 text-gray-800 rounded-tl-md',
      )}>
        {isUser ? (
          <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>
        ) : (
          <div
            className="prose prose-sm max-w-none"
            dangerouslySetInnerHTML={{ __html: renderMD(message.content) }}
          />
        )}
        {isStreaming && (
          <span className="inline-flex ml-1">
            <span className="inline-block w-1.5 h-4 bg-current rounded-sm animate-pulse" />
          </span>
        )}
      </div>

      {isUser && (
        <div className="flex-shrink-0 w-8 h-8 rounded-xl bg-gray-700 flex items-center justify-center shadow-sm">
          <User className="w-4 h-4 text-white" />
        </div>
      )}
    </div>
  )
}