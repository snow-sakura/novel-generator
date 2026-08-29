import { useEffect, useState, useMemo, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { X, BookOpen, Loader2, FileText, CheckCircle, AlertTriangle, Sparkles, ArrowRight, PenLine, Send, ChevronUp, StopCircle } from 'lucide-react'
import { useNovelStore, STEPS } from '../stores/novelStore'
import { generateNovel, generateNovelDemo, generateOpenings, generateOpeningsDemo, fetchRecord, cancelRecord } from '../services/api'
import OpeningCompare from '../components/OpeningCompare'
import NovelForm from '../components/NovelForm'
import StepProgress from '../components/StepProgress'
import ConfigStatus from '../components/ConfigStatus'
import MultiStepLog from '../components/MultiStepLog'
import EmotionCurveChart from '../components/EmotionCurveChart'
import NovelReader from '../components/NovelReader'
import { cn, escapeHtml } from '../lib/utils'

function ChapterModal({ chapterIndex, chapter, content, onClose }) {
  const contentRef = useRef(null)
  useEffect(() => {
    const handleKey = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [onClose])
  useEffect(() => {
    if (contentRef.current) contentRef.current.scrollTop = contentRef.current.scrollHeight
  }, [content])

  return (
    <div className="modal-overlay animate-fade-in" onClick={onClose}>
      <div className="bg-white rounded-2xl w-[90vw] max-w-3xl max-h-[85vh] flex flex-col shadow-2xl border border-gray-100 animate-scale-in" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 flex-shrink-0">
          <div className="flex items-center gap-3">
            <span className="flex-shrink-0 w-8 h-8 rounded-full gradient-brand text-white flex items-center justify-center text-sm font-bold shadow-sm">
              {chapterIndex + 1}
            </span>
            <h2 className="text-lg font-bold text-gray-900">{chapter.title || `第${chapterIndex + 1}章`}</h2>
          </div>
          <button onClick={onClose} className="btn-ghost p-1.5" aria-label="关闭">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div ref={contentRef} className="flex-1 overflow-y-auto p-6 novel-content">
          {content ? (
            <div dangerouslySetInnerHTML={{ __html: renderMD(content) }} />
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

function CompleteDialog({ data, onConfirm, onCancel }) {
  return (
    <div className="modal-overlay animate-fade-in" onClick={onCancel}>
      <div className="bg-white rounded-2xl w-[90vw] max-w-md shadow-2xl border border-gray-100 p-8 text-center animate-bounce-in" onClick={e => e.stopPropagation()}>
        <div className="w-16 h-16 rounded-full gradient-brand flex items-center justify-center mx-auto mb-5 shadow-lg shadow-orange-200/50">
          <Sparkles className="w-8 h-8 text-white" />
        </div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">生成完成！</h2>
        <p className="text-lg font-semibold gradient-text mb-4">《{data.title?.replace(/^《|》$/g, '') || data.title}》</p>
        <div className="bg-gradient-to-br from-orange-50 to-rose-50 rounded-xl p-4 mb-6 border border-orange-100/60 space-y-1">
          <p className="text-sm text-gray-600">
            共 <span className="font-bold text-orange-600">{data.totalChapters}</span> 章 ·
            <span className="font-bold text-orange-600"> {data.totalWords.toLocaleString()}</span> 字
          </p>
          {data.timeCost && (
            <p className="text-xs text-gray-400">耗时 {data.timeCost.toFixed(1)}s</p>
          )}
        </div>
        <div className="flex gap-3 justify-center">
          <button onClick={onConfirm}
            className="px-6 py-2.5 gradient-brand text-white rounded-xl font-medium hover:shadow-md transition-all shadow-sm flex items-center gap-2 text-sm">
            <CheckCircle className="w-4 h-4" />
            进入详情页
          </button>
          <button onClick={onCancel}
            className="px-6 py-2.5 btn-secondary text-sm">
            继续浏览
          </button>
        </div>
      </div>
    </div>
  )
}

function renderMD(text: string): string {
  if (!text) return ''
  let html = escapeHtml(text)
    .replace(/^### (.+)$/gm, '</p><h3 class="text-lg font-bold my-3 text-gray-800 text-left">$1</h3><p>')
    .replace(/^## (.+)$/gm, '</p><h2 class="text-xl font-bold my-4 text-gray-900 text-left">$1</h2><p>')
    .replace(/^# (.+)$/gm, '</p><h1 class="text-2xl font-bold my-5 text-gray-900 text-left">$1</h1><p>')
    .replace(/\*\*(.+?)\*\*/g, '<strong class="font-semibold">$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/\n\n/g, '</p><p class="text-base leading-relaxed mb-4 text-gray-700">')
    .replace(/\n/g, '<br/>')
  return '<p class="text-base leading-relaxed mb-4 text-gray-700">' + html + '</p>'
}

function ScrollToTopButton() {
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 300)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])
  return visible ? (
    <button onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} aria-label="回到顶部"
      className="fixed bottom-6 right-6 z-50 w-10 h-10 rounded-full bg-white border border-gray-200 shadow-lg hover:shadow-xl hover:bg-gray-50 flex items-center justify-center transition-all animate-fade-in">
      <ChevronUp className="w-5 h-5 text-gray-500" />
    </button>
  ) : null
}

export default function CreatePage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const isContinue = searchParams.get('continue')
  const continueRecordIdParam = searchParams.get('record_id')

  const {
    params, generating, currentContent, demoMode, customModel,
    customPrompts, continueRecordId: storeContinueId,
    chapters, chapterTexts, currentStep, thinkingLogs, emotionCurve,
    startGeneration, setStep, appendChapterText, addChapter, setTitle,
    addEvent, addThinkingLog, addOutlineThinking, setOutlineTree, setEmotionCurve, setError, finishGeneration, reset,
    setCurrentRecordId, setContinueRecordId, setParams,
    setAbortController, setConnecting,
  } = useNovelStore()

  const [openChapter, setOpenChapter] = useState(-1)
  const [completeData, setCompleteData] = useState(null)
  const [showCompleteDialog, setShowCompleteDialog] = useState(false)
  const [showStopConfirm, setShowStopConfirm] = useState(false)
  // F7: 对比模式状态
  const [openings, setOpenings] = useState([])
  const [openingsLoading, setOpeningsLoading] = useState(false)
  const [showOpeningCompare, setShowOpeningCompare] = useState(false)

  const generatingRef = useRef(false)
  const connectingRef = useRef(false)

  useEffect(() => {
    if (isContinue && continueRecordIdParam) {
      const id = Number(continueRecordIdParam)
      setContinueRecordId(id)
      fetchRecord(id).then(rec => {
        if (!rec) return
        if (rec.thinking_logs?.length > 0) {
          rec.thinking_logs.forEach(log => addThinkingLog(log))
        }
        // 恢复大纲展示（outlineThinking）
        if (rec.outline_data) {
          const od = rec.outline_data
          const items = []
          for (const name of ['strategy', 'characters', 'world']) {
            const ld = od[name]
            if (ld && typeof ld === 'object' && Object.keys(ld).length > 0) {
              items.push({ type: name, data: ld })
            }
          }
          const structData = {}
          for (const k of ['plot_structure', 'rhythm', 'style_tone']) {
            const v = od[k]
            if (v && typeof v === 'object' && Object.keys(v).length > 0) structData[k] = v
          }
          if (Object.keys(structData).length > 0) {
            items.push({ type: 'structure', data: structData })
          }
          items.forEach(i => addOutlineThinking(i))
        }
        // 恢复情感曲线
        if (rec.emotion_curve && Array.isArray(rec.emotion_curve) && rec.emotion_curve.length > 0) {
          setEmotionCurve(rec.emotion_curve)
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
          const p = rec.params as Record<string, any>
          setParams({
            seed_text: p.seed_text || useNovelStore.getState().params.seed_text,
            gender: p.gender || '男频',
            genre: p.genre || '都市脑洞',
            style: p.style || '轻松搞笑',
            word_count: p.word_count || 3000,
            chapter_count: p.chapter_count || 2,
            per_chapter_min: p.per_chapter_min || 800,
            per_chapter_max: p.per_chapter_max || 2500,
            // V3/V4 参数恢复
            pov: p.pov || '第三人称有限',
            pacing: p.pacing || '标准型',
            style_intensity: p.style_intensity || '中度',
            enable_suspense: p.enable_suspense === undefined ? true : p.enable_suspense,
            enable_twist: p.enable_twist === undefined ? true : p.enable_twist,
            theme: p.theme || '',
            aesthetic_intensity: p.aesthetic_intensity || '中度',
            ending_type: p.ending_type || '',
          })
        }
      }).catch(() => {})
    }
  }, [isContinue, continueRecordIdParam])

  generatingRef.current = generating

  const chapterContentList = useMemo(() => {
    return chapters.map((ch, i) => ({
      index: i, title: ch.title || `第${i+1}章`,
      content: chapterTexts[i] || '',
      hasContent: (chapterTexts[i] || '').trim().length > 50,
    }))
  }, [chapters, chapterTexts])

  const showToc = currentStep === STEPS.WRITING || currentStep === STEPS.TITLING ||
                  currentStep === STEPS.DONE || currentStep === STEPS.ERROR
  const writingActive = currentStep === STEPS.WRITING
  const hasContent = generating || currentContent.length > 0 || chapters.length > 0

  // F7: 打开对比模式，不显示传统生成流程
  const isOpeningsMode = openingsLoading || showOpeningCompare

  async function handleGenerate() {
    const activeContinueId = storeContinueId || (isContinue ? Number(continueRecordIdParam) : null)
    // F7: 继续生成模式跳过对比模式，直接续生
    if (activeContinueId) {
      startFullGeneration(null)
      return
    }

    // F7: 先打开对比模式生成开头版本
    setOpeningsLoading(true)
    setShowOpeningCompare(true)

    const effectiveConfig = customModel != null ? customModel : null
    const requestParams = {
      seed_text: params.seed_text,
      gender: params.gender, genre: params.genre,
      style: params.selectedStyles ? params.selectedStyles.join('+') : params.style || params.styles,
      word_count: params.word_count, chapter_count: params.chapter_count,
      per_chapter_min: params.per_chapter_min, per_chapter_max: params.per_chapter_max,
      llm_config: effectiveConfig,
      pov: params.pov, pacing: params.pacing,
      style_intensity: params.style_intensity,
      enable_suspense: params.enable_suspense,
      enable_twist: params.enable_twist,
      theme: params.theme || '',
      aesthetic_intensity: params.aesthetic_intensity || '中度',
      ending_type: params.ending_type || '',
    }

    const onEvent = (event, data) => {
      if (event === 'opening_version') {
        setOpenings(prev => [...prev, data])
      } else if (event === 'openings_done') {
        setOpenings(data.openings || [])
        setOpeningsLoading(false)
      } else if (event === 'log') {
        const msg = typeof data === 'string' ? data : (data?.text || '')
        const step = data?.step || 'info'
        let type = 'info'
        if (msg.startsWith('✅')) type = 'success'
        else if (msg.startsWith('❌')) type = 'error'
        else if (msg.startsWith('⚠️')) type = 'warn'
        addThinkingLog({ time: new Date().toLocaleTimeString('zh-CN', { hour12: false }), type, text: msg, step })
      }
    }

    const onComplete = () => { setOpeningsLoading(false) }
    const onErrorCb = (msg) => {
      setOpeningsLoading(false)
      setShowOpeningCompare(false)
      setOpenings([])
      // Fallback: skip openings, go straight to full generation
      startFullGeneration(null)
    }

    if (demoMode) {
      await generateOpeningsDemo(requestParams, onEvent, onComplete, onErrorCb)
    } else {
      generateOpenings(requestParams, onEvent, onComplete, onErrorCb)
    }
  }

  function handleSelectOpening(opening) {
    setShowOpeningCompare(false)
    setOpeningsLoading(false)
    setOpenings([])
    startFullGeneration(opening.text)
  }

  function handleSkipOpenings() {
    setShowOpeningCompare(false)
    setOpeningsLoading(false)
    setOpenings([])
    startFullGeneration(null)
  }

  async function startFullGeneration(openingText) {
    const prevLogs = useNovelStore.getState().thinkingLogs
    startGeneration()
    if (prevLogs.length > 0) prevLogs.forEach(log => addThinkingLog(log))

    const onEvent = (event, data) => {
      if (connectingRef.current) { connectingRef.current = false; setConnecting(false) }
      addEvent(event)
      switch (event) {
        case 'parse': setStep('parsing'); break
        case 'parse_done': break
        case 'outline': setStep('outlining'); break
        case 'outline_thinking': addOutlineThinking(data); break
        case 'outline_done':
          if (data?.tree) setOutlineTree(data.tree)
          if (Array.isArray(data?.chapters)) {
            const outlineChs = data.chapters
            const currentChs = useNovelStore.getState().chapters
            if (currentChs.length === 0) {
              outlineChs.forEach(ch => addChapter({ title: ch.title || '', index: ch.index || 0, ...ch }))
            } else if (currentChs.length < outlineChs.length) {
              outlineChs.slice(currentChs.length).forEach(ch => addChapter({ title: ch.title || '', index: ch.index || 0, ...ch }))
            } else {
              currentChs.forEach((ch, i) => {
                if (outlineChs[i]) Object.assign(ch, outlineChs[i])
              })
            }
          }
          setStep('writing')
          break
        case 'emotion_curve':
          if (Array.isArray(data) && data.length > 0) {
            setEmotionCurve(data)
          }
          break
        case 'chapter_start': addChapter(data); break
        case 'content': appendChapterText(data); break
        case 'chapter_end': break
        case 'title': setStep('titling'); break
        case 'interpretation': break
        case 'record_id': setCurrentRecordId(data); break
        case 'continue_from': break
        case 'complete': {
          const currentChapters = useNovelStore.getState().chapters
          setCompleteData({
            title: data.title, novel_id: data.novel_id,
            totalWords: data.total_words || 0,
            totalChapters: currentChapters.length,
            timeCost: data.time_cost || 0,
          })
          setShowCompleteDialog(true)
          break
        }
        case 'log': {
          const msg = typeof data === 'string' ? data : (data?.text || data?.data || '')
          const step = data?.step || 'info'
          let type = 'info'
          if (msg.startsWith('✅') || msg.startsWith('🎉')) type = 'success'
          else if (msg.startsWith('❌')) type = 'error'
          else if (msg.startsWith('⚠️')) type = 'warn'
          else if (msg.startsWith('📖') || msg.startsWith('📋')) type = 'chapter'
          addThinkingLog({ time: new Date().toLocaleTimeString('zh-CN', { hour12: false }), type, text: msg, step })
          break
        }
        case 'error': setError(data.message); setContinueRecordId(null); break
      }
    }

    const onComplete = () => { connectingRef.current = false; setConnecting(false) }
    const onErrorCb = (msg) => {
      connectingRef.current = false; setConnecting(false)
      setError(msg); setContinueRecordId(null)
    }

    const effectiveConfig = customModel != null ? customModel : null
    const effectiveCustomPrompts = Object.fromEntries(
      Object.entries(customPrompts || {}).filter(([, v]) => v && v.trim())
    )

    const requestParams = {
      seed_text: params.seed_text,
      gender: params.gender, genre: params.genre,
      style: params.selectedStyles ? params.selectedStyles.join('+') : params.style || params.styles,
      word_count: params.word_count, chapter_count: params.chapter_count,
      per_chapter_min: params.per_chapter_min, per_chapter_max: params.per_chapter_max,
      llm_config: effectiveConfig,
      custom_prompts: Object.keys(effectiveCustomPrompts).length > 0 ? effectiveCustomPrompts : null,
      pov: params.pov, pacing: params.pacing,
      style_intensity: params.style_intensity,
      enable_suspense: params.enable_suspense,
      enable_twist: params.enable_twist,
      theme: params.theme || '',
      aesthetic_intensity: params.aesthetic_intensity || '中度',
      ending_type: params.ending_type || '',
      opening_text: openingText,  // F7: 已选开头文本
    }

    const activeContinueId = (storeContinueId || (isContinue ? continueRecordIdParam : null))?.toString() ?? null

    connectingRef.current = true
    setConnecting(true)

    const { controller } = demoMode
      ? await generateNovelDemo(requestParams, onEvent, onComplete, onErrorCb)
      : generateNovel(requestParams, onEvent, onComplete, onErrorCb, activeContinueId)

    if (controller) setAbortController(controller)
  }

  function handleStopGeneration() { setShowStopConfirm(true) }

  function confirmStop() {
    const state = useNovelStore.getState()
    connectingRef.current = false; setConnecting(false)
    if (state.currentRecordId) cancelRecord(state.currentRecordId)
    const ctrl = state.abortController
    if (ctrl) { ctrl.abort(); setAbortController(null) }
    setError('用户手动停止')
    setContinueRecordId(null)
    setShowStopConfirm(false)
  }

  function handleCompleteConfirm() {
    if (completeData) {
      finishGeneration()
      setContinueRecordId(null); setShowCompleteDialog(false); setAbortController(null)
      navigate(`/novel/${completeData.novel_id}`)
    }
  }

  function handleCompleteCancel() {
    finishGeneration()
    setContinueRecordId(null); setShowCompleteDialog(false); setAbortController(null)
  }

  const generatingIndex = generating && chapterTexts.length > 0
    ? chapterTexts.findIndex(t => !t || t.trim().length <= 50)
    : -1

  return (
    <div className="space-y-5">
      {/* 错误提示 */}
      {currentStep === 'error' && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3 animate-fade-in-down shadow-sm">
          <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-medium text-red-800">生成失败</p>
            <p className="text-sm text-red-600 mt-1">{useNovelStore.getState().errorMessage}</p>
          </div>
          <button onClick={reset} className="text-sm text-red-500 hover:text-red-700 underline flex-shrink-0 font-medium">重新开始</button>
        </div>
      )}

      {/* 页面标题 */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl gradient-brand flex items-center justify-center shadow-sm">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            {storeContinueId || (isContinue && continueRecordIdParam) ? '继续生成' : '创作新小说'}
          </h1>
          <p className="text-gray-500 mt-1 text-sm ml-10">
            {demoMode ? '🎯 Demo 模式 — 模拟生成演示' : '输入一句话，AI 自动生成完整故事'}
            {storeContinueId || (isContinue && continueRecordIdParam) ? '（接续上次进度）' : ''}
          </p>
        </div>
        <ConfigStatus />
      </div>

      {/* 主体布局 */}
      <div className="flex flex-col lg:flex-row gap-5 items-stretch">
        {/* 左侧表单 */}
        <div className="w-full lg:w-[360px] xl:w-[380px] flex-shrink-0">
          <div className="bg-white rounded-xl border border-gray-200 p-6 sticky top-20 max-h-[calc(100vh-6rem)] overflow-y-auto shadow-sm gradient-card">
            <NovelForm onGenerate={handleGenerate} onStop={handleStopGeneration} />
          </div>
        </div>

        {/* 右侧内容 */}
        <div className="flex-1 min-w-0 flex flex-col gap-4">
          {/* 步骤进度 */}
          {(generating || currentStep === 'error') && <StepProgress />}

          {/* 生成日志 */}
          {(generating || thinkingLogs.length > 0) && <MultiStepLog />}

          {/* ─── F2: 情感曲线（只读展示） ─── */}
          {emotionCurve && (
            <EmotionCurveChart data={emotionCurve as any[]} />
          )}

          {/* 阅读器区域（TOC + 内容） */}
          {hasContent ? (
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm flex-1 flex animate-fade-in-up min-h-0" style={{ maxHeight: '600px' }}>
              {/* 竖排 TOC */}
              {showToc && chapters.length > 0 && (
                <div className="hidden md:flex flex-col w-44 border-r border-gray-100 bg-gray-50/50 flex-shrink-0">
                  <div className="flex items-center justify-between px-3 py-2.5 border-b border-gray-100 bg-white">
                    <span className="text-xs font-semibold text-gray-600 flex items-center gap-1">
                      <BookOpen className="w-3.5 h-3.5 text-orange-500" />
                      目录
                    </span>
                    <span className="text-[10px] text-gray-400">
                      {chapterContentList.filter(c => c.hasContent).length}/{chapters.length}
                    </span>
                  </div>
                  <div className="flex-1 overflow-y-auto py-1 px-1.5 space-y-0.5">
                    {chapters.map((ch, i) => {
                      const done = chapterContentList[i]?.hasContent
                      const isActive = i === generatingIndex && !done
                      return (
                        <button key={i} onClick={() => setOpenChapter(i)}
                          className={cn(
                            'w-full text-left px-2.5 py-1.5 rounded-lg transition-colors text-xs flex items-center gap-2',
                            done ? 'text-emerald-700 hover:bg-emerald-50' : isActive ? 'text-orange-700 bg-orange-50' : 'text-gray-500 hover:bg-gray-100'
                          )}>
                          <span className={cn(
                            'flex-shrink-0 w-5 h-5 rounded flex items-center justify-center text-[9px] font-bold',
                            done ? 'bg-emerald-500 text-white' : isActive ? 'bg-orange-500 text-white' : 'bg-gray-200 text-gray-400'
                          )}>
                            {done ? '✓' : i + 1}
                          </span>
                          <span className="truncate flex-1">{ch.title || `第${i+1}章`}</span>
                          {isActive && <span className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse flex-shrink-0" />}
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* 移动端 TOC 折叠按钮 */}
              {showToc && chapters.length > 0 && (
                <div className="md:hidden absolute top-2 left-2 z-10">
                  <button onClick={() => setOpenChapter(0)}
                    className="flex items-center gap-1 px-2.5 py-1.5 bg-white border border-gray-200 rounded-lg shadow-sm text-xs text-gray-600 hover:bg-gray-50">
                    <BookOpen className="w-3.5 h-3.5" />
                    目录
                  </button>
                </div>
              )}

              {/* 内容区 */}
              <div className="flex-1 flex flex-col min-w-0">
                <NovelReader simple />
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-gray-200 p-6 min-h-[400px] flex flex-col items-center justify-center gradient-card">
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-orange-100 to-rose-100 flex items-center justify-center mb-5 shadow-inner">
                <PenLine className="w-9 h-9 text-orange-400" />
              </div>
              <p className="text-gray-500 font-medium">填写左侧表单，点击「开始生成」</p>
              <p className="text-sm text-gray-400 mt-1">AI 将为你创作一篇完整的小说</p>
              <button onClick={() => document.querySelector('textarea')?.focus()}
                className="mt-5 inline-flex items-center gap-1.5 text-sm text-orange-500 hover:text-orange-700 font-medium transition-colors bg-orange-50 px-4 py-2 rounded-full border border-orange-200">
                <PenLine className="w-3.5 h-3.5" />
                从种子句开始
              </button>
            </div>
          )}
        </div>
      </div>

      {/* 章节弹窗 */}
      {openChapter >= 0 && chapters[openChapter] && (
        <ChapterModal
          chapterIndex={openChapter}
          chapter={chapters[openChapter]}
          content={chapterTexts[openChapter] || ''}
          onClose={() => setOpenChapter(-1)}
        />
      )}

      {/* F7: 对比模式 - 开头选择弹窗 */}
      {showOpeningCompare && (
        <OpeningCompare
          openings={openings}
          loading={openingsLoading}
          onSelect={handleSelectOpening}
          onCancel={handleSkipOpenings}
        />
      )}

      {/* 完成对话框 */}
      {showCompleteDialog && completeData && (
        <CompleteDialog data={completeData} onConfirm={handleCompleteConfirm} onCancel={handleCompleteCancel} />
      )}

      {/* 回到顶部 */}
      <ScrollToTopButton />

      {/* 停止确认对话框 */}
      {showStopConfirm && (
        <div className="modal-overlay animate-fade-in" onClick={() => setShowStopConfirm(false)}>
          <div className="bg-white rounded-2xl w-[90vw] max-w-sm shadow-2xl border border-gray-100 p-6 text-center animate-scale-in" onClick={e => e.stopPropagation()}>
            <div className="w-14 h-14 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-4">
              <StopCircle className="w-7 h-7 text-red-400" />
            </div>
            <h2 className="text-lg font-bold text-gray-900 mb-2">确认停止生成？</h2>
            <p className="text-sm text-gray-500 mb-6">已生成的章节将自动保存，可在历史记录中继续生成。</p>
            <div className="flex gap-3 justify-center">
              <button onClick={confirmStop}
                className="px-5 py-2 bg-red-500 text-white rounded-xl font-medium hover:bg-red-600 transition-all text-sm shadow-sm">确认停止</button>
              <button onClick={() => setShowStopConfirm(false)}
                className="px-5 py-2 btn-secondary text-sm">取消</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}