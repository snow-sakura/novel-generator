import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Edit2, Trash2, X, Shield, ChevronDown, ChevronRight, Check, Loader2 } from 'lucide-react'
import { roleApi, type RoleItem } from '@/lib/api-service'

/** 菜单树 */
const MENU_TREE = [
  { key: 'projects', label: '项目管理', children: ['项目列表', '项目详情'] },
  { key: 'requirements', label: '需求管理', children: ['需求列表', '需求表单'] },
  { key: 'environments', label: '测试环境', children: ['环境列表', '环境配置', '健康检查'] },
  { key: 'assets', label: '测试资产库', children: ['资产列表', '资产详情'] },
  { key: 'knowledge', label: 'AI 知识库', children: ['知识库管理', '语义检索'] },
  { key: 'agents', label: 'AI 智能体', children: ['调度总控', '需求分析', '测试架构', '测试设计', '用例编写', '执行分析', '质量审计', '成本优化', '辩论引擎'] },
  { key: 'test-types', label: '测试类型', children: ['功能测试', '接口测试', 'Web自动化', 'App自动化', '性能测试', '安全测试', 'UI测试', '冒烟测试'] },
  { key: 'execution', label: '测试执行与报告', children: ['执行记录', '测试报告', '报告对比'] },
  { key: 'ai-config', label: 'AI 配置中心', children: ['模型配置', '提示词工程', '去AI味配置', '技能配置', '工作流配置', '测试数据配置', '集成与通知', 'MCP工具'] },
  { key: 'ai-apps', label: 'AI 应用', children: ['AI聊天室', 'AI数据库调优', 'AI助手'] },
  { key: 'settings', label: '系统设置', children: ['系统配置', '用户管理', '角色管理'] },
]

const DATA_SCOPES = [
  { value: 'all' as const, label: '全部数据', desc: '可查看所有项目的数据' },
  { value: 'project' as const, label: '项目数据', desc: '仅可查看所属项目的数据' },
  { value: 'self' as const, label: '仅本人', desc: '仅可查看自己创建的数据' },
]

export default function RoleManagementPage() {
  const [roles, setRoles] = useState<RoleItem[]>([])
  const [loading, setLoading] = useState(true)
  const [showDialog, setShowDialog] = useState(false)
  const [editRole, setEditRole] = useState<RoleItem | null>(null)
  const [form, setForm] = useState({ name: '', code: '', description: '', dataScope: 'self' as 'all' | 'project' | 'self' })
  const [menuPerms, setMenuPerms] = useState<string[]>([])
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set())
  const [saving, setSaving] = useState(false)

  const fetchRoles = async () => {
    setLoading(true)
    try {
      const res = await roleApi.list({ page: 1, page_size: 100 })
      setRoles(res.data.items)
    } catch (err) {
      console.error('Failed to fetch roles:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchRoles()
  }, [])

  const openCreate = () => {
    setEditRole(null)
    setForm({ name: '', code: '', description: '', dataScope: 'self' })
    setMenuPerms([])
    setShowDialog(true)
  }

  const openEdit = (r: RoleItem) => {
    setEditRole(r)
    setForm({ name: r.name, code: r.code, description: r.description || '', dataScope: r.data_scope })
    setMenuPerms(r.menu_permissions || [])
    setShowDialog(true)
  }

  const toggleGroup = (key: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev)
      next.has(key) ? next.delete(key) : next.add(key)
      return next
    })
  }

  const togglePerm = (perm: string) => {
    setMenuPerms((prev) => prev.includes(perm) ? prev.filter((p) => p !== perm) : [...prev, perm])
  }

  const toggleGroupPerms = (group: typeof MENU_TREE[0]) => {
    const allPerms = [group.key, ...group.children]
    const allSelected = allPerms.every((p) => menuPerms.includes(p))
    if (allSelected) {
      setMenuPerms((prev) => prev.filter((p) => !allPerms.includes(p)))
    } else {
      setMenuPerms((prev) => [...new Set([...prev, ...allPerms])])
    }
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      if (editRole) {
        await roleApi.update(editRole.id, {
          name: form.name,
          description: form.description,
          menu_permissions: menuPerms,
          data_scope: form.dataScope,
        })
      } else {
        await roleApi.create({
          name: form.name,
          code: form.code,
          description: form.description,
          menu_permissions: menuPerms,
          data_scope: form.dataScope,
        })
      }
      setShowDialog(false)
      await fetchRoles()
    } catch (err) {
      console.error('Failed to save role:', err)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: number) => {
    if (!window.confirm('确定删除该角色？')) return
    try {
      await roleApi.delete(id)
      await fetchRoles()
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : '删除失败'
      alert(message)
    }
  }

  return (
    <div className="space-y-4">
      {/* 标题栏 */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold" style={{ color: 'var(--polaroid-text)' }}>角色管理</h2>
          <p className="text-sm" style={{ color: 'var(--polaroid-text-muted)' }}>管理角色、菜单权限与数据权限</p>
        </div>
        <button onClick={openCreate}
          className="flex items-center gap-2 rounded-lg px-4 py-2 text-sm text-white transition-opacity hover:opacity-90"
          style={{ backgroundColor: 'var(--amber-primary)' }}>
          <Plus className="h-4 w-4" /> 新建角色
        </button>
      </div>

      {/* 角色列表 */}
      <div className="grid gap-4">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin" style={{ color: 'var(--amber-primary)' }} />
          </div>
        ) : roles.length === 0 ? (
          <div className="text-center py-12" style={{ color: 'var(--polaroid-text-muted)' }}>
            暂无角色数据
          </div>
        ) : (
          roles.map((r) => (
            <div key={r.id} className="rounded-xl border p-5 flex items-start justify-between"
              style={{ borderColor: 'var(--polaroid-border)', backgroundColor: 'var(--polaroid-white)' }}>
              <div className="flex items-start gap-4">
                <div className="h-11 w-11 rounded-xl flex items-center justify-center"
                  style={{ backgroundColor: 'rgba(245, 158, 11, 0.1)' }}>
                  <Shield className="h-5 w-5" style={{ color: 'var(--amber-primary)' }} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-semibold" style={{ color: 'var(--polaroid-text)' }}>{r.name}</h3>
                    <span className="text-xs rounded-full px-2 py-0.5 bg-gray-100" style={{ color: 'var(--polaroid-text-muted)' }}>{r.code}</span>
                  </div>
                  <p className="text-xs mt-1" style={{ color: 'var(--polaroid-text-muted)' }}>{r.description || '暂无描述'}</p>
                  <div className="flex items-center gap-4 mt-2 text-xs" style={{ color: 'var(--polaroid-text-muted)' }}>
                    <span>{r.user_count} 个用户</span>
                    <span>·</span>
                    <span>{(r.menu_permissions || []).length} 项菜单权限</span>
                    <span>·</span>
                    <span>数据范围: {DATA_SCOPES.find((s) => s.value === r.data_scope)?.label}</span>
                  </div>
                </div>
              </div>
              <div className="flex gap-1">
                <button onClick={() => openEdit(r)} className="p-2 rounded-lg hover:bg-gray-100 transition-colors">
                  <Edit2 className="h-4 w-4" style={{ color: 'var(--polaroid-text-muted)' }} />
                </button>
                <button onClick={() => handleDelete(r.id)} className="p-2 rounded-lg hover:bg-red-50 transition-colors">
                  <Trash2 className="h-4 w-4 text-red-400" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* 新建/编辑弹窗 */}
      <AnimatePresence>
        {showDialog && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
            onClick={() => setShowDialog(false)}>
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-2xl max-h-[85vh] rounded-2xl bg-white shadow-xl overflow-hidden flex flex-col"
              style={{ border: '1px solid var(--polaroid-border)' }}>
              {/* 头部 */}
              <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: 'var(--polaroid-border)' }}>
                <h3 className="text-lg font-semibold" style={{ color: 'var(--polaroid-text)' }}>{editRole ? '编辑角色' : '新建角色'}</h3>
                <button onClick={() => setShowDialog(false)} className="p-1 rounded-lg hover:bg-gray-100">
                  <X className="h-5 w-5" style={{ color: 'var(--polaroid-text-muted)' }} />
                </button>
              </div>

              <div className="flex-1 overflow-auto p-6 space-y-5">
                {/* 基本信息 */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1" style={{ color: 'var(--polaroid-text)' }}>角色名称 <span className="text-red-500">*</span></label>
                    <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                      className="w-full rounded-lg border bg-white px-3 py-2 text-sm outline-none focus:border-[var(--amber-primary)]"
                      style={{ borderColor: 'var(--polaroid-border)' }} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1" style={{ color: 'var(--polaroid-text)' }}>角色编码 <span className="text-red-500">*</span></label>
                    <input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })}
                      placeholder="如 test_engineer"
                      disabled={!!editRole}
                      className="w-full rounded-lg border bg-white px-3 py-2 text-sm outline-none focus:border-[var(--amber-primary)] disabled:bg-gray-50 disabled:text-gray-500"
                      style={{ borderColor: 'var(--polaroid-border)' }} />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: 'var(--polaroid-text)' }}>描述</label>
                  <input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
                    className="w-full rounded-lg border bg-white px-3 py-2 text-sm outline-none focus:border-[var(--amber-primary)]"
                    style={{ borderColor: 'var(--polaroid-border)' }} />
                </div>

                {/* 菜单权限 */}
                <div>
                  <label className="block text-sm font-medium mb-2" style={{ color: 'var(--polaroid-text)' }}>菜单权限</label>
                  <div className="rounded-lg border overflow-hidden" style={{ borderColor: 'var(--polaroid-border)' }}>
                    {MENU_TREE.map((group) => {
                      const expanded = expandedGroups.has(group.key)
                      const allPerms = [group.key, ...group.children]
                      const selectedCount = allPerms.filter((p) => menuPerms.includes(p)).length
                      const allSelected = selectedCount === allPerms.length

                      return (
                        <div key={group.key}>
                          <div className="flex items-center justify-between px-3 py-2 border-b cursor-pointer hover:bg-gray-50"
                            style={{ borderColor: 'var(--polaroid-border)' }}
                            onClick={() => toggleGroup(group.key)}>
                            <div className="flex items-center gap-2">
                              <button onClick={(e) => { e.stopPropagation(); toggleGroupPerms(group) }}
                                className="h-4 w-4 rounded border flex items-center justify-center"
                                style={{
                                  borderColor: allSelected ? 'var(--amber-primary)' : '#D1D5DB',
                                  backgroundColor: allSelected ? 'var(--amber-primary)' : 'white',
                                }}>
                                {allSelected && <Check className="h-3 w-3 text-white" />}
                              </button>
                              <span className="text-sm font-medium" style={{ color: 'var(--polaroid-text)' }}>{group.label}</span>
                              <span className="text-xs" style={{ color: 'var(--polaroid-text-muted)' }}>{selectedCount}/{allPerms.length}</span>
                            </div>
                            {expanded ? <ChevronDown className="h-4 w-4" style={{ color: 'var(--polaroid-text-muted)' }} />
                              : <ChevronRight className="h-4 w-4" style={{ color: 'var(--polaroid-text-muted)' }} />}
                          </div>
                          {expanded && (
                            <div className="bg-gray-50 px-6 py-2 grid grid-cols-3 gap-1">
                              {group.children.map((child) => {
                                const checked = menuPerms.includes(child)
                                return (
                                  <label key={child} className="flex items-center gap-2 cursor-pointer py-1"
                                    onClick={() => togglePerm(child)}>
                                    <div className="h-3.5 w-3.5 rounded border flex items-center justify-center"
                                      style={{
                                        borderColor: checked ? 'var(--amber-primary)' : '#D1D5DB',
                                        backgroundColor: checked ? 'var(--amber-primary)' : 'white',
                                      }}>
                                      {checked && <Check className="h-2.5 w-2.5 text-white" />}
                                    </div>
                                    <span className="text-xs" style={{ color: 'var(--polaroid-text)' }}>{child}</span>
                                  </label>
                                )
                              })}
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>

                {/* 数据权限 */}
                <div>
                  <label className="block text-sm font-medium mb-2" style={{ color: 'var(--polaroid-text)' }}>数据权限</label>
                  <div className="space-y-2">
                    {DATA_SCOPES.map((scope) => (
                      <label key={scope.value} className="flex items-center gap-3 rounded-lg border p-3 cursor-pointer transition-colors"
                        style={{
                          borderColor: form.dataScope === scope.value ? 'var(--amber-primary)' : 'var(--polaroid-border)',
                          backgroundColor: form.dataScope === scope.value ? 'rgba(245, 158, 11, 0.03)' : 'var(--polaroid-white)',
                        }}
                        onClick={() => setForm({ ...form, dataScope: scope.value })}>
                        <div className="h-4 w-4 rounded-full border-2 flex items-center justify-center"
                          style={{ borderColor: form.dataScope === scope.value ? 'var(--amber-primary)' : '#D1D5DB' }}>
                          {form.dataScope === scope.value && (
                            <div className="h-2 w-2 rounded-full" style={{ backgroundColor: 'var(--amber-primary)' }} />
                          )}
                        </div>
                        <div>
                          <p className="text-sm font-medium" style={{ color: 'var(--polaroid-text)' }}>{scope.label}</p>
                          <p className="text-xs" style={{ color: 'var(--polaroid-text-muted)' }}>{scope.desc}</p>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              </div>

              {/* 底部按钮 */}
              <div className="flex justify-end gap-2 px-6 py-4 border-t" style={{ borderColor: 'var(--polaroid-border)' }}>
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
