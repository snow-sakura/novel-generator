import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Search, Edit2, Trash2, Loader2, Package, X, Tag } from 'lucide-react'
import { assetApi, projectApi, type AssetResponse, type ProjectItem } from '@/lib/api-service'

const TYPE_OPTIONS = [
  { value: 'file', label: '文件', color: 'bg-blue-50 text-blue-600' },
  { value: 'script', label: '脚本', color: 'bg-green-50 text-green-600' },
  { value: 'data', label: '数据', color: 'bg-amber-50 text-amber-600' },
  { value: 'config', label: '配置', color: 'bg-purple-50 text-purple-600' },
  { value: 'image', label: '图片', color: 'bg-pink-50 text-pink-600' },
  { value: 'other', label: '其他', color: 'bg-gray-100 text-gray-500' },
]

export default function AssetListPage() {
  const [assets, setAssets] = useState<AssetResponse[]>([])
  const [projects, setProjects] = useState<ProjectItem[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [projectFilter, setProjectFilter] = useState('')
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [showDialog, setShowDialog] = useState(false)
  const [editAsset, setEditAsset] = useState<AssetResponse | null>(null)
  const [form, setForm] = useState({
    project_id: '',
    name: '',
    type: 'file',
    tags: '',
    content: '',
  })
  const [saving, setSaving] = useState(false)

  const fetchAssets = useCallback(async () => {
    setLoading(true)
    try {
      const params: Record<string, unknown> = { page, page_size: 20 }
      if (search) params.search = search
      if (typeFilter) params.type = typeFilter
      if (projectFilter) params.project_id = parseInt(projectFilter)
      const res = await assetApi.list(params as { page?: number; pageSize?: number; project_id?: number; type?: string; tags?: string; search?: string })
      setAssets(res.data.items)
      setTotal(res.data.total)
    } catch (err) {
      console.error('Failed to fetch assets:', err)
    } finally {
      setLoading(false)
    }
  }, [page, search, typeFilter, projectFilter])

  const fetchProjects = async () => {
    try {
      const res = await projectApi.list({ page: 1, page_size: 100 })
      setProjects(res.data.items)
    } catch (err) {
      console.error('Failed to fetch projects:', err)
    }
  }

  useEffect(() => { fetchAssets() }, [fetchAssets])
  useEffect(() => { fetchProjects() }, [])

  const openCreate = () => {
    setEditAsset(null)
    setForm({ project_id: projects[0]?.id?.toString() || '', name: '', type: 'file', tags: '', content: '' })
    setShowDialog(true)
  }

  const openEdit = (asset: AssetResponse) => {
    setEditAsset(asset)
    setForm({
      project_id: asset.project_id.toString(),
      name: asset.name,
      type: asset.type,
      tags: asset.tags || '',
      content: asset.content || '',
    })
    setShowDialog(true)
  }

  const handleSave = async () => {
    if (!form.name.trim() || !form.project_id) return
    setSaving(true)
    try {
      const data = {
        name: form.name,
        type: form.type,
        tags: form.tags || undefined,
        content: form.content || undefined,
      }
      if (editAsset) {
        await assetApi.update(editAsset.id, data)
      } else {
        await assetApi.create({ ...data, project_id: parseInt(form.project_id) })
      }
      setShowDialog(false)
      await fetchAssets()
    } catch (err) {
      console.error('Failed to save asset:', err)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: number) => {
    if (!window.confirm('确定删除该资产？')) return
    try {
      await assetApi.delete(id)
      await fetchAssets()
    } catch (err) {
      console.error('Failed to delete asset:', err)
    }
  }

  const parseTags = (tags: string | null): string[] => {
    if (!tags) return []
    return tags.split(',').map(t => t.trim()).filter(Boolean)
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
              placeholder="搜索资产..."
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
        </div>
        <button onClick={openCreate}
          className="flex items-center gap-2 rounded-lg px-4 py-2 text-sm text-white transition-opacity hover:opacity-90"
          style={{ backgroundColor: 'var(--amber-primary)' }}>
          <Plus className="h-4 w-4" /> 新建资产
        </button>
      </div>

      {/* 资产表格 */}
      <div className="rounded-xl border overflow-hidden" style={{ borderColor: 'var(--polaroid-border)' }}>
        <table className="w-full text-sm">
          <thead>
            <tr style={{ backgroundColor: 'var(--polaroid-warm)' }}>
              <th className="px-4 py-3 text-left font-medium" style={{ color: 'var(--polaroid-text)' }}>名称</th>
              <th className="px-4 py-3 text-left font-medium" style={{ color: 'var(--polaroid-text)' }}>类型</th>
              <th className="px-4 py-3 text-left font-medium" style={{ color: 'var(--polaroid-text)' }}>标签</th>
              <th className="px-4 py-3 text-left font-medium" style={{ color: 'var(--polaroid-text)' }}>版本</th>
              <th className="px-4 py-3 text-left font-medium" style={{ color: 'var(--polaroid-text)' }}>更新时间</th>
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
            ) : assets.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center" style={{ color: 'var(--polaroid-text-muted)' }}>
                  <Package className="h-12 w-12 mx-auto mb-3 opacity-30" />
                  <p className="text-lg font-medium">暂无资产</p>
                  <p className="text-sm mt-1">点击"新建资产"开始创建</p>
                </td>
              </tr>
            ) : (
              assets.map((asset) => (
                <tr key={asset.id} className="border-t hover:bg-gray-50/50" style={{ borderColor: 'var(--polaroid-border)' }}>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Package className="h-4 w-4" style={{ color: 'var(--amber-primary)' }} />
                      <span className="font-medium" style={{ color: 'var(--polaroid-text)' }}>{asset.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${TYPE_OPTIONS.find(t => t.value === asset.type)?.color || ''}`}>
                      {TYPE_OPTIONS.find(t => t.value === asset.type)?.label || asset.type}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {parseTags(asset.tags).map((tag, i) => (
                        <span key={i} className="inline-flex items-center gap-0.5 rounded-full bg-gray-100 px-2 py-0.5 text-xs" style={{ color: 'var(--polaroid-text-muted)' }}>
                          <Tag className="h-2.5 w-2.5" /> {tag}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-xs" style={{ color: 'var(--polaroid-text-muted)' }}>v{asset.version}</td>
                  <td className="px-4 py-3 text-xs" style={{ color: 'var(--polaroid-text-muted)' }}>
                    {new Date(asset.updated_at).toLocaleDateString('zh-CN')}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => openEdit(asset)} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
                      <Edit2 className="h-4 w-4" style={{ color: 'var(--polaroid-text-muted)' }} />
                    </button>
                    <button onClick={() => handleDelete(asset.id)} className="p-1.5 rounded-lg hover:bg-red-50 transition-colors">
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
          <p className="text-sm" style={{ color: 'var(--polaroid-text-muted)' }}>共 {total} 个资产</p>
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
                  {editAsset ? '编辑资产' : '新建资产'}
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
                    disabled={!!editAsset}
                    className="w-full rounded-lg border bg-white px-3 py-2 text-sm outline-none disabled:bg-gray-50"
                    style={{ borderColor: 'var(--polaroid-border)' }}>
                    <option value="">请选择项目</option>
                    {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1" style={{ color: 'var(--polaroid-text)' }}>
                      资产名称 <span className="text-red-500">*</span>
                    </label>
                    <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                      placeholder="请输入资产名称"
                      className="w-full rounded-lg border bg-white px-3 py-2 text-sm outline-none focus:border-[var(--amber-primary)]"
                      style={{ borderColor: 'var(--polaroid-border)' }} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1" style={{ color: 'var(--polaroid-text)' }}>资产类型</label>
                    <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}
                      className="w-full rounded-lg border bg-white px-3 py-2 text-sm outline-none"
                      style={{ borderColor: 'var(--polaroid-border)' }}>
                      {TYPE_OPTIONS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: 'var(--polaroid-text)' }}>标签</label>
                  <input value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })}
                    placeholder="多个标签用逗号分隔，如：测试数据,登录模块"
                    className="w-full rounded-lg border bg-white px-3 py-2 text-sm outline-none focus:border-[var(--amber-primary)]"
                    style={{ borderColor: 'var(--polaroid-border)' }} />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: 'var(--polaroid-text)' }}>内容</label>
                  <textarea value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })}
                    placeholder="资产内容或描述"
                    rows={6}
                    className="w-full rounded-lg border bg-white px-3 py-2 text-sm outline-none resize-none font-mono focus:border-[var(--amber-primary)]"
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
