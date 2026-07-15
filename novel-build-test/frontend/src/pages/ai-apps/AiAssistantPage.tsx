import { useState, useEffect, useRef, useCallback } from 'react'
import { motion } from 'framer-motion'
import { useNavigate } from 'react-router'
import { cn } from '@/lib/utils'
import { aiAssistantApi, type QuickActionItem, type AssistantOverviewData } from '@/lib/api-service'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Send, Sparkles, Bot, User,
  FolderPlus, Play, FileText, BookOpen,
  MessageSquare, Database, GitBranch, Users,
  Activity, Clock, CheckCircle2, AlertCircle,
  ArrowRight, RefreshCw,
  type LucideIcon,
} from 'lucide-react'

// ── Icon name → Lucide component mapping ──
const ICON_MAP: Record<string, LucideIcon> = {
  FolderPlus, Play, FileText, BookOpen,
  MessageSquare, Database, GitBranch, Users,
}

const ICON_COLORS = [
  '#F59E0B', '#3B82F6', '#10B981', '#8B5CF6',
  '#EC4899', '#0D9488', '#7C3AED', '#DC2626',
]

// ── Types ──
interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

const WELCOME_MSG: ChatMessage = {
  role: 'assistant',
  content: '👋 你好！我是 AISQA AI 助手。\n\n我可以帮你：\n• 查看项目总览和测试统计\n• 快速跳转到各功能模块\n• 回答关于测试平台的问题\n\n试试点击左侧的快捷操作，或直接输入问题！',
}

// ── Component ──
export default function AiAssistantPage() {
  const navigate = useNavigate()
  const [quickActions, setQuickActions] = useState<QuickActionItem[]>([])
  const [overview, setOverview] = useState<AssistantOverviewData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([WELCOME_MSG])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const listRef = useRef<HTMLDivElement>(null)

  // ── Fetch data ──
  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [qaRes, ovRes] = await Promise.all([
        aiAssistantApi.quickActions(),
        aiAssistantApi.overview(),
      ])
      setQuickActions(qaRes.data)
      setOverview(ovRes.data)
    } catch {
      setError('加载数据失败，请稍后重试')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  // Auto-scroll
  useEffect(() => {
    if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight
  }, [messages])

  // ── Send chat message ──
  const send = async () => {
    if (!input.trim() || sending) return
    const text = input.trim()
    setInput('')
    setMessages(prev => [...prev, { role: 'user', content: text }])
    setSending(true)
    try {
      const res = await aiAssistantApi.chat(text)
      setMessages(prev => [...prev, { role: 'assistant', content: res.data.reply }])
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: '抱歉，通信异常，请稍后重试。' }])
    } finally {
      setSending(false)
    }
  }

  // ── Navigate helper ──
  const goModule = (moduleKey: string) => {
    navigate(`/modules/${moduleKey}`)
  }

  // ── Action label → module key ──
  const actionToModule: Record<string, string> = {
    create_project: 'projects',
    run_test: 'test-functional',
    view_reports: 'execution',
    knowledge_base: 'knowledge',
    chat_assistant: 'ai-chatroom',
    db_tuning: 'ai-db-tuning',
    cicd_config: 'integration',
    user_management: 'user-mgmt',
  }

  // ── Activity action label ──
  const actionLabel = (action: string) => {
    const map: Record<string, string> = {
      create: '创建', update: '更新', delete: '删除', login: '登录', export: '导出',
    }
    return map[action] ?? action
  }

  // ── Render ──

  if (loading && !overview) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <RefreshCw className="h-8 w-8 animate-spin" style={{ color: 'var(--amber-primary)' }} />
          <span className="text-sm" style={{ color: 'var(--polaroid-text-muted)' }}>加载中...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-full gap-0">
      {/* ═══════════════ Left Sidebar ═══════════════ */}
      <aside className="w-56 shrink-0 border-r flex flex-col overflow-hidden"
        style={{ borderColor: 'var(--polaroid-border)', backgroundColor: 'var(--polaroid-white)' }}
      >
        {/* Header */}
        <div className="p-4 border-b shrink-0" style={{ borderColor: 'var(--polaroid-border)' }}>
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg"
              style={{ backgroundColor: 'var(--amber-primary)' }}
            >
              <Sparkles className="h-4 w-4 text-white" />
            </div>
            <div>
              <h3 className="text-sm font-semibold" style={{ color: 'var(--polaroid-text)' }}>AI 助手</h3>
              <p className="text-[11px]" style={{ color: 'var(--polaroid-text-muted)' }}>全屏交互模式</p>
            </div>
          </div>
          {error && (
            <p className="mt-2 text-[11px] text-red-500">{error}</p>
          )}
        </div>

        {/* Quick actions */}
        <nav className="flex-1 overflow-y-auto p-2 space-y-0.5">
          <p className="px-3 pt-2 pb-1 text-[10px] font-semibold uppercase tracking-wider"
            style={{ color: 'var(--polaroid-text-muted)' }}
          >
            快捷操作
          </p>
          {quickActions.length === 0
            ? // Skeleton placeholder
              Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center gap-2.5 px-3 py-2">
                  <Skeleton className="h-4 w-4 rounded" />
                  <Skeleton className="h-3.5 w-20" />
                </div>
              ))
            : quickActions.map((a, i) => {
                const Icon = ICON_MAP[a.icon] ?? Activity
                const moduleKey = actionToModule[a.key] ?? 'projects'
                return (
                  <button
                    key={a.key}
                    onClick={() => goModule(moduleKey)}
                    className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm transition-all hover:bg-gray-50 group"
                    style={{ color: 'var(--polaroid-text)' }}
                  >
                    <Icon className="h-4 w-4 shrink-0" style={{ color: ICON_COLORS[i % ICON_COLORS.length] }} />
                    <span className="flex-1">{a.label}</span>
                    <ArrowRight className="h-3 w-3 opacity-0 -translate-x-1 transition-all group-hover:opacity-50 group-hover:translate-x-0"
                      style={{ color: 'var(--polaroid-text-muted)' }}
                    />
                  </button>
                )
              })
          }
        </nav>

        {/* Bottom refresh */}
        <div className="p-3 border-t shrink-0" style={{ borderColor: 'var(--polaroid-border)' }}>
          <button
            onClick={fetchData}
            disabled={loading}
            className="flex w-full items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs transition-colors hover:bg-gray-50 disabled:opacity-50"
            style={{ color: 'var(--polaroid-text-muted)' }}
          >
            <RefreshCw className={`h-3 w-3 ${loading ? 'animate-spin' : ''}`} />
            刷新数据
          </button>
        </div>
      </aside>

      {/* ═══════════════ Main Content ═══════════════ */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* ── Section 1: Overview Stats ── */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <h3 className="text-sm font-semibold mb-3 flex items-center gap-2"
              style={{ color: 'var(--polaroid-text)' }}
            >
              <Activity className="h-4 w-4" style={{ color: 'var(--amber-primary)' }} />
              项目总览
            </h3>
            <div className="grid grid-cols-3 gap-4">
              {/* Project count */}
              <div className="rounded-xl border p-4 transition-all hover:shadow-md"
                style={{ borderColor: 'var(--polaroid-border)', backgroundColor: 'var(--polaroid-white)' }}
              >
                <div className="flex items-center gap-2 mb-1.5">
                  <FolderPlus className="h-4 w-4" style={{ color: '#F59E0B' }} />
                  <span className="text-xs" style={{ color: 'var(--polaroid-text-muted)' }}>项目总数</span>
                </div>
                {loading && overview === null ? (
                  <Skeleton className="h-7 w-16" />
                ) : (
                  <span className="text-2xl font-bold" style={{ color: 'var(--polaroid-text)' }}>
                    {overview?.project_count ?? 0}
                  </span>
                )}
              </div>

              {/* Execution count */}
              <div className="rounded-xl border p-4 transition-all hover:shadow-md"
                style={{ borderColor: 'var(--polaroid-border)', backgroundColor: 'var(--polaroid-white)' }}
              >
                <div className="flex items-center gap-2 mb-1.5">
                  <Play className="h-4 w-4" style={{ color: '#3B82F6' }} />
                  <span className="text-xs" style={{ color: 'var(--polaroid-text-muted)' }}>执行次数</span>
                </div>
                {loading && overview === null ? (
                  <Skeleton className="h-7 w-16" />
                ) : (
                  <span className="text-2xl font-bold" style={{ color: 'var(--polaroid-text)' }}>
                    {overview?.execution_count ?? 0}
                  </span>
                )}
              </div>

              {/* Pass rate */}
              <div className="rounded-xl border p-4 transition-all hover:shadow-md"
                style={{ borderColor: 'var(--polaroid-border)', backgroundColor: 'var(--polaroid-white)' }}
              >
                <div className="flex items-center gap-2 mb-1.5">
                  <CheckCircle2 className="h-4 w-4" style={{ color: '#10B981' }} />
                  <span className="text-xs" style={{ color: 'var(--polaroid-text-muted)' }}>通过率</span>
                </div>
                {loading && overview === null ? (
                  <Skeleton className="h-7 w-16" />
                ) : (
                  <span className="text-2xl font-bold" style={{ color: overview && overview.pass_rate >= 80 ? '#10B981' : '#F59E0B' }}>
                    {overview ? `${overview.pass_rate}%` : '0%'}
                  </span>
                )}
              </div>
            </div>
          </motion.div>

          {/* ── Section 2: Recent Activities ── */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.1 }}
          >
            <h3 className="text-sm font-semibold mb-3 flex items-center gap-2"
              style={{ color: 'var(--polaroid-text)' }}
            >
              <Clock className="h-4 w-4" style={{ color: 'var(--amber-primary)' }} />
              最近活动
            </h3>
            <div className="rounded-xl border" style={{ borderColor: 'var(--polaroid-border)', backgroundColor: 'var(--polaroid-white)' }}>
              {loading && overview === null ? (
                <div className="divide-y" style={{ borderColor: 'var(--polaroid-border)' }}>
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="flex items-center gap-3 px-4 py-3">
                      <Skeleton className="h-2 w-2 rounded-full" />
                      <Skeleton className="h-3.5 w-24" />
                      <Skeleton className="h-3.5 w-32" />
                    </div>
                  ))}
                </div>
              ) : overview?.recent_activities && overview.recent_activities.length > 0 ? (
                <div className="divide-y" style={{ borderColor: 'var(--polaroid-border)' }}>
                  {overview.recent_activities.map((act) => (
                    <div key={act.id} className="flex items-center gap-3 px-4 py-3 text-sm">
                      <div className="flex h-6 w-6 items-center justify-center rounded-full"
                        style={{ backgroundColor: act.action === 'create' ? '#10B98120' : act.action === 'delete' ? '#EF444420' : '#F59E0B20' }}
                      >
                        {act.action === 'create' ? (
                          <CheckCircle2 className="h-3 w-3" style={{ color: '#10B981' }} />
                        ) : act.action === 'delete' ? (
                          <AlertCircle className="h-3 w-3" style={{ color: '#EF4444' }} />
                        ) : (
                          <Activity className="h-3 w-3" style={{ color: '#F59E0B' }} />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className="font-medium" style={{ color: 'var(--polaroid-text)' }}>
                          {actionLabel(act.action)}
                        </span>
                        <span style={{ color: 'var(--polaroid-text-muted)' }}>
                          {' '}{act.entity_type} #{act.entity_id}
                        </span>
                        <span className="ml-1 text-xs" style={{ color: 'var(--polaroid-text-muted)' }}>
                          · {act.actor_name}
                        </span>
                      </div>
                      <span className="text-xs shrink-0" style={{ color: 'var(--polaroid-text-muted)' }}>
                        {act.created_at ? new Date(act.created_at).toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }) : ''}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex items-center justify-center py-8 text-sm" style={{ color: 'var(--polaroid-text-muted)' }}>
                  暂无活动记录
                </div>
              )}
            </div>
          </motion.div>

          {/* ── Section 3: Chat ── */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.2 }}
            className="flex flex-col"
          >
            <h3 className="text-sm font-semibold mb-3 flex items-center gap-2"
              style={{ color: 'var(--polaroid-text)' }}
            >
              <MessageSquare className="h-4 w-4" style={{ color: 'var(--amber-primary)' }} />
              智能对话
            </h3>

            {/* Messages */}
            <div
              ref={listRef}
              className="rounded-xl border mb-3 overflow-y-auto"
              style={{ borderColor: 'var(--polaroid-border)', backgroundColor: 'var(--polaroid-white)', maxHeight: '320px', minHeight: '200px' }}
            >
              <div className="p-4 space-y-3">
                {messages.map((msg, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2 }}
                    className={cn('flex gap-3', msg.role === 'user' ? 'justify-end' : 'justify-start')}
                  >
                    {msg.role === 'assistant' && (
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full"
                        style={{ backgroundColor: 'var(--amber-primary)' }}
                      >
                        <Bot className="h-3.5 w-3.5 text-white" />
                      </div>
                    )}
                    <div
                      className={cn(
                        'max-w-[70%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed whitespace-pre-wrap',
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
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gray-200">
                        <User className="h-3.5 w-3.5 text-gray-600" />
                      </div>
                    )}
                  </motion.div>
                ))}
                {sending && (
                  <div className="flex gap-3">
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full"
                      style={{ backgroundColor: 'var(--amber-primary)' }}
                    >
                      <Bot className="h-3.5 w-3.5 text-white" />
                    </div>
                    <div className="flex items-center gap-1.5 rounded-2xl rounded-tl-md px-4 py-3"
                      style={{ backgroundColor: 'var(--polaroid-warm)' }}
                    >
                      <span className="h-2 w-2 animate-pulse rounded-full" style={{ backgroundColor: 'var(--amber-primary)' }} />
                      <span className="h-2 w-2 animate-pulse rounded-full" style={{ backgroundColor: 'var(--amber-primary)', animationDelay: '0.2s' }} />
                      <span className="h-2 w-2 animate-pulse rounded-full" style={{ backgroundColor: 'var(--amber-primary)', animationDelay: '0.4s' }} />
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Input */}
            <div className="flex items-center gap-2">
              <input
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), send())}
                placeholder="输入消息，与 AI 助手对话..."
                className="flex-1 rounded-xl border bg-white px-4 py-2.5 text-sm outline-none transition-colors focus:border-[var(--amber-primary)]"
                style={{ borderColor: 'var(--polaroid-border)' }}
              />
              <button
                onClick={send}
                disabled={!input.trim() || sending}
                className="flex h-10 w-10 items-center justify-center rounded-xl text-white transition-opacity hover:opacity-90 disabled:opacity-50"
                style={{ backgroundColor: 'var(--amber-primary)' }}
              >
                <Send className="h-4 w-4" />
              </button>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  )
}
