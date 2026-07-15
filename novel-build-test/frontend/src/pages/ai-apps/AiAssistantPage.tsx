import { useState, useRef, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useNavigate } from 'react-router'
import { Send, Sparkles, BrainCircuit, ListChecks, Zap, ExternalLink, Bot, User } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Message {
  role: 'user' | 'assistant'
  content: string
}

const WELCOME: Message = {
  role: 'assistant',
  content: '你好！我是 AISQA AI 助手（全屏版）。\n\n你可以在这里：\n• 与 AI 深度讨论测试策略\n• 快速跳转到各个功能模块\n• 获取项目总览和执行建议',
}

const QUICK_ACTIONS = [
  { icon: BrainCircuit, label: 'AI 智能体', path: '/modules/agents', color: '#7C3AED' },
  { icon: ListChecks, label: '执行记录', path: '/modules/execution', color: '#10B981' },
  { icon: Zap, label: '冒烟测试', path: '/modules/test-smoke', color: '#F59E0B' },
  { icon: ExternalLink, label: '测试报告', path: '/modules/execution', color: '#3B82F6' },
]

export default function AiAssistantPage() {
  const [messages, setMessages] = useState<Message[]>([WELCOME])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const listRef = useRef<HTMLDivElement>(null)
  const navigate = useNavigate()

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
      setMessages((prev) => [...prev, { role: 'assistant', content: `收到："${text}"\n\n后续版本将接入真实 LLM，提供专业测试建议。` }])
      setLoading(false)
    }, 800)
  }

  return (
    <div className="flex h-full gap-0">
      {/* 左侧：快捷导航 */}
      <aside className="w-56 shrink-0 border-r flex flex-col" style={{ borderColor: 'var(--polaroid-border)', backgroundColor: 'var(--polaroid-white)' }}>
        <div className="p-4 border-b" style={{ borderColor: 'var(--polaroid-border)' }}>
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg" style={{ backgroundColor: 'var(--amber-primary)' }}>
              <Sparkles className="h-4 w-4 text-white" />
            </div>
            <div>
              <h3 className="text-sm font-semibold" style={{ color: 'var(--polaroid-text)' }}>AI 助手</h3>
              <p className="text-[11px]" style={{ color: 'var(--polaroid-text-muted)' }}>全屏交互模式</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-2 space-y-1">
          <p className="px-3 pt-2 pb-1 text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--polaroid-text-muted)' }}>
            快捷跳转
          </p>
          {QUICK_ACTIONS.map((a) => {
            const Icon = a.icon
            return (
              <button
                key={a.label}
                onClick={() => navigate(a.path)}
                className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm transition-colors hover:bg-gray-50"
                style={{ color: 'var(--polaroid-text)' }}
              >
                <Icon className="h-4 w-4 shrink-0" style={{ color: a.color }} />
                <span>{a.label}</span>
              </button>
            )
          })}
        </nav>
      </aside>

      {/* 右侧：对话区 */}
      <div className="flex-1 flex flex-col p-6">
        {/* 消息列表 */}
        <div ref={listRef} className="flex-1 overflow-y-auto space-y-4 pr-2">
          {messages.map((msg, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className={cn('flex gap-3', msg.role === 'user' ? 'justify-end' : 'justify-start')}
            >
              {msg.role === 'assistant' && (
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full" style={{ backgroundColor: 'var(--amber-primary)' }}>
                  <Bot className="h-4 w-4 text-white" />
                </div>
              )}
              <div
                className={cn(
                  'max-w-[65%] rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap',
                  msg.role === 'user' ? 'rounded-tr-md text-white' : 'rounded-tl-md',
                )}
                style={{
                  backgroundColor: msg.role === 'user' ? 'var(--amber-primary)' : 'var(--polaroid-warm)',
                  color: msg.role === 'user' ? 'white' : 'var(--polaroid-text)',
                }}
              >
                {msg.content}
              </div>
              {msg.role === 'user' && (
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gray-200">
                  <User className="h-4 w-4 text-gray-600" />
                </div>
              )}
            </motion.div>
          ))}
          {loading && (
            <div className="flex gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full" style={{ backgroundColor: 'var(--amber-primary)' }}>
                <Bot className="h-4 w-4 text-white" />
              </div>
              <div className="flex items-center gap-1.5 rounded-2xl rounded-tl-md px-4 py-3" style={{ backgroundColor: 'var(--polaroid-warm)' }}>
                <span className="h-2 w-2 animate-pulse rounded-full" style={{ backgroundColor: 'var(--amber-primary)' }} />
                <span className="h-2 w-2 animate-pulse rounded-full" style={{ backgroundColor: 'var(--amber-primary)', animationDelay: '0.2s' }} />
                <span className="h-2 w-2 animate-pulse rounded-full" style={{ backgroundColor: 'var(--amber-primary)', animationDelay: '0.4s' }} />
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
            placeholder="输入消息，与 AI 助手对话..."
            className="flex-1 rounded-xl border bg-white px-4 py-3 text-sm outline-none transition-colors focus:border-[var(--amber-primary)]"
            style={{ borderColor: 'var(--polaroid-border)' }}
          />
          <button
            onClick={send}
            disabled={!input.trim() || loading}
            className="flex h-11 w-11 items-center justify-center rounded-xl text-white transition-opacity hover:opacity-90 disabled:opacity-50"
            style={{ backgroundColor: 'var(--amber-primary)' }}
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  )
}
