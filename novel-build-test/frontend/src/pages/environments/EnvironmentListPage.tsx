import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Search, Edit2, Trash2, Loader2, Server, X, Heart, Rocket } from 'lucide-react'
import { environmentApi, projectApi, type EnvironmentItem, type ProjectItem } from '@/lib/api-service'

const TYPE_OPTIONS = [
  { value: 'dev', label: '开发环境', color: 'bg-blue-50 text-blue-600' },
  { value: 'test', label: '测试环境', color: 'bg-green-50 text-green-600' },
  { value: 'staging', label: '预发环境', color: 'bg-amber-50 text-amber-600' },
  { value: 'production', label: '生产环境', color: 'bg-red-50 text-red-600' },
  { value: 'custom', label: '自定义', color: 'bg-gray-100 text-gray-500' },
]

const STATUS_OPTIONS = [
  { value: 'preparing', label: '准备中', color: 'bg-gray-100 text-gray-500' },
  { value: 'ready', label: '就绪', color: 'bg-green-50 text-green-600' },
  { value: 'in_use', label: '使用中', color: 'bg-blue-50 text-blue-600' },
  { value: 'maintenance', label: '维护中', color: 'bg-amber-50 text-amber-600' },
  { value: 'unavailable', label: '不可用', color: 'bg-red-50 text-red-600' },
]

export default function EnvironmentListPage() {
  const [environments, setEnvironments] = useState<EnvironmentItem[]>([])
  const [projects, setProjects] = useState<ProjectItem[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [projectFilter, setProjectFilter] = useState('')
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [showDialog, setShowDialog] = useState(false)
  const [editEnv, setEditEnv] = useState<EnvironmentItem | null>(null)
  const [form, setForm] = useState({
    project_id: '',
    name: '',
    type: 'test',
    config_url: '',
    config_desc: '',
  })
  const [saving, setSaving] = useState(false)

  const fetchEnvironments = useCallback(async () => {
    setLoading(true)
    try {
      const params: Record<string, unknown> = { page, page_size: 20 }
      if (search) params.search = search
      if (typeFilter) params.type = typeFilter
      if (statusFilter) params.status = statusFilter
      if (projectFilter) params.project_id = parseInt(projectFilter)
      const res = await environmentApi.list(params as { page?: number; page_size?: number; project_id?: number; status?: string; type?: string })
      setEnvironments(res.data.items)
      setTotal(res.data.total)
    } catch (err) {
      console.error('Failed to fetch environments:', err)
    } finally {
      setLoading(false)
    }
  }, [page, search, typeFilter, statusFilter, projectFilter])

  const fetchProjects = async () => {
    try {
      const res = await projectApi.list({ page: 1, page_size: 100 })
      setProjects(res.data.items)
    } catch (err) {
      console.error('Failed to fetch projects:', err)
    }
  }

  useEffect(() => { fetchEnvironments() }, [fetchEnvironments])
  useEffect(() => { fetchProjects() }, [])

  const openCreate = () => {
    setEditEnv(null)
    setForm({ project_id: projects[0]?.id?.toString() || '', name: '', type: 'test', config_url: '', config_desc: '' })
    setShowDialog(true)
  }

  const openEdit = (env: EnvironmentItem) => {
    setEditEnv(env)
    const config = env.config || {}
    setForm({
      project_id: env.project_id.toString(),
      name: env.name,
      type: env.type,
      config_url: config.url || '',
      config_desc: config.description || '',
    })
    setShowDialog(true)
  }

  const handleSave = async () => {
    if (!form.name.trim() || !form.project_id) return
    setSaving(true)
    try {
      const data = {
        project_id: parseInt(form.project_id),
        name: form.name,
        type: form.type,
        config: { url: form.config_url, description: form.config_desc },
      }
      if (editEnv) {
        await environmentApi.update(editEnv.id, data as Record<string, unknown>)
      } else {
        await environmentApi.create(data as { project_id: number; name: string; type?: string; config?: Record<string, string> })
      }
      setShowDialog(false)
      await fetchEnvironments()
    } catch (err) {
      console.error('Failed to save environment:', err)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: number) => {
    if (!window.confirm('确定删除该环境？')) return
    try {
      await environmentApi.delete(id)
      await fetchEnvironments()
    } catch (err) {
      console.error('Failed to delete environment:', err)
    }
  }

  const handleHealthCheck = async (id: number) => {
    try {
      const res = await environmentApi.healthCheck(id)
      alert(res.data.message || '健康检查通过')
      await fetchEnvironments()
    } catch (err) {
      console.error('Health check failed:', err)
      alert('健康检查失败')
    }
  }

  const handleDeploy = async (id: number) => {
    if (!window.confirm('确定部署该环境？')) return
    try {
      const res = await environmentApi.deploy(id)
      alert(res.data.message || '部署成功')
      await fetchEnvironments()
    } catch (err) {
      console.error('Deploy failed:', err)
      alert('部署失败')
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
              placeholder="搜索环境..."
              className="w-48 rounded-lg border bg-white pl-9 pr-3 py-2 text-sm outline-none focus:border-[var(--amber-primary)]"
              style={{ borderColor: 'var(--polaroid-border)' }} />
          </div>
          <select value={projectFilter} onChange={(e) => { setProjectFilter(e.target.value); setPage(1) }}
            className="rounded-lg border bg-white px-3 py-2 text-sm outline-none"
            style={{ borderColor: 'var(--polaroid-border)' }}>
            <option value="">全部项目</option>
            {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          <select value={typeFilter} onChange={(e) => { setTypeFilter(e.target.value); setPage(1) }}
            className="rounded-lg border bg-white px-3 py-2 text-sm outline-none"
            style={{ borderColor: 'var(--polaroid-border)' }}>
            <option value="">全部类型</option>
            {TYPE_OPTIONS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
          <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1) }}
            className="rounded-lg border bg-white px-3 py-2 text-sm outline-none"
            style={{ borderColor: 'var(--polaroid-border)' }}>
            <option value="">全部状态</option>
            {STATUS_OPTIONS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
        </div>
        <button onClick={openCreate}
          className="flex items-center gap-2 rounded-lg px-4 py-2 text-sm text-white transition-opacity hover:opacity-90"
          style={{ backgroundColor: 'var(--amber-primary)' }}>
          <Plus className="h-4 w-4" /> 新建环境
        </button>
      </div>

      {/* 环境卡片列表 */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {loading ? (
          <div className="col-span-full flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin" style={{ color: 'var(--amber-primary)' }} />
          </div>
        ) : environments.length === 0 ? (
          <div className="col-span-full text-center py-12" style={{ color: 'var(--polaroid-text-muted)' }}>
            <Server className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p className="text-lg font-medium">暂无环境</p>
            <p className="text-sm mt-1">点击"新建环境"开始创建</p>
          </div>
        ) : (
          environments.map((env) => (
            <motion.div key={env.id} whileHover={{ y: -2 }}
              className="rounded-xl border p-5 space-y-3" style={{ borderColor: 'var(--polaroid-border)', backgroundColor: 'var(--polaroid-white)' }}>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: 'rgba(16, 185, 129, 0.1)' }}>
                    <Server className="h-5 w-5 text-emerald-500" />
                  </div>
                  <div>
                    <h3 className="font-medium" style={{ color: 'var(--polaroid-text)' }}>{env.name}</h3>
                    <p className="text-xs" style={{ color: 'var(--polaroid-text-muted)' }}>
                      {TYPE_OPTIONS.find(t => t.value === env.type)?.label || env.type}
                    </p>
                  </div>
                </div>
                <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_OPTIONS.find(s => s.value === env.status)?.color || ''}`}>
                  {STATUS_OPTIONS.find(s => s.value === env.status)?.label || env.status}
                </span>
              </div>

              {env.config?.url && (
                <p className="text-xs truncate" style={{ color: 'var(--polaroid-text-muted)' }}>
                  URL: {env.config.url}
                </p>
              )}

              <div className="flex items-center gap-2 pt-2 border-t" style={{ borderColor: 'var(--polaroid-border)' }}>
                <button onClick={() => handleHealthCheck(env.id)}
                  className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs border transition-colors hover:bg-gray-50"
                  style={{ borderColor: 'var(--polaroid-border)' }}>
                  <Heart className="h-3 w-3" /> 健康检查
                </button>
                <button onClick={() => handleDeploy(env.id)}
                  className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs border transition-colors hover:bg-gray-50"
                  style={{ borderColor: 'var(--polaroid-border)' }}>
                  <Rocket className="h-3 w-3" /> 部署
                </button>
                <div className="flex-1" />
                <button onClick={() => openEdit(env)} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
                  <Edit2 className="h-4 w-4" style={{ color: 'var(--polaroid-text-muted)' }} />
                </button>
                <button onClick={() => handleDelete(env.id)} className="p-1.5 rounded-lg hover:bg-red-50 transition-colors">
                  <Trash2 className="h-4 w-4 text-red-400" />
                </button>
              </div>
            </motion.div>
          ))
        )}
      </div>

      {/* 分页 */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm" style={{ color: 'var(--polaroid-text-muted)' }}>共 {total} 个环境</p>
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
                  {editEnv ? '编辑环境' : '新建环境'}
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
                    disabled={!!editEnv}
                    className="w-full rounded-lg border bg-white px-3 py-2 text-sm outline-none disabled:bg-gray-50"
                    style={{ borderColor: 'var(--polaroid-border)' }}>
                    <option value="">请选择项目</option>
                    {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1" style={{ color: 'var(--polaroid-text)' }}>
                      环境名称 <span className="text-red-500">*</span>
                    </label>
                    <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                      placeholder="如：测试环境-01"
                      className="w-full rounded-lg border bg-white px-3 py-2 text-sm outline-none focus:border-[var(--amber-primary)]"
                      style={{ borderColor: 'var(--polaroid-border)' }} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1" style={{ color: 'var(--polaroid-text)' }}>环境类型</label>
                    <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}
                      className="w-full rounded-lg border bg-white px-3 py-2 text-sm outline-none"
                      style={{ borderColor: 'var(--polaroid-border)' }}>
                      {TYPE_OPTIONS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: 'var(--polaroid-text)' }}>访问地址</label>
                  <input value={form.config_url} onChange={(e) => setForm({ ...form, config_url: e.target.value })}
                    placeholder="如：https://test.example.com"
                    className="w-full rounded-lg border bg-white px-3 py-2 text-sm outline-none focus:border-[var(--amber-primary)]"
                    style={{ borderColor: 'var(--polaroid-border)' }} />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: 'var(--polaroid-text)' }}>环境说明</label>
                  <textarea value={form.config_desc} onChange={(e) => setForm({ ...form, config_desc: e.target.value })}
                    placeholder="环境用途说明"
                    rows={3}
                    className="w-full rounded-lg border bg-white px-3 py-2 text-sm outline-none resize-none focus:border-[var(--amber-primary)]"
                    style={{ borderColor: 'var(--polaroid-border)' }} />
                </div>
              </div>
              <div className="flex justify-end gap-2 mt-6">
                <button onClick={() => setShowDialog(false)}
                  className="rounded-lg px-4 py-2 text-sm border transition-colors hover:bg-gray-50"
                  style={{ borderColor: 'var(--polaroid-border)', color: 'var(--polaroid-text-muted)' }}>取消</button>
                <button onClick={handleSave} disabled={saving || !form.name.trim() || !form.project_id}
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
