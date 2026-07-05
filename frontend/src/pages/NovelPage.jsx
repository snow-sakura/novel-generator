import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Trash2, Clock, BookOpen, Type, Cpu, Download, FileText, Brain } from 'lucide-react'
import { fetchNovel, deleteNovel, isGitHubPages, getChapterExportUrl, getOutlineExportUrl } from '../services/api'

export default function NovelPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [novel, setNovel] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const demoMode = isGitHubPages() || id === '0'

  useEffect(() => { loadNovel() }, [id])

  async function loadNovel() {
    setLoading(true); setError('')
    try { const data = await fetchNovel(id); setNovel(data) }
    catch (err) { setError(err.message) }
    finally { setLoading(false) }
  }

  async function handleDelete() {
    if (!window.confirm('确定删除？')) return
    try { await deleteNovel(id); navigate('/history') }
    catch (err) { alert('删除失败：' + err.message) }
  }

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-6 h-6 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" /></div>

  if (error) return <div className="text-center py-16"><p className="text-red-500">{error}</p><button onClick={() => navigate(-1)} className="mt-4 text-orange-500 hover:underline">返回</button></div>

  if (!novel) return null

  const chapters = Array.isArray(novel.chapters) ? novel.chapters : []

  return (
    <div className="space-y-6">
      {/* 顶栏 */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-gray-500 hover:text-gray-700 transition-colors">
          <ArrowLeft className="w-4 h-4" />返回
        </button>
        <div className="flex items-center gap-2 flex-wrap">
          {!demoMode && (
            <>
              {/* 导出按钮组 */}
              <div className="flex items-center gap-1">
                <a href={`/api/v1/novels/${id}/export?format=markdown`} download
                  className="flex items-center gap-1 px-2.5 py-1.5 text-xs bg-white border rounded-lg hover:bg-gray-50 text-gray-600">
                  <FileText className="w-3 h-3" />MD
                </a>
                <a href={`/api/v1/novels/${id}/export?format=txt`} download
                  className="flex items-center gap-1 px-2.5 py-1.5 text-xs bg-white border rounded-lg hover:bg-gray-50 text-gray-600">
                  <FileText className="w-3 h-3" />TXT
                </a>
                <a href={`/api/v1/novels/${id}/export?format=pdf`} download
                  className="flex items-center gap-1 px-2.5 py-1.5 text-xs bg-white border rounded-lg hover:bg-gray-50 text-gray-600">
                  <FileText className="w-3 h-3" />PDF
                </a>
              </div>
              {/* 逐章导出 */}
              <a href={getChapterExportUrl(id)} download
                className="flex items-center gap-1 px-2.5 py-1.5 text-xs bg-white border rounded-lg hover:bg-gray-50 text-gray-600">
                <Download className="w-3 h-3" />章节ZIP
              </a>
              {/* 大纲导出 */}
              <a href={getOutlineExportUrl(id)} download
                className="flex items-center gap-1 px-2.5 py-1.5 text-xs bg-white border rounded-lg hover:bg-gray-50 text-gray-600">
                <Brain className="w-3 h-3" />大纲
              </a>
            </>
          )}
          {!demoMode && (
            <button onClick={handleDelete}
              className="flex items-center gap-1 px-2.5 py-1.5 text-xs text-red-400 hover:text-red-600 border border-red-200 rounded-lg hover:bg-red-50 transition-colors">
              <Trash2 className="w-3 h-3" />删除
            </button>
          )}
          {demoMode && <span className="text-xs bg-gray-100 text-gray-500 px-3 py-1.5 rounded-lg">Demo 预览</span>}
        </div>
      </div>

      {/* 小说信息 */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">{novel.title || '未命名小说'}</h1>
        <div className="flex flex-wrap items-center gap-3 mt-3 text-sm text-gray-500">
          <span className="bg-orange-50 text-orange-700 px-2 py-0.5 rounded-full text-xs">{novel.gender}</span>
          <span className="flex items-center gap-1"><BookOpen className="w-3.5 h-3.5" /> {novel.genre}</span>
          <span className="flex items-center gap-1"><Type className="w-3.5 h-3.5" /> {novel.style}</span>
          <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> {novel.created_at ? new Date(novel.created_at).toLocaleString('zh-CN') : ''}</span>
          <span className="flex items-center gap-1"><Cpu className="w-3.5 h-3.5" /> {novel.model_used}</span>
          <span>{novel.actual_count?.toLocaleString()} 字（目标 {novel.word_count} 字）</span>
          {novel.time_cost && <span>耗时 {novel.time_cost.toFixed(1)}秒</span>}
          {novel.per_chapter_min && <span>每章 {novel.per_chapter_min}-{novel.per_chapter_max} 字</span>}
        </div>
      </div>

      {/* 大纲预览 */}
      {novel.outline && novel.outline.chapters && novel.outline.chapters.length > 0 && (
        <div className="bg-gradient-to-r from-orange-50 to-rose-50 rounded-xl border border-orange-100 p-4">
          <h3 className="text-sm font-medium text-orange-800 mb-2 flex items-center gap-1.5"><Brain className="w-4 h-4" />创作大纲</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {novel.outline.chapters.map((ch, i) => (
              <div key={i} className="bg-white/80 rounded-lg p-3 border border-orange-100/50">
                <p className="text-xs font-medium text-orange-700">第{i+1}章 {ch.title}</p>
                <p className="text-xs text-gray-500 mt-0.5">{ch.summary}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 小说内容 — 按章节渲染 */}
      {renderChapterContent(novel.content || '', chapters)}
    </div>
  )
}

function renderChapterContent(fullContent, chapters) {
  if (!fullContent) return null

  // 按 ## 分割章节
  const blocks = fullContent.split(/(?=## )/).filter(Boolean)
  if (blocks.length <= 1) {
    return <div className="bg-white rounded-xl border border-gray-200 p-6 md:p-8 novel-content" dangerouslySetInnerHTML={{ __html: renderMD(fullContent) }} />
  }

  return (
    <div className="space-y-4">
      {blocks.map((block, i) => {
        const titleMatch = block.match(/^## (.+)/)
        const title = titleMatch ? titleMatch[1].trim() : (chapters[i]?.title || `第${i+1}章`)
        const content = block.replace(/^## .+\n+/, '')
        return (
          <section key={i} id={`ch-${i}`} className="bg-white rounded-xl border border-gray-200 p-6 md:p-8 scroll-mt-20">
            <div className="flex items-center gap-3 mb-5 pb-3 border-b border-gray-100">
              <span className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-orange-400 to-rose-400 text-white flex items-center justify-center text-sm font-bold shadow-sm">{i + 1}</span>
              <h2 className="text-xl font-bold text-gray-900 m-0">{title}</h2>
            </div>
            <div className="novel-content" dangerouslySetInnerHTML={{ __html: renderMD(content) }} />
          </section>
        )
      })}
    </div>
  )
}

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
