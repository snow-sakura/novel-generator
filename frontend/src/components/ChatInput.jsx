import { useState } from 'react'
import { Send, Loader2 } from 'lucide-react'
import { cn } from '../lib/utils'

export default function ChatInput({ onSend, disabled }) {
  const [text, setText] = useState('')

  function handleSubmit(e) {
    e.preventDefault()
    if (!text.trim() || disabled) return
    onSend(text.trim())
    setText('')
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit(e)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="border-t border-gray-200 p-4 bg-white rounded-b-xl">
      <div className="flex gap-2">
        <textarea
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="描述你的故事灵感..."
          rows={1}
          disabled={disabled}
          className="flex-1 px-4 py-3 rounded-xl border border-gray-200 focus:border-orange-400 focus:ring-2 focus:ring-orange-100 outline-none resize-none text-sm transition-all disabled:bg-gray-50 disabled:cursor-not-allowed leading-5"
          onInput={e => { e.target.style.height = ''; e.target.style.height = e.target.scrollHeight + 'px' }}
        />
        <button
          type="submit"
          disabled={disabled || !text.trim()}
          className={cn(
            'flex-shrink-0 w-12 rounded-xl flex items-center justify-center transition-all self-stretch',
            disabled || !text.trim()
              ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
              : 'bg-gradient-to-r from-orange-500 to-rose-500 text-white hover:from-orange-600 hover:to-rose-600 shadow-sm',
          )}
        >
          {disabled ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
        </button>
      </div>
      <p className="text-[10px] text-gray-400 mt-1.5">按 Enter 发送，Shift+Enter 换行</p>
    </form>
  )
}
