import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Search, Edit2, Trash2, Loader2, FileText, X } from 'lucide-react'
import { requirementApi, projectApi, type RequirementItem, type ProjectItem } from '@/lib/api-service'

const PRIORITY_OPTIONS = [
  { value: 'P0', label: 'P0 紧急', color: 'bg-red-50 text-red-600' },
  { value: 'P1', label: 'P1 高', color: 'bg-orange-50 text-orange-600' },
  { value: 'P2', label: 'P2 中', color: 'bg-amber-50 text-amber-600' },
  { value: 'P3', label: 'P3 低', color: 'bg-gray-100 text-gray-500' },
]

const STATUS_OPTIONS = [
  { value: 'draft', label: '草稿', color: 'bg-gray-100 text-gray-500' },
  { value: 'review', label: '评审中', color: 'bg-blue-50 text-blue-600' },
  { value: 'approved', label: '已通过', color: 'bg-green-50 text-green-600' },
  { value: 'implemented', label: '已实现', color: 'bg-purple-50 text-purple-600' },
  { value: 'rejected', label: '已驳回', color: 'bg-red-50 text-red-600' },
]

export default function RequirementsPage() {
  const [requirements, setRequirements] = useState<RequirementItem[]>([])
  const [projects, setProjects] = useState<ProjectItem[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [priorityFilter, setPriorityFilter] = useState('')
  const [projectFilter, setProjectFilter] = useState('')
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [showDialog, setShowDialog] = useState(false)
  const [editReq, setEditReq] = useState<RequirementItem | null>(null)
  const [form, setForm] = useState({
    project_id: '',
    title: '',
    description: '',
    module: '',
    priority: 'P2',
    status: 'draft',
  })
  const [saving, setSaving] = useState(false)

  const fetchRequirements = useCallback(async () => {
    setLoading(true)
    try {
      const params: Record<string, unknown> = { page, page_size: 20 }
      if (search) params.search = search
      if (statusFilter) params.status = statusFilter
      if (priorityFilter) params.priority = priorityFilter
      if (projectFilter) params.project_id = parseInt(projectFilter)
      const res = await requirementApi.list(params as { page?: number; page_size?: number; project_id?: number; status?: string; priority?: string; search?: string })
      setRequirements(res.data.items)
      setTotal(res.data.total)
    } catch (err) {
      console.error('Failed to fetch requirements:', err)
    } finally {
      setLoading(false)
    }
  }, [page, search, statusFilter, priorityFilter, projectFilter])

  const fetchProjects = async () => {
    try {
      const res = await projectApi.list({ page: 1, page_size: 100 })
      setProjects(res.data.items)
    } catch (err) {
      console.error('Failed to fetch projects:', err)
    }
  }

  useEffect(() => {
    fetchRequirements()
  }, [fetchRequirements])

  useEffect(() => {
    fetchProjects()
  }, [])

  const openCreate = () => {
    setEditReq(null)
    setForm({ project_id: projects[0]?.id?.toString() || '', title: '', description: '', module: '', priority: 'P2', status: 'draft' })
    setShowDialog(true)
  }

  const openEdit = (req: RequirementItem) => {
    setEditReq(req)
    setForm({
      project_id: req.project_id.toString(),
      title: req.title,
      description: req.description || '',
      module: req.module || '',
      priority: req.priority,
      status: req.status,
    })
    setShowDialog(true)
  }

  const handleSave = async () => {
    if (!form.title.trim() || !form.project_id) return
    setSaving(true)
    try {
      const data = {
        project_id: parseInt(form.project_id),
        title: form.title,
        description: form.description || undefined,
        module: form.module || undefined,
        priority: form.priority,
      }
      if (editReq) {
        await requirementApi.update(editReq.id, { ...data, status: form.status })
      } else {
        await requirementApi.create(data)
      }
      setShowDialog(false)
      await fetchRequirements()
    } catch (err) {
      console.error('Failed to save requirement:', err)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: number) => {
    if (!window.confirm('确定删除该需求？')) return
    try {
      await requirementApi.delete(id)
      await fetchRequirements()
    } catch (err) {
      console.error('Failed to delete requirement:', err)
    }
  }

  const totalPages = Math.ceil(total / 20)

  return (
    <div className="space-y-4">
      {/* 操作栏 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: 'var(--polaroid-text-muted)' }} />
            <input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1) }}
              placeholder="搜索需求..."
              className="w-48 rounded-lg border bg-white pl-9 pr-3 py-2 text-sm outline-none focus:border-[var(--amber-primary)]"
              style={{ borderColor: 'var(--polaroid-border)' }} />
          </div>
          <select value={projectFilter} onChange={(e) => { setProjectFilter(e.target.value); setPage(1) }}
            className="rounded-lg border bg-white px-3 py-2 text-sm outline-none"
            style={{ borderColor: 'var(--polaroid-border)' }}>
            <option value="">全部项目</option>
            {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1) }}
            className="rounded-lg border bg-white px-3 py-2 text-sm outline-none"
            style={{ borderColor: 'var(--polaroid-border)' }}>
            <option value="">全部状态</option>
            {STATUS_OPTIONS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
          <select value={priorityFilter} onChange={(e) => { setPriorityFilter(e.target.value); setPage(1) }}
            className="rounded-lg border bg-white px-3 py-2 text-sm outline-none"
            style={{ borderColor: 'var(--polaroid-border)' }}>
            <option value="">全部优先级</option>
            {PRIORITY_OPTIONS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
          </select>
        </div>
        <button onClick={openCreate}
          className="flex items-center gap-2 rounded-lg px-4 py-2 text-sm text-white transition-opacity hover:opacity-90"
          style={{ backgroundColor: 'var(--amber-primary)' }}>
          <Plus className="h-4 w-4" /> 新建需求
        </button>
      </div>

      {/* 需求表格 */}
      <div className="rounded-xl border overflow-hidden" style={{ borderColor: 'var(--polaroid-border)' }}>
        <table className="w-full text-sm">
          <thead>
            <tr style={{ backgroundColor: 'var(--polaroid-warm)' }}>
              <th className="px-4 py-3 text-left font-medium" style={{ color: 'var(--polaroid-text)' }}>标题</th>
              <th className="px-4 py-3 text-left font-medium" style={{ color: 'var(--polaroid-text)' }}>模块</th>
              <th className="px-4 py-3 text-left font-medium" style={{ color: 'var(--polaroid-text)' }}>优先级</th>
              <th className="px-4 py-3 text-left font-medium" style={{ color: 'var(--polaroid-text)' }}>状态</th>
              <th className="px-4 py-3 text-left font-medium" style={{ color: 'var(--polaroid-text)' }}>创建时间</th>
              <th className="px-4 py-3 text-right font-medium" style={{ color: 'var(--polaroid-text)' }}>操作</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center">
                  <Loader2 className="h-6 w-6 animate-spin mx-auto" style={{ color: 'var(--amber-primary)' }} />
                </td>
              </tr>
            ) : requirements.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center" style={{ color: 'var(--polaroid-text-muted)' }}>
                  <FileText className="h-12 w-12 mx-auto mb-3 opacity-30" />
                  <p className="text-lg font-medium">暂无需求</p>
                  <p className="text-sm mt-1">点击"新建需求"开始创建</p>
                </td>
              </tr>
            ) : (
              requirements.map((req) => (
                <tr key={req.id} className="border-t hover:bg-gray-50/50" style={{ borderColor: 'var(--polaroid-border)' }}>
                  <td className="px-4 py-3 max-w-[200px] truncate font-medium" style={{ color: 'var(--polaroid-text)' }}>
                    {req.title}
                  </td>
                  <td className="px-4 py-3 text-sm" style={{ color: 'var(--polaroid-text-muted)' }}>
                    {req.module || '—'}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${PRIORITY_OPTIONS.find(p => p.value === req.priority)?.color || ''}`}>
                      {req.priority}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_OPTIONS.find(s => s.value === req.status)?.color || ''}`}>
                      {STATUS_OPTIONS.find(s => s.value === req.status)?.label || req.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs" style={{ color: 'var(--polaroid-text-muted)' }}>
                    {new Date(req.created_at).toLocaleDateString('zh-CN')}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => openEdit(req)} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
                      <Edit2 className="h-4 w-4" style={{ color: 'var(--polaroid-text-muted)' }} />
                    </button>
                    <button onClick={() => handleDelete(req.id)} className="p-1.5 rounded-lg hover:bg-red-50 transition-colors">
                      <Trash2 className="h-4 w-4 text-red-400" />
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
          <p className="text-sm" style={{ color: 'var(--polaroid-text-muted)' }}>共 {total} 条需求</p>
          <div className="flex items-center gap-2">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
              className="rounded-lg px-3 py-1.5 text-sm border disabled:opacity-50"
              style={{ borderColor: 'var(--polaroid-border)' }}>上一页</button>
            <span className="px-3 py-1.5 text-sm" style={{ color: 'var(--polaroid-text)' }}>第 {page} / {totalPages} 页</span>
            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages}
              className="rounded-lg px-3 py-1.5 text-sm border disabled:opacity-50"
              style={{ borderColor: 'var(--polaroid-border)' }}>下一页</button>
          </div>
        </div>
      )}

      {/* 新建/编辑弹窗 */}
      <AnimatePresence>
        {showDialog && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
            onClick={() => setShowDialog(false)}>
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl"
              style={{ border: '1px solid var(--polaroid-border)' }}>
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-lg font-semibold" style={{ color: 'var(--polaroid-text)' }}>
                  {editReq ? '编辑需求' : '新建需求'}
                </h3>
                <button onClick={() => setShowDialog(false)} className="p-1 rounded-lg hover:bg-gray-100">
                  <X className="h-5 w-5" style={{ color: 'var(--polaroid-text-muted)' }} />
                </button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: 'var(--polaroid-text)' }}>
                    所属项目 <span className="text-red-500">*</span>
                  </label>
                  <select value={form.project_id} onChange={(e) => setForm({ ...form, project_id: e.target.value })}
                    disabled={!!editReq}
                    className="w-full rounded-lg border bg-white px-3 py-2 text-sm outline-none disabled:bg-gray-50"
                    style={{ borderColor: 'var(--polaroid-border)' }}>
                    <option value="">请选择项目</option>
                    {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: 'var(--polaroid-text)' }}>
                    需求标题 <span className="text-red-500">*</span>
                  </label>
                  <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })}
                    placeholder="请输入需求标题"
                    className="w-full rounded-lg border bg-white px-3 py-2 text-sm outline-none focus:border-[var(--amber-primary)]"
                    style={{ borderColor: 'var(--polaroid-border)' }} />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: 'var(--polaroid-text)' }}>需求描述</label>
                  <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
                    placeholder="请输入需求描述"
                    rows={4}
                    className="w-full rounded-lg border bg-white px-3 py-2 text-sm outline-none resize-none focus:border-[var(--amber-primary)]"
                    style={{ borderColor: 'var(--polaroid-border)' }} />
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1" style={{ color: 'var(--polaroid-text)' }}>所属模块</label>
                    <input value={form.module} onChange={(e) => setForm({ ...form, module: e.target.value })}
                      placeholder="如：登录模块"
                      className="w-full rounded-lg border bg-white px-3 py-2 text-sm outline-none focus:border-[var(--amber-primary)]"
                      style={{ borderColor: 'var(--polaroid-border)' }} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1" style={{ color: 'var(--polaroid-text)' }}>优先级</label>
                    <select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })}
                      className="w-full rounded-lg border bg-white px-3 py-2 text-sm outline-none"
                      style={{ borderColor: 'var(--polaroid-border)' }}>
                      {PRIORITY_OPTIONS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                    </select>
                  </div>
                  {editReq && (
                    <div>
                      <label className="block text-sm font-medium mb-1" style={{ color: 'var(--polaroid-text)' }}>状态</label>
                      <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}
                        className="w-full rounded-lg border bg-white px-3 py-2 text-sm outline-none"
                        style={{ borderColor: 'var(--polaroid-border)' }}>
                        {STATUS_OPTIONS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                      </select>
                    </div>
                  )}
                </div>
              </div>
              <div className="flex justify-end gap-2 mt-6">
                <button onClick={() => setShowDialog(false)}
                  className="rounded-lg px-4 py-2 text-sm border transition-colors hover:bg-gray-50"
                  style={{ borderColor: 'var(--polaroid-border)', color: 'var(--polaroid-text-muted)' }}>取消</button>
                <button onClick={handleSave} disabled={saving || !form.title.trim() || !form.project_id}
                  className="rounded-lg px-4 py-2 text-sm text-white transition-opacity hover:opacity-90 disabled:opacity-50"
                  style={{ backgroundColor: 'var(--amber-primary)' }}>
                  {saving ? '保存中...' : '保存'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
