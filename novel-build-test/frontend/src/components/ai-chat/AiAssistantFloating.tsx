import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate, useLocation } from 'react-router'
import { MessageCircle, X, Send, Sparkles, Zap, ListChecks, BrainCircuit, ExternalLink } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ChatMessage {
  role: 'assistant' | 'user'
  content: string
}

/** 快捷建议列表 */
const DEFAULT_SUGGESTIONS = [
  { label: '📊 当前项目总览', action: 'overview' },
  { label: '📋 最新执行结果', action: 'latest' },
  { label: '🤖 一键跳转 Agent', action: 'agent' },
  { label: '⚡ 快速检测项目', action: 'quickcheck' },
]

/**
 * AiAssistantFloating — AI 助手悬浮按钮（增强版）
 *
 * 2.5.8 增强内容：
 * - 快捷操作：快速检测当前项目、查看最近执行、一键跳转 Agent 页面
 * - 根据当前页面 URL 智能识别项目上下文
 * - 快捷操作按钮直接触发导航或执行
 */
export default function AiAssistantFloating() {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: 'assistant', content: '你好！我是 AISQA AI 助手，有什么可以帮你的？' },
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const listRef = useRef<HTMLDivElement>(null)
  const navigate = useNavigate()
  const location = useLocation()

  /** 从 URL 中提取项目 ID */
  const projectId = location.pathname.match(/\/projects\/(\d+)/)?.[1]

  // 自动滚动到底部
  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight
    }
  }, [messages])

  const addAssistantMessage = (content: string) => {
    setMessages((prev) => [...prev, { role: 'assistant', content }])
  }

  const addUserMessage = (text: string) => {
    setMessages((prev) => [...prev, { role: 'user', content: text }])
  }

  const handleSend = async () => {
    if (!input.trim() || loading) return
    const text = input.trim()
    setInput('')
    addUserMessage(text)
    setLoading(true)

    // 模拟 AI 响应（后续对接真实 API）
    setTimeout(() => {
      addAssistantMessage(`收到！让我查询相关信息。"${text}" 的结果将在后续版本接入。`)
      setLoading(false)
    }, 800)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  /** 处理快捷操作 */
  const handleQuickAction = async (action: string) => {
    const pid = projectId

    switch (action) {
      case 'overview':
        addUserMessage('📊 当前项目总览')
        setLoading(true)
        setTimeout(() => {
          if (pid) {
            addAssistantMessage(
              `正在获取项目 #${pid} 的总览信息...\n\n当前系统中暂无详细的统计数据，请先在项目管理页面完善项目信息。`,
            )
          } else {
            addAssistantMessage('当前未在项目详情页面，请先进入一个项目。')
          }
          setLoading(false)
        }, 800)
        break

      case 'latest':
        addUserMessage('📋 最新执行结果')
        setLoading(true)
        setTimeout(() => {
          if (pid) {
            addAssistantMessage(
              `正在查询项目 #${pid} 的最新执行结果...\n\n当前系统中暂无执行记录，建议先创建一个测试项目并执行测试。`,
            )
          } else {
            addAssistantMessage('当前未在项目详情页面，请先进入一个项目查看执行记录。')
          }
          setLoading(false)
        }, 800)
        break

      case 'agent':
        addUserMessage('🤖 一键跳转 Agent')
        setLoading(true)
        setTimeout(() => {
          addAssistantMessage('正在跳转到 AI 智能体页面...')
          setLoading(false)
          setOpen(false)
          if (pid) {
            navigate(`/projects/${pid}/agents`)
          } else {
            navigate('/agents')
          }
        }, 500)
        break

      case 'quickcheck':
        addUserMessage('⚡ 快速检测项目')
        setLoading(true)
        setTimeout(() => {
          addAssistantMessage(
            '正在启动快速检测流程...\n\n' +
              '快速检测将执行：需求分析 → 执行分析 → 质量审计 三个步骤。\n' +
              '跳转至智能体页面以查看完整结果。',
          )
          setLoading(false)
          setOpen(false)
          if (pid) {
            navigate(`/projects/${pid}/agents`)
          }
        }, 800)
        break
    }
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
            style={{ height: '480px' }}
          >
            {/* 头部 */}
            <div className="flex items-center gap-2 rounded-t-2xl bg-[var(--amber-primary)] px-4 py-3 text-white">
              <Sparkles className="h-5 w-5" />
              <span className="text-sm font-medium">AI 助手</span>
              {projectId && (
                <span className="ml-auto text-[10px] opacity-80">
                  项目 #{projectId}
                </span>
              )}
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

            {/* Quick Action 按钮 */}
            <div className="grid grid-cols-2 gap-2 border-t border-[var(--polaroid-border)] px-3 py-2">
              {DEFAULT_SUGGESTIONS.map((s) => (
                <button
                  key={s.action}
                  onClick={() => handleQuickAction(s.action)}
                  disabled={loading}
                  className="flex items-center gap-1.5 rounded-lg bg-[var(--polaroid-warm)] px-2.5 py-2 text-xs text-[var(--polaroid-text-muted)] transition-colors hover:bg-[var(--amber-light)] hover:text-[var(--amber-primary)] disabled:opacity-50"
                >
                  {s.action === 'agent' && <BrainCircuit className="h-3 w-3 shrink-0" />}
                  {s.action === 'latest' && <ListChecks className="h-3 w-3 shrink-0" />}
                  {s.action === 'quickcheck' && <Zap className="h-3 w-3 shrink-0" />}
                  {s.action === 'overview' && <ExternalLink className="h-3 w-3 shrink-0" />}
                  <span className="truncate">{s.label.replace(/^[^\s]+\s/, '')}</span>
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
