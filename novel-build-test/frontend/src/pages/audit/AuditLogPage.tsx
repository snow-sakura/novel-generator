import { useState, useEffect } from 'react'
import { Search, Filter, Loader2, Eye, ChevronLeft, ChevronRight } from 'lucide-react'
import { auditApi, type AuditLogItem } from '@/lib/api-service'

const ACTION_LABELS: Record<string, string> = {
  create: '创建',
  update: '更新',
  delete: '删除',
  login: '登录',
  export: '导出',
}

const ACTION_COLORS: Record<string, string> = {
  create: 'bg-emerald-50 text-emerald-600',
  update: 'bg-blue-50 text-blue-600',
  delete: 'bg-red-50 text-red-600',
  login: 'bg-purple-50 text-purple-600',
  export: 'bg-amber-50 text-amber-600',
}

const ENTITY_TYPES = [
  { value: '', label: '全部类型' },
  { value: 'user', label: '用户' },
  { value: 'project', label: '项目' },
  { value: 'requirement', label: '需求' },
  { value: 'environment', label: '环境' },
  { value: 'asset', label: '资产' },
  { value: 'knowledge', label: '知识库' },
  { value: 'setting', label: '设置' },
]

export default function AuditLogPage() {
  const [logs, setLogs] = useState<AuditLogItem[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [entityType, setEntityType] = useState('')
  const [entityId, setEntityId] = useState('')
  const [selectedLog, setSelectedLog] = useState<AuditLogItem | null>(null)

  const fetchLogs = async () => {
    setLoading(true)
    try {
      const params: Record<string, unknown> = { page, page_size: 20 }
      if (entityType) params.entity_type = entityType
      if (entityId) params.entity_id = parseInt(entityId)
      const res = await auditApi.list(params as { page?: number; page_size?: number; entity_type?: string; entity_id?: number })
      setLogs(res.data.items)
      setTotal(res.data.total)
    } catch (err) {
      console.error('Failed to fetch audit logs:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchLogs()
  }, [page, entityType])

  const handleSearchEntityId = () => {
    setPage(1)
    fetchLogs()
  }

  const totalPages = Math.ceil(total / 20)

  return (
    <div className="space-y-4">
      {/* 标题栏 */}
      <div>
        <h2 className="text-lg font-semibold" style={{ color: 'var(--polaroid-text)' }}>审计日志</h2>
        <p className="text-sm" style={{ color: 'var(--polaroid-text-muted)' }}>查看系统操作记录与实体轨迹追踪</p>
      </div>

      {/* 筛选栏 */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-xs">
          <Filter className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: 'var(--polaroid-text-muted)' }} />
          <select value={entityType} onChange={(e) => { setEntityType(e.target.value); setPage(1) }}
            className="w-full rounded-lg border bg-white pl-10 pr-4 py-2.5 text-sm outline-none appearance-none cursor-pointer focus:border-[var(--amber-primary)]"
            style={{ borderColor: 'var(--polaroid-border)' }}>
            {ENTITY_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </div>
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: 'var(--polaroid-text-muted)' }} />
          <input value={entityId} onChange={(e) => setEntityId(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearchEntityId()}
            placeholder="实体ID..."
            className="w-full rounded-lg border bg-white pl-10 pr-4 py-2.5 text-sm outline-none focus:border-[var(--amber-primary)]"
            style={{ borderColor: 'var(--polaroid-border)' }} />
        </div>
        <button onClick={handleSearchEntityId}
          className="rounded-lg px-4 py-2.5 text-sm text-white transition-opacity hover:opacity-90"
          style={{ backgroundColor: 'var(--amber-primary)' }}>
          搜索
        </button>
      </div>

      {/* 日志表格 */}
      <div className="rounded-xl border overflow-hidden" style={{ borderColor: 'var(--polaroid-border)' }}>
        <table className="w-full text-sm">
          <thead>
            <tr style={{ backgroundColor: 'var(--polaroid-warm)' }}>
              <th className="px-4 py-3 text-left font-medium" style={{ color: 'var(--polaroid-text)' }}>操作</th>
              <th className="px-4 py-3 text-left font-medium" style={{ color: 'var(--polaroid-text)' }}>实体</th>
              <th className="px-4 py-3 text-left font-medium" style={{ color: 'var(--polaroid-text)' }}>操作人</th>
              <th className="px-4 py-3 text-left font-medium" style={{ color: 'var(--polaroid-text)' }}>详情</th>
              <th className="px-4 py-3 text-left font-medium" style={{ color: 'var(--polaroid-text)' }}>IP</th>
              <th className="px-4 py-3 text-left font-medium" style={{ color: 'var(--polaroid-text)' }}>时间</th>
              <th className="px-4 py-3 text-right font-medium" style={{ color: 'var(--polaroid-text)' }}>操作</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} className="px-4 py-12 text-center">
                  <Loader2 className="h-6 w-6 animate-spin mx-auto" style={{ color: 'var(--amber-primary)' }} />
                </td>
              </tr>
            ) : logs.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-12 text-center" style={{ color: 'var(--polaroid-text-muted)' }}>
                  暂无日志数据
                </td>
              </tr>
            ) : (
              logs.map((log) => (
                <tr key={log.id} className="border-t hover:bg-gray-50/50" style={{ borderColor: 'var(--polaroid-border)' }}>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${ACTION_COLORS[log.action] || 'bg-gray-100 text-gray-600'}`}>
                      {ACTION_LABELS[log.action] || log.action}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-sm" style={{ color: 'var(--polaroid-text)' }}>{log.entity_type}</span>
                    <span className="text-xs ml-1" style={{ color: 'var(--polaroid-text-muted)' }}>#{log.entity_id}</span>
                  </td>
                  <td className="px-4 py-3 text-sm" style={{ color: 'var(--polaroid-text)' }}>{log.actor}</td>
                  <td className="px-4 py-3 text-sm max-w-[200px] truncate" style={{ color: 'var(--polaroid-text-muted)' }}>{log.detail}</td>
                  <td className="px-4 py-3 text-xs" style={{ color: 'var(--polaroid-text-muted)' }}>{log.ip_address || '-'}</td>
                  <td className="px-4 py-3 text-xs" style={{ color: 'var(--polaroid-text-muted)' }}>
                    {new Date(log.created_at).toLocaleString('zh-CN')}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => setSelectedLog(log)} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
                      <Eye className="h-4 w-4" style={{ color: 'var(--polaroid-text-muted)' }} />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* 分页 */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm" style={{ color: 'var(--polaroid-text-muted)' }}>
            共 {total} 条记录
          </p>
          <div className="flex items-center gap-2">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
              className="p-2 rounded-lg border disabled:opacity-50 hover:bg-gray-50"
              style={{ borderColor: 'var(--polaroid-border)' }}>
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="text-sm px-2" style={{ color: 'var(--polaroid-text)' }}>
              {page} / {totalPages}
            </span>
            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
              className="p-2 rounded-lg border disabled:opacity-50 hover:bg-gray-50"
              style={{ borderColor: 'var(--polaroid-border)' }}>
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* 详情弹窗 */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setSelectedLog(null)}>
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}
            style={{ border: '1px solid var(--polaroid-border)' }}>
            <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--polaroid-text)' }}>日志详情</h3>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span style={{ color: 'var(--polaroid-text-muted)' }}>操作类型</span>
                <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${ACTION_COLORS[selectedLog.action] || 'bg-gray-100 text-gray-600'}`}>
                  {ACTION_LABELS[selectedLog.action] || selectedLog.action}
                </span>
              </div>
              <div className="flex justify-between">
                <span style={{ color: 'var(--polaroid-text-muted)' }}>实体类型</span>
                <span style={{ color: 'var(--polaroid-text)' }}>{selectedLog.entity_type}</span>
              </div>
              <div className="flex justify-between">
                <span style={{ color: 'var(--polaroid-text-muted)' }}>实体ID</span>
                <span style={{ color: 'var(--polaroid-text)' }}>{selectedLog.entity_id}</span>
              </div>
              <div className="flex justify-between">
                <span style={{ color: 'var(--polaroid-text-muted)' }}>操作人</span>
                <span style={{ color: 'var(--polaroid-text)' }}>{selectedLog.actor}</span>
              </div>
              <div className="flex justify-between">
                <span style={{ color: 'var(--polaroid-text-muted)' }}>IP地址</span>
                <span style={{ color: 'var(--polaroid-text)' }}>{selectedLog.ip_address || '-'}</span>
              </div>
              <div className="flex justify-between">
                <span style={{ color: 'var(--polaroid-text-muted)' }}>时间</span>
                <span style={{ color: 'var(--polaroid-text)' }}>{new Date(selectedLog.created_at).toLocaleString('zh-CN')}</span>
              </div>
              <div className="pt-2 border-t" style={{ borderColor: 'var(--polaroid-border)' }}>
                <p className="mb-1" style={{ color: 'var(--polaroid-text-muted)' }}>详情</p>
                <p className="p-3 rounded-lg bg-gray-50 text-sm" style={{ color: 'var(--polaroid-text)' }}>{selectedLog.detail}</p>
              </div>
            </div>
            <div className="flex justify-end mt-6">
              <button onClick={() => setSelectedLog(null)}
                className="rounded-lg px-4 py-2 text-sm border transition-colors hover:bg-gray-50"
                style={{ borderColor: 'var(--polaroid-border)', color: 'var(--polaroid-text-muted)' }}>关闭</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
