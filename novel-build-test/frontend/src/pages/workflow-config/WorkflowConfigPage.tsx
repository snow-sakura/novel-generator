import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Edit2, Trash2, X, Workflow, Play, Clock, RotateCcw } from 'lucide-react'

interface WorkflowTemplate {
  id: number
  name: string
  description: string
  steps: string[]
  timeout: number
  retry_count: number
  is_preset: boolean
}

const MOCK_TEMPLATES: WorkflowTemplate[] = [
  { id: 1, name: '全流程测试', description: '完整测试流程：需求分析→架构设计→测试设计→用例生成→执行→报告', steps: ['需求分析', '测试架构', '测试设计', '用例编写', '执行分析', '质量审计'], timeout: 3600, retry_count: 2, is_preset: true },
  { id: 2, name: '快速检测', description: '快速冒烟测试流程', steps: ['需求分析', '用例编写', '执行分析'], timeout: 1800, retry_count: 1, is_preset: true },
  { id: 3, name: '架构评审', description: '测试架构评审流程', steps: ['需求分析', '测试架构', '质量审计'], timeout: 1200, retry_count: 1, is_preset: true },
]

const ALL_STEPS = ['需求分析', '测试架构', '测试设计', '用例编写', '执行分析', '质量审计', '成本优化', '辩论引擎']

export default function WorkflowConfigPage() {
  const [templates, setTemplates] = useState<WorkflowTemplate[]>(MOCK_TEMPLATES)
  const [showDialog, setShowDialog] = useState(false)
  const [editTemplate, setEditTemplate] = useState<WorkflowTemplate | null>(null)
  const [form, setForm] = useState({ name: '', description: '', timeout: '3600', retry_count: '2' })
  const [selectedSteps, setSelectedSteps] = useState<string[]>([])

  const openCreate = () => {
    setEditTemplate(null)
    setForm({ name: '', description: '', timeout: '3600', retry_count: '2' })
    setSelectedSteps([])
    setShowDialog(true)
  }

  const openEdit = (t: WorkflowTemplate) => {
    setEditTemplate(t)
    setForm({ name: t.name, description: t.description, timeout: t.timeout.toString(), retry_count: t.retry_count.toString() })
    setSelectedSteps([...t.steps])
    setShowDialog(true)
  }

  const handleSave = () => {
    if (editTemplate) {
      setTemplates(prev => prev.map(t => t.id === editTemplate.id ? { ...t, ...form, steps: selectedSteps, timeout: parseInt(form.timeout), retry_count: parseInt(form.retry_count) } : t))
    } else {
      setTemplates(prev => [...prev, { id: Date.now(), ...form, steps: selectedSteps, timeout: parseInt(form.timeout), retry_count: parseInt(form.retry_count), is_preset: false }])
    }
    setShowDialog(false)
  }

  const toggleStep = (step: string) => {
    setSelectedSteps(prev => prev.includes(step) ? prev.filter(s => s !== step) : [...prev, step])
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm" style={{ color: 'var(--polaroid-text-muted)' }}>管理测试工作流模板，配置执行步骤和重试策略</p>
        <button onClick={openCreate}
          className="flex items-center gap-2 rounded-lg px-4 py-2 text-sm text-white transition-opacity hover:opacity-90"
          style={{ backgroundColor: 'var(--amber-primary)' }}>
          <Plus className="h-4 w-4" /> 新建模板
        </button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {templates.map((t) => (
          <motion.div key={t.id} whileHover={{ y: -2 }}
            className="rounded-xl border p-5 space-y-3" style={{ borderColor: 'var(--polaroid-border)', backgroundColor: 'var(--polaroid-white)' }}>
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: 'rgba(124, 58, 237, 0.1)' }}>
                  <Workflow className="h-5 w-5 text-purple-500" />
                </div>
                <div>
                  <h3 className="font-medium" style={{ color: 'var(--polaroid-text)' }}>{t.name}</h3>
                  {t.is_preset && <span className="text-xs text-amber-600">预置</span>}
                </div>
              </div>
            </div>
            <p className="text-xs" style={{ color: 'var(--polaroid-text-muted)' }}>{t.description}</p>
            <div className="flex flex-wrap gap-1">
              {t.steps.map((step, i) => (
                <span key={i} className="inline-flex items-center rounded-full bg-purple-50 px-2 py-0.5 text-xs text-purple-600">
                  {step}
                </span>
              ))}
            </div>
            <div className="flex items-center gap-4 text-xs pt-2 border-t" style={{ borderColor: 'var(--polaroid-border)', color: 'var(--polaroid-text-muted)' }}>
              <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {t.timeout}s</span>
              <span className="flex items-center gap-1"><RotateCcw className="h-3 w-3" /> {t.retry_count}次重试</span>
            </div>
            <div className="flex gap-2 pt-2">
              <button className="flex-1 flex items-center justify-center gap-1 rounded-lg px-3 py-2 text-xs border transition-colors hover:bg-gray-50"
                style={{ borderColor: 'var(--polaroid-border)' }}>
                <Play className="h-3 w-3" /> 发起
              </button>
              <button onClick={() => openEdit(t)} className="p-2 rounded-lg hover:bg-gray-100 transition-colors">
                <Edit2 className="h-4 w-4" style={{ color: 'var(--polaroid-text-muted)' }} />
              </button>
              {!t.is_preset && (
                <button onClick={() => setTemplates(prev => prev.filter(x => x.id !== t.id))} className="p-2 rounded-lg hover:bg-red-50 transition-colors">
                  <Trash2 className="h-4 w-4 text-red-400" />
                </button>
              )}
            </div>
          </motion.div>
        ))}
      </div>

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
                <h3 className="text-lg font-semibold" style={{ color: 'var(--polaroid-text)' }}>{editTemplate ? '编辑模板' : '新建模板'}</h3>
                <button onClick={() => setShowDialog(false)} className="p-1 rounded-lg hover:bg-gray-100">
                  <X className="h-5 w-5" style={{ color: 'var(--polaroid-text-muted)' }} />
                </button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: 'var(--polaroid-text)' }}>模板名称</label>
                  <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="w-full rounded-lg border bg-white px-3 py-2 text-sm outline-none"
                    style={{ borderColor: 'var(--polaroid-border)' }} />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: 'var(--polaroid-text)' }}>描述</label>
                  <input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
                    className="w-full rounded-lg border bg-white px-3 py-2 text-sm outline-none"
                    style={{ borderColor: 'var(--polaroid-border)' }} />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2" style={{ color: 'var(--polaroid-text)' }}>执行步骤</label>
                  <div className="flex flex-wrap gap-2">
                    {ALL_STEPS.map(step => (
                      <button key={step} onClick={() => toggleStep(step)}
                        className={`rounded-lg px-3 py-1.5 text-xs border transition-colors ${selectedSteps.includes(step) ? 'bg-purple-50 border-purple-300 text-purple-700' : 'hover:bg-gray-50'}`}
                        style={{ borderColor: selectedSteps.includes(step) ? undefined : 'var(--polaroid-border)' }}>
                        {step}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1" style={{ color: 'var(--polaroid-text)' }}>超时时间(秒)</label>
                    <input type="number" value={form.timeout} onChange={(e) => setForm({ ...form, timeout: e.target.value })}
                      className="w-full rounded-lg border bg-white px-3 py-2 text-sm outline-none"
                      style={{ borderColor: 'var(--polaroid-border)' }} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1" style={{ color: 'var(--polaroid-text)' }}>重试次数</label>
                    <input type="number" value={form.retry_count} onChange={(e) => setForm({ ...form, retry_count: e.target.value })}
                      className="w-full rounded-lg border bg-white px-3 py-2 text-sm outline-none"
                      style={{ borderColor: 'var(--polaroid-border)' }} />
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
