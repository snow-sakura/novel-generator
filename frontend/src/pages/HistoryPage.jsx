import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Clock, BookOpen, Monitor } from 'lucide-react'
import { fetchNovels, isGitHubPages } from '../services/api'
import NovelCard from '../components/NovelCard'

export default function HistoryPage() {
  const navigate = useNavigate()
  const [novels, setNovels] = useState([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const demoMode = isGitHubPages()
  const pageSize = 12

  useEffect(() => {
    loadNovels()
  }, [page])

  async function loadNovels() {
    setLoading(true)
    try {
      const data = await fetchNovels(page, pageSize)
      setNovels(data.items || [])
      setTotal(data.total || 0)
    } catch (err) {
      console.error('加载历史记录失败:', err)
    } finally {
      setLoading(false)
    }
  }

  const totalPages = Math.ceil(total / pageSize)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">创作历史</h1>
          <p className="text-gray-500 mt-1">
            {demoMode ? (
              <span className="flex items-center gap-1">
                <Monitor className="w-4 h-4" /> Demo 模式 — 展示一条样例记录
              </span>
            ) : (
              `共 ${total} 篇小说`
            )}
          </p>
        </div>
        <button
          onClick={() => navigate('/')}
          className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg text-sm transition-colors"
        >
          创作新小说
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-40">
          <div className="w-6 h-6 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : novels.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-16 text-center text-gray-400">
          <div className="text-5xl mb-4">📖</div>
          <p className="text-lg">还没有创作过小说</p>
          <button
            onClick={() => navigate('/')}
            className="mt-4 text-orange-500 hover:underline"
          >
            开始你的第一篇创作
          </button>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {novels.map((n) => (
              <NovelCard key={n.id} novel={n} />
            ))}
          </div>

          {/* 分页 */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="px-3 py-1.5 text-sm border rounded-lg disabled:opacity-30 hover:bg-gray-50"
              >
                上一页
              </button>
              <span className="text-sm text-gray-500">
                {page} / {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="px-3 py-1.5 text-sm border rounded-lg disabled:opacity-30 hover:bg-gray-50"
              >
                下一页
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
