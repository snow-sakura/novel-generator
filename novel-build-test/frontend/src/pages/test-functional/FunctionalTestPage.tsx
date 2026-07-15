import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Edit2, Trash2, X, Play, CheckCircle2, XCircle, Clock, Loader2 } from 'lucide-react'
import { functionalTestApi } from '../../lib/api-service'
import type { FunctionalTestCaseItem } from '../../lib/api-service'

interface ExecutionRun {
  id: number
  date: string
  total: number
  pass: number
  fail: number
  duration: string
  triggered_by: string
}

const PRIORITY_COLORS: Record<string, string> = {
  P0: 'bg-red-50 text-red-600',
  P1: 'bg-orange-50 text-orange-600',
  P2: 'bg-blue-50 text-blue-600',
  P3: 'bg-gray-50 text-gray-500',
}

const STATUS_COLORS: Record<string, string> = {
  passed: 'bg-green-50 text-green-600',
  failed: 'bg-red-50 text-red-600',
  blocked: 'bg-yellow-50 text-yellow-600',
  draft: 'bg-gray-100 text-gray-500',
  ready: 'bg-blue-50 text-blue-600',
}

const MODULES = ['登录模块', '注册模块', '密码管理', '个人中心', '账号管理']

export default function FunctionalTestPage() {
  const [activeTab, setActiveTab] = useState<'func-cases' | 'func-execution'>('func-cases')
  const [cases, setCases] = useState<FunctionalTestCaseItem[]>([])
  const [loading, setLoading] = useState(true)
  const [runs, setRuns] = useState<ExecutionRun[]>([])
  const [showDialog, setShowDialog] = useState(false)
  const [editItem, setEditItem] = useState<FunctionalTestCaseItem | null>(null)
  type FormState = { title: string; module: string; priority: FunctionalTestCaseItem['priority']; status: FunctionalTestCaseItem['status'] }
  const [form, setForm] = useState<FormState>({ title: '', module: '登录模块', priority: 'P1', status: 'draft' })
  const [executing, setExecuting] = useState(false)

  useEffect(() => {
    (async () => {
      try {
        setLoading(true)
        const res = await functionalTestApi.list({ page_size: 100 })
        setCases(res.data.items)
      } catch {
        setLoading(false)
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  const openCreate = () => {
    setEditItem(null)
    setForm({ title: '', module: '登录模块', priority: 'P1', status: 'draft' })
    setShowDialog(true)
  }

  const openEdit = (tc: FunctionalTestCaseItem) => {
    setEditItem(tc)
    setForm({ title: tc.title, module: tc.module || '', priority: tc.priority, status: tc.status })
    setShowDialog(true)
  }

  const handleSave = async () => {
    try {
      if (editItem) {
        const res = await functionalTestApi.update(editItem.id, form)
        setCases(prev => prev.map(c => c.id === editItem.id ? res.data : c))
      } else {
        const res = await functionalTestApi.create(form)
        setCases(prev => [...prev, res.data])
      }
      setShowDialog(false)
    } catch {
      // silently fail
    }
  }

  const handleDelete = async (id: number) => {
    if (window.confirm('确定删除该测试用例？')) {
      try {
        await functionalTestApi.delete(id)
        setCases(prev => prev.filter(c => c.id !== id))
      } catch {
        // silently fail
      }
    }
  }

  const handleExecute = async () => {
    if (cases.length === 0) return
    setExecuting(true)
    try {
      const res = await functionalTestApi.run(cases[0].id)
      const newRun: ExecutionRun = {
        id: res.data.execution_id,
        date: new Date().toLocaleString('zh-CN'),
        total: cases.length,
        pass: cases.filter(c => c.status === 'passed').length,
        fail: cases.filter(c => c.status === 'failed').length,
        duration: '处理中',
        triggered_by: '手动执行',
      }
      setRuns(prev => [newRun, ...prev])
    } catch {
      // silently fail
    } finally {
      setExecuting(false)
    }
  }

  const tabs = [
    { key: 'func-cases', label: '用例管理' },
    { key: 'func-execution', label: '用例执行' },
  ]

  const passRate = runs.length > 0 && runs[0].total > 0 ? Math.round(runs[0].pass / runs[0].total * 100) : 0

  const statusLabel: Record<string, string> = {
    passed: '通过', failed: '失败', blocked: '阻塞', draft: '草稿', ready: '就绪',
  }

  return (
    <div className="space-y-4">
      {/* Tab 栏 */}
      <div className="flex gap-1 p-1 rounded-lg" style={{ backgroundColor: 'var(--polaroid-warm)' }}>
        {tabs.map((t) => (
          <button key={t.key} onClick={() => setActiveTab(t.key as typeof activeTab)}
            className="flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all"
            style={{
              backgroundColor: activeTab === t.key ? 'var(--polaroid-white)' : 'transparent',
              color: activeTab === t.key ? 'var(--amber-primary)' : 'var(--polaroid-text-muted)',
              boxShadow: activeTab === t.key ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
            }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* 用例管理 */}
      {activeTab === 'func-cases' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button onClick={openCreate}
              className="flex items-center gap-2 rounded-lg px-4 py-2 text-sm text-white transition-opacity hover:opacity-90"
              style={{ backgroundColor: 'var(--amber-primary)' }}>
              <Plus className="h-4 w-4" /> 添加用例
            </button>
          </div>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin" style={{ color: 'var(--amber-primary)' }} />
            </div>
          ) : (
          <div className="rounded-xl border overflow-hidden" style={{ borderColor: 'var(--polaroid-border)' }}>
            <table className="w-full text-sm">
              <thead>
                <tr style={{ backgroundColor: 'var(--polaroid-warm)' }}>
                  <th className="px-4 py-3 text-left font-medium" style={{ color: 'var(--polaroid-text)' }}>ID</th>
                  <th className="px-4 py-3 text-left font-medium" style={{ color: 'var(--polaroid-text)' }}>标题</th>
                  <th className="px-4 py-3 text-left font-medium" style={{ color: 'var(--polaroid-text)' }}>所属模块</th>
                  <th className="px-4 py-3 text-left font-medium" style={{ color: 'var(--polaroid-text)' }}>优先级</th>
                  <th className="px-4 py-3 text-left font-medium" style={{ color: 'var(--polaroid-text)' }}>状态</th>
                  <th className="px-4 py-3 text-right font-medium" style={{ color: 'var(--polaroid-text)' }}>操作</th>
                </tr>
              </thead>
              <tbody>
                {cases.map((tc) => (
                  <tr key={tc.id} className="border-t hover:bg-gray-50/50" style={{ borderColor: 'var(--polaroid-border)' }}>
                    <td className="px-4 py-3 text-sm" style={{ color: 'var(--polaroid-text-muted)' }}>#{tc.id}</td>
                    <td className="px-4 py-3 font-medium" style={{ color: 'var(--polaroid-text)' }}>{tc.title}</td>
                    <td className="px-4 py-3 text-sm" style={{ color: 'var(--polaroid-text-muted)' }}>{tc.module || '-'}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${PRIORITY_COLORS[tc.priority]}`}>
                        {tc.priority}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[tc.status] || 'bg-gray-100 text-gray-500'}`}>
                        {tc.status === 'passed' && <CheckCircle2 className="h-3 w-3" />}
                        {tc.status === 'failed' && <XCircle className="h-3 w-3" />}
                        {tc.status === 'blocked' && <Clock className="h-3 w-3" />}
                        {statusLabel[tc.status] || tc.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button onClick={() => openEdit(tc)} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
                        <Edit2 className="h-4 w-4" style={{ color: 'var(--polaroid-text-muted)' }} />
                      </button>
                      <button onClick={() => handleDelete(tc.id)} className="p-1.5 rounded-lg hover:bg-red-50 transition-colors">
                        <Trash2 className="h-4 w-4 text-red-400" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          )}
        </div>
      )}

      {/* 用例执行 */}
      {activeTab === 'func-execution' && (
        <div className="space-y-4">
          {/* Stats Cards */}
          <div className="grid gap-4 md:grid-cols-4">
            <div className="rounded-xl border p-5" style={{ borderColor: 'var(--polaroid-border)', backgroundColor: 'var(--polaroid-white)' }}>
              <p className="text-sm" style={{ color: 'var(--polaroid-text-muted)' }}>用例总数</p>
              <p className="text-2xl font-bold mt-1" style={{ color: 'var(--polaroid-text)' }}>{cases.length}</p>
            </div>
            <div className="rounded-xl border p-5" style={{ borderColor: 'var(--polaroid-border)', backgroundColor: 'var(--polaroid-white)' }}>
              <p className="text-sm" style={{ color: 'var(--polaroid-text-muted)' }}>上次执行总数</p>
              <p className="text-2xl font-bold mt-1" style={{ color: 'var(--polaroid-text)' }}>{runs[0]?.total || 0}</p>
            </div>
            <div className="rounded-xl border p-5" style={{ borderColor: 'var(--polaroid-border)', backgroundColor: 'var(--polaroid-white)' }}>
              <p className="text-sm" style={{ color: 'var(--polaroid-text-muted)' }}>通过率</p>
              <p className="text-2xl font-bold mt-1 text-green-600">{passRate}%</p>
            </div>
            <div className="rounded-xl border p-5" style={{ borderColor: 'var(--polaroid-border)', backgroundColor: 'var(--polaroid-white)' }}>
              <p className="text-sm" style={{ color: 'var(--polaroid-text-muted)' }}>失败数</p>
              <p className="text-2xl font-bold mt-1 text-red-500">{runs[0]?.fail || 0}</p>
            </div>
          </div>

          <div className="flex justify-end">
            <button onClick={handleExecute} disabled={executing}
              className="flex items-center gap-2 rounded-lg px-4 py-2 text-sm text-white transition-opacity hover:opacity-90 disabled:opacity-50"
              style={{ backgroundColor: 'var(--amber-primary)' }}>
              {executing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
              {executing ? '执行中...' : '执行'}
            </button>
          </div>

          <div className="rounded-xl border overflow-hidden" style={{ borderColor: 'var(--polaroid-border)' }}>
            <table className="w-full text-sm">
              <thead>
                <tr style={{ backgroundColor: 'var(--polaroid-warm)' }}>
                  <th className="px-4 py-3 text-left font-medium" style={{ color: 'var(--polaroid-text)' }}>执行ID</th>
                  <th className="px-4 py-3 text-left font-medium" style={{ color: 'var(--polaroid-text)' }}>执行时间</th>
                  <th className="px-4 py-3 text-left font-medium" style={{ color: 'var(--polaroid-text)' }}>总数</th>
                  <th className="px-4 py-3 text-left font-medium" style={{ color: 'var(--polaroid-text)' }}>通过</th>
                  <th className="px-4 py-3 text-left font-medium" style={{ color: 'var(--polaroid-text)' }}>失败</th>
                  <th className="px-4 py-3 text-left font-medium" style={{ color: 'var(--polaroid-text)' }}>耗时</th>
                  <th className="px-4 py-3 text-left font-medium" style={{ color: 'var(--polaroid-text)' }}>触发人</th>
                </tr>
              </thead>
              <tbody>
                {runs.map((run) => (
                  <tr key={run.id} className="border-t hover:bg-gray-50/50" style={{ borderColor: 'var(--polaroid-border)' }}>
                    <td className="px-4 py-3 text-sm font-mono" style={{ color: 'var(--polaroid-text-muted)' }}>#{run.id}</td>
                    <td className="px-4 py-3 text-sm" style={{ color: 'var(--polaroid-text)' }}>{run.date}</td>
                    <td className="px-4 py-3 text-sm" style={{ color: 'var(--polaroid-text)' }}>{run.total}</td>
                    <td className="px-4 py-3 text-sm text-green-600">{run.pass}</td>
                    <td className="px-4 py-3 text-sm text-red-500">{run.fail}</td>
                    <td className="px-4 py-3 text-sm" style={{ color: 'var(--polaroid-text-muted)' }}>{run.duration}</td>
                    <td className="px-4 py-3 text-sm" style={{ color: 'var(--polaroid-text-muted)' }}>{run.triggered_by}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 弹窗 */}
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
                  {editItem ? '编辑用例' : '添加用例'}
                </h3>
                <button onClick={() => setShowDialog(false)} className="p-1 rounded-lg hover:bg-gray-100">
                  <X className="h-5 w-5" style={{ color: 'var(--polaroid-text-muted)' }} />
                </button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: 'var(--polaroid-text)' }}>标题</label>
                  <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })}
                    className="w-full rounded-lg border bg-white px-3 py-2 text-sm outline-none"
                    style={{ borderColor: 'var(--polaroid-border)' }} />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: 'var(--polaroid-text)' }}>所属模块</label>
                  <select value={form.module} onChange={(e) => setForm({ ...form, module: e.target.value })}
                    className="w-full rounded-lg border bg-white px-3 py-2 text-sm outline-none"
                    style={{ borderColor: 'var(--polaroid-border)' }}>
                    {MODULES.map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1" style={{ color: 'var(--polaroid-text)' }}>优先级</label>
                    <select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value as FunctionalTestCaseItem['priority'] })}
                      className="w-full rounded-lg border bg-white px-3 py-2 text-sm outline-none"
                      style={{ borderColor: 'var(--polaroid-border)' }}>
                      <option value="P0">P0 - 关键</option>
                      <option value="P1">P1 - 重要</option>
                      <option value="P2">P2 - 一般</option>
                      <option value="P3">P3 - 次要</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1" style={{ color: 'var(--polaroid-text)' }}>状态</label>
                    <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as FunctionalTestCaseItem['status'] })}
                      className="w-full rounded-lg border bg-white px-3 py-2 text-sm outline-none"
                      style={{ borderColor: 'var(--polaroid-border)' }}>
                      <option value="draft">草稿</option>
                      <option value="ready">就绪</option>
                      <option value="passed">通过</option>
                      <option value="failed">失败</option>
                      <option value="blocked">阻塞</option>
                    </select>
                  </div>
                </div>
              </div>
              <div className="flex justify-end gap-2 mt-6">
                <button onClick={() => setShowDialog(false)}
                  className="rounded-lg px-4 py-2 text-sm border transition-colors hover:bg-gray-50"
                  style={{ borderColor: 'var(--polaroid-border)', color: 'var(--polaroid-text-muted)' }}>取消</button>
                <button onClick={handleSave}
                  className="rounded-lg px-4 py-2 text-sm text-white transition-opacity hover:opacity-90"
                  style={{ backgroundColor: 'var(--amber-primary)' }}>保存</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
