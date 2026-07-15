import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  ArrowLeft,
  Loader2,
  Edit2,
  Trash2,
  FileText,
  Server,
  Package,
  BookOpen,
  FolderKanban,
  BrainCircuit,
  ListChecks,
  BarChart3,
  MessageSquare,
  DollarSign,
  ChevronDown,
  ChevronRight,
} from 'lucide-react'
import { projectApi, type ProjectItem } from '@/lib/api-service'

/** 状态映射 */
const statusMap: Record<string, { label: string; color: string }> = {
  active: { label: '进行中', color: 'bg-emerald-50 text-emerald-600' },
  draft: { label: '草稿', color: 'bg-gray-100 text-gray-500' },
  archived: { label: '已归档', color: 'bg-blue-50 text-blue-600' },
}

/** 左侧导航项定义 */
interface NavItem {
  label: string
  path: string
  icon: React.ReactNode
  children?: { label: string; path: string; icon: React.ReactNode }[]
}

/**
 * 项目详情页（带左侧导航）
 */
export default function ProjectDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [project, setProject] = useState<ProjectItem | null>(null)
  const [stats, setStats] = useState({
    total_requirements: 0,
    total_environments: 0,
    total_assets: 0,
    total_knowledge: 0,
  })
  const [loading, setLoading] = useState(true)
  const [agentMenuOpen, setAgentMenuOpen] = useState(true)
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [editForm, setEditForm] = useState({ name: '', description: '', status: 'active' })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!id) return
    const projectId = Number(id)
    setLoading(true)

    Promise.all([
      projectApi.detail(projectId),
      projectApi.stats(projectId).catch(() => ({
        data: { total_requirements: 0, total_environments: 0, total_assets: 0, total_knowledge: 0 },
      })),
    ])
      .then(([projRes, statsRes]) => {
        setProject(projRes.data)
        setStats(statsRes.data)
      })
      .catch(() => setProject(null))
      .finally(() => setLoading(false))
  }, [id])

  const openEdit = () => {
    if (!project) return
    setEditForm({ name: project.name, description: project.description || '', status: project.status })
    setShowEditDialog(true)
  }

  const handleSave = async () => {
    if (!project || !editForm.name.trim()) return
    setSaving(true)
    try {
      await projectApi.update(project.id, editForm as Partial<ProjectItem>)
      setProject({ ...project, ...editForm } as ProjectItem)
      setShowEditDialog(false)
    } catch (err) {
      console.error('Failed to update project:', err)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!project) return
    if (!window.confirm('确定删除该项目？相关数据将一并删除。')) return
    try {
      await projectApi.delete(project.id)
      navigate('/')
    } catch (err) {
      console.error('Failed to delete project:', err)
    }
  }

  const isActive = (path: string) => {
    const resolved = path.replace(':id', id || '')
    return location.pathname === resolved || location.pathname.startsWith(resolved + '/')
  }

  const navItems: NavItem[] = [
    { label: '需求管理', path: `/projects/${id}/requirements`, icon: <FileText className="h-4 w-4" /> },
    { label: '测试环境', path: `/projects/${id}/environments`, icon: <Server className="h-4 w-4" /> },
    { label: '测试资产', path: `/projects/${id}/assets`, icon: <Package className="h-4 w-4" /> },
    { label: 'AI 知识库', path: `/projects/${id}/knowledge`, icon: <BookOpen className="h-4 w-4" /> },
    {
      label: '智能体',
      path: `/projects/${id}/agents`,
      icon: <BrainCircuit className="h-4 w-4" />,
      children: [
        { label: '发起任务', path: `/projects/${id}/agents`, icon: <BrainCircuit className="h-4 w-4" /> },
        { label: '执行记录', path: `/projects/${id}/agents/executions`, icon: <ListChecks className="h-4 w-4" /> },
        { label: '辩论管理', path: `/projects/${id}/agents/debate`, icon: <MessageSquare className="h-4 w-4" /> },
        { label: '成本统计', path: `/projects/${id}/agents/costs`, icon: <DollarSign className="h-4 w-4" /> },
      ],
    },
    { label: '执行记录', path: `/projects/${id}/executions`, icon: <ListChecks className="h-4 w-4" /> },
    { label: '测试报告', path: `/projects/${id}/reports`, icon: <BarChart3 className="h-4 w-4" /> },
  ]

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin" style={{ color: 'var(--amber-primary)' }} />
      </div>
    )
  }

  if (!project) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" onClick={() => navigate('/')}>
          <ArrowLeft className="mr-1 h-4 w-4" />
          返回首页
        </Button>
        <Card className="border-[var(--polaroid-border)]">
          <CardContent className="p-6 text-center" style={{ color: 'var(--polaroid-text-muted)' }}>
            项目不存在或已被删除
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="flex gap-6">
      {/* ===== 左侧导航 ===== */}
      <aside className="w-52 shrink-0 space-y-1">
        <div
          className={cn(
            'flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium cursor-pointer transition-colors',
            isActive(`/projects/${id}`) && !isActive('/agents') && !isActive('/requirements')
              ? 'bg-amber-100 text-amber-800'
              : 'text-gray-600 hover:bg-gray-100',
          )}
          onClick={() => navigate(`/projects/${id}`)}
        >
          <FolderKanban className="h-4 w-4" />
          <span>项目概览</span>
        </div>

        <div className="border-t border-gray-200 my-2" />

        {navItems.map((item) => {
          if (item.children) {
            return (
              <div key={item.label}>
                <button
                  onClick={() => { setAgentMenuOpen(!agentMenuOpen); navigate(item.path) }}
                  className={cn(
                    'flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                    isActive(item.path) ? 'bg-amber-100 text-amber-800' : 'text-gray-600 hover:bg-gray-100',
                  )}
                >
                  <span className="shrink-0">{item.icon}</span>
                  <span className="flex-1 text-left">{item.label}</span>
                  {agentMenuOpen ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                </button>
                {agentMenuOpen && (
                  <div className="ml-4 mt-1 space-y-1">
                    {item.children.map((child) => (
                      <button
                        key={child.label}
                        onClick={() => navigate(child.path)}
                        className={cn(
                          'flex w-full items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors',
                          isActive(child.path) ? 'bg-amber-50 text-amber-700' : 'text-gray-500 hover:bg-gray-50 hover:text-gray-700',
                        )}
                      >
                        <span className="shrink-0">{child.icon}</span>
                        <span>{child.label}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )
          }
          return (
            <button
              key={item.label}
              onClick={() => navigate(item.path)}
              className={cn(
                'flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                isActive(item.path) ? 'bg-amber-100 text-amber-800' : 'text-gray-600 hover:bg-gray-100',
              )}
            >
              <span className="shrink-0">{item.icon}</span>
              <span>{item.label}</span>
            </button>
          )
        })}
      </aside>

      {/* ===== 右侧内容 ===== */}
      <div className="flex-1 space-y-6 min-w-0">
        {/* 返回 + 标题 + 操作 */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => navigate('/')}>
              <ArrowLeft className="mr-1 h-4 w-4" />
              返回
            </Button>
            <div className="flex items-center gap-2">
              <FolderKanban className="h-5 w-5" style={{ color: 'var(--amber-primary)' }} />
              <h2 className="text-xl font-semibold" style={{ color: 'var(--polaroid-text)' }}>{project.name}</h2>
            </div>
            <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${statusMap[project.status]?.color || ''}`}>
              {statusMap[project.status]?.label || project.status}
            </span>
          </div>
          <div className="flex gap-2">
            <button onClick={openEdit}
              className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm border transition-colors hover:bg-gray-50"
              style={{ borderColor: 'var(--polaroid-border)', color: 'var(--polaroid-text)' }}>
              <Edit2 className="h-4 w-4" /> 编辑
            </button>
            <button onClick={handleDelete}
              className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm border transition-colors hover:bg-red-50 text-red-500"
              style={{ borderColor: 'var(--polaroid-border)' }}>
              <Trash2 className="h-4 w-4" /> 删除
            </button>
          </div>
        </div>

        {/* 基本信息卡片 */}
        <Card className="border-[var(--polaroid-border)]">
          <CardHeader className="border-b bg-[var(--polaroid-warm)]" style={{ borderColor: 'var(--polaroid-border)' }}>
            <CardTitle className="text-base" style={{ color: 'var(--polaroid-text)' }}>基本信息</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 p-6 text-sm md:grid-cols-3">
            <div>
              <span className="font-medium" style={{ color: 'var(--polaroid-text-muted)' }}>描述：</span>
              <span style={{ color: 'var(--polaroid-text)' }}>{project.description || '—'}</span>
            </div>
            <div>
              <span className="font-medium" style={{ color: 'var(--polaroid-text-muted)' }}>创建时间：</span>
              <span style={{ color: 'var(--polaroid-text)' }}>{new Date(project.created_at).toLocaleString('zh-CN')}</span>
            </div>
            <div>
              <span className="font-medium" style={{ color: 'var(--polaroid-text-muted)' }}>更新时间：</span>
              <span style={{ color: 'var(--polaroid-text)' }}>{new Date(project.updated_at).toLocaleString('zh-CN')}</span>
            </div>
          </CardContent>
        </Card>

        {/* 关联模块统计卡片 */}
        <div>
          <h3 className="mb-3 text-base font-semibold" style={{ color: 'var(--polaroid-text)' }}>关联模块</h3>
          <div className="grid gap-4 md:grid-cols-4">
            {[
              { label: '需求', value: stats.total_requirements, icon: <FileText className="h-5 w-5" />, color: '#3B82F6', path: `/projects/${id}/requirements` },
              { label: '环境', value: stats.total_environments, icon: <Server className="h-5 w-5" />, color: '#10B981', path: `/projects/${id}/environments` },
              { label: '资产', value: stats.total_assets, icon: <Package className="h-5 w-5" />, color: '#8B5CF6', path: `/projects/${id}/assets` },
              { label: '知识', value: stats.total_knowledge, icon: <BookOpen className="h-5 w-5" />, color: '#EC4899', path: `/projects/${id}/knowledge` },
            ].map((stat) => (
              <motion.div key={stat.label} whileHover={{ y: -4 }}>
                <Card className="cursor-pointer border-[var(--polaroid-border)] transition-all hover:shadow-lg"
                  onClick={() => navigate(stat.path)}>
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium" style={{ color: 'var(--polaroid-text-muted)' }}>{stat.label}</CardTitle>
                    <span style={{ color: stat.color }}>{stat.icon}</span>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold" style={{ color: 'var(--polaroid-text)' }}>{stat.value}</div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>

        {/* 快捷操作 */}
        <div>
          <h3 className="mb-3 text-base font-semibold" style={{ color: 'var(--polaroid-text)' }}>快捷操作</h3>
          <div className="grid gap-4 md:grid-cols-3">
            <motion.div whileHover={{ y: -4 }}>
              <Card className="cursor-pointer border-[var(--polaroid-border)] transition-all hover:shadow-lg"
                onClick={() => navigate(`/projects/${id}/agents`)}>
                <CardHeader className="flex flex-row items-center gap-3 pb-2">
                  <div className="rounded-lg p-2" style={{ backgroundColor: 'rgba(245, 158, 11, 0.1)' }}>
                    <BrainCircuit className="h-5 w-5" style={{ color: 'var(--amber-primary)' }} />
                  </div>
                  <div>
                    <CardTitle className="text-sm font-medium" style={{ color: 'var(--polaroid-text)' }}>AI 智能体</CardTitle>
                    <p className="text-xs" style={{ color: 'var(--polaroid-text-muted)' }}>启动多智能体协作测试</p>
                  </div>
                </CardHeader>
              </Card>
            </motion.div>
            <motion.div whileHover={{ y: -4 }}>
              <Card className="cursor-pointer border-[var(--polaroid-border)] transition-all hover:shadow-lg"
                onClick={() => navigate(`/projects/${id}/executions`)}>
                <CardHeader className="flex flex-row items-center gap-3 pb-2">
                  <div className="rounded-lg bg-blue-50 p-2">
                    <ListChecks className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <CardTitle className="text-sm font-medium" style={{ color: 'var(--polaroid-text)' }}>执行记录</CardTitle>
                    <p className="text-xs" style={{ color: 'var(--polaroid-text-muted)' }}>查看智能体执行历史</p>
                  </div>
                </CardHeader>
              </Card>
            </motion.div>
            <motion.div whileHover={{ y: -4 }}>
              <Card className="cursor-pointer border-[var(--polaroid-border)] transition-all hover:shadow-lg"
                onClick={() => navigate(`/projects/${id}/reports`)}>
                <CardHeader className="flex flex-row items-center gap-3 pb-2">
                  <div className="rounded-lg bg-green-50 p-2">
                    <BarChart3 className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <CardTitle className="text-sm font-medium" style={{ color: 'var(--polaroid-text)' }}>测试报告</CardTitle>
                    <p className="text-xs" style={{ color: 'var(--polaroid-text-muted)' }}>查看测试结果分析</p>
                  </div>
                </CardHeader>
              </Card>
            </motion.div>
          </div>
        </div>
      </div>

      {/* 编辑弹窗 */}
      {showEditDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setShowEditDialog(false)}>
          <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl"
            style={{ border: '1px solid var(--polaroid-border)' }}>
            <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--polaroid-text)' }}>编辑项目</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: 'var(--polaroid-text)' }}>项目名称</label>
                <input value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  className="w-full rounded-lg border bg-white px-3 py-2 text-sm outline-none focus:border-[var(--amber-primary)]"
                  style={{ borderColor: 'var(--polaroid-border)' }} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: 'var(--polaroid-text)' }}>项目描述</label>
                <textarea value={editForm.description} onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                  rows={3}
                  className="w-full rounded-lg border bg-white px-3 py-2 text-sm outline-none resize-none focus:border-[var(--amber-primary)]"
                  style={{ borderColor: 'var(--polaroid-border)' }} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: 'var(--polaroid-text)' }}>状态</label>
                <select value={editForm.status} onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                  className="w-full rounded-lg border bg-white px-3 py-2 text-sm outline-none focus:border-[var(--amber-primary)]"
                  style={{ borderColor: 'var(--polaroid-border)' }}>
                  <option value="active">进行中</option>
                  <option value="draft">草稿</option>
                  <option value="archived">已归档</option>
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <button onClick={() => setShowEditDialog(false)}
                className="rounded-lg px-4 py-2 text-sm border transition-colors hover:bg-gray-50"
                style={{ borderColor: 'var(--polaroid-border)', color: 'var(--polaroid-text-muted)' }}>取消</button>
              <button onClick={handleSave} disabled={saving}
                className="rounded-lg px-4 py-2 text-sm text-white transition-opacity hover:opacity-90 disabled:opacity-50"
                style={{ backgroundColor: 'var(--amber-primary)' }}>
                {saving ? '保存中...' : '保存'}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  )
}
