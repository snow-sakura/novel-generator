import { useState, useRef, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Send, Sparkles, Bot, User } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Message {
  role: 'user' | 'assistant'
  content: string
}

const WELCOME: Message = {
  role: 'assistant',
  content: '你好！我是 AISQA AI 聊天室，支持多轮对话。你可以在这里与 AI 讨论测试策略、分析缺陷、编写用例。',
}

export default function AiChatRoom() {
  const [messages, setMessages] = useState<Message[]>([WELCOME])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const listRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight
  }, [messages])

  const send = async () => {
    if (!input.trim() || loading) return
    const text = input.trim()
    setInput('')
    setMessages((prev) => [...prev, { role: 'user', content: text }])
    setLoading(true)
    setTimeout(() => {
      setMessages((prev) => [...prev, { role: 'assistant', content: `收到你的问题："${text}"\n\n后续版本将接入真实 LLM，提供专业测试咨询。` }])
      setLoading(false)
    }, 800)
  }

  return (
    <div className="flex flex-col h-full">
      {/* 标题栏 */}
      <div className="flex items-center gap-3 pb-4 border-b" style={{ borderColor: 'var(--polaroid-border)' }}>
        <div className="flex h-10 w-10 items-center justify-center rounded-xl" style={{ backgroundColor: '#7C3AED20' }}>
          <Sparkles className="h-5 w-5" style={{ color: '#7C3AED' }} />
        </div>
        <div>
          <h2 className="text-lg font-semibold" style={{ color: 'var(--polaroid-text)' }}>AI 聊天室</h2>
          <p className="text-xs" style={{ color: 'var(--polaroid-text-muted)' }}>多轮对话 · 测试策略讨论 · 缺陷分析</p>
        </div>
      </div>

      {/* 消息区域 */}
      <div ref={listRef} className="flex-1 overflow-y-auto py-4 space-y-4">
        {messages.map((msg, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
            className={cn('flex gap-3', msg.role === 'user' ? 'justify-end' : 'justify-start')}
          >
            {msg.role === 'assistant' && (
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full" style={{ backgroundColor: '#7C3AED20' }}>
                <Bot className="h-4 w-4" style={{ color: '#7C3AED' }} />
              </div>
            )}
            <div
              className={cn(
                'max-w-[70%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap',
                msg.role === 'assistant'
                  ? 'rounded-tl-md'
                  : 'rounded-tr-md text-white',
              )}
              style={{
                backgroundColor: msg.role === 'assistant' ? 'var(--polaroid-warm)' : 'var(--amber-primary)',
                color: msg.role === 'assistant' ? 'var(--polaroid-text)' : 'white',
              }}
            >
              {msg.content}
            </div>
            {msg.role === 'user' && (
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full" style={{ backgroundColor: 'var(--amber-primary)' }}>
                <User className="h-4 w-4 text-white" />
              </div>
            )}
          </motion.div>
        ))}
        {loading && (
          <div className="flex gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full" style={{ backgroundColor: '#7C3AED20' }}>
              <Bot className="h-4 w-4" style={{ color: '#7C3AED' }} />
            </div>
            <div className="flex items-center gap-1.5 rounded-2xl rounded-tl-md px-4 py-3" style={{ backgroundColor: 'var(--polaroid-warm)' }}>
              <span className="h-2 w-2 animate-pulse rounded-full" style={{ backgroundColor: '#7C3AED' }} />
              <span className="h-2 w-2 animate-pulse rounded-full" style={{ backgroundColor: '#7C3AED', animationDelay: '0.2s' }} />
              <span className="h-2 w-2 animate-pulse rounded-full" style={{ backgroundColor: '#7C3AED', animationDelay: '0.4s' }} />
            </div>
          </div>
        )}
      </div>

      {/* 输入区 */}
      <div className="flex items-center gap-3 pt-4 border-t" style={{ borderColor: 'var(--polaroid-border)' }}>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), send())}
          placeholder="输入消息，与 AI 讨论测试策略..."
          className="flex-1 rounded-xl border bg-white px-4 py-2.5 text-sm outline-none transition-colors focus:border-[#7C3AED]"
          style={{ borderColor: 'var(--polaroid-border)' }}
        />
        <button
          onClick={send}
          disabled={!input.trim() || loading}
          className="flex h-10 w-10 items-center justify-center rounded-xl text-white transition-opacity hover:opacity-90 disabled:opacity-50"
          style={{ backgroundColor: '#7C3AED' }}
        >
          <Send className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}
