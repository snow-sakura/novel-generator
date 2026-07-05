import { useState, useEffect, useCallback } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Clock, BookOpen, Monitor, RefreshCw, CheckCircle, XCircle, Loader2, AlertTriangle, ExternalLink, Trash2, Download } from 'lucide-react'
import { fetchCompletedNovels, fetchRecords, deleteRecord, isGitHubPages } from '../services/api'
import NovelCard from '../components/NovelCard'
import { cn } from '../lib/utils'

export default function HistoryPage() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()

  // 从 URL 参数恢复状态
  const initialTab = searchParams.get('tab') || 'novels'
  const initialPage = parseInt(searchParams.get('page') || '1', 10)

  const [novels, setNovels] = useState([])
  const [records, setRecords] = useState([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(initialPage)
  const [novelTotal, setNovelTotal] = useState(0)
  const [recordTotal, setRecordTotal] = useState(0)
  const [tab, setTab] = useState(initialTab)
  const demoMode = isGitHubPages()
  const pageSize = 12

  // 同步状态到 URL
  const syncUrl = useCallback((t, p) => {
    setSearchParams({ tab: t, page: String(p) }, { replace: true })
  }, [setSearchParams])

  useEffect(() => { loadData() }, [page, tab])

  const handleTabChange = (t) => {
    setTab(t)
    setPage(1)
    syncUrl(t, 1)
  }

  async function loadData() {
    setLoading(true)
    try {
      // 始终同时加载两个计数，确保 tab 切换时另一个计数不归零
      if (tab === 'novels') {
        const [data, recData] = await Promise.all([
          fetchCompletedNovels(page, pageSize),
          fetchRecords(1, 1),
        ])
        setNovels(data.items || [])
        setNovelTotal(data.total || 0)
        setRecordTotal(recData.total || 0)
      } else {
        const [recData, novelData] = await Promise.all([
          fetchRecords(page, 20),
          fetchCompletedNovels(1, 12),
        ])
        setRecords(recData.items || [])
        setRecordTotal(recData.total || 0)
        setNovelTotal(novelData.total || 0)
      }
    } catch (err) {
      console.error('加载失败:', err)
    } finally {
      setLoading(false)
    }
  }

  const handlePageChange = (p) => {
    setPage(p)
    syncUrl(tab, p)
  }

  async function handleDeleteRecord(id) {
    if (!window.confirm('确定删除此生成记录？')) return
    try {
      await deleteRecord(id)
      setRecords(prev => prev.filter(r => r.id !== id))
      setRecordTotal(prev => prev - 1)
    } catch (err) {
      alert('删除失败: ' + err.message)
    }
  }

  const novelTotalPages = Math.ceil(novelTotal / pageSize)
  const recordTotalPages = Math.ceil(recordTotal / 20)

  const statusIcons = {
    in_progress: { icon: Loader2, color: 'text-blue-500', bg: 'bg-blue-50', label: '生成中' },
    completed: { icon: CheckCircle, color: 'text-green-500', bg: 'bg-green-50', label: '已完成' },
    failed: { icon: XCircle, color: 'text-red-500', bg: 'bg-red-50', label: '失败' },
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">创作历史</h1>
          <p className="text-gray-500 mt-1 text-sm">
            {demoMode ? (
              <span className="flex items-center gap-1"><Monitor className="w-4 h-4" /> Demo 模式</span>
            ) : (
              `已完成 ${novelTotal} 部 · 共 ${recordTotal} 条生成记录`
            )}
          </p>
        </div>
        <button onClick={() => navigate('/')}
          className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg text-sm transition-colors">
          创作新小说
        </button>
      </div>

      <div className="flex gap-1 border-b border-gray-200">
        {[
          { key: 'novels', label: '已完成小说', count: novelTotal },
          { key: 'records', label: '生成记录', count: recordTotal },
        ].map(t => (
          <button key={t.key} onClick={() => handleTabChange(t.key)}
            className={cn(
              'px-4 py-2 text-sm font-medium border-b-2 transition-colors -mb-px',
              tab === t.key
                ? 'text-orange-600 border-orange-500'
                : 'text-gray-500 border-transparent hover:text-gray-700'
            )}>
            {t.label}
            {!demoMode && <span className="ml-1.5 text-xs opacity-60">({t.count})</span>}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-40">
          <div className="w-6 h-6 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : tab === 'novels' ? (
        novels.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-16 text-center text-gray-400">
            <div className="text-5xl mb-4">📖</div>
            <p className="text-lg">还没有创作过小说</p>
            <button onClick={() => navigate('/')} className="mt-4 text-orange-500 hover:underline">开始你的第一篇创作</button>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {novels.map(n => <NovelCard key={n.id} novel={n} />)}
            </div>
            {novelTotalPages > 1 && (
              <Pagination page={page} totalPages={novelTotalPages} onChange={handlePageChange} />
            )}
          </>
        )
      ) : (
        records.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-16 text-center text-gray-400">
            <div className="text-5xl mb-4">📋</div>
            <p className="text-lg">暂无生成记录</p>
          </div>
        ) : (
          <div className="space-y-3">
            {records.map(r => {
              const st = statusIcons[r.status] || statusIcons.failed
              const Icon = st.icon
              return (
                <div key={r.id} className={cn('bg-white rounded-xl border p-4 transition-all hover:shadow-sm', st.bg + '/30')}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium', st.bg, st.color)}>
                          <Icon className={cn('w-3 h-3', r.status === 'in_progress' && 'animate-spin')} />
                          {st.label}
                        </span>
                        {r.completed_chapters > 0 && (
                          <span className="text-xs text-gray-500">
                            进度 {r.completed_chapters}/{r.total_chapters} 章
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-700 truncate">{r.seed_text || '未知种子'}</p>
                      <p className="text-xs text-gray-400 mt-1">
                        {new Date(r.created_at).toLocaleString('zh-CN')}
                      </p>
                      {r.error_message && (
                        <p className="text-xs text-red-500 mt-1 truncate">{r.error_message}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      {r.status === 'completed' && r.novel_id && (
                        <button onClick={() => navigate(`/novel/${r.novel_id}`)}
                          className="flex items-center gap-1 px-2.5 py-1.5 text-xs bg-green-50 text-green-700 border border-green-200 rounded-lg hover:bg-green-100 transition-colors">
                          <ExternalLink className="w-3 h-3" /> 查看
                        </button>
                      )}
                      {r.status === 'failed' && (
                        <button onClick={() => navigate(`/?continue=true&record_id=${r.id}`)}
                          className="flex items-center gap-1 px-2.5 py-1.5 text-xs bg-orange-50 text-orange-700 border border-orange-200 rounded-lg hover:bg-orange-100 transition-colors">
                          <RefreshCw className="w-3 h-3" /> 继续生成
                        </button>
                      )}
                      {r.status === 'in_progress' && (
                        <span className="text-xs text-gray-400 flex items-center gap-1">
                          <Loader2 className="w-3 h-3 animate-spin" /> 生成中...
                        </span>
                      )}
                      <button onClick={() => handleDeleteRecord(r.id)}
                        className="p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
            {recordTotalPages > 1 && (
              <Pagination page={page} totalPages={recordTotalPages} onChange={handlePageChange} />
            )}
          </div>
        )
      )}
    </div>
  )
}

function Pagination({ page, totalPages, onChange }) {
  return (
    <div className="flex items-center justify-center gap-2">
      <button onClick={() => onChange(Math.max(1, page - 1))} disabled={page <= 1}
        className="px-3 py-1.5 text-sm border rounded-lg disabled:opacity-30 hover:bg-gray-50">上一页</button>
      <span className="text-sm text-gray-500">{page} / {totalPages}</span>
      <button onClick={() => onChange(Math.min(totalPages, page + 1))} disabled={page >= totalPages}
        className="px-3 py-1.5 text-sm border rounded-lg disabled:opacity-30 hover:bg-gray-50">下一页</button>
    </div>
  )
}
