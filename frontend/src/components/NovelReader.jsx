import { useEffect, useRef, useState } from 'react'
import { Loader2, List, X } from 'lucide-react'
import { useNovelStore } from '../stores/novelStore'
import { cn } from '../lib/utils'

export default function NovelReader() {
  const { currentContent, chapters, generating } = useNovelStore()
  const bottomRef = useRef(null)
  const contentRef = useRef(null)
  const [showToc, setShowToc] = useState(false)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [currentContent])

  // 解析内容，提取章节锚点
  const sections = currentContent
    ? currentContent.split(/(?=## )/).filter(Boolean).map((block, i) => {
        const titleMatch = block.match(/^## (.+)/)
        const title = titleMatch ? titleMatch[1].trim() : (chapters[i]?.title || `第${i+1}章`)
        const content = block.replace(/^## .+\n+/, '')
        return { id: `ch-${i}`, index: i, title, content }
      })
    : []

  function scrollToSection(id) {
    const el = document.getElementById(id)
    if (el) { el.scrollIntoView({ behavior: 'smooth', block: 'start' }); setShowToc(false) }
  }

  const isLoading = generating && !currentContent
  const isStreaming = generating && currentContent.length > 0

  return (
    <div className="bg-white rounded-xl border border-gray-200 min-h-[360px] max-h-[75vh] flex flex-col">
      {/* 顶部：章节标签行 + TOC按钮 */}
      {chapters.length > 0 && (
        <div className="flex items-center gap-1 px-4 pt-3 pb-2 border-b border-gray-100">
          <div className="flex-1 flex items-center gap-1.5 overflow-x-auto scrollbar-hide">
            {chapters.map((ch, i) => {
              const isActive = generating && i === chapters.length - 1
              return (
                <button key={i} type="button"
                  onClick={() => scrollToSection(`ch-${i}`)}
                  className={cn(
                    'flex-shrink-0 text-xs px-3 py-1 rounded-full transition-all',
                    isActive
                      ? 'bg-orange-100 text-orange-700 font-medium ring-1 ring-orange-300'
                      : 'bg-gray-50 text-gray-500 hover:bg-gray-100 hover:text-gray-700'
                  )}>
                  <span className="text-gray-400 mr-1">{i + 1}</span>
                  <span className="hidden sm:inline">{ch.title || `第${i+1}章`}</span>
                  {isActive && <span className="inline-block ml-1 w-1.5 h-1.5 bg-orange-500 rounded-full animate-pulse" />}
                </button>
              )
            })}
          </div>
          {/* TOC 侧栏开关 */}
          {sections.length > 0 && (
            <button type="button" onClick={() => setShowToc(!showToc)}
              className="flex-shrink-0 p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
              <List className="w-4 h-4" />
            </button>
          )}
        </div>
      )}

      <div className="flex flex-1 overflow-hidden relative">
        {/* TOC 侧栏 */}
        {showToc && sections.length > 0 && (
          <div className="flex-shrink-0 w-56 border-r border-gray-100 bg-gray-50/50 overflow-y-auto p-3 space-y-1">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-gray-500">目录</span>
              <button type="button" onClick={() => setShowToc(false)}
                className="p-0.5 text-gray-400 hover:text-gray-600"><X className="w-3.5 h-3.5" /></button>
            </div>
            {sections.map((sec, i) => (
              <button key={sec.id} type="button" onClick={() => scrollToSection(sec.id)}
                className="w-full text-left text-xs py-1.5 px-2 rounded-lg hover:bg-orange-50 hover:text-orange-700 text-gray-600 transition-colors">
                <span className="text-gray-400 mr-1.5">{i + 1}.</span>
                {sec.title}
              </button>
            ))}
          </div>
        )}

        {/* 内容区域 */}
        <div ref={contentRef} className="flex-1 overflow-y-auto p-5 md:p-8">
          {isLoading && (
            <div className="flex flex-col items-center justify-center h-60 text-gray-400">
              <Loader2 className="w-8 h-8 animate-spin mb-3 text-orange-500" />
              <p className="text-sm">正在构思故事...</p>
            </div>
          )}

          {sections.length > 0 ? (
            <div className="novel-content">
              {sections.map((sec) => (
                <section key={sec.id} id={sec.id} className="mb-8 scroll-mt-20">
                  {/* 重新设计的章节标题 */}
                  <div className="flex items-center gap-3 mb-5 pb-3 border-b border-gray-100">
                    <span className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-orange-400 to-rose-400 text-white flex items-center justify-center text-sm font-bold shadow-sm">
                      {sec.index + 1}
                    </span>
                    <h2 className="text-xl font-bold text-gray-900 m-0">{sec.title}</h2>
                  </div>
                  {/* 内容用 markdown 渲染 */}
                  <div dangerouslySetInnerHTML={{ __html: renderMarkdown(sec.content) }} />
                </section>
              ))}
            </div>
          ) : currentContent ? (
            <div className="novel-content" dangerouslySetInnerHTML={{ __html: renderMarkdown(currentContent) }} />
          ) : null}

          {isStreaming && (
            <span className="inline-block w-0.5 h-5 bg-orange-500 animate-pulse ml-0.5 align-middle" />
          )}
          <div ref={bottomRef} />
        </div>
      </div>
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
