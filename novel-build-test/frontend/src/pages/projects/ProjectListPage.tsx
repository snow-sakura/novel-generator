import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Search, Eye, Edit2, Trash2, Loader2, FolderKanban, X } from 'lucide-react'
import { projectApi, type ProjectItem } from '@/lib/api-service'

const STATUS_OPTIONS = [
  { value: 'active', label: '进行中' },
  { value: 'draft', label: '草稿' },
  { value: 'archived', label: '已归档' },
]

export default function ProjectListPage() {
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [projects, setProjects] = useState<ProjectItem[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [showDialog, setShowDialog] = useState(false)
  const [editProject, setEditProject] = useState<ProjectItem | null>(null)
  const [form, setForm] = useState({ name: '', description: '', status: 'active' })
  const [saving, setSaving] = useState(false)

  const fetchProjects = useCallback(async () => {
    setLoading(true)
    try {
      const res = await projectApi.list({ page, page_size: 20, search: search || undefined })
      setProjects(res.data.items)
      setTotal(res.data.total)
    } catch {
      // 保持现有数据
    } finally {
      setLoading(false)
    }
  }, [page, search])

  useEffect(() => { fetchProjects() }, [fetchProjects])

  const handleSearch = (value: string) => {
    setSearch(value)
    setPage(1)
  }

  const openCreate = () => {
    setEditProject(null)
    setForm({ name: '', description: '', status: 'active' })
    setShowDialog(true)
  }

  const openEdit = (p: ProjectItem) => {
    setEditProject(p)
    setForm({ name: p.name, description: p.description || '', status: p.status })
    setShowDialog(true)
  }

  const handleSave = async () => {
    if (!form.name.trim()) return
    setSaving(true)
    try {
      if (editProject) {
        await projectApi.update(editProject.id, form as Partial<ProjectItem>)
      } else {
        await projectApi.create({ name: form.name, description: form.description || undefined })
      }
      setShowDialog(false)
      await fetchProjects()
    } catch (err) {
      console.error('Failed to save project:', err)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: number) => {
    if (!window.confirm('确定删除该项目？相关数据将一并删除。')) return
    try {
      await projectApi.delete(id)
      await fetchProjects()
    } catch (err) {
      console.error('Failed to delete project:', err)
    }
  }

  const totalPages = Math.ceil(total / 20)

  return (
    <div className="space-y-4">
      {/* 操作栏 */}
      <div className="flex items-center justify-between">
        <div className="relative w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: 'var(--polaroid-text-muted)' }} />
          <input
            placeholder="搜索项目..."
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
            className="w-full rounded-lg border bg-white pl-10 pr-4 py-2.5 text-sm outline-none focus:border-[var(--amber-primary)]"
            style={{ borderColor: 'var(--polaroid-border)' }}
          />
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm text-white transition-opacity hover:opacity-90"
          style={{ backgroundColor: 'var(--amber-primary)' }}
        >
          <Plus className="h-4 w-4" />
          新建项目
        </button>
      </div>

      {/* 项目表格 */}
      <div className="rounded-xl border overflow-hidden" style={{ borderColor: 'var(--polaroid-border)' }}>
        <table className="w-full text-sm">
          <thead>
            <tr style={{ backgroundColor: 'var(--polaroid-warm)' }}>
              <th className="px-4 py-3 text-left font-medium" style={{ color: 'var(--polaroid-text)' }}>项目名称</th>
              <th className="px-4 py-3 text-left font-medium" style={{ color: 'var(--polaroid-text)' }}>描述</th>
              <th className="px-4 py-3 text-left font-medium" style={{ color: 'var(--polaroid-text)' }}>状态</th>
              <th className="px-4 py-3 text-left font-medium" style={{ color: 'var(--polaroid-text)' }}>创建时间</th>
              <th className="px-4 py-3 text-right font-medium" style={{ color: 'var(--polaroid-text)' }}>操作</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={5} className="px-4 py-12 text-center">
                  <Loader2 className="h-6 w-6 animate-spin mx-auto" style={{ color: 'var(--amber-primary)' }} />
                </td>
              </tr>
            ) : projects.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-12 text-center" style={{ color: 'var(--polaroid-text-muted)' }}>
                  <FolderKanban className="h-12 w-12 mx-auto mb-3 opacity-30" />
                  <p className="text-lg font-medium">暂无项目</p>
                  <p className="text-sm mt-1">点击"新建项目"开始创建</p>
                </td>
              </tr>
            ) : (
              projects.map((project) => (
                <tr key={project.id} className="border-t hover:bg-gray-50/50" style={{ borderColor: 'var(--polaroid-border)' }}>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <FolderKanban className="h-4 w-4" style={{ color: 'var(--amber-primary)' }} />
                      <span className="font-medium" style={{ color: 'var(--polaroid-text)' }}>{project.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 max-w-[200px] truncate" style={{ color: 'var(--polaroid-text-muted)' }}>
                    {project.description || '—'}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                      project.status === 'active' ? 'bg-emerald-50 text-emerald-600' :
                      project.status === 'draft' ? 'bg-gray-100 text-gray-500' :
                      'bg-blue-50 text-blue-600'
                    }`}>
                      {STATUS_OPTIONS.find(s => s.value === project.status)?.label || project.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs" style={{ color: 'var(--polaroid-text-muted)' }}>
                    {new Date(project.created_at).toLocaleDateString('zh-CN')}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => navigate(`/projects/${project.id}`)} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
                      <Eye className="h-4 w-4" style={{ color: 'var(--polaroid-text-muted)' }} />
                    </button>
                    <button onClick={() => openEdit(project)} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
                      <Edit2 className="h-4 w-4" style={{ color: 'var(--polaroid-text-muted)' }} />
                    </button>
                    <button onClick={() => handleDelete(project.id)} className="p-1.5 rounded-lg hover:bg-red-50 transition-colors">
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
          <p className="text-sm" style={{ color: 'var(--polaroid-text-muted)' }}>
            共 {total} 个项目
          </p>
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
              className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl"
              style={{ border: '1px solid var(--polaroid-border)' }}>
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-lg font-semibold" style={{ color: 'var(--polaroid-text)' }}>
                  {editProject ? '编辑项目' : '新建项目'}
                </h3>
                <button onClick={() => setShowDialog(false)} className="p-1 rounded-lg hover:bg-gray-100">
                  <X className="h-5 w-5" style={{ color: 'var(--polaroid-text-muted)' }} />
                </button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: 'var(--polaroid-text)' }}>
                    项目名称 <span className="text-red-500">*</span>
                  </label>
                  <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="请输入项目名称"
                    className="w-full rounded-lg border bg-white px-3 py-2 text-sm outline-none focus:border-[var(--amber-primary)]"
                    style={{ borderColor: 'var(--polaroid-border)' }} />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: 'var(--polaroid-text)' }}>项目描述</label>
                  <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
                    placeholder="请输入项目描述"
                    rows={3}
                    className="w-full rounded-lg border bg-white px-3 py-2 text-sm outline-none resize-none focus:border-[var(--amber-primary)]"
                    style={{ borderColor: 'var(--polaroid-border)' }} />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: 'var(--polaroid-text)' }}>状态</label>
                  <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}
                    className="w-full rounded-lg border bg-white px-3 py-2 text-sm outline-none focus:border-[var(--amber-primary)]"
                    style={{ borderColor: 'var(--polaroid-border)' }}>
                    {STATUS_OPTIONS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                  </select>
                </div>
              </div>
              <div className="flex justify-end gap-2 mt-6">
                <button onClick={() => setShowDialog(false)}
                  className="rounded-lg px-4 py-2 text-sm border transition-colors hover:bg-gray-50"
                  style={{ borderColor: 'var(--polaroid-border)', color: 'var(--polaroid-text-muted)' }}>取消</button>
                <button onClick={handleSave} disabled={saving || !form.name.trim()}
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
