import { useEffect, useRef, useState, useMemo } from 'react'
import { List, X, ChevronUp, BookMarked } from 'lucide-react'
import { useNovelStore } from '../stores/novelStore'
import { cn } from '../lib/utils'

export default function NovelReader() {
  const { currentContent, chapters, generating } = useNovelStore()
  const bottomRef = useRef(null)
  const contentRef = useRef(null)
  const [showToc, setShowToc] = useState(false)
  const [activeSection, setActiveSection] = useState(null)

  // 自动滚动
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [currentContent])

  // 解析章节区块
  const sections = useMemo(() => {
    if (!currentContent) return []
    return currentContent.split(/(?=## )/).filter(Boolean).map((block, i) => {
      const titleMatch = block.match(/^## (.+)/)
      const title = titleMatch ? titleMatch[1].trim() : (chapters[i]?.title || `第${i+1}章`)
      const content = block.replace(/^## .+\n+/, '')
      return { id: `ch-${i}`, index: i, title, content }
    })
  }, [currentContent, chapters])

  // IntersectionObserver 跟踪当前可见章节
  useEffect(() => {
    if (sections.length === 0) return
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            const id = entry.target.id
            const found = sections.find(s => s.id === id)
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
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' })
      setShowToc(false)
    }
  }

  const isLoading = generating && !currentContent
  const isStreaming = generating && currentContent.length > 0

  return (
    <div className="bg-white rounded-xl border border-gray-200 min-h-[360px] flex flex-col overflow-hidden">
      {/* 顶栏：章节导航标签 */}
      {chapters.length > 0 && (
        <div className="flex items-center gap-1 px-4 pt-3 pb-2 border-b border-gray-100 bg-white sticky top-0 z-10">
          <div className="flex-1 flex items-center gap-1.5 overflow-x-auto scrollbar-hide">
            {chapters.map((ch, i) => {
              const isActive = activeSection === i
              const isLastGenerating = generating && i === chapters.length - 1
              return (
                <button key={i} type="button"
                  onClick={() => scrollToSection(`ch-${i}`)}
                  className={cn(
                    'flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap',
                    isActive
                      ? 'bg-orange-100 text-orange-700 ring-1 ring-orange-300'
                      : isLastGenerating
                      ? 'bg-orange-50 text-orange-600'
                      : 'bg-gray-50 text-gray-500 hover:bg-gray-100 hover:text-gray-700'
                  )}>
                  <span className={cn(
                    'inline-flex items-center justify-center w-5 h-5 rounded-full text-xs font-bold mr-1.5',
                    isActive ? 'bg-orange-500 text-white' : 'bg-gray-200 text-gray-500'
                  )}>{i + 1}</span>
                  {ch.title || `第${i+1}章`}
                  {isLastGenerating && <span className="inline-block ml-1.5 w-1.5 h-1.5 bg-orange-500 rounded-full animate-pulse" />}
                </button>
              )
            })}
          </div>
          {sections.length > 0 && (
            <button type="button" onClick={() => setShowToc(!showToc)}
              className="flex-shrink-0 p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors ml-1">
              <List className="w-4 h-4" />
            </button>
          )}
        </div>
      )}

      <div className="flex flex-1 overflow-hidden relative">
        {/* TOC 侧栏 */}
        {showToc && sections.length > 0 && (
          <div className="flex-shrink-0 w-64 border-r border-gray-100 bg-gray-50/80 overflow-y-auto p-4 space-y-1">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-semibold text-gray-700 flex items-center gap-1.5">
                <BookMarked className="w-4 h-4 text-orange-500" /> 目录
              </span>
              <button type="button" onClick={() => setShowToc(false)}
                className="p-0.5 text-gray-400 hover:text-gray-600"><X className="w-4 h-4" /></button>
            </div>
            {sections.map((sec, i) => (
              <button key={sec.id} type="button" onClick={() => scrollToSection(sec.id)}
                className={cn(
                  'w-full text-left py-2 px-3 rounded-lg transition-colors',
                  activeSection === i
                    ? 'bg-orange-100 text-orange-700 font-medium'
                    : 'hover:bg-orange-50 text-gray-600 hover:text-orange-700'
                )}>
                <span className={cn(
                  'inline-flex items-center justify-center w-5 h-5 rounded-full text-xs font-bold mr-2',
                  activeSection === i ? 'bg-orange-500 text-white' : 'bg-gray-200 text-gray-500'
                )}>{i + 1}</span>
                <span className="text-xs">{sec.title}</span>
              </button>
            ))}
          </div>
        )}

        {/* 主内容区域 */}
        <div ref={contentRef} className="flex-1 overflow-y-auto">
          {isLoading && (
            <div className="flex flex-col items-center justify-center h-60 text-gray-400">
              <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin mb-3" />
              <p className="text-sm">正在构思故事...</p>
            </div>
          )}

          {sections.length > 0 ? (
            <div className="novel-content space-y-6 p-5 md:p-8">
              {sections.map((sec) => (
                <section key={sec.id} id={sec.id} className={cn(
                  'scroll-mt-24 rounded-xl border p-5 md:p-6 transition-all',
                  activeSection === sec.index
                    ? 'border-orange-200 bg-orange-50/30 shadow-sm'
                    : 'border-gray-100 bg-white'
                )}>
                  {/* 章节头部 — 大号、显眼 */}
                  <div className="flex items-center gap-4 mb-5 pb-4 border-b-2 border-gray-100">
                    <span className="flex-shrink-0 w-10 h-10 rounded-xl bg-gradient-to-br from-orange-400 to-rose-500 text-white flex items-center justify-center text-base font-bold shadow-sm">
                      {sec.index + 1}
                    </span>
                    <h2 className="text-xl font-bold text-gray-900 leading-tight">{sec.title}</h2>
                  </div>
                  {/* 内容 */}
                  <div dangerouslySetInnerHTML={{ __html: renderMarkdown(sec.content) }} />
                </section>
              ))}
            </div>
          ) : currentContent ? (
            <div className="p-5 md:p-8 novel-content" dangerouslySetInnerHTML={{ __html: renderMarkdown(currentContent) }} />
          ) : null}

          {isStreaming && (
            <div className="flex items-center gap-2 px-8 pb-6 text-orange-500">
              <span className="inline-block w-2 h-5 bg-orange-500 animate-pulse" />
              <span className="text-xs">正在生成...</span>
            </div>
          )}
          <div ref={bottomRef} />
        </div>
      </div>

      {/* 滚动到顶部按钮 */}
      {sections.length > 3 && (
        <button type="button" onClick={() => scrollToSection(sections[0]?.id)}
          className="absolute bottom-4 right-4 p-2 bg-white border border-gray-200 rounded-full shadow-md hover:shadow-lg hover:bg-gray-50 transition-all z-10">
          <ChevronUp className="w-4 h-4 text-gray-500" />
        </button>
      )}
    </div>
  )
}

function renderMarkdown(text) {
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
