import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Search, Edit2, Trash2, X, Shield, Loader2 } from 'lucide-react'
import { userApi, type UserItem } from '@/lib/api-service'

const ROLES = ['admin', 'engineer', 'viewer']
const ROLE_LABELS: Record<string, string> = {
  admin: '管理员',
  engineer: '工程师',
  viewer: '观察者',
}

export default function UserManagementPage() {
  const [users, setUsers] = useState<UserItem[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [showDialog, setShowDialog] = useState(false)
  const [editUser, setEditUser] = useState<UserItem | null>(null)
  const [form, setForm] = useState({
    username: '',
    email: '',
    displayName: '',
    password: '',
    role: 'engineer',
    is_active: true,
  })
  const [saving, setSaving] = useState(false)

  const fetchUsers = async () => {
    setLoading(true)
    try {
      const res = await userApi.list({ page, page_size: 20, search: search || undefined })
      setUsers(res.data.items)
      setTotal(res.data.total)
    } catch (err) {
      console.error('Failed to fetch users:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchUsers()
  }, [page, search])

  const openCreate = () => {
    setEditUser(null)
    setForm({ username: '', email: '', displayName: '', password: '', role: 'engineer', is_active: true })
    setShowDialog(true)
  }

  const openEdit = (u: UserItem) => {
    setEditUser(u)
    setForm({
      username: u.username,
      email: u.email,
      displayName: u.display_name || '',
      password: '',
      role: u.role,
      is_active: u.is_active,
    })
    setShowDialog(true)
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      if (editUser) {
        await userApi.update(editUser.id, {
          display_name: form.displayName,
          email: form.email,
          role: form.role,
          is_active: form.is_active,
        })
      } else {
        await userApi.create({
          username: form.username,
          email: form.email,
          password: form.password,
          display_name: form.displayName || undefined,
        })
      }
      setShowDialog(false)
      await fetchUsers()
    } catch (err) {
      console.error('Failed to save user:', err)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: number) => {
    if (!window.confirm('确定删除该用户？')) return
    try {
      await userApi.delete(id)
      await fetchUsers()
    } catch (err) {
      console.error('Failed to delete user:', err)
    }
  }

  const handleToggleStatus = async (u: UserItem) => {
    try {
      await userApi.updateStatus(u.id, !u.is_active)
      await fetchUsers()
    } catch (err) {
      console.error('Failed to update status:', err)
    }
  }

  return (
    <div className="space-y-4">
      {/* 标题栏 */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold" style={{ color: 'var(--polaroid-text)' }}>用户管理</h2>
          <p className="text-sm" style={{ color: 'var(--polaroid-text-muted)' }}>管理系统用户账号、角色分配与状态</p>
        </div>
        <button onClick={openCreate}
          className="flex items-center gap-2 rounded-lg px-4 py-2 text-sm text-white transition-opacity hover:opacity-90"
          style={{ backgroundColor: 'var(--amber-primary)' }}>
          <Plus className="h-4 w-4" /> 新建用户
        </button>
      </div>

      {/* 搜索 */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: 'var(--polaroid-text-muted)' }} />
        <input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1) }}
          placeholder="搜索用户名、姓名或邮箱..."
          className="w-full rounded-lg border bg-white pl-10 pr-4 py-2.5 text-sm outline-none focus:border-[var(--amber-primary)]"
          style={{ borderColor: 'var(--polaroid-border)' }} />
      </div>

      {/* 用户表格 */}
      <div className="rounded-xl border overflow-hidden" style={{ borderColor: 'var(--polaroid-border)' }}>
        <table className="w-full text-sm">
          <thead>
            <tr style={{ backgroundColor: 'var(--polaroid-warm)' }}>
              <th className="px-4 py-3 text-left font-medium" style={{ color: 'var(--polaroid-text)' }}>用户</th>
              <th className="px-4 py-3 text-left font-medium" style={{ color: 'var(--polaroid-text)' }}>邮箱</th>
              <th className="px-4 py-3 text-left font-medium" style={{ color: 'var(--polaroid-text)' }}>角色</th>
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
            ) : users.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center" style={{ color: 'var(--polaroid-text-muted)' }}>
                  暂无用户数据
                </td>
              </tr>
            ) : (
              users.map((u) => (
                <tr key={u.id} className="border-t" style={{ borderColor: 'var(--polaroid-border)' }}>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold text-white"
                        style={{ backgroundColor: u.is_active ? 'var(--amber-primary)' : '#9CA3AF' }}>
                        {(u.display_name || u.username).charAt(0)}
                      </div>
                      <div>
                        <p className="font-medium" style={{ color: 'var(--polaroid-text)' }}>{u.display_name || u.username}</p>
                        <p className="text-xs" style={{ color: 'var(--polaroid-text-muted)' }}>@{u.username}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3" style={{ color: 'var(--polaroid-text-muted)' }}>{u.email}</td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium bg-blue-50 text-blue-600">
                      <Shield className="h-3 w-3" /> {ROLE_LABELS[u.role] || u.role}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <button onClick={() => handleToggleStatus(u)}
                      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium cursor-pointer transition-colors ${u.is_active ? 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}>
                      <span className={`h-1.5 w-1.5 rounded-full ${u.is_active ? 'bg-emerald-500' : 'bg-gray-400'}`} />
                      {u.is_active ? '启用' : '禁用'}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-xs" style={{ color: 'var(--polaroid-text-muted)' }}>
                    {new Date(u.created_at).toLocaleDateString('zh-CN')}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => openEdit(u)} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
                      <Edit2 className="h-4 w-4" style={{ color: 'var(--polaroid-text-muted)' }} />
                    </button>
                    <button onClick={() => handleDelete(u.id)} className="p-1.5 rounded-lg hover:bg-red-50 transition-colors">
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
      {total > 20 && (
        <div className="flex items-center justify-between">
          <p className="text-sm" style={{ color: 'var(--polaroid-text-muted)' }}>
            共 {total} 个用户
          </p>
          <div className="flex gap-2">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
              className="rounded-lg px-3 py-1.5 text-sm border disabled:opacity-50"
              style={{ borderColor: 'var(--polaroid-border)' }}>上一页</button>
            <span className="px-3 py-1.5 text-sm" style={{ color: 'var(--polaroid-text)' }}>第 {page} 页</span>
            <button onClick={() => setPage(p => p + 1)} disabled={users.length < 20}
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
                <h3 className="text-lg font-semibold" style={{ color: 'var(--polaroid-text)' }}>{editUser ? '编辑用户' : '新建用户'}</h3>
                <button onClick={() => setShowDialog(false)} className="p-1 rounded-lg hover:bg-gray-100">
                  <X className="h-5 w-5" style={{ color: 'var(--polaroid-text-muted)' }} />
                </button>
              </div>
              <div className="space-y-4">
                {!editUser && (
                  <div>
                    <label className="block text-sm font-medium mb-1" style={{ color: 'var(--polaroid-text)' }}>用户名 <span className="text-red-500">*</span></label>
                    <input value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })}
                      className="w-full rounded-lg border bg-white px-3 py-2 text-sm outline-none focus:border-[var(--amber-primary)]"
                      style={{ borderColor: 'var(--polaroid-border)' }} />
                  </div>
                )}
                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: 'var(--polaroid-text)' }}>昵称</label>
                  <input value={form.displayName} onChange={(e) => setForm({ ...form, displayName: e.target.value })}
                    className="w-full rounded-lg border bg-white px-3 py-2 text-sm outline-none focus:border-[var(--amber-primary)]"
                    style={{ borderColor: 'var(--polaroid-border)' }} />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: 'var(--polaroid-text)' }}>邮箱 <span className="text-red-500">*</span></label>
                  <input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} type="email"
                    className="w-full rounded-lg border bg-white px-3 py-2 text-sm outline-none focus:border-[var(--amber-primary)]"
                    style={{ borderColor: 'var(--polaroid-border)' }} />
                </div>
                {!editUser && (
                  <div>
                    <label className="block text-sm font-medium mb-1" style={{ color: 'var(--polaroid-text)' }}>密码 <span className="text-red-500">*</span></label>
                    <input value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} type="password"
                      className="w-full rounded-lg border bg-white px-3 py-2 text-sm outline-none focus:border-[var(--amber-primary)]"
                      style={{ borderColor: 'var(--polaroid-border)' }} />
                  </div>
                )}
                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: 'var(--polaroid-text)' }}>角色</label>
                  <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}
                    className="w-full rounded-lg border bg-white px-3 py-2 text-sm outline-none focus:border-[var(--amber-primary)]"
                    style={{ borderColor: 'var(--polaroid-border)' }}>
                    {ROLES.map((r) => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
                  </select>
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-sm font-medium" style={{ color: 'var(--polaroid-text)' }}>启用状态</label>
                  <button onClick={() => setForm({ ...form, is_active: !form.is_active })}
                    className="relative h-6 w-11 rounded-full transition-colors"
                    style={{ backgroundColor: form.is_active ? 'var(--amber-primary)' : '#D1D5DB' }}>
                    <span className="absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform"
                      style={{ transform: form.is_active ? 'translateX(20px)' : 'translateX(0)' }} />
                  </button>
                </div>
              </div>
              <div className="flex justify-end gap-2 mt-6">
                <button onClick={() => setShowDialog(false)}
                  className="rounded-lg px-4 py-2 text-sm border transition-colors hover:bg-gray-50"
                  style={{ borderColor: 'var(--polaroid-border)', color: 'var(--polaroid-text-muted)' }}>取消</button>
                <button onClick={handleSave} disabled={saving}
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
