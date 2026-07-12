import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Sparkles, ArrowLeft, Loader2, CheckCircle, StopCircle, MessageSquarePlus } from 'lucide-react'
import { useChatStore } from '../stores/chatStore'
import { chatGenerate, cancelRecord } from '../services/api'
import ChatMessage from '../components/ChatMessage'
import ChatInput from '../components/ChatInput'
import ChatOptionSelector from '../components/ChatOptionSelector'
import NovelStatusPanel from '../components/NovelStatusPanel'

export default function ChatPage() {
  const navigate = useNavigate()
  const {
    messages, generating, novelData,
    addMessage, updateLastMessage, setGenerating,
    setCurrentStep, setNovelData, updateNovelData,
    setCurrentRecordId, setAbortController, reset,
  } = useChatStore()

  const messagesEndRef = useRef(null)
  const messagesContainerRef = useRef(null)
  const [showStopConfirm, setShowStopConfirm] = useState(false)
  const [showOptions, setShowOptions] = useState(false)
  const [pendingSeed, setPendingSeed] = useState('')

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  function handleSend(text) {
    addMessage({ role: 'user', content: text })
    setPendingSeed(text)
    setShowOptions(true)
  }

  function handleOptionsConfirm(params) {
    setShowOptions(false)
    const combinedText = `种子：${params.seed_text}\n频道：${params.gender}\n题材：${params.genre}\n风格：${params.style}\n章节数：${params.chapter_count}\n每章字数：${params.per_chapter_min}-${params.per_chapter_max}\n\n请根据以上设置创作小说。`

    const assistantMsg = { role: 'assistant', content: '', streaming: true }
    addMessage(assistantMsg)
    setGenerating(true)

    const onEvent = (event, data) => {
      switch (event) {
        case 'record_id':
          setCurrentRecordId(data)
          break
        case 'parse':
          setCurrentStep('parsing')
          updateNovelData({ step: 'parsing' })
          break
        case 'parse_done':
          updateLastMessage('✅ **故事要素分析完成**\n\n' + formatElements(data))
          break
        case 'outline':
          setCurrentStep('outlining')
          updateNovelData({ step: 'outlining' })
          break
        case 'outline_thinking': {
          const type = data?.type || ''
          if (type !== 'chapter') {
            updateLastMessage('📐 **正在构建大纲：' + type + '层** ...')
          }
          break
        }
        case 'outline_done': {
          const chs = data?.chapters || []
          const outline = data?.outline || {}
          updateLastMessage(
            `📐 **大纲规划完成**（共 ${chs.length} 章）\n\n` +
            formatOutlinePreview(outline, chs)
          )
          setCurrentStep('writing')
          updateNovelData({
            step: 'writing', chapters: chs,
            outline, chapterTexts: chs.map(() => ''),
          })
          break
        }
        case 'chapter_start':
          setCurrentStep('writing')
          break
        case 'chapter_end': {
          const title = data?.title || ''
          const words = data?.word_count || 0
          const state = useChatStore.getState()
          const idx = (state.novelData?.chapters || []).findIndex(c => c.title === title)
          if (idx >= 0) {
            const texts = [...(state.novelData?.chapterTexts || [])]
            texts[idx] = '[completed]'
            updateNovelData({ chapterTexts: texts })
          }
          const chapterNum = idx >= 0 ? idx + 1 : (state.novelData?.chapters?.length || 0) + 1
          updateLastMessage(
            `✍️ **第${chapterNum}章《${title}》完成**（${words}字）`
          )
          break
        }
        case 'content': {
          const prev = getLatestAssistantContent()
          if (data && typeof data === 'string') {
            updateLastMessage(prev + data)
          }
          break
        }
        case 'title':
          setCurrentStep('titling')
          updateNovelData({ step: 'titling' })
          break
        case 'complete': {
          const novelId = data?.novel_id
          const title = data?.title || '未命名小说'
          const totalWords = data?.total_words || 0
          setCurrentStep('done')
          updateLastMessage(
            `🎉 **《${title}》生成完成！**\n\n总字数：${totalWords.toLocaleString()}字\n点击下方按钮查看详情。`
          )
          updateNovelData({ step: 'done', totalWords, novelId })
          setGenerating(false)
          break
        }
        case 'log': {
          const msg = typeof data === 'string' ? data : (data?.text || data?.data || '')
          if (msg && !msg.startsWith('  ')) {
            updateLastMessage(getLatestAssistantContent() + '\n' + msg)
          }
          break
        }
        case 'error':
          updateLastMessage('❌ **生成出错**：' + (data?.message || '未知错误'))
          setGenerating(false)
          break
      }
    }

    const onComplete = () => {
      setGenerating(false)
    }

    const onError = (msg) => {
      updateLastMessage('❌ **错误**：' + msg)
      setGenerating(false)
    }

    const { controller } = chatGenerate(combinedText, onEvent, onComplete, onError)
    if (controller) {
      setAbortController(controller)
    }
  }

  function handleOptionsCancel() {
    setShowOptions(false)
    setPendingSeed('')
  }

  function handleStop() {
    const state = useChatStore.getState()
    if (state.currentRecordId) {
      cancelRecord(state.currentRecordId)
    }
    const ctrl = state.abortController
    if (ctrl) {
      ctrl.abort()
      setAbortController(null)
    }
    updateLastMessage('⏹️ **生成已停止**（已生成内容已保存）')
    setGenerating(false)
    setShowStopConfirm(false)
  }

  function getLatestAssistantContent() {
    const msgs = useChatStore.getState().messages
    return msgs[msgs.length - 1]?.content || ''
  }

  function formatElements(data) {
    if (!data || typeof data !== 'object') return ''
    const parts = []
    if (data.protagonist) parts.push(`- **主角**：${data.protagonist}`)
    if (data.time_era) parts.push(`- **时代**：${data.time_era}`)
    if (data.locations) parts.push(`- **场景**：${data.locations}`)
    if (data.conflict_type) parts.push(`- **冲突**：${data.conflict_type}`)
    if (data.inciting_incident) parts.push(`- **起点**：${data.inciting_incident}`)
    if (data.world_tone) parts.push(`- **基调**：${data.world_tone}`)
    return parts.join('\n')
  }

  function formatOutlinePreview(outline, chapters) {
    const parts = []
    if (outline.strategy?.core_idea?.high_concept) {
      parts.push(`**高概念**：${outline.strategy.core_idea.high_concept}`)
    }
    if (outline.characters?.protagonist?.name) {
      parts.push(`**主角**：${outline.characters.protagonist.name}（${outline.characters.protagonist.identity || ''}）`)
    }
    if (outline.characters?.antagonist?.name) {
      parts.push(`**反派**：${outline.characters.antagonist.name}`)
    }
    if (outline.strategy?.theme?.core_question) {
      parts.push(`**核心命题**：${outline.strategy.theme.core_question}`)
    }
    parts.push(`\n**章节预览**：${chapters.slice(0, 5).map(c => c.title).join('、')}${chapters.length > 5 ? '...' : ''}`)
    return parts.join('\n')
  }

  function handleViewNovel() {
    const id = useChatStore.getState().novelData?.novelId
    if (id) navigate(`/novel/${id}`)
  }

  function handleNewChat() {
    reset()
  }

  return (
    <div className="h-[calc(100vh-5rem)] flex flex-col">
      <div className="flex items-center justify-between mb-3 flex-shrink-0">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/')}
            className="flex items-center gap-1 text-sm text-gray-400 hover:text-gray-600 bg-white border border-gray-200 px-2.5 py-1.5 rounded-lg hover:bg-gray-50 transition-all">
            <ArrowLeft className="w-3.5 h-3.5" />返回
          </button>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg gradient-brand flex items-center justify-center shadow-sm">
              <Sparkles className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="text-sm font-bold text-gray-900">AI 对话创作</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {generating && (
            <button onClick={() => setShowStopConfirm(true)}
              className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-red-600 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 transition-all">
              <StopCircle className="w-3.5 h-3.5" />
              停止生成
            </button>
          )}
          {novelData?.novelId && (
            <button onClick={handleViewNovel}
              className="flex items-center gap-1 px-3 py-1.5 text-xs gradient-brand text-white rounded-lg hover:shadow-sm transition-all">
              <CheckCircle className="w-3.5 h-3.5" />
              查看小说
            </button>
          )}
          <button onClick={handleNewChat}
            className="flex items-center gap-1 px-3 py-1.5 text-xs text-gray-500 border border-gray-200 rounded-lg hover:bg-gray-50 hover:border-gray-300 transition-all">
            <MessageSquarePlus className="w-3.5 h-3.5" />
            新对话
          </button>
        </div>
      </div>

      <div className="flex-1 flex gap-4 min-h-0">
        <div className="flex-1 flex flex-col bg-white rounded-xl border border-gray-200 min-w-0 shadow-sm">
          <div ref={messagesContainerRef} className="flex-1 overflow-y-auto py-2 scrollbar-hide">
            {messages.length <= 1 && !generating && (
              <div className="flex flex-col items-center justify-center py-12 text-gray-400 animate-fade-in-up">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-orange-100 to-rose-100 flex items-center justify-center mb-4">
                  <Sparkles className="w-8 h-8 text-orange-400" />
                </div>
                <p className="text-sm font-medium text-gray-500">输入故事灵感开始对话</p>
                <p className="text-xs text-gray-300 mt-1">AI 将引导你完成小说创作</p>
              </div>
            )}
            {messages.map((msg, i) => (
              <ChatMessage key={i} message={msg} isLast={i === messages.length - 1} />
            ))}
            {generating && (
              <div className="px-4 py-3">
                <span className="inline-flex items-center gap-2 text-xs text-orange-500 bg-orange-50 px-3 py-1.5 rounded-full">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  生成中...
                </span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
          {showOptions && pendingSeed && !generating && (
            <div className="px-4 pb-3 animate-slide-up">
              <ChatOptionSelector
                seedText={pendingSeed}
                onConfirm={handleOptionsConfirm}
                onCancel={handleOptionsCancel}
              />
            </div>
          )}
          <ChatInput onSend={handleSend} disabled={generating || showOptions} />
        </div>

        <div className="w-72 flex-shrink-0 overflow-y-auto hidden lg:block">
          <NovelStatusPanel novelData={novelData} />
        </div>
      </div>

      {showStopConfirm && (
        <div className="modal-overlay animate-fade-in" onClick={() => setShowStopConfirm(false)}>
          <div className="bg-white rounded-2xl w-[90vw] max-w-sm shadow-2xl border border-gray-100 p-6 text-center animate-scale-in" onClick={e => e.stopPropagation()}>
            <div className="w-14 h-14 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-4">
              <StopCircle className="w-7 h-7 text-red-400" />
            </div>
            <h2 className="text-lg font-bold text-gray-900 mb-2">确认停止生成？</h2>
            <p className="text-sm text-gray-500 mb-6">已生成的内容将自动保存。</p>
            <div className="flex gap-3 justify-center">
              <button onClick={handleStop}
                className="px-5 py-2 bg-red-500 text-white rounded-xl font-medium hover:bg-red-600 transition-all text-sm shadow-sm">
                确认停止
              </button>
              <button onClick={() => setShowStopConfirm(false)}
                className="px-5 py-2 btn-secondary text-sm">取消</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}