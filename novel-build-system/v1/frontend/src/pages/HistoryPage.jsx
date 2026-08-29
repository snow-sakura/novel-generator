import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Clock, BookOpen, Monitor, RefreshCw, CheckCircle, XCircle, Loader2, AlertTriangle, ExternalLink, Trash2, Download, StopCircle, Sparkles, Plus } from 'lucide-react'
import { fetchCompletedNovels, fetchRecords, fetchRecordStatus, deleteRecord, cleanupData, isGitHubPages } from '../services/api'
import NovelCard from '../components/NovelCard'
import { cn, toast } from '../lib/utils'
import ConfirmDialog from '../components/ConfirmDialog'

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
  
  // 对话框状态
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [showCleanupConfirm, setShowCleanupConfirm] = useState(false)

  const syncUrl = useCallback((t, p) => {
    setSearchParams({ tab: t, page: String(p) }, { replace: true })
  }, [setSearchParams])

  useEffect(() => { loadData() }, [page, tab])

  useEffect(() => {
    // 开始轮询 in_progress 记录
    const inProgressIds = records.filter(r => r.status === 'in_progress').map(r => r.id)
    if (inProgressIds.length === 0) return

    let isCancelled = false
    pollingRef.current = setInterval(async () => {
      if (isCancelled) return
      for (const id of inProgressIds) {
        const status = await fetchRecordStatus(id)
        if (status && !isCancelled) {
          setPollingRecords(prev => ({ ...prev, [id]: status }))
          // 如果状态变为非 in_progress，刷新列表
          if (status.status !== 'in_progress') {
            loadData()
          }
        }
      }
    }, 3000)

    return () => {
      isCancelled = true
      if (pollingRef.current) clearInterval(pollingRef.current)
    }
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

  function handleDeleteRecord(id) {
    setDeleteTarget(id)
    setShowDeleteConfirm(true)
  }

  async function confirmDeleteRecord() {
    setShowDeleteConfirm(false)
    if (!deleteTarget) return
    try {
      await deleteRecord(deleteTarget)
      setRecords(prev => prev.filter(r => r.id !== deleteTarget))
      setRecordTotal(prev => prev - 1)
    } catch (err) {
      toast.error('删除失败: ' + err.message)
    }
    setDeleteTarget(null)
  }

  function handleCleanup() {
    setShowCleanupConfirm(true)
  }

  async function confirmCleanup() {
    setShowCleanupConfirm(false)
    try {
      const result = await cleanupData()
      if (result) {
        toast.success(`清理完成：${result.cleaned.orphaned_records} 条孤立记录、${result.cleaned.orphaned_novels} 部无效小说已清理`)
        loadData()
      }
    } catch (err) {
      toast.error('清理失败: ' + err.message)
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
    <div className="space-y-5">
      {/* 页面标题 */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900">创作历史</h1>
          <p className="text-gray-500 mt-0.5 text-sm">
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
              className="px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5">
              <RefreshCw className="w-4 h-4" />
              清理数据
            </button>
          )}
          <button onClick={() => navigate('/')}
            className="px-4 py-2 bg-gradient-to-r from-orange-500 to-rose-500 hover:from-orange-600 hover:to-rose-600 text-white rounded-lg text-sm font-semibold transition-all flex items-center gap-1.5 shadow-md hover:shadow-lg">
            <Plus className="w-4 h-4" />
            创作新小说
          </button>
        </div>
      </div>

      {/* Tab 导航 */}
      <div className="flex gap-1.5 p-1.5 bg-gray-100 rounded-xl">
        {[
          { key: 'novels', label: '已完成小说', count: novelTotal, icon: BookOpen },
          { key: 'records', label: '生成记录', count: recordTotal, icon: Clock },
        ].map(t => (
          <button key={t.key} onClick={() => handleTabChange(t.key)}
            className={cn(
              'flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-sm font-semibold transition-all',
              tab === t.key
                ? 'bg-white text-orange-600 shadow-md'
                : 'text-gray-500 hover:text-gray-700 hover:bg-white/50'
            )}>
            <t.icon className="w-4 h-4" />
            {t.label}
            {!demoMode && <span className="text-xs opacity-60">({t.count})</span>}
          </button>
        ))}
      </div>

      {/* 内容区域 */}
      {loading ? (
        <div className="flex items-center justify-center h-48">
          <div className="flex flex-col items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-400 to-rose-500 flex items-center justify-center shadow-md">
              <RefreshCw className="w-5 h-5 text-white animate-spin" />
            </div>
            <p className="text-sm text-gray-400 font-medium">加载中...</p>
          </div>
        </div>
      ) : tab === 'novels' ? (
        novels.length === 0 ? (
          /* 空状态 - 小说列表 */
          <div className="bg-white rounded-xl border border-gray-200 p-12 text-center shadow-sm">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-orange-100 to-rose-100 flex items-center justify-center mx-auto mb-4 shadow-inner">
              <BookOpen className="w-8 h-8 text-orange-500" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">还没有创作过小说</h3>
            <p className="text-sm text-gray-500 mb-6 max-w-sm mx-auto">
              开始你的第一篇创作，AI 将为你生成一部完整的小说
            </p>
            <button onClick={() => navigate('/')}
              className="px-6 py-3 bg-gradient-to-r from-orange-500 to-rose-500 text-white rounded-xl font-semibold hover:from-orange-600 hover:to-rose-600 transition-all shadow-md hover:shadow-lg inline-flex items-center gap-2">
              <Sparkles className="w-4 h-4" />
              开始创作
            </button>
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
          /* 空状态 - 记录列表 */
          <div className="bg-white rounded-xl border border-gray-200 p-12 text-center shadow-sm">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-100 to-purple-100 flex items-center justify-center mx-auto mb-4 shadow-inner">
              <Clock className="w-8 h-8 text-blue-500" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">暂无生成记录</h3>
            <p className="text-sm text-gray-500 mb-6 max-w-sm mx-auto">
              生成记录会在你创作小说时自动创建
            </p>
            <button onClick={() => navigate('/')}
              className="px-6 py-3 bg-gradient-to-r from-orange-500 to-rose-500 text-white rounded-xl font-semibold hover:from-orange-600 hover:to-rose-600 transition-all shadow-md hover:shadow-lg inline-flex items-center gap-2">
              <Sparkles className="w-4 h-4" />
              开始创作
            </button>
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
                <div key={r.id} className={cn('bg-white rounded-xl border p-5 transition-all hover:shadow-md', sc.border)}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      {/* 状态徽章 */}
                      <div className="flex items-center gap-2 mb-2">
                        <span className={cn('inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold', sc.bg, sc.color)}>
                          <Icon className={cn('w-3.5 h-3.5', isInProgress && 'animate-spin')} />
                          {sc.label}
                        </span>
                        {merged.completed_chapters > 0 && (
                          <span className="text-xs text-gray-500 font-medium">
                            {merged.completed_chapters}/{merged.total_chapters} 章
                          </span>
                        )}
                        {failureStep && (
                          <span className="text-[10px] text-red-500 bg-red-50 px-2 py-0.5 rounded-md font-medium">
                            {failureStep}阶段失败
                          </span>
                        )}
                      </div>

                      {/* 进度条（in_progress） */}
                      {isInProgress && merged.total_chapters > 0 && (
                        <div className="w-full h-2 bg-gray-100 rounded-full mb-3 overflow-hidden">
                          <div className="h-full bg-gradient-to-r from-orange-400 to-rose-400 rounded-full transition-all duration-500 shadow-sm"
                            style={{ width: `${progressPct}%` }} />
                        </div>
                      )}

                      <p className="text-sm text-gray-700 truncate font-medium">{merged.seed_text || '未知种子'}</p>
                      <p className="text-xs text-gray-400 mt-1.5">
                        {new Date(merged.created_at).toLocaleString('zh-CN')}
                      </p>
                      {merged.error_message && (
                        <p className="text-xs text-red-500 mt-1.5 truncate">{merged.error_message.replace(/^\[\w+\]\s*/, '')}</p>
                      )}
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">
                      {merged.status === 'completed' && merged.novel_id && (
                        <button onClick={() => navigate(`/novel/${merged.novel_id}`)}
                          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-green-50 text-green-700 border border-green-200 rounded-lg hover:bg-green-100 transition-all shadow-sm hover:shadow-md">
                          <ExternalLink className="w-3.5 h-3.5" /> 查看
                        </button>
                      )}
                      {(merged.status === 'failed' || merged.status === 'cancelled') && (
                        <button onClick={() => navigate(`/?continue=true&record_id=${merged.id}`)}
                          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-orange-50 text-orange-700 border border-orange-200 rounded-lg hover:bg-orange-100 transition-all shadow-sm hover:shadow-md">
                          <RefreshCw className="w-3.5 h-3.5" /> 继续
                        </button>
                      )}
                      {isInProgress && (
                        <button onClick={() => navigate(`/?continue=true&record_id=${merged.id}`)}
                          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200 rounded-lg hover:bg-blue-100 transition-all shadow-sm hover:shadow-md">
                          <ExternalLink className="w-3.5 h-3.5" /> 查看进度
                        </button>
                      )}
                      <button onClick={() => handleDeleteRecord(r.id)}
                        className="p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all">
                        <Trash2 className="w-4 h-4" />
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

      {/* 删除确认对话框 */}
      <ConfirmDialog
        open={showDeleteConfirm}
        onClose={() => { setShowDeleteConfirm(false); setDeleteTarget(null) }}
        onConfirm={confirmDeleteRecord}
        title="确定删除？"
        message="删除后将无法恢复，是否继续？"
        type="danger"
        confirmText="删除"
        cancelText="取消"
        confirmColor="danger"
      />

      {/* 清理确认对话框 */}
      <ConfirmDialog
        open={showCleanupConfirm}
        onClose={() => setShowCleanupConfirm(false)}
        onConfirm={confirmCleanup}
        title="清理数据"
        message="将清理孤立的生成记录和无效数据，是否继续？"
        type="warning"
        confirmText="确认清理"
        cancelText="取消"
        confirmColor="warning"
      />
    </div>
  )
}

function Pagination({ page, totalPages, onChange }) {
  return (
    <div className="flex items-center justify-center gap-2 pt-4">
      <button onClick={() => onChange(Math.max(1, page - 1))} disabled={page <= 1}
        className="px-4 py-2 text-sm font-medium border border-gray-200 rounded-xl disabled:opacity-30 hover:bg-gray-50 transition-all shadow-sm hover:shadow-md">
        上一页
      </button>
      <span className="text-sm text-gray-500 px-3 font-medium">
        {page} / {totalPages}
      </span>
      <button onClick={() => onChange(Math.min(totalPages, page + 1))} disabled={page >= totalPages}
        className="px-4 py-2 text-sm font-medium border border-gray-200 rounded-xl disabled:opacity-30 hover:bg-gray-50 transition-all shadow-sm hover:shadow-md">
        下一页
      </button>
    </div>
  )
}
