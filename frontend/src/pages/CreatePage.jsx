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

export default function CreatePage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const isContinue = searchParams.get('continue')
  const continueRecordId = searchParams.get('record_id')

  const {
    params, generating, currentContent, demoMode, customModel,
    defaultApiKey, customPrompts, continueRecordId: storeContinueId,
    chapters, chapterTexts, currentStep, thinkingLogs,
    startGeneration, setStep, appendChapterText, addChapter, setTitle,
    addEvent, addThinkingLog, addOutlineThinking, setError, finishGeneration, reset,
    setCurrentRecordId, setContinueRecordId, setParams,
  } = useNovelStore()

  const [openChapter, setOpenChapter] = useState(-1)
  const timersRef = useRef([])
  const generatingRef = useRef(false)
  const currentChapterIdxRef = useRef(-1)
  // 标记 outline_done 是否已开过弹窗（防止 chapter_start 重复开）
  const outlineOpenedRef = useRef(false)

  useEffect(() => {
    if (isContinue && continueRecordId) {
      const id = Number(continueRecordId)
      setContinueRecordId(id)
      fetchRecord(id).then(rec => {
        if (!rec) return
        if (rec.thinking_logs && rec.thinking_logs.length > 0) {
          rec.thinking_logs.forEach(log => addThinkingLog(log))
        }
        if (rec.content_sofar && !useNovelStore.getState().currentContent) {
          const blocks = rec.content_sofar.split(/(?=## )/).filter(Boolean)
          blocks.forEach((block, i) => {
            const t = block.match(/^## (.+)/)
            const title = t ? t[1].trim() : `第${i+1}章`
            useNovelStore.getState().addChapter({ title, index: i })
            useNovelStore.getState().appendChapterText(block)
          })
        }
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

  useEffect(() => {
    return () => timersRef.current.forEach(clearTimeout)
  }, [])

  generatingRef.current = generating

  const chapterContentList = useMemo(() => {
    return chapters.map((ch, i) => ({
      index: i,
      title: ch.title || `第${i+1}章`,
      content: chapterTexts[i] || '',
      hasContent: (chapterTexts[i] || '').trim().length > 50,
    }))
  }, [chapters, chapterTexts])

  function safeTimeout(fn, ms) {
    const id = setTimeout(fn, ms)
    timersRef.current.push(id)
    return id
  }

  async function handleGenerate() {
    const prevLogs = useNovelStore.getState().thinkingLogs
    startGeneration()
    if (prevLogs.length > 0) {
      prevLogs.forEach(log => addThinkingLog(log))
    }

    outlineOpenedRef.current = false

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
          // 大纲完成 → 打开第一章弹窗（等待内容流入）
          outlineOpenedRef.current = true
          setOpenChapter(0)
          break
        case 'chapter_start':
          addChapter(data)
          currentChapterIdxRef.current = chapterTexts.length
          // 如果第一章还没打开（outline_done 可能未触发），或这是后续章节 → 打开弹窗
          // 第一章已在 outline_done 打开，chapter_start 无需重复打开
          if (outlineOpenedRef.current && currentChapterIdxRef.current > 0) {
            // 后续章节：后端真实 gap 已过，立即打开
            setOpenChapter(currentChapterIdxRef.current)
          } else if (!outlineOpenedRef.current) {
            // 没有 outline_done（继续模式），直接用 chapter_start 打开
            setOpenChapter(currentChapterIdxRef.current)
          }
          break
        case 'content':
          appendChapterText(data)
          break
        case 'chapter_end':
          // 当前章完成 → 立即关闭弹窗
          // 弹窗会在后端处理下一章的真实 gap 期间保持关闭
          setOpenChapter(-1)
          break
        case 'title': setStep('titling'); break
        case 'record_id':
          setCurrentRecordId(data)
          break
        case 'continue_from': break
        case 'complete':
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

  const generatingIndex = generating && chapterTexts.length > 0
    ? chapterTexts.findIndex(t => !t || t.trim().length <= 50)
    : -1
  const showContent = generating || currentContent.length > 0 || chapters.length > 0

  return (
    <div className="space-y-5">
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
        <div className="w-full lg:w-2/5 xl:w-2/5 flex-shrink-0">
          <div className="bg-white rounded-xl border border-gray-200 p-5 sticky top-20 max-h-[calc(100vh-8rem)] overflow-y-auto">
            <NovelForm onGenerate={handleGenerate} />
          </div>
        </div>
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
                    （{chapterContentList.filter(c => c.hasContent).length}/{chapters.length} 章）
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
                  const done = chapterContentList[i]?.hasContent
                  const isActive = i === generatingIndex && !done

                  return (
                    <div key={i}
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
                          {done ? `${chapterContentList[i]?.content.length || 0} 字` : isActive ? '生成中...' : '等待生成'}
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

      {openChapter >= 0 && chapters[openChapter] && (
        <ChapterModal
          chapterIndex={openChapter}
          chapter={chapters[openChapter]}
          content={chapterTexts[openChapter] || ''}
          onClose={() => setOpenChapter(-1)}
        />
      )}
    </div>
  )
}
