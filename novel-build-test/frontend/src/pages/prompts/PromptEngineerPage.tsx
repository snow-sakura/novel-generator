import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Trash2, X, PenTool, Copy, Zap } from 'lucide-react'

interface Prompt {
  id: number
  agent_key: string
  agent_name: string
  content: string
  version: number
  updated_at: string
}

interface Template {
  id: number
  name: string
  category: string
  content: string
  is_preset: boolean
}

const AGENTS = [
  { key: 'requirements_analyst', name: '需求分析', color: '#3B82F6' },
  { key: 'test_architect', name: '测试架构', color: '#0891B2' },
  { key: 'test_designer', name: '测试设计', color: '#0D9488' },
  { key: 'test_case_writer', name: '用例编写', color: '#059669' },
  { key: 'execution_analyst', name: '执行分析', color: '#EA580C' },
  { key: 'quality_auditor', name: '质量审计', color: '#DC2626' },
  { key: 'cost_optimizer', name: '成本优化', color: '#10B981' },
]

const MOCK_PROMPTS: Prompt[] = [
  { id: 1, agent_key: 'requirements_analyst', agent_name: '需求分析', content: '你是一个资深的测试需求分析师。你的任务是分析产品需求文档，提取关键功能点、边界条件和潜在风险。', version: 3, updated_at: '2026-07-13' },
  { id: 2, agent_key: 'test_architect', agent_name: '测试架构', content: '你是一个测试架构师。你需要根据需求设计合理的测试架构，包括测试层级、技术选型和工具推荐。', version: 2, updated_at: '2026-07-12' },
  { id: 3, agent_key: 'test_designer', agent_name: '测试设计', content: '你是一个测试设计专家。你需要设计全面的测试场景，覆盖功能、边界、异常和性能测试。', version: 1, updated_at: '2026-07-11' },
]

const MOCK_TEMPLATES: Template[] = [
  { id: 1, name: '标准测试分析', category: '测试分析', content: '请分析以下需求，提取测试要点...', is_preset: true },
  { id: 2, name: 'API测试用例', category: '用例生成', content: '请为以下API接口生成测试用例...', is_preset: true },
  { id: 3, name: '安全测试检查', category: '安全测试', content: '请检查以下功能的安全风险...', is_preset: true },
]

export default function PromptEngineerPage() {
  const [activeTab, setActiveTab] = useState<'prompts' | 'templates' | 'debug'>('prompts')
  const [prompts, setPrompts] = useState<Prompt[]>(MOCK_PROMPTS)
  const [templates, setTemplates] = useState<Template[]>(MOCK_TEMPLATES)
  const [selectedPrompt, setSelectedPrompt] = useState<Prompt | null>(MOCK_PROMPTS[0])
  const [editContent, setEditContent] = useState(MOCK_PROMPTS[0].content)
  const [showTemplateDialog, setShowTemplateDialog] = useState(false)
  const [templateForm, setTemplateForm] = useState({ name: '', category: '', content: '' })
  const [debugInput, setDebugInput] = useState('')
  const [debugOutput, setDebugOutput] = useState('')
  const [debugging, setDebugging] = useState(false)

  const handleSavePrompt = () => {
    if (!selectedPrompt) return
    setPrompts(prev => prev.map(p =>
      p.id === selectedPrompt.id ? { ...p, content: editContent, version: p.version + 1, updated_at: new Date().toISOString().slice(0, 10) } : p
    ))
    alert('提示词已保存')
  }

  const handleDebug = () => {
    if (!debugInput.trim()) return
    setDebugging(true)
    setTimeout(() => {
      setDebugOutput(`基于输入："${debugInput}"\n\nAI 将按照当前提示词生成测试分析结果...\n\n[模拟输出 - 实际版本将调用真实 LLM]`)
      setDebugging(false)
    }, 1500)
  }

  const tabs = [
    { key: 'prompts', label: 'Agent 提示词', icon: PenTool },
    { key: 'templates', label: '模板库', icon: Copy },
    { key: 'debug', label: '在线调试', icon: Zap },
  ]

  return (
    <div className="space-y-4">
      {/* Tab 栏 */}
      <div className="flex gap-1 p-1 rounded-lg" style={{ backgroundColor: 'var(--polaroid-warm)' }}>
        {tabs.map((t) => {
          const Icon = t.icon
          return (
            <button key={t.key} onClick={() => setActiveTab(t.key as typeof activeTab)}
              className="flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all"
              style={{
                backgroundColor: activeTab === t.key ? 'var(--polaroid-white)' : 'transparent',
                color: activeTab === t.key ? 'var(--amber-primary)' : 'var(--polaroid-text-muted)',
                boxShadow: activeTab === t.key ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
              }}>
              <Icon className="h-4 w-4" />
              {t.label}
            </button>
          )
        })}
      </div>

      {/* Agent 提示词 */}
      {activeTab === 'prompts' && (
        <div className="flex gap-6">
          {/* 左侧：Agent 列表 */}
          <div className="w-48 shrink-0 space-y-2">
            {AGENTS.map((agent) => {
              const prompt = prompts.find(p => p.agent_key === agent.key)
              const isSelected = selectedPrompt?.agent_key === agent.key
              return (
                <button key={agent.key}
                  onClick={() => { setSelectedPrompt(prompt || null); setEditContent(prompt?.content || '') }}
                  className={`w-full text-left rounded-lg px-3 py-2.5 text-sm transition-colors ${isSelected ? 'bg-amber-50' : 'hover:bg-gray-50'}`}
                  style={{ borderLeft: `3px solid ${isSelected ? agent.color : 'transparent'}` }}>
                  <p className="font-medium" style={{ color: isSelected ? agent.color : 'var(--polaroid-text)' }}>{agent.name}</p>
                  {prompt && (
                    <p className="text-xs mt-0.5" style={{ color: 'var(--polaroid-text-muted)' }}>v{prompt.version}</p>
                  )}
                </button>
              )
            })}
          </div>

          {/* 右侧：编辑器 */}
          <div className="flex-1 rounded-xl border overflow-hidden" style={{ borderColor: 'var(--polaroid-border)' }}>
            {selectedPrompt ? (
              <>
                <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: 'var(--polaroid-border)', backgroundColor: 'var(--polaroid-warm)' }}>
                  <div>
                    <h3 className="font-medium" style={{ color: 'var(--polaroid-text)' }}>{selectedPrompt.agent_name} 提示词</h3>
                    <p className="text-xs" style={{ color: 'var(--polaroid-text-muted)' }}>版本 v{selectedPrompt.version} · 最后更新 {selectedPrompt.updated_at}</p>
                  </div>
                  <button onClick={handleSavePrompt}
                    className="flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm text-white transition-opacity hover:opacity-90"
                    style={{ backgroundColor: 'var(--amber-primary)' }}>
                    保存
                  </button>
                </div>
                <textarea value={editContent} onChange={(e) => setEditContent(e.target.value)}
                  className="w-full h-[400px] p-4 text-sm outline-none resize-none font-mono"
                  style={{ color: 'var(--polaroid-text)' }} />
              </>
            ) : (
              <div className="flex items-center justify-center h-64" style={{ color: 'var(--polaroid-text-muted)' }}>
                请选择一个 Agent
              </div>
            )}
          </div>
        </div>
      )}

      {/* 模板库 */}
      {activeTab === 'templates' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button onClick={() => setShowTemplateDialog(true)}
              className="flex items-center gap-2 rounded-lg px-4 py-2 text-sm text-white transition-opacity hover:opacity-90"
              style={{ backgroundColor: 'var(--amber-primary)' }}>
              <Plus className="h-4 w-4" /> 新建模板
            </button>
          </div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {templates.map((t) => (
              <div key={t.id} className="rounded-xl border p-5" style={{ borderColor: 'var(--polaroid-border)', backgroundColor: 'var(--polaroid-white)' }}>
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-medium" style={{ color: 'var(--polaroid-text)' }}>{t.name}</h3>
                    <span className="inline-block rounded-full bg-gray-100 px-2 py-0.5 text-xs mt-1" style={{ color: 'var(--polaroid-text-muted)' }}>
                      {t.category}
                    </span>
                  </div>
                  {t.is_preset && <span className="text-xs text-amber-600">预置</span>}
                </div>
                <p className="text-sm line-clamp-3 mb-3" style={{ color: 'var(--polaroid-text-muted)' }}>{t.content}</p>
                <div className="flex gap-2">
                  <button className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs border transition-colors hover:bg-gray-50"
                    style={{ borderColor: 'var(--polaroid-border)' }}>
                    <Copy className="h-3 w-3" /> 复制
                  </button>
                  {!t.is_preset && (
                    <button onClick={() => setTemplates(prev => prev.filter(x => x.id !== t.id))}
                      className="p-1.5 rounded-lg hover:bg-red-50 transition-colors">
                      <Trash2 className="h-4 w-4 text-red-400" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 在线调试 */}
      {activeTab === 'debug' && (
        <div className="grid grid-cols-2 gap-6">
          <div className="space-y-4">
            <h3 className="font-medium" style={{ color: 'var(--polaroid-text)' }}>输入</h3>
            <div>
              <label className="block text-sm mb-1" style={{ color: 'var(--polaroid-text-muted)' }}>选择 Agent</label>
              <select className="w-full rounded-lg border bg-white px-3 py-2 text-sm outline-none"
                style={{ borderColor: 'var(--polaroid-border)' }}>
                {AGENTS.map(a => <option key={a.key} value={a.key}>{a.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm mb-1" style={{ color: 'var(--polaroid-text-muted)' }}>测试输入</label>
              <textarea value={debugInput} onChange={(e) => setDebugInput(e.target.value)}
                placeholder="输入测试数据..."
                rows={8}
                className="w-full rounded-lg border bg-white px-3 py-2 text-sm outline-none resize-none"
                style={{ borderColor: 'var(--polaroid-border)' }} />
            </div>
            <button onClick={handleDebug} disabled={debugging}
              className="flex items-center gap-2 rounded-lg px-4 py-2 text-sm text-white transition-opacity hover:opacity-90 disabled:opacity-50"
              style={{ backgroundColor: 'var(--amber-primary)' }}>
              {debugging ? '调试中...' : '开始调试'}
            </button>
          </div>
          <div className="space-y-4">
            <h3 className="font-medium" style={{ color: 'var(--polaroid-text)' }}>输出</h3>
            <div className="rounded-lg border bg-gray-50 p-4 min-h-[300px]"
              style={{ borderColor: 'var(--polaroid-border)' }}>
              {debugOutput ? (
                <pre className="text-sm whitespace-pre-wrap" style={{ color: 'var(--polaroid-text)' }}>{debugOutput}</pre>
              ) : (
                <p className="text-sm" style={{ color: 'var(--polaroid-text-muted)' }}>等待调试...</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 新建模板弹窗 */}
      <AnimatePresence>
        {showTemplateDialog && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
            onClick={() => setShowTemplateDialog(false)}>
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl"
              style={{ border: '1px solid var(--polaroid-border)' }}>
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-lg font-semibold" style={{ color: 'var(--polaroid-text)' }}>新建模板</h3>
                <button onClick={() => setShowTemplateDialog(false)} className="p-1 rounded-lg hover:bg-gray-100">
                  <X className="h-5 w-5" style={{ color: 'var(--polaroid-text-muted)' }} />
                </button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: 'var(--polaroid-text)' }}>模板名称</label>
                  <input value={templateForm.name} onChange={(e) => setTemplateForm({ ...templateForm, name: e.target.value })}
                    className="w-full rounded-lg border bg-white px-3 py-2 text-sm outline-none"
                    style={{ borderColor: 'var(--polaroid-border)' }} />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: 'var(--polaroid-text)' }}>分类</label>
                  <input value={templateForm.category} onChange={(e) => setTemplateForm({ ...templateForm, category: e.target.value })}
                    placeholder="如：测试分析、用例生成"
                    className="w-full rounded-lg border bg-white px-3 py-2 text-sm outline-none"
                    style={{ borderColor: 'var(--polaroid-border)' }} />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: 'var(--polaroid-text)' }}>内容</label>
                  <textarea value={templateForm.content} onChange={(e) => setTemplateForm({ ...templateForm, content: e.target.value })}
                    rows={6}
                    className="w-full rounded-lg border bg-white px-3 py-2 text-sm outline-none resize-none"
                    style={{ borderColor: 'var(--polaroid-border)' }} />
                </div>
              </div>
              <div className="flex justify-end gap-2 mt-6">
                <button onClick={() => setShowTemplateDialog(false)}
                  className="rounded-lg px-4 py-2 text-sm border transition-colors hover:bg-gray-50"
                  style={{ borderColor: 'var(--polaroid-border)', color: 'var(--polaroid-text-muted)' }}>取消</button>
                <button onClick={() => {
                  setTemplates(prev => [...prev, { id: Date.now(), ...templateForm, is_preset: false }])
                  setShowTemplateDialog(false)
                  setTemplateForm({ name: '', category: '', content: '' })
                }}
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
