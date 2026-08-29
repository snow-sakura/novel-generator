import { useState, useRef, useEffect } from 'react'
import { Send, Loader2 } from 'lucide-react'
import { cn } from '../lib/utils'

export default function ChatInput({ onSend, disabled }) {
  const [text, setText] = useState('')
  const textareaRef = useRef(null)

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px'
    }
  }, [text])

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
      <div className="flex gap-2 items-end">
        <textarea
          ref={textareaRef}
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="描述你的故事灵感..."
          rows={1}
          disabled={disabled}
          className="flex-1 px-4 py-3 rounded-xl border border-gray-200 focus:border-orange-400 focus:ring-2 focus:ring-orange-100 outline-none resize-none text-sm transition-all disabled:bg-gray-50 disabled:cursor-not-allowed leading-5 max-h-32"
        />
        <button
          type="submit"
          disabled={disabled || !text.trim()}
          aria-label="发送"
          className={cn(
            'flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center transition-all',
            disabled || !text.trim()
              ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
              : 'gradient-brand text-white hover:shadow-md',
          )}
        >
          {disabled ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
        </button>
      </div>
      <p className="text-[10px] text-gray-400 mt-1.5">Enter 发送 · Shift+Enter 换行</p>
    </form>
  )
}