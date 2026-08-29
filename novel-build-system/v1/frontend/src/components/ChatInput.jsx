import { useState } from 'react'
import { Send, Loader2, Paperclip } from 'lucide-react'
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
    <div className="border-t border-gray-100 bg-white px-5 py-4">
      <form onSubmit={handleSubmit} className="max-w-3xl mx-auto">
        <div className="relative flex items-end gap-3">
          {/* 输入框容器 */}
          <div className="flex-1 relative">
            <textarea
              value={text}
              onChange={e => setText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="描述你的故事灵感，例如：一个外卖员在送餐途中意外获得了一本会发光的古书..."
              rows={1}
              disabled={disabled}
              className={cn(
                'w-full px-4 py-3 pr-12 rounded-2xl border border-gray-200 focus:border-orange-400 focus:ring-2 focus:ring-orange-100 outline-none resize-none text-sm transition-all leading-5',
                'placeholder:text-gray-400',
                disabled ? 'bg-gray-50 cursor-not-allowed' : 'bg-white hover:border-gray-300',
              )}
              onInput={e => {
                e.target.style.height = 'auto'
                e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px'
              }}
              style={{ minHeight: '44px', maxHeight: '120px' }}
            />
            
            {/* 字符计数 */}
            {text.length > 0 && (
              <span className="absolute bottom-2 right-12 text-[10px] text-gray-300">
                {text.length}
              </span>
            )}
          </div>

          {/* 发送按钮 */}
          <button
            type="submit"
            disabled={disabled || !text.trim()}
            className={cn(
              'flex-shrink-0 w-11 h-11 rounded-xl flex items-center justify-center transition-all',
              disabled || !text.trim()
                ? 'bg-gray-100 text-gray-300 cursor-not-allowed'
                : 'bg-orange-500 text-white hover:bg-orange-600 shadow-sm hover:shadow-md active:scale-95',
            )}
          >
            {disabled ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </button>
        </div>

        {/* 底部提示 */}
        <div className="flex items-center justify-between mt-2 px-1">
          <p className="text-[10px] text-gray-400">
            按 Enter 发送，Shift+Enter 换行
          </p>
          {disabled && (
            <p className="text-[10px] text-orange-500">
              AI 正在生成中...
            </p>
          )}
        </div>
      </form>
    </div>
  )
}
