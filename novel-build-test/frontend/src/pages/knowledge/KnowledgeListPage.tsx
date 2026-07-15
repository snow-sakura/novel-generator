import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Search, Edit2, Trash2, Loader2, BookOpen, X, RefreshCw, Database } from 'lucide-react'
import { knowledgeApi, projectApi, type KnowledgeItem, type ProjectItem } from '@/lib/api-service'

const SOURCE_OPTIONS = [
  { value: 'manual', label: '手动录入', color: 'bg-blue-50 text-blue-600' },
  { value: 'file', label: '文件导入', color: 'bg-green-50 text-green-600' },
  { value: 'api', label: 'API接入', color: 'bg-purple-50 text-purple-600' },
]

export default function KnowledgeListPage() {
  const [knowledge, setKnowledge] = useState<KnowledgeItem[]>([])
  const [projects, setProjects] = useState<ProjectItem[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [sourceFilter, setSourceFilter] = useState('')
  const [projectFilter, setProjectFilter] = useState('')
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [showDialog, setShowDialog] = useState(false)
  const [editItem, setEditItem] = useState<KnowledgeItem | null>(null)
  const [form, setForm] = useState({
    project_id: '',
    title: '',
    content: '',
    source: 'manual',
    tags: '',
    collection_name: 'default',
  })
  const [saving, setSaving] = useState(false)
  const [syncingId, setSyncingId] = useState<number | null>(null)

  const fetchKnowledge = useCallback(async () => {
    setLoading(true)
    try {
      const params: Record<string, unknown> = { page, page_size: 20 }
      if (search) params.search = search
      if (sourceFilter) params.source = sourceFilter
      if (projectFilter) params.project_id = parseInt(projectFilter)
      const res = await knowledgeApi.list(params as { page?: number; pageSize?: number; project_id?: number; collection?: string; source?: string; search?: string })
      setKnowledge(res.data.items)
      setTotal(res.data.total)
    } catch (err) {
      console.error('Failed to fetch knowledge:', err)
    } finally {
      setLoading(false)
    }
  }, [page, search, sourceFilter, projectFilter])

  const fetchProjects = async () => {
    try {
      const res = await projectApi.list({ page: 1, page_size: 100 })
      setProjects(res.data.items)
    } catch (err) {
      console.error('Failed to fetch projects:', err)
    }
  }

  useEffect(() => { fetchKnowledge() }, [fetchKnowledge])
  useEffect(() => { fetchProjects() }, [])

  const openCreate = () => {
    setEditItem(null)
    setForm({ project_id: projects[0]?.id?.toString() || '', title: '', content: '', source: 'manual', tags: '', collection_name: 'default' })
    setShowDialog(true)
  }

  const openEdit = (item: KnowledgeItem) => {
    setEditItem(item)
    setForm({
      project_id: item.project_id.toString(),
      title: item.title,
      content: item.content || '',
      source: item.source,
      tags: item.tags || '',
      collection_name: item.collection_name,
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
        content: form.content || undefined,
        source: form.source,
        tags: form.tags || undefined,
        collection_name: form.collection_name,
      }
      if (editItem) {
        await knowledgeApi.update(editItem.id, data)
      } else {
        await knowledgeApi.create(data)
      }
      setShowDialog(false)
      await fetchKnowledge()
    } catch (err) {
      console.error('Failed to save knowledge:', err)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: number) => {
    if (!window.confirm('确定删除该知识条目？')) return
    try {
      await knowledgeApi.delete(id)
      await fetchKnowledge()
    } catch (err) {
      console.error('Failed to delete knowledge:', err)
    }
  }

  const handleSync = async (id: number) => {
    setSyncingId(id)
    try {
      await knowledgeApi.sync(id)
      await fetchKnowledge()
    } catch (err) {
      console.error('Failed to sync:', err)
      alert('同步失败')
    } finally {
      setSyncingId(null)
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
              placeholder="搜索知识..."
              className="w-48 rounded-lg border bg-white pl-9 pr-3 py-2 text-sm outline-none focus:border-[var(--amber-primary)]"
              style={{ borderColor: 'var(--polaroid-border)' }} />
          </div>
          <select value={projectFilter} onChange={(e) => { setProjectFilter(e.target.value); setPage(1) }}
            className="rounded-lg border bg-white px-3 py-2 text-sm outline-none"
            style={{ borderColor: 'var(--polaroid-border)' }}>
            <option value="">全部项目</option>
            {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          <select value={sourceFilter} onChange={(e) => { setSourceFilter(e.target.value); setPage(1) }}
            className="rounded-lg border bg-white px-3 py-2 text-sm outline-none"
            style={{ borderColor: 'var(--polaroid-border)' }}>
            <option value="">全部来源</option>
            {SOURCE_OPTIONS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
        </div>
        <button onClick={openCreate}
          className="flex items-center gap-2 rounded-lg px-4 py-2 text-sm text-white transition-opacity hover:opacity-90"
          style={{ backgroundColor: 'var(--amber-primary)' }}>
          <Plus className="h-4 w-4" /> 新建知识
        </button>
      </div>

      {/* 知识列表 */}
      <div className="grid gap-4 md:grid-cols-2">
        {loading ? (
          <div className="col-span-full flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin" style={{ color: 'var(--amber-primary)' }} />
          </div>
        ) : knowledge.length === 0 ? (
          <div className="col-span-full text-center py-12" style={{ color: 'var(--polaroid-text-muted)' }}>
            <BookOpen className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p className="text-lg font-medium">暂无知识条目</p>
            <p className="text-sm mt-1">点击"新建知识"开始创建</p>
          </div>
        ) : (
          knowledge.map((item) => (
            <motion.div key={item.id} whileHover={{ y: -2 }}
              className="rounded-xl border p-5 space-y-3" style={{ borderColor: 'var(--polaroid-border)', backgroundColor: 'var(--polaroid-white)' }}>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: 'rgba(236, 72, 153, 0.1)' }}>
                    <BookOpen className="h-5 w-5 text-pink-500" />
                  </div>
                  <div>
                    <h3 className="font-medium" style={{ color: 'var(--polaroid-text)' }}>{item.title}</h3>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${SOURCE_OPTIONS.find(s => s.value === item.source)?.color || ''}`}>
                        {SOURCE_OPTIONS.find(s => s.value === item.source)?.label || item.source}
                      </span>
                      <span className="text-xs" style={{ color: 'var(--polaroid-text-muted)' }}>{item.collection_name}</span>
                    </div>
                  </div>
                </div>
                <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${item.vector_synced ? 'bg-green-50 text-green-600' : 'bg-amber-50 text-amber-600'}`}>
                  <Database className="h-3 w-3 mr-1" />
                  {item.vector_synced ? '已同步' : '未同步'}
                </span>
              </div>

              {item.content && (
                <p className="text-xs line-clamp-2" style={{ color: 'var(--polaroid-text-muted)' }}>
                  {item.content}
                </p>
              )}

              <div className="flex items-center gap-2 pt-2 border-t" style={{ borderColor: 'var(--polaroid-border)' }}>
                <button onClick={() => handleSync(item.id)} disabled={syncingId === item.id}
                  className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs border transition-colors hover:bg-gray-50 disabled:opacity-50"
                  style={{ borderColor: 'var(--polaroid-border)' }}>
                  <RefreshCw className={`h-3 w-3 ${syncingId === item.id ? 'animate-spin' : ''}`} /> 同步向量
                </button>
                <div className="flex-1" />
                <button onClick={() => openEdit(item)} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
                  <Edit2 className="h-4 w-4" style={{ color: 'var(--polaroid-text-muted)' }} />
                </button>
                <button onClick={() => handleDelete(item.id)} className="p-1.5 rounded-lg hover:bg-red-50 transition-colors">
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
          <p className="text-sm" style={{ color: 'var(--polaroid-text-muted)' }}>共 {total} 条知识</p>
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
                  {editItem ? '编辑知识' : '新建知识'}
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
                    disabled={!!editItem}
                    className="w-full rounded-lg border bg-white px-3 py-2 text-sm outline-none disabled:bg-gray-50"
                    style={{ borderColor: 'var(--polaroid-border)' }}>
                    <option value="">请选择项目</option>
                    {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: 'var(--polaroid-text)' }}>
                    标题 <span className="text-red-500">*</span>
                  </label>
                  <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })}
                    placeholder="请输入知识标题"
                    className="w-full rounded-lg border bg-white px-3 py-2 text-sm outline-none focus:border-[var(--amber-primary)]"
                    style={{ borderColor: 'var(--polaroid-border)' }} />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: 'var(--polaroid-text)' }}>内容</label>
                  <textarea value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })}
                    placeholder="请输入知识内容"
                    rows={6}
                    className="w-full rounded-lg border bg-white px-3 py-2 text-sm outline-none resize-none focus:border-[var(--amber-primary)]"
                    style={{ borderColor: 'var(--polaroid-border)' }} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1" style={{ color: 'var(--polaroid-text)' }}>来源</label>
                    <select value={form.source} onChange={(e) => setForm({ ...form, source: e.target.value })}
                      className="w-full rounded-lg border bg-white px-3 py-2 text-sm outline-none"
                      style={{ borderColor: 'var(--polaroid-border)' }}>
                      {SOURCE_OPTIONS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1" style={{ color: 'var(--polaroid-text)' }}>标签</label>
                    <input value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })}
                      placeholder="多个标签用逗号分隔"
                      className="w-full rounded-lg border bg-white px-3 py-2 text-sm outline-none focus:border-[var(--amber-primary)]"
                      style={{ borderColor: 'var(--polaroid-border)' }} />
                  </div>
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
