import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { MessageCircle, X, Send, Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ChatMessage {
  role: 'assistant' | 'user'
  content: string
}

const suggestions = [
  '当前项目总览',
  '最新执行结果',
  '如何开始测试?',
  '测试覆盖率分析',
]

/**
 * AiAssistantFloating — AI 助手悬浮按钮（Intercom 风格）
 *
 * - 右下角圆形悬浮按钮
 * - 点击展开 320px × 440px 弹窗
 * - 消息列表 + 快捷建议 + 输入框
 */
export default function AiAssistantFloating() {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: 'assistant', content: '你好！我是 AISQA AI 助手，有什么可以帮你的？' },
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const listRef = useRef<HTMLDivElement>(null)

  // 自动滚动到底部
  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight
    }
  }, [messages])

  const handleSend = async () => {
    if (!input.trim() || loading) return
    const text = input.trim()
    setInput('')
    setMessages((prev) => [...prev, { role: 'user', content: text }])
    setLoading(true)

    // 模拟 AI 响应（后续对接真实 API）
    setTimeout(() => {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: `收到！让我查询相关信息。"${text}" 的结果将在后续版本接入。` },
      ])
      setLoading(false)
    }, 800)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleSuggestion = (text: string) => {
    setInput(text)
    // 自动发送建议
    setTimeout(() => {
      setMessages((prev) => [...prev, { role: 'user', content: text }])
      setLoading(true)
      setTimeout(() => {
        setMessages((prev) => [
          ...prev,
          {
            role: 'assistant',
            content: `正在分析"${text}"的相关数据...\n\n当前系统中暂无执行记录，建议先创建一个测试项目并执行测试。`,
          },
        ])
        setLoading(false)
      }, 1000)
    }, 100)
  }

  return (
    <>
      {/* 悬浮按钮 */}
      <motion.button
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        onClick={() => setOpen(!open)}
        className={cn(
          'fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full shadow-lg transition-shadow',
          open ? 'bg-gray-700 shadow-gray-400/30' : 'bg-[var(--amber-primary)] shadow-amber-900/20 hover:shadow-xl',
        )}
      >
        {open ? (
          <X className="h-6 w-6 text-white" />
        ) : (
          <MessageCircle className="h-6 w-6 text-white" />
        )}
      </motion.button>

      {/* 弹窗 */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 20 }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            className={cn(
              'fixed bottom-24 right-6 z-50 flex w-80 flex-col rounded-2xl bg-white shadow-2xl',
              'border border-[var(--polaroid-border)]',
            )}
            style={{ height: '440px' }}
          >
            {/* 头部 */}
            <div className="flex items-center gap-2 rounded-t-2xl bg-[var(--amber-primary)] px-4 py-3 text-white">
              <Sparkles className="h-5 w-5" />
              <span className="text-sm font-medium">AI 助手</span>
            </div>

            {/* 消息列表 */}
            <div ref={listRef} className="flex-1 overflow-y-auto space-y-3 p-4">
              {messages.map((msg, i) => (
                <div
                  key={i}
                  className={cn(
                    'max-w-[85%] rounded-lg px-3 py-2 text-sm leading-relaxed',
                    msg.role === 'assistant'
                      ? 'bg-[var(--polaroid-warm)] text-[var(--polaroid-text)]'
                      : 'ml-auto bg-[var(--amber-primary)] text-white',
                  )}
                >
                  {msg.content}
                </div>
              ))}
              {loading && (
                <div className="flex items-center gap-2 text-sm text-[var(--polaroid-text-muted)]">
                  <span className="h-2 w-2 animate-pulse rounded-full bg-[var(--amber-primary)]" />
                  <span className="h-2 w-2 animate-pulse rounded-full bg-[var(--amber-primary)]" style={{ animationDelay: '0.2s' }} />
                  <span className="h-2 w-2 animate-pulse rounded-full bg-[var(--amber-primary)]" style={{ animationDelay: '0.4s' }} />
                </div>
              )}
            </div>

            {/* 快捷建议 */}
            <div className="flex flex-wrap gap-2 border-t border-[var(--polaroid-border)] px-3 py-2">
              {suggestions.map((s) => (
                <button
                  key={s}
                  onClick={() => handleSuggestion(s)}
                  className="rounded-full bg-[var(--polaroid-warm)] px-2.5 py-1 text-xs text-[var(--polaroid-text-muted)] transition-colors hover:bg-[var(--amber-light)] hover:text-[var(--amber-primary)]"
                >
                  {s}
                </button>
              ))}
            </div>

            {/* 输入区 */}
            <div className="flex items-center gap-2 border-t border-[var(--polaroid-border)] p-3">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="输入消息..."
                className="flex-1 rounded-lg border border-[var(--polaroid-border)] bg-[var(--polaroid-warm)] px-3 py-2 text-sm outline-none transition-colors focus:border-[var(--amber-primary)]"
              />
              <button
                onClick={handleSend}
                disabled={!input.trim() || loading}
                className="flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--amber-primary)] text-white transition-opacity hover:opacity-90 disabled:opacity-50"
              >
                <Send className="h-4 w-4" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
