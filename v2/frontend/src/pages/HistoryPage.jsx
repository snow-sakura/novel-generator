import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Monitor, RefreshCw, CheckCircle, XCircle, Loader2, ExternalLink, Trash2, StopCircle } from 'lucide-react'
import { fetchCompletedNovels, fetchRecords, fetchRecordStatus, deleteRecord, cleanupData, isGitHubPages } from '../services/api'
import NovelCard from '../components/NovelCard'
import { cn } from '../lib/utils'

export default function HistoryPage() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()

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

  // 轮询 in_progress 记录
  const pollingRef = useRef(null)
  const [pollingRecords, setPollingRecords] = useState({})

  const syncUrl = useCallback((t, p) => {
    setSearchParams({ tab: t, page: String(p) }, { replace: true })
  }, [setSearchParams])

  useEffect(() => { loadData() }, [page, tab])

  useEffect(() => {
    // 开始轮询 in_progress 记录
    const inProgressIds = records.filter(r => r.status === 'in_progress').map(r => r.id)
    if (inProgressIds.length > 0) {
      pollingRef.current = setInterval(async () => {
        for (const id of inProgressIds) {
          const status = await fetchRecordStatus(id)
          if (status) {
            setPollingRecords(prev => ({ ...prev, [id]: status }))
            // 如果状态变为非 in_progress，刷新列表
            if (status.status !== 'in_progress') {
              loadData()
            }
          }
        }
      }, 3000)
    }
    return () => { if (pollingRef.current) clearInterval(pollingRef.current) }
  }, [records])

  const handleTabChange = (t) => {
    setTab(t)
    setPage(1)
    syncUrl(t, 1)
  }

  async function loadData() {
    setLoading(true)
    try {
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

  async function handleCleanup() {
    if (!window.confirm('将清理孤立的生成记录和无效数据，是否继续？')) return
    try {
      const result = await cleanupData()
      if (result) {
        alert(`清理完成：${result.cleaned.orphaned_records} 条孤立记录、${result.cleaned.orphaned_novels} 部无效小说已清理`)
        loadData()
      }
    } catch (err) {
      alert('清理失败: ' + err.message)
    }
  }

  const novelTotalPages = Math.ceil(novelTotal / pageSize)
  const recordTotalPages = Math.ceil(recordTotal / 20)

  const STATUS_CONFIG = {
    in_progress: { icon: Loader2, color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-200', label: '生成中' },
    completed: { icon: CheckCircle, color: 'text-green-600', bg: 'bg-green-50', border: 'border-green-200', label: '已完成' },
    failed: { icon: XCircle, color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-200', label: '已失败' },
    cancelled: { icon: StopCircle, color: 'text-orange-600', bg: 'bg-orange-50', border: 'border-orange-200', label: '已停止' },
  }

  function getStatusConfig(r) {
    return STATUS_CONFIG[r.status] || STATUS_CONFIG.failed
  }

  function getFailureStep(errorMessage) {
    if (!errorMessage) return ''
    const match = errorMessage.match(/^\[(\w+)\]/)
    if (match) {
      const stepMap = { parsing: '要素分析', outlining: '大纲规划', writing: '逐章生成', titling: '生成标题' }
      return stepMap[match[1]] || match[1]
    }
    return ''
  }

  // 将 polling 状态合并到 records
  function getMergedRecord(r) {
    const polled = pollingRecords[r.id]
    if (polled) {
      return { ...r, completed_chapters: polled.completed_chapters, total_chapters: polled.total_chapters, status: polled.status }
    }
    return r
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
        <div className="flex gap-2">
          {!demoMode && (
            <button onClick={handleCleanup}
              className="px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-lg text-sm transition-colors flex items-center gap-1.5">
              <RefreshCw className="w-4 h-4" />
              清理无效数据
            </button>
          )}
          <button onClick={() => navigate('/')}
            className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg text-sm transition-colors">
            创作新小说
          </button>
        </div>
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
              const merged = getMergedRecord(r)
              const sc = getStatusConfig(merged)
              const Icon = sc.icon
              const isInProgress = merged.status === 'in_progress'
              const failureStep = getFailureStep(merged.error_message)
              const progressPct = merged.total_chapters > 0
                ? Math.round((merged.completed_chapters / merged.total_chapters) * 100)
                : 0

              return (
                <div key={r.id} className={cn('bg-white rounded-xl border p-4 transition-all hover:shadow-sm', sc.border)}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      {/* 状态徽章 */}
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className={cn('inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium', sc.bg, sc.color)}>
                          <Icon className={cn('w-3 h-3', isInProgress && 'animate-spin')} />
                          {sc.label}
                        </span>
                        {merged.completed_chapters > 0 && (
                          <span className="text-xs text-gray-500">
                            {merged.completed_chapters}/{merged.total_chapters} 章
                          </span>
                        )}
                        {failureStep && (
                          <span className="text-[10px] text-red-400 bg-red-50 px-1.5 py-0.5 rounded">
                            {failureStep}阶段失败
                          </span>
                        )}
                      </div>

                      {/* 进度条（in_progress） */}
                      {isInProgress && merged.total_chapters > 0 && (
                        <div className="w-full h-1.5 bg-gray-100 rounded-full mb-2 overflow-hidden">
                          <div className="h-full bg-gradient-to-r from-orange-400 to-rose-400 rounded-full transition-all duration-500"
                            style={{ width: `${progressPct}%` }} />
                        </div>
                      )}

                      <p className="text-sm text-gray-700 truncate">{merged.seed_text || '未知种子'}</p>
                      <p className="text-xs text-gray-400 mt-1">
                        {new Date(merged.created_at).toLocaleString('zh-CN')}
                      </p>
                      {merged.error_message && (
                        <p className="text-xs text-red-500 mt-1 truncate">{merged.error_message.replace(/^\[\w+\]\s*/, '')}</p>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      {merged.status === 'completed' && merged.novel_id && (
                        <button onClick={() => navigate(`/novel/${merged.novel_id}`)}
                          className="flex items-center gap-1 px-2.5 py-1.5 text-xs bg-green-50 text-green-700 border border-green-200 rounded-lg hover:bg-green-100 transition-colors">
                          <ExternalLink className="w-3 h-3" /> 查看
                        </button>
                      )}
                      {(merged.status === 'failed' || merged.status === 'cancelled') && (
                        <button onClick={() => navigate(`/?continue=true&record_id=${merged.id}`)}
                          className="flex items-center gap-1 px-2.5 py-1.5 text-xs bg-orange-50 text-orange-700 border border-orange-200 rounded-lg hover:bg-orange-100 transition-colors">
                          <RefreshCw className="w-3 h-3" /> 继续
                        </button>
                      )}
                      {isInProgress && (
                        <button onClick={() => navigate(`/?continue=true&record_id=${merged.id}`)}
                          className="flex items-center gap-1 px-2.5 py-1.5 text-xs bg-blue-50 text-blue-700 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors">
                          <ExternalLink className="w-3 h-3" /> 查看进度
                        </button>
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
