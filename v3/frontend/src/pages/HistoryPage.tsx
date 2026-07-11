import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Monitor, RefreshCw, CheckCircle, XCircle, Loader2, ExternalLink, Trash2, StopCircle, Plus, BookOpen, Clock, ArrowRight, Sparkles, RotateCcw, BarChart3, Search, Filter } from 'lucide-react'
import { fetchCompletedNovels, fetchRecords, fetchRecordStatus, deleteRecord, cleanupData, isGitHubPages } from '../services/api'
import NovelCard from '../components/NovelCard'
import { cn, toast } from '../lib/utils'

const STATUS_CONFIG = {
  in_progress: { icon: Loader2, color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-200', label: '生成中', dot: 'bg-blue-500' },
  completed: { icon: CheckCircle, color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-200', label: '已完成', dot: 'bg-emerald-500' },
  failed: { icon: XCircle, color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-200', label: '已失败', dot: 'bg-red-500' },
  cancelled: { icon: StopCircle, color: 'text-orange-600', bg: 'bg-orange-50', border: 'border-orange-200', label: '已停止', dot: 'bg-orange-500' },
}

function Pagination({ page, totalPages, onChange }) {
  if (totalPages <= 1) return null
  return (
    <div className="flex items-center justify-center gap-1.5 mt-6">
      {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
        <button key={p} onClick={() => onChange(p)}
          className={cn(
            'w-8 h-8 rounded-lg text-xs font-medium transition-all',
            p === page ? 'gradient-brand text-white shadow-sm' : 'bg-white text-gray-500 border border-gray-200 hover:border-orange-300'
          )}>
          {p}
        </button>
      ))}
    </div>
  )
}

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
  const pollingRef = useRef(null)
  const [pollingRecords, setPollingRecords] = useState({})
  const [deletingIds, setDeletingIds] = useState(new Set())

  const syncUrl = useCallback((t, p) => {
    setSearchParams({ tab: t, page: String(p) }, { replace: true })
  }, [setSearchParams])

  useEffect(() => { loadData() }, [page, tab])

  useEffect(() => {
    const inProgressIds = records.filter(r => r.status === 'in_progress').map(r => r.id)
    if (inProgressIds.length > 0) {
      pollingRef.current = setInterval(async () => {
        for (const id of inProgressIds) {
          const status = await fetchRecordStatus(id)
          if (status) {
            setPollingRecords(prev => ({ ...prev, [id]: status }))
            if (status.status !== 'in_progress') loadData()
          }
        }
      }, 3000)
    }
    return () => { if (pollingRef.current) clearInterval(pollingRef.current) }
  }, [records])

  function handleTabChange(t) {
    setTab(t); setPage(1); syncUrl(t, 1)
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
    } finally { setLoading(false) }
  }

  async function handleDeleteRecord(id) {
    if (!window.confirm('确定删除此生成记录？')) return
    setDeletingIds(prev => new Set([...prev, id]))
    try {
      await deleteRecord(id)
      setRecords(prev => prev.filter(r => r.id !== id))
      setRecordTotal(prev => prev - 1)
      toast.success('已删除记录')
    } catch (err) { toast.error('删除失败: ' + err.message) }
    finally { setDeletingIds(prev => { const next = new Set(prev); next.delete(id); return next }) }
  }

  async function handleCleanup() {
    if (!window.confirm('将清理孤立的生成记录和无效数据，是否继续？')) return
    try {
      const result = await cleanupData()
      if (result) {
        const cleaned = (result as Record<string, any>)?.cleaned || {}
        toast.success(`清理完成：${cleaned.orphaned_records || 0} 条孤立记录、${cleaned.orphaned_novels || 0} 部无效小说`)
        loadData()
      }
    } catch (err) { toast.error('清理失败: ' + err.message) }
  }

  const novelTotalPages = Math.ceil(novelTotal / pageSize)
  const recordTotalPages = Math.ceil(recordTotal / 20)

  function getFailureStep(errMsg) {
    if (!errMsg) return ''
    const m = errMsg.match(/^\[(\w+)\]/)
    if (m) {
      const stepMap = { parsing: '要素分析', outlining: '大纲规划', writing: '逐章生成', titling: '生成标题' }
      return stepMap[m[1]] || m[1]
    }
    return ''
  }

  function getMergedRecord(r) {
    const polled = pollingRecords[r.id]
    if (polled) return { ...r, completed_chapters: polled.completed_chapters, total_chapters: polled.total_chapters, status: polled.status }
    return r
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl gradient-brand flex items-center justify-center shadow-sm">
              <Clock className="w-4 h-4 text-white" />
            </div>
            创作历史
          </h1>
          <p className="text-sm text-gray-500 mt-1 ml-10">
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
              className="flex items-center gap-1.5 px-3.5 py-2 bg-white border border-gray-200 hover:bg-gray-50 hover:border-gray-300 text-gray-600 rounded-xl text-sm transition-all duration-150">
              <RotateCcw className="w-4 h-4" />
              清理数据
            </button>
          )}
          <button onClick={() => navigate('/')}
            className="flex items-center gap-1.5 px-4 py-2 gradient-brand text-white rounded-xl text-sm font-medium hover:shadow-md transition-all duration-150 shadow-sm">
            <Plus className="w-4 h-4" />
            新创作
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-200">
        {[
          { key: 'novels', label: '已完成小说', count: novelTotal, icon: BookOpen },
          { key: 'records', label: '生成记录', count: recordTotal, icon: BarChart3 },
        ].map(t => {
          const Icon = t.icon
          const active = tab === t.key
          return (
            <button key={t.key} onClick={() => handleTabChange(t.key)}
              className={cn(
                'flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium transition-colors -mb-px',
                active
                  ? 'text-orange-600 border-b-2 border-orange-500'
                  : 'text-gray-500 border-b-2 border-transparent hover:text-gray-700'
              )}>
              <Icon className="w-4 h-4" />
              {t.label}
              {!demoMode && <span className="text-xs opacity-60">({t.count})</span>}
            </button>
          )
        })}
      </div>

      {/* 内容 */}
      {loading ? (
        <div className="flex items-center justify-center h-60">
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-[3px] border-orange-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-gray-400 animate-pulse-soft">加载中...</p>
          </div>
        </div>
      ) : tab === 'novels' ? (
        novels.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-16 text-center shadow-sm">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-orange-100 to-rose-100 flex items-center justify-center mx-auto mb-5">
              <BookOpen className="w-9 h-9 text-orange-400" />
            </div>
            <p className="text-lg text-gray-400 font-medium">还没有创作过小说</p>
            <p className="text-sm text-gray-300 mt-1">点击下方按钮开始你的第一篇创作</p>
            <button onClick={() => navigate('/')} className="mt-5 inline-flex items-center gap-1.5 text-sm font-medium text-orange-500 hover:text-orange-700 bg-orange-50 px-4 py-2 rounded-full border border-orange-200 transition-all hover:shadow-sm">
              开始创作 <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {novels.map((n, i) => <NovelCard key={n.id} novel={n} index={i} />)}
            </div>
            <Pagination page={page} totalPages={novelTotalPages} onChange={(p) => { setPage(p); syncUrl(tab, p) }} />
          </>
        )
      ) : (
        records.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-16 text-center shadow-sm">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-gray-100 to-gray-50 flex items-center justify-center mx-auto mb-5">
              <BarChart3 className="w-9 h-9 text-gray-300" />
            </div>
            <p className="text-lg text-gray-400 font-medium">暂无生成记录</p>
            <p className="text-sm text-gray-300 mt-1">每次生成小说都会在这里留下记录</p>
          </div>
        ) : (
          <div className="space-y-2">
            {records.map((r, idx) => {
              const merged = getMergedRecord(r)
              const sc = STATUS_CONFIG[merged.status] || STATUS_CONFIG.failed
              const Icon = sc.icon
              const isInProgress = merged.status === 'in_progress'
              const failureStep = getFailureStep(merged.error_message)
              const progressPct = merged.total_chapters > 0
                ? Math.round((merged.completed_chapters / merged.total_chapters) * 100)
                : 0
              const isDeleting = deletingIds.has(r.id)

              return (
                <div key={r.id} className={cn(
                  'bg-white rounded-xl border p-4 transition-all duration-150 animate-fade-in-up card-hover-sm',
                  sc.border,
                  isInProgress && 'ring-1 ring-blue-200'
                )}
                  style={{ animationDelay: `${idx * 30}ms` }}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                        <span className={cn('inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium border', sc.bg, sc.color)}>
                          <Icon className={cn('w-3 h-3', isInProgress && 'animate-spin')} />
                          {sc.label}
                        </span>
                        {merged.completed_chapters > 0 && (
                          <span className="text-xs text-gray-500 font-mono">
                            {merged.completed_chapters}/{merged.total_chapters} 章
                          </span>
                        )}
                        {failureStep && (
                          <span className="text-[10px] text-red-500 bg-red-50 px-1.5 py-0.5 rounded border border-red-200">
                            {failureStep}失败
                          </span>
                        )}
                      </div>

                      {isInProgress && merged.total_chapters > 0 && (
                        <div className="w-full h-1.5 bg-gray-100 rounded-full mb-2 overflow-hidden">
                          <div className="h-full gradient-brand rounded-full transition-all duration-500"
                            style={{ width: `${progressPct}%` }} />
                        </div>
                      )}

                      {merged.params && typeof merged.params === 'string' && (
                        <p className="text-xs text-gray-500 truncate">
                          {(() => {
                            try {
                              const p = JSON.parse(merged.params)
                              return [p.gender, p.genre, p.style].filter(Boolean).join(' · ') || '未知参数'
                            } catch { return merged.params.slice(0, 60) }
                          })()}
                        </p>
                      )}

                      {merged.error_message && (
                        <p className="text-[11px] text-red-500 mt-1 truncate">{merged.error_message}</p>
                      )}

                      {merged.created_at && (
                        <p className="text-[10px] text-gray-400 mt-1 font-mono">
                          {new Date(merged.created_at).toLocaleString('zh-CN')}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      {merged.status === 'completed' && merged.novel_id && (
                        <button onClick={() => navigate(`/novel/${merged.novel_id}`)}
                          className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium gradient-brand text-white rounded-lg hover:shadow-sm transition-all">
                          <ExternalLink className="w-3 h-3" /> 查看
                        </button>
                      )}
                      {(merged.status === 'failed' || merged.status === 'cancelled') && (
                        <button onClick={() => navigate(`/?continue=true&record_id=${merged.id}`)}
                          className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-orange-600 bg-orange-50 border border-orange-200 rounded-lg hover:bg-orange-100 transition-all">
                          <RefreshCw className="w-3 h-3" /> 继续
                        </button>
                      )}
                      {isInProgress && (
                        <button onClick={() => navigate(`/?continue=true&record_id=${merged.id}`)}
                          className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-blue-600 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-all">
                          <Loader2 className="w-3 h-3 animate-spin" /> 查看
                        </button>
                      )}
                      <button onClick={() => handleDeleteRecord(r.id)} disabled={isDeleting}
                        className="p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all">
                        {isDeleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
            <Pagination page={page} totalPages={recordTotalPages} onChange={(p) => { setPage(p); syncUrl(tab, p) }} />
          </div>
        )
      )}
    </div>
  )
}