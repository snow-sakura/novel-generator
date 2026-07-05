import { useEffect, useState, useMemo, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { X, BookOpen, Loader2, FileText } from 'lucide-react'
import { useNovelStore } from '../stores/novelStore'
import { generateNovel, generateNovelDemo, fetchRecord } from '../services/api'
import NovelForm from '../components/NovelForm'
import StepProgress from '../components/StepProgress'
import ConfigStatus from '../components/ConfigStatus'
import ThinkingLog from '../components/ThinkingLog'
import { cn } from '../lib/utils'

const OPENCODE_DEFAULT = { provider: 'opencode', base_url: 'https://opencode.ai/zen/v1', model: 'deepseek-v4-flash-free' }

function renderMD(text) {
  if (!text) return ''
  let html = text
    .replace(/^### (.+)$/gm, '<h3 class="text-lg font-bold my-3 text-gray-800">$1</h3>')
    .replace(/^## (.+)$/gm, '<h2 class="text-xl font-bold my-4 text-gray-900 text-left">$1</h2>')
    .replace(/^# (.+)$/gm, '<h1 class="text-2xl font-bold my-5 text-gray-900 text-left">$1</h1>')
    .replace(/\*\*(.+?)\*\*/g, '<strong class="font-semibold">$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/\n\n/g, '</p><p class="text-base leading-relaxed mb-4 text-gray-800">')
    .replace(/\n/g, '<br/>')
  return '<p class="text-base leading-relaxed mb-4 text-gray-800">' + html + '</p>'
}

/* 章节弹窗：单列展示，实时显示生成内容 */
function ChapterModal({ chapterIndex, chapter, content, onClose }) {
  const contentRef = useRef(null)

  useEffect(() => {
    const handleKey = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [onClose])

  // 生成内容时自动滚动到底部
  useEffect(() => {
    if (contentRef.current) {
      contentRef.current.scrollTop = contentRef.current.scrollHeight
    }
  }, [content])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-2xl w-[90vw] max-w-3xl max-h-[85vh] flex flex-col shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 flex-shrink-0">
          <div className="flex items-center gap-3">
            <span className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-orange-400 to-rose-400 text-white flex items-center justify-center text-sm font-bold shadow-sm">
              {chapterIndex + 1}
            </span>
            <h2 className="text-lg font-bold text-gray-900">{chapter.title || `第${chapterIndex + 1}章`}</h2>
          </div>
          <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div ref={contentRef} className="flex-1 overflow-y-auto p-6">
          {content ? (
            <div className="novel-content space-y-4" dangerouslySetInnerHTML={{ __html: renderMD(content) }} />
          ) : (
            <div className="flex items-center justify-center py-12 text-gray-400">
              <Loader2 className="w-5 h-5 animate-spin mr-2" />
              等待生成...
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── 工具：延迟 Promise ───
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

export default function CreatePage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const isContinue = searchParams.get('continue')
  const continueRecordId = searchParams.get('record_id')

  const {
    params, generating, currentContent, demoMode, customModel,
    defaultApiKey, customPrompts, continueRecordId: storeContinueId,
    chapters, currentStep, thinkingLogs,
    startGeneration, setStep, appendContent, addChapter, setTitle,
    addEvent, addThinkingLog, addOutlineThinking, setError, finishGeneration, reset,
    setCurrentRecordId, setContinueRecordId, setParams,
  } = useNovelStore()

  // 弹窗状态：-1 = 关闭
  const [openChapter, setOpenChapter] = useState(-1)
  const timersRef = useRef([])
  const generatingRef = useRef(false) // 追踪生成是否还在进行（用于判断是否继续安排下一章）

  useEffect(() => {
    if (isContinue && continueRecordId) {
      const id = Number(continueRecordId)
      setContinueRecordId(id)
      fetchRecord(id).then(rec => {
        if (!rec) return
        // 加载上次的生成日志
        if (rec.thinking_logs && rec.thinking_logs.length > 0) {
          rec.thinking_logs.forEach(log => addThinkingLog(log))
        }
        // 回显已有内容（让用户看到之前生成了多少）
        if (rec.content_sofar && !useNovelStore.getState().currentContent) {
          appendContent(rec.content_sofar)
          // 从内容逐章解析标题
          const blocks = rec.content_sofar.split(/(?=## )/).filter(Boolean)
          blocks.forEach((block, i) => {
            const t = block.match(/^## (.+)/)
            addChapter({ title: t ? t[1].trim() : `第${i+1}章`, index: i })
          })
        }
        // 回显表单参数
        if (rec.params) {
          const p = rec.params
          setParams({
            seed_text: p.seed_text || useNovelStore.getState().params.seed_text,
            gender: p.gender || '男频',
            genre: p.genre || '都市脑洞',
            style: p.style || '轻松搞笑',
            word_count: p.word_count || 3000,
            chapter_count: p.chapter_count || 2,
            per_chapter_min: p.per_chapter_min || 800,
            per_chapter_max: p.per_chapter_max || 2500,
          })
        }
      }).catch(() => {})
    }
  }, [isContinue, continueRecordId])

  // 清理定时器
  useEffect(() => {
    return () => timersRef.current.forEach(clearTimeout)
  }, [])

  // 解析 currentContent
  const chapterContents = useMemo(() => {
    if (!currentContent) return []
    const blocks = currentContent.split(/(?=## )/).filter(Boolean)
    return blocks.map((block, i) => ({
      index: i,
      title: chapters[i]?.title || `第${i + 1}章`,
      content: block.replace(/^## .+\n+/, '').trim(),
      hasContent: block.replace(/^## .+\n+/, '').trim().length > 50,
    }))
  }, [currentContent, chapters])

  // 是否仍在生成中
  generatingRef.current = generating

  function safeTimeout(fn, ms) {
    const id = setTimeout(fn, ms)
    timersRef.current.push(id)
    return id
  }

  async function handleGenerate() {
    // 继续生成时保留已加载的历史日志
    const prevLogs = useNovelStore.getState().thinkingLogs
    startGeneration()
    // 恢复历史日志（继续生成场景）
    if (prevLogs.length > 0) {
      prevLogs.forEach(log => addThinkingLog(log))
    }

    let currentChapterIdx = -1
    const totalChapters = params.chapter_count || 2

    const onEvent = (event, data) => {
      addEvent(event)

      switch (event) {
        case 'parse': setStep('parsing'); break
        case 'parse_done': break
        case 'outline': setStep('outlining'); break
        case 'outline_thinking':
          addOutlineThinking(data)
          break
        case 'outline_done':
          setStep('writing')
          currentChapterIdx = 0
          // 大纲完成 → 延迟 1.5s 弹出第一章
          safeTimeout(() => {
            if (generatingRef.current) setOpenChapter(0)
          }, 1500 + Math.random() * 500)
          break
        case 'chapter_start':
          addChapter(data)
          // 记录当前章节索引（从第2章开始由 chapter_end 的定时器安排弹窗）
          currentChapterIdx = chapters.length
          break
        case 'content':
          appendContent(data)
          break
        case 'chapter_end':
          // 当前章完成 → 延迟 1.5s 关闭弹窗，然后安排下一章
          safeTimeout(async () => {
            setOpenChapter(-1)
            await delay(1500 + Math.random() * 500)
            const nextIdx = currentChapterIdx + 1
            if (nextIdx < totalChapters && generatingRef.current) {
              setOpenChapter(nextIdx)
            }
          }, 1500 + Math.random() * 500)
          break
        case 'title': setStep('titling'); break
        case 'record_id':
          setCurrentRecordId(data)
          break
        case 'continue_from': break
        case 'complete':
          // 最后一章完成 → 关闭弹窗 → 导航
          setOpenChapter(-1)
          safeTimeout(() => {
            setTitle(data.title)
            finishGeneration()
            setContinueRecordId(null)
            navigate(`/novel/${data.novel_id}`)
          }, 2000)
          break
        case 'log': {
          const msg = data.data || data
          let type = 'info'
          if (msg.startsWith('✅') || msg.startsWith('🎉')) type = 'success'
          else if (msg.startsWith('❌')) type = 'error'
          else if (msg.startsWith('⚠️')) type = 'warn'
          else if (msg.startsWith('📖') || msg.startsWith('📋')) type = 'chapter'
          addThinkingLog({ time: new Date().toLocaleTimeString('zh-CN', { hour12: false }), type, text: msg })
          break
        }
        case 'error':
          setError(data.message)
          setContinueRecordId(null)
          break
      }
    }

    const onComplete = () => {}
    const onError = (msg) => { setError(msg); setContinueRecordId(null) }

    const effectiveConfig = customModel != null
      ? customModel
      : (defaultApiKey ? { ...OPENCODE_DEFAULT, api_key: defaultApiKey } : null)

    const effectiveCustomPrompts = Object.fromEntries(
      Object.entries(customPrompts || {}).filter(([, v]) => v && v.trim())
    )

    const requestParams = {
      seed_text: params.seed_text,
      gender: params.gender, genre: params.genre, style: params.style,
      word_count: params.word_count, chapter_count: params.chapter_count,
      per_chapter_min: params.per_chapter_min, per_chapter_max: params.per_chapter_max,
      llm_config: effectiveConfig,
      custom_prompts: Object.keys(effectiveCustomPrompts).length > 0 ? effectiveCustomPrompts : null,
    }

    const activeContinueId = storeContinueId || (isContinue ? Number(continueRecordId) : null)

    if (demoMode) { generateNovelDemo(requestParams, onEvent, onComplete, onError) }
    else {
      generateNovel(requestParams, onEvent, onComplete, onError, activeContinueId)
    }
  }

  const showContent = generating || currentContent.length > 0 || chapters.length > 0
  // 当前正在生成的章节索引
  const generatingIndex = generating && chapters.length > 0 ? chapterContents.length : -1

  return (
    <div className="space-y-5">
      {/* 错误提示 */}
      {currentStep === 'error' && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
          <div className="flex-1">
            <p className="text-sm font-medium text-red-800">生成失败</p>
            <p className="text-sm text-red-600 mt-1">{useNovelStore.getState().errorMessage}</p>
          </div>
          <button onClick={reset} className="text-sm text-red-500 hover:text-red-700 underline flex-shrink-0">重新开始</button>
        </div>
      )}

      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {storeContinueId || (isContinue && continueRecordId) ? '继续生成' : '创作新小说'}
          </h1>
          <p className="text-gray-500 mt-1 text-sm">
            {demoMode ? '🎯 Demo 模式' : '输入一句话，AI 自动生成完整故事'}
            {storeContinueId || (isContinue && continueRecordId) ? '（接续上次失败进度）' : ''}
          </p>
        </div>
        <ConfigStatus />
      </div>

      <div className="flex flex-col lg:flex-row gap-5 items-stretch">
        {/* 左侧表单 */}
        <div className="w-full lg:w-2/5 xl:w-2/5 flex-shrink-0">
          <div className="bg-white rounded-xl border border-gray-200 p-5 sticky top-20 max-h-[calc(100vh-8rem)] overflow-y-auto">
            <NovelForm onGenerate={handleGenerate} />
          </div>
        </div>
        {/* 右侧区域 */}
        <div className="flex-1 min-w-0 space-y-4 flex flex-col">
          {(generating || currentStep === 'error') && <StepProgress />}
          {(generating || thinkingLogs.length > 0) && <ThinkingLog />}

          {showContent ? (
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-medium text-gray-700 flex items-center gap-1.5">
                  <BookOpen className="w-4 h-4 text-orange-500" />
                  章节目录
                  <span className="text-xs text-gray-400 font-normal">
                    （{chapterContents.length}/{chapters.length} 章）
                  </span>
                </h3>
                {generating && (
                  <span className="text-xs text-orange-500 flex items-center gap-1">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    生成中...
                  </span>
                )}
              </div>
              <div className="grid grid-cols-2 gap-2">
                {chapters.map((ch, i) => {
                  const done = chapterContents[i]?.hasContent
                  const isActive = i === generatingIndex && !done

                  return (
                    <div
                      key={i}
                      className={cn(
                        'flex items-start gap-2 p-3 rounded-lg border transition-all',
                        done && 'border-green-200 bg-green-50/50',
                        isActive && 'border-orange-200 bg-orange-50/50 animate-pulse',
                        !done && !isActive && 'border-gray-100 bg-gray-50/50'
                      )}
                    >
                      <span className={cn(
                        'flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold mt-0.5',
                        done ? 'bg-green-500 text-white' : isActive ? 'bg-orange-500 text-white' : 'bg-gray-200 text-gray-500'
                      )}>
                        {done ? '✓' : i + 1}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className={cn(
                          'text-xs font-medium truncate',
                          done ? 'text-green-800' : isActive ? 'text-orange-700' : 'text-gray-600'
                        )}>
                          {ch.title || `第${i + 1}章`}
                        </p>
                        <p className="text-[10px] text-gray-400 mt-0.5">
                          {done ? `${chapterContents[i]?.content.length || 0} 字` : isActive ? '生成中...' : '等待生成'}
                        </p>
                      </div>
                      {openChapter === i && (
                        <FileText className="w-3.5 h-3.5 text-orange-400 flex-shrink-0 mt-0.5" />
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-gray-200 p-6 min-h-[360px] flex flex-col items-center justify-center">
              <div className="text-5xl mb-4">✍️</div>
              <p className="text-gray-400">填写左侧表单，点击「开始生成」</p>
              <p className="text-sm text-gray-300 mt-1">AI 将为你创作一篇完整的小说</p>
            </div>
          )}
        </div>
      </div>

      {/* 章节弹窗 — 自动弹出/关闭 */}
      {openChapter >= 0 && chapters[openChapter] && (
        <ChapterModal
          chapterIndex={openChapter}
          chapter={chapters[openChapter]}
          content={chapterContents[openChapter]?.content || ''}
          onClose={() => setOpenChapter(-1)}
        />
      )}
    </div>
  )
}
