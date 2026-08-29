import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Sparkles, ArrowLeft, Loader2, CheckCircle, StopCircle, Plus } from 'lucide-react'
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
    const seedText = params.seed_text

    // 记录用户选择的故事参数，供右侧看板展示
    const meta = {
      step: 'parsing',
      seedText,
      gender: params.gender,
      genre: params.genre,
      style: params.style,
      word_count: params.word_count,
    }
    setNovelData(meta)

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
        case 'parse_done': {
          const elems = (data && data.elements && Object.keys(data.elements).length > 0)
            ? data.elements
            : (data && data.protagonist ? data : {})
          updateLastMessage(
            '✅ **故事要素分析完成**\n\n' + formatElements(elems)
          )
          break
        }
        case 'outline':
          setCurrentStep('outlining')
          updateNovelData({ step: 'outlining' })
          break
        case 'outline_thinking': {
          const type = data?.type || ''
          if (type && type !== 'chapter' && type !== '_progress') {
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
          const index = data?.index
          const state = useChatStore.getState()
          // 优先用后端返回的 index 定位，避免同名章节错位
          let idx = (typeof index === 'number') ? index : -1
          if (idx < 0) {
            idx = (state.novelData?.chapters || []).findIndex(c => c.title === title)
          }
          if (idx >= 0) {
            const texts = [...(state.novelData?.chapterTexts || [])]
            texts[idx] = '[completed]'
            updateNovelData({ chapterTexts: texts })
          }
          updateLastMessage(
            `✍️ **第${idx + 1}章《${title}》完成**（${words}字）`
          )
          break
        }
        case 'content': {
          // 只把正文流式追加到消息，不混入日志
          if (data && typeof data === 'string' && data.trim()) {
            const prev = getLatestAssistantContent()
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
          // 日志仅用于侧边进度展示，不混入正文消息流，避免正文被日志污染
          const msg = (data && typeof data === 'object') ? (data.text || data.data || '') : (data || '')
          if (msg) {
            const state = useChatStore.getState()
            const meta = state.novelData || {}
            updateNovelData({ lastLog: msg })
            void meta
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

    const { controller } = chatGenerate(seedText, onEvent, onComplete, onError, params)
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
    <div className="h-[calc(100vh-4rem)] flex flex-col bg-gradient-to-br from-gray-50 to-gray-100">
      {/* 顶部导航栏 */}
      <div className="flex items-center justify-between px-5 py-3 bg-white/80 backdrop-blur-sm border-b border-gray-200 flex-shrink-0">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/')}
            className="flex items-center gap-1.5 text-gray-500 hover:text-gray-700 transition-colors text-sm font-medium">
            <ArrowLeft className="w-4 h-4" /> 返回
          </button>
          <div className="h-5 w-px bg-gray-200" />
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-orange-400 to-rose-500 flex items-center justify-center">
              <Sparkles className="w-3.5 h-3.5 text-white" />
            </div>
            <h1 className="text-sm font-bold text-gray-900">AI 对话创作</h1>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {generating && (
            <button onClick={() => setShowStopConfirm(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-red-600 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 transition-all">
              <StopCircle className="w-3.5 h-3.5" />
              停止生成
            </button>
          )}
          {novelData?.novelId && (
            <button onClick={handleViewNovel}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-gradient-to-r from-orange-500 to-rose-500 text-white rounded-lg hover:from-orange-600 hover:to-rose-600 transition-all shadow-md">
              <CheckCircle className="w-3.5 h-3.5" />
              查看小说
            </button>
          )}
          <button onClick={handleNewChat}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
            <Plus className="w-3.5 h-3.5" />
            新对话
          </button>
        </div>
      </div>

      {/* 主内容区 */}
      <div className="flex-1 flex gap-4 min-h-0 p-4">
        {/* 左侧聊天区 */}
        <div className="flex-1 flex flex-col bg-white rounded-2xl border border-gray-200 shadow-sm min-w-0 overflow-hidden">
          {/* 消息列表 */}
          <div className="flex-1 overflow-y-auto py-4">
            {messages.length <= 1 ? (
              /* 空状态 - 欢迎界面 */
              <div className="h-full flex flex-col items-center justify-center text-center px-8">
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-orange-400 to-rose-500 flex items-center justify-center mb-6 shadow-xl">
                  <Sparkles className="w-10 h-10 text-white" />
                </div>
                <h2 className="text-xl font-bold text-gray-900 mb-2">开始创作你的小说</h2>
                <p className="text-sm text-gray-500 mb-8 max-w-md leading-relaxed">
                  告诉我你想要的故事灵感，我会为你自动生成一部完整的小说
                </p>
                <div className="grid grid-cols-2 gap-3 max-w-lg w-full">
                  {[
                    '一个外卖员在送餐途中意外获得了一本会发光的古书',
                    '重生回到高考前，这一次我要改变命运',
                    '在末日废土中，我发现了一个地下避难所',
                    '穿越到古代，成为一个被贬的将军',
                  ].map((example, i) => (
                    <button key={i} onClick={() => handleSend(example)}
                      className="p-3.5 text-left text-xs text-gray-600 bg-gray-50 rounded-xl border border-gray-100 hover:border-orange-300 hover:bg-orange-50 hover:shadow-sm transition-all leading-relaxed">
                      "{example}"
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              /* 消息列表 */
              <>
                {messages.slice(1).map((msg, i) => (
                  <ChatMessage key={i + 1} message={msg} isLast={i + 1 === messages.length - 1} />
                ))}
                {generating && (
                  <div className="px-5 py-3">
                    <div className="flex items-center gap-2 text-orange-500">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span className="text-xs">AI 正在思考...</span>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </>
            )}
          </div>

          {/* 选项选择器 - 悬浮在输入框上方 */}
          {showOptions && pendingSeed && !generating && (
            <div className="px-5 pb-3">
              <ChatOptionSelector
                seedText={pendingSeed}
                onConfirm={handleOptionsConfirm}
                onCancel={handleOptionsCancel}
              />
            </div>
          )}

          {/* 输入框 */}
          <ChatInput onSend={handleSend} disabled={generating || showOptions} />
        </div>

        {/* 右侧状态面板 - 在移动端隐藏 */}
        <div className="hidden lg:block w-72 flex-shrink-0 overflow-y-auto">
          <NovelStatusPanel novelData={novelData} />
        </div>
      </div>

      {/* 停止确认弹窗 */}
      {showStopConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={() => setShowStopConfirm(false)}>
          <div className="bg-white rounded-2xl w-[90vw] max-w-sm shadow-2xl p-6 text-center" onClick={e => e.stopPropagation()}>
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-red-400 to-rose-500 flex items-center justify-center mx-auto mb-4 shadow-lg">
              <StopCircle className="w-7 h-7 text-white" />
            </div>
            <h2 className="text-lg font-bold text-gray-900 mb-2">确认停止生成？</h2>
            <p className="text-sm text-gray-500 mb-6 leading-relaxed">已生成的内容将自动保存。</p>
            <div className="flex gap-3 justify-center">
              <button onClick={handleStop}
                className="px-6 py-2.5 bg-gradient-to-r from-red-500 to-rose-500 text-white rounded-xl font-semibold hover:from-red-600 hover:to-rose-600 transition-all text-sm shadow-md">
                确认停止
              </button>
              <button onClick={() => setShowStopConfirm(false)}
                className="px-6 py-2.5 bg-white border-2 border-gray-200 text-gray-600 rounded-xl font-semibold hover:bg-gray-50 hover:border-gray-300 transition-all text-sm">
                取消
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
