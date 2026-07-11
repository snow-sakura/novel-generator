import { useEffect, useRef, useState, useMemo, useCallback } from 'react'
import { ChevronUp, PenLine, RefreshCw, Expand, Minimize2, History, Check, Loader2, ChevronDown, Quote, Plus, Send, Wand2, X } from 'lucide-react'
import { useNovelStore } from '../stores/novelStore'
import { refineParagraph, fetchParagraphVersions, assistContinue, assistRewrite } from '../services/api'
import { cn, toast } from '../lib/utils'

function renderMarkdown(text) {
  if (!text) return ''
  let html = text
    .replace(/^### (.+)$/gm, '<h3 class="text-lg font-bold my-3 text-gray-800">$1</h3>')
    .replace(/^## (.+)$/gm, '<h2 class="text-xl font-bold my-4 text-gray-900 text-left">$1</h2>')
    .replace(/^# (.+)$/gm, '<h1 class="text-2xl font-bold my-5 text-gray-900 text-left">$1</h1>')
    .replace(/^>[^\S\r\n]?\*?(.+?)\*?[^\S\r\n]*$/gm, '<blockquote class="border-l-4 border-orange-300 pl-4 italic text-gray-500 my-4 text-sm">$1</blockquote>')
    .replace(/\*\*(.+?)\*\*/g, '<strong class="font-semibold">$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/\n\n/g, '</p><p class="text-base leading-relaxed mb-4 text-gray-700">')
    .replace(/\n/g, '<br/>')
  return '<p class="text-base leading-relaxed mb-4 text-gray-700">' + html + '</p>'
}

function RefineSidebar({ selectedParagraph, novelId, onClose, onApply, onInsertContent,
  rewriteInstruction, setRewriteInstruction, rewriteResult, rewriteLoading, handleSmartRewrite, handleApplyRewrite }) {
  const [refining, setRefining] = useState(false)
  const [result, setResult] = useState('')
  const [versions, setVersions] = useState([])
  const [showVersions, setShowVersions] = useState(false)
  const [action, setAction] = useState(null)
  const abortRef = useRef(null)

  const { chapterIndex, paragraphIndex, content } = selectedParagraph || {}

  useEffect(() => {
    if (novelId && chapterIndex != null && paragraphIndex != null) {
      fetchParagraphVersions(novelId, chapterIndex, paragraphIndex)
        .then(data => setVersions(data.versions || []))
        .catch(() => {})
    }
  }, [novelId, chapterIndex, paragraphIndex])

  useEffect(() => {
    setResult(''); setShowVersions(false); setAction(null)
  }, [chapterIndex, paragraphIndex])

  useEffect(() => {
    return () => { if (abortRef.current) abortRef.current.abort?.() }
  }, [])

  async function handleRefine(actionType) {
    if (!novelId || !content) return
    setRefining(true); setResult(''); setAction(actionType)

    const params = {
      novel_id: novelId,
      chapter_index: chapterIndex,
      paragraph_index: paragraphIndex,
      action: actionType,
      original_content: content,
      context: '',
      style: '轻松搞笑',
    }

    try {
      const ctrl = await refineParagraph(
        params,
        (event, data) => {
          if (event === 'refine_content') {
            const d = data as { text?: string }
            setResult(prev => prev + (d.text || ''))
          }
        },
        () => {
          setRefining(false)
          toast.success('润色完成')
          loadVersions()
        },
        (error) => {
          setRefining(false)
          toast.error(error.message || '润色失败')
        }
      )
      if (ctrl?.abort) abortRef.current = ctrl
    } catch (err) {
      setRefining(false)
      toast.error(err.message || '润色请求失败')
    }
  }

  async function loadVersions() {
    if (!novelId) return
    try {
      const data = await fetchParagraphVersions(novelId, chapterIndex, paragraphIndex)
      setVersions(data.versions || [])
    } catch {}
  }

  function handleApply(text) {
    if (action === 'insert_quote') {
      if (onInsertContent) onInsertContent(text, chapterIndex, paragraphIndex)
    } else {
      if (onApply) onApply(text, chapterIndex, paragraphIndex)
    }
    toast.success('已应用润色版本')
  }

  const ACTIONS = [
    { key: 'rewrite', icon: RefreshCw, label: '重写', color: 'text-blue-600 bg-blue-50 hover:bg-blue-100 border-blue-200' },
    { key: 'expand', icon: Expand, label: '扩写', color: 'text-emerald-600 bg-emerald-50 hover:bg-emerald-100 border-emerald-200' },
    { key: 'compress', icon: Minimize2, label: '精简', color: 'text-orange-600 bg-orange-50 hover:bg-orange-100 border-orange-200' },
    { key: 'insert_quote', icon: Quote, label: '插入金句', color: 'text-purple-600 bg-purple-50 hover:bg-purple-100 border-purple-200' },
  ]

  const isRefining = refining

  return (
    <div className="w-80 border-l border-gray-200 bg-white flex flex-col overflow-hidden animate-slide-in-right shadow-lg">
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 flex-shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg gradient-brand flex items-center justify-center">
            <PenLine className="w-3.5 h-3.5 text-white" />
          </div>
          <span className="text-sm font-semibold text-gray-800">段落润色</span>
        </div>
        <button onClick={onClose} className="btn-ghost p-1">
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        <div>
          <span className="text-[10px] font-medium text-gray-400 uppercase tracking-wider">选定段落</span>
          <p className="text-xs text-gray-600 mt-1 bg-gray-50 rounded-lg p-2.5 border border-gray-100 leading-relaxed max-h-24 overflow-y-auto">
            {content?.slice(0, 300) || '（未选择段落）'}
            {(content?.length || 0) > 300 && '...'}
          </p>
          <span className="text-[10px] text-gray-400 mt-1 block">
            第 {chapterIndex != null ? chapterIndex + 1 : '-'} 章 · 段落 {paragraphIndex != null ? paragraphIndex + 1 : '-'}
          </span>
        </div>

        <div>
          <span className="text-[10px] font-medium text-gray-400 uppercase tracking-wider mb-1.5 block">操作</span>
          <div className="flex flex-col gap-1.5">
            {ACTIONS.map(a => {
              const Icon = a.icon
              const active = action === a.key && isRefining
              return (
                <button key={a.key} type="button" onClick={() => handleRefine(a.key)}
                  disabled={isRefining}
                  className={cn(
                    'flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-medium border transition-all duration-150 w-full text-left',
                    active ? 'ring-2 ring-orange-300 opacity-60 cursor-wait' : a.color,
                    isRefining && !active && 'opacity-40 cursor-not-allowed'
                  )}>
                  {active ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Icon className="w-3.5 h-3.5" />}
                  {a.label}
                  {active && <span className="text-[10px] text-gray-400 ml-auto">处理中...</span>}
                </button>
              )
            })}
          </div>
        </div>

        {/* F9: 智能改写 */}
        <div>
          <span className="text-[10px] font-medium text-gray-400 uppercase tracking-wider mb-1.5 block">智能改写</span>
          <div className="flex gap-1.5 mb-1.5">
            <input value={rewriteInstruction} onChange={e => setRewriteInstruction(e.target.value)}
              placeholder="例如：更悬疑、更幽默、更文艺..." disabled={isRefining || rewriteLoading}
              className="flex-1 px-2.5 py-1.5 text-xs border border-gray-200 rounded-lg outline-none focus:ring-1 focus:ring-indigo-300" />
            <button onClick={handleSmartRewrite} disabled={!content || !rewriteInstruction.trim() || rewriteLoading}
              className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-white bg-violet-500 rounded-lg hover:bg-violet-600 disabled:opacity-50">
              {rewriteLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Wand2 className="w-3 h-3" />}
              改写
            </button>
          </div>
          {rewriteResult && (
            <div className="animate-fade-in-up mt-1">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] font-medium text-gray-400 uppercase tracking-wider">改写结果</span>
                <button onClick={handleApplyRewrite}
                  className="flex items-center gap-1 text-[10px] font-medium text-emerald-600 bg-emerald-50 px-2 py-1 rounded-lg hover:bg-emerald-100 transition-colors">
                  <Check className="w-3 h-3" /> 应用
                </button>
              </div>
              <div className="bg-violet-50 border border-violet-200 rounded-xl p-3">
                <p className="text-xs text-gray-700 leading-relaxed whitespace-pre-wrap">{rewriteResult}</p>
              </div>
            </div>
          )}
        </div>

        {result && (
          <div className="animate-fade-in-up">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10px] font-medium text-gray-400 uppercase tracking-wider">润色结果</span>
              <button onClick={() => handleApply(result)}
                className="flex items-center gap-1 text-[10px] font-medium text-emerald-600 bg-emerald-50 px-2 py-1 rounded-lg hover:bg-emerald-100 transition-colors">
                <Check className="w-3 h-3" /> 应用
              </button>
            </div>
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3">
              <p className="text-xs text-gray-700 leading-relaxed whitespace-pre-wrap">{result}</p>
            </div>
          </div>
        )}

        {versions.length > 0 && (
          <div>
            <button onClick={() => setShowVersions(!showVersions)}
              className="flex items-center gap-1.5 text-[10px] font-medium text-gray-500 hover:text-gray-700 transition-colors w-full text-left">
              <History className="w-3 h-3" />
              版本历史 ({versions.length})
              <ChevronDown className={cn('w-3 h-3 ml-auto transition-transform', showVersions && 'rotate-180')} />
            </button>
            {showVersions && (
              <div className="mt-1.5 space-y-1.5 animate-fade-in-down">
                {versions.map((v, i) => (
                  <div key={v.id} className="flex items-start gap-2 p-2 bg-gray-50 rounded-lg border border-gray-100">
                    <span className="flex-shrink-0 w-5 h-5 rounded-full bg-gray-200 text-gray-500 flex items-center justify-center text-[9px] font-bold">
                      {versions.length - i}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] font-medium text-gray-600">
                          {v.action === 'rewrite' ? '重写' : v.action === 'expand' ? '扩写' : '精简'}
                        </span>
                        <span className="text-[9px] text-gray-400">v{v.version}</span>
                        {v.created_at && (
                          <span className="text-[9px] text-gray-400 ml-auto">
                            {new Date(v.created_at).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-gray-500 mt-0.5 truncate">{v.content?.slice(0, 80)}...</p>
                      <button onClick={() => handleApply(v.content)}
                        className="text-[10px] text-orange-600 hover:text-orange-800 font-medium mt-1">
                        应用此版本
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function ParagraphContent({ content, chapterIndex, selectedParagraph, onParagraphSelect }) {
  if (!content) return null
  const paragraphs = content.split(/\n\n+/).filter(p => p.trim())

  if (paragraphs.length <= 1) {
    const isSelected = selectedParagraph?.chapterIndex === chapterIndex && selectedParagraph?.paragraphIndex === 0
    return (
      <div onClick={() => onParagraphSelect(chapterIndex, 0, content)}
        className={cn(
          'cursor-pointer rounded-lg p-2 -m-2 transition-all duration-150 group/para',
          isSelected ? 'bg-orange-100 ring-2 ring-orange-300' : 'hover:bg-orange-50/50 hover:ring-1 hover:ring-orange-200'
        )}>
        <div dangerouslySetInnerHTML={{ __html: renderMarkdown(content) }} />
        <div className="flex items-center gap-1 mt-1 opacity-0 group-hover/para:opacity-100 transition-opacity">
          <PenLine className="w-3 h-3 text-orange-400" />
          <span className="text-[10px] text-orange-400">点击润色</span>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {paragraphs.map((para, idx) => {
        const isSelected = selectedParagraph?.chapterIndex === chapterIndex && selectedParagraph?.paragraphIndex === idx
        return (
          <div key={idx} onClick={() => onParagraphSelect(chapterIndex, idx, para)}
            className={cn(
              'cursor-pointer rounded-lg p-2 -m-2 transition-all duration-150 group/para',
              isSelected ? 'bg-orange-100 ring-2 ring-orange-300' : 'hover:bg-orange-50/50 hover:ring-1 hover:ring-orange-200'
            )}>
            <p className="text-base leading-relaxed text-gray-700">{para}</p>
            <div className="flex items-center gap-1 mt-1 opacity-0 group-hover/para:opacity-100 transition-opacity">
              <PenLine className="w-3 h-3 text-orange-400" />
              <span className="text-[10px] text-orange-400">点击润色此段落</span>
            </div>
          </div>
        )
      })}
    </div>
  )
}

export default function NovelReader({ novelId, initialContent, initialChapters, onContentChange, onInsertContent, simple = false }) {
  const { currentContent, chapters, generating } = useNovelStore()
  const bottomRef = useRef(null)
  const contentRef = useRef(null)
  const [activeSection, setActiveSection] = useState(null)
  const [selectedParagraph, setSelectedParagraph] = useState(null)
  const [showRefine, setShowRefine] = useState(false)
  const [showToc, setShowToc] = useState(false)
  // F9: 续写
  const [continuingChapter, setContinuingChapter] = useState(null)
  const [continueInstruction, setContinueInstruction] = useState('')
  const [continueResult, setContinueResult] = useState('')
  const [continueLoading, setContinueLoading] = useState(false)
  // F9: 智能改写
  const [rewriteInstruction, setRewriteInstruction] = useState('')
  const [rewriteResult, setRewriteResult] = useState('')
  const [rewriteLoading, setRewriteLoading] = useState(false)

  const displayContent = initialContent || currentContent
  const displayChapters = initialChapters || chapters
  const effectiveNovelId = novelId

  useEffect(() => {
    if (!initialContent) bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [displayContent, initialContent])

  const sections = useMemo(() => {
    if (!displayContent) return []
    return displayContent.split(/(?=## )/).filter(Boolean).map((block, i) => {
      const titleMatch = block.match(/^## (.+)/)
      const title = titleMatch ? titleMatch[1].trim() : (displayChapters[i]?.title || `第${i+1}章`)
      const content = block.replace(/^## .+\n+/, '')
      return { id: `ch-${i}`, index: i, title, content }
    })
  }, [displayContent, displayChapters])

  useEffect(() => {
    if (sections.length === 0) return
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            const found = sections.find(s => s.id === entry.target.id)
            if (found) setActiveSection(found.index)
          }
        }
      },
      { rootMargin: '-80px 0px -60% 0px' }
    )
    sections.forEach(s => {
      const el = document.getElementById(s.id)
      if (el) observer.observe(el)
    })
    return () => observer.disconnect()
  }, [sections])

  function scrollToSection(id) {
    const el = document.getElementById(id)
    if (el) { el.scrollIntoView({ behavior: 'smooth', block: 'start' }); setShowToc(false) }
  }

  function handleParagraphSelect(chapterIndex, paragraphIndex, content) {
    setSelectedParagraph({ chapterIndex, paragraphIndex, content })
    setShowRefine(true)
    setRewriteInstruction('')
    setRewriteResult('')
  }

  function handleApplyRefine(text, chapterIndex, paragraphIndex) {
    if (onContentChange) {
      onContentChange(text, chapterIndex, paragraphIndex)
    }
    setShowRefine(false)
    setSelectedParagraph(null)
  }

  function handleInsertContent(text, chapterIndex, paragraphIndex) {
    if (onInsertContent) {
      onInsertContent(text, chapterIndex, paragraphIndex)
    }
    setShowRefine(false)
    setSelectedParagraph(null)
  }

  function closeRefine() {
    setShowRefine(false)
    setSelectedParagraph(null)
  }

  // F9: 续写
  async function handleContinue(chapterIndex) {
    const content = sections[chapterIndex]?.content || ''
    if (!content.trim()) return
    setContinuingChapter(chapterIndex)
    setContinueLoading(true)
    setContinueResult('')
    const params = {
      novel_id: novelId || 0,
      chapter_index: chapterIndex,
      context: content.slice(-3000),
      instruction: continueInstruction,
      target_words: 300,
    }
    const onEvent = (event, data) => {
      if (event === 'content') setContinueResult(prev => prev + (data.text || ''))
    }
    const onComplete = () => setContinueLoading(false)
    const onError = (msg) => { setContinueLoading(false); toast.error(msg) }
    assistContinue(params, onEvent, onComplete, onError)
  }

  function handleApplyContinue() {
    if (!continueResult || continuingChapter == null) return
    if (onContentChange) {
      onContentChange(continueResult, continuingChapter, -1)
    }
    setContinuingChapter(null)
    setContinueResult('')
    setContinueInstruction('')
    toast.success('续写内容已应用')
  }

  // F9: 智能改写
  async function handleSmartRewrite() {
    if (!selectedParagraph || !rewriteInstruction.trim()) return
    setRewriteLoading(true)
    setRewriteResult('')
    const params = {
      novel_id: novelId || 0,
      chapter_index: selectedParagraph.chapterIndex,
      paragraph_index: selectedParagraph.paragraphIndex,
      content: selectedParagraph.content,
      instruction: rewriteInstruction,
    }
    const onEvent = (event, data) => {
      if (event === 'content') setRewriteResult(prev => prev + (data.text || ''))
    }
    const onComplete = () => setRewriteLoading(false)
    const onError = (msg) => { setRewriteLoading(false); toast.error(msg) }
    assistRewrite(params, onEvent, onComplete, onError)
  }

  function handleApplyRewrite() {
    if (!rewriteResult || !selectedParagraph) return
    if (onContentChange) {
      onContentChange(rewriteResult, selectedParagraph.chapterIndex, selectedParagraph.paragraphIndex)
    }
    setRewriteResult('')
    setRewriteInstruction('')
    setRewriteLoading(false)
    toast.success('改写已应用')
  }

  const isStreaming = generating && displayContent?.length > 0

  return (
    <div className={cn(
      !simple && 'bg-white rounded-xl border border-gray-200 min-h-[360px] flex overflow-hidden relative shadow-sm',
      simple && 'flex flex-col min-w-0 h-full'
    )}>
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {!simple && displayChapters.length > 0 && (
          <div className="flex items-center gap-1 px-4 pt-3 pb-2 border-b border-gray-100 bg-white sticky top-0 z-10 overflow-x-auto scrollbar-hide">
            {displayChapters.map((ch, i) => {
              const isActive = activeSection === i
              const isLast = generating && i === displayChapters.length - 1
              return (
                <button key={i} type="button" onClick={() => scrollToSection(`ch-${i}`)}
                  className={cn(
                    'flex-shrink-0 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap',
                    isActive ? 'bg-orange-100 text-orange-700 ring-1 ring-orange-300' : 'bg-gray-50 text-gray-500 hover:bg-gray-100'
                  )}>
                  <span className={cn(
                    'inline-flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-bold mr-1.5',
                    isActive ? 'bg-orange-500 text-white' : 'bg-gray-200 text-gray-500'
                  )}>{i + 1}</span>
                  {ch.title || `第${i+1}章`}
                  {isLast && <span className="inline-block ml-1.5 w-1.5 h-1.5 bg-orange-500 rounded-full animate-pulse" />}
                </button>
              )
            })}
          </div>
        )}

        <div className="flex flex-1 overflow-hidden relative">
          <div ref={contentRef} className="flex-1 overflow-y-auto">
            {generating && !displayContent && (
              <div className="flex flex-col items-center justify-center h-72 text-gray-400">
                <div className="w-10 h-10 border-[3px] border-orange-500 border-t-transparent rounded-full animate-spin mb-3" />
                <p className="text-sm animate-pulse-soft">正在构思故事...</p>
              </div>
            )}

            {sections.length > 0 ? (
              <div className="novel-content space-y-4 p-5 md:p-6">
                {sections.map(sec => (
                  <section key={sec.id} id={sec.id} className={cn(
                    'scroll-mt-20 rounded-xl border p-5 md:p-6 transition-all duration-200',
                    activeSection === sec.index ? 'border-orange-200 bg-orange-50/20 shadow-sm' : 'border-gray-100 bg-white'
                  )}>
                    <div className="flex items-center gap-3 mb-4 pb-3 border-b border-gray-100">
                      <span className="flex-shrink-0 w-9 h-9 rounded-xl gradient-brand text-white flex items-center justify-center text-sm font-bold shadow-sm">
                        {sec.index + 1}
                      </span>
                      <h2 className="text-lg font-bold text-gray-900">{sec.title}</h2>
                    </div>
                    <ParagraphContent
                      content={sec.content}
                      chapterIndex={sec.index}
                      selectedParagraph={selectedParagraph}
                      onParagraphSelect={handleParagraphSelect}
                    />
                    {/* F9: 续写 */}
                    <div className="mt-4 pt-3 border-t border-dashed border-gray-200">
                      {continuingChapter === sec.index ? (
                        <div className="space-y-2 animate-fade-in">
                          {continueResult && (
                            <div className="bg-indigo-50 rounded-lg p-3 border border-indigo-100">
                              <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{continueResult}</p>
                            </div>
                          )}
                          <div className="flex items-center gap-2">
                            <input value={continueInstruction} onChange={e => setContinueInstruction(e.target.value)}
                              placeholder="续写方向（可选）..." disabled={continueLoading}
                              className="flex-1 px-3 py-1.5 text-xs border border-gray-200 rounded-lg outline-none focus:ring-1 focus:ring-indigo-300" />
                            <button onClick={() => handleContinue(sec.index)} disabled={continueLoading}
                              className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-white bg-indigo-500 rounded-lg hover:bg-indigo-600 disabled:opacity-50">
                              {continueLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
                              {continueLoading ? '生成中...' : '续写'}
                            </button>
                            {continueResult && (
                              <button onClick={handleApplyContinue}
                                className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-emerald-600 bg-emerald-50 border border-emerald-200 rounded-lg hover:bg-emerald-100">
                                <Check className="w-3 h-3" /> 应用
                              </button>
                            )}
                          </div>
                        </div>
                      ) : (
                        <button onClick={() => setContinuingChapter(sec.index)}
                          className="flex items-center gap-1 text-xs text-gray-400 hover:text-indigo-500 transition-colors">
                          <Plus className="w-3 h-3" /> 续写
                        </button>
                      )}
                    </div>
                  </section>
                ))}
              </div>
            ) : displayContent ? (
              <div className="p-5 md:p-6 novel-content" dangerouslySetInnerHTML={{ __html: renderMarkdown(displayContent) }} />
            ) : null}

            {isStreaming && (
              <div className="flex items-center gap-2 px-8 pb-6 text-orange-500">
                <span className="inline-block w-2 h-4 bg-orange-500 rounded-sm animate-pulse" />
                <span className="text-xs">正在生成...</span>
              </div>
            )}
            <div ref={bottomRef} />
          </div>
        </div>

        {sections.length > 3 && (
          <button onClick={() => scrollToSection(sections[0]?.id)}
            className="absolute bottom-4 right-4 p-2 bg-white border border-gray-200 rounded-full shadow-md hover:shadow-lg hover:bg-gray-50 transition-all z-10">
            <ChevronUp className="w-4 h-4 text-gray-500" />
          </button>
        )}
      </div>

      {showRefine && selectedParagraph && (
        <RefineSidebar
          selectedParagraph={selectedParagraph}
          novelId={effectiveNovelId}
          onClose={closeRefine}
          onApply={handleApplyRefine}
          onInsertContent={handleInsertContent}
          rewriteInstruction={rewriteInstruction}
          setRewriteInstruction={setRewriteInstruction}
          rewriteResult={rewriteResult}
          rewriteLoading={rewriteLoading}
          handleSmartRewrite={handleSmartRewrite}
          handleApplyRewrite={handleApplyRewrite}
        />
      )}
    </div>
  )
}