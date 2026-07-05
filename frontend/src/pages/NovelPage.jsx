import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Trash2, Clock, BookOpen, Type, Cpu } from 'lucide-react'
import { fetchNovel, deleteNovel, isGitHubPages } from '../services/api'
import ExportBar from '../components/ExportBar'

export default function NovelPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [novel, setNovel] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const demoMode = isGitHubPages() || id === '0'

  useEffect(() => {
    loadNovel()
  }, [id])

  async function loadNovel() {
    setLoading(true)
    setError('')
    try {
      const data = await fetchNovel(id)
      setNovel(data)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  async function handleDelete() {
    if (!window.confirm('确定要删除这篇小说吗？')) return
    try {
      await deleteNovel(id)
      navigate('/history')
    } catch (err) {
      alert('删除失败：' + err.message)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-6 h-6 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-16">
        <p className="text-red-500">{error}</p>
        <button onClick={() => navigate(-1)} className="mt-4 text-orange-500 hover:underline">
          返回
        </button>
      </div>
    )
  }

  if (!novel) return null

  return (
    <div className="space-y-6">
      {/* 顶部导航 */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-1 text-gray-500 hover:text-gray-700 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          返回
        </button>
        <div className="flex items-center gap-3">
          {!demoMode && <ExportBar novelId={novel.id} />}
          {!demoMode && (
            <button
              onClick={handleDelete}
              className="flex items-center gap-1 text-red-400 hover:text-red-600 text-sm transition-colors"
            >
              <Trash2 className="w-4 h-4" />
              删除
            </button>
          )}
          {demoMode && (
            <span className="text-xs bg-gray-100 text-gray-500 px-3 py-1.5 rounded-lg">
              Demo 预览
            </span>
          )}
        </div>
      </div>

      {/* 小说信息 */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">{novel.title || '未命名小说'}</h1>
        <div className="flex flex-wrap items-center gap-4 mt-3 text-sm text-gray-500">
          <span className="flex items-center gap-1">
            <BookOpen className="w-4 h-4" /> {novel.genre}
          </span>
          <span className="flex items-center gap-1">
            <Type className="w-4 h-4" /> {novel.style}
          </span>
          <span className="flex items-center gap-1">
            <Clock className="w-4 h-4" /> {new Date(novel.created_at).toLocaleString('zh-CN')}
          </span>
          <span className="flex items-center gap-1">
            <Cpu className="w-4 h-4" /> {novel.model_used}
          </span>
          <span className="text-gray-400">
            {novel.actual_count?.toLocaleString()} 字（目标 {novel.word_count} 字）
          </span>
          {novel.time_cost && (
            <span className="text-gray-400">耗时 {novel.time_cost.toFixed(1)} 秒</span>
          )}
        </div>
      </div>

      {/* 小说内容 */}
      <div
        className="bg-white rounded-xl border border-gray-200 p-6 md:p-8 novel-content"
        dangerouslySetInnerHTML={{ __html: renderMarkdown(novel.content || '') }}
      />
    </div>
  )
}

/** 简易 Markdown 转 HTML */
function renderMarkdown(text) {
  if (!text) return ''

  let html = text
    .replace(/^### (.+)$/gm, '<h3>$1</h3>')
    .replace(/^## (.+)$/gm, '<h2>$1</h2>')
    .replace(/^# (.+)$/gm, '<h1>$1</h1>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/\n\n/g, '</p><p>')
    .replace(/\n/g, '<br/>')

  return `<p>${html}</p>`
}
