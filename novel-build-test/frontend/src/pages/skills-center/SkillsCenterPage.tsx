import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Trash2, X, Puzzle, Package, Zap, ScrollText } from 'lucide-react'

interface Skill {
  id: number
  name: string
  type: 'mcp' | 'internal' | 'custom'
  description: string
  status: 'active' | 'inactive'
}

interface SkillLog {
  id: number
  skill_name: string
  agent: string
  status: 'success' | 'failed'
  duration_ms: number
  created_at: string
}

const MOCK_SKILLS: Skill[] = [
  { id: 1, name: 'Playwright浏览器', type: 'mcp', description: 'Web自动化测试工具', status: 'active' },
  { id: 2, name: 'Appium移动端', type: 'mcp', description: '移动端自动化测试', status: 'active' },
  { id: 3, name: 'Postman接口', type: 'mcp', description: 'API接口测试工具', status: 'active' },
  { id: 4, name: '代码分析', type: 'internal', description: '静态代码分析能力', status: 'active' },
]

const MOCK_LOGS: SkillLog[] = [
  { id: 1, skill_name: 'Playwright浏览器', agent: 'Web自动化', status: 'success', duration_ms: 1250, created_at: '2026-07-14 10:30' },
  { id: 2, skill_name: 'Postman接口', agent: '接口测试', status: 'success', duration_ms: 890, created_at: '2026-07-14 10:15' },
  { id: 3, skill_name: '代码分析', agent: '质量审计', status: 'failed', duration_ms: 2100, created_at: '2026-07-14 09:45' },
]

const SKILL_TYPES = [
  { value: 'mcp', label: 'MCP工具', color: 'bg-purple-50 text-purple-600' },
  { value: 'internal', label: '内置技能', color: 'bg-blue-50 text-blue-600' },
  { value: 'custom', label: '自定义', color: 'bg-gray-100 text-gray-500' },
]

export default function SkillsCenterPage() {
  const [activeTab, setActiveTab] = useState<'skills' | 'market' | 'logs'>('skills')
  const [skills, setSkills] = useState<Skill[]>(MOCK_SKILLS)
  const [logs] = useState<SkillLog[]>(MOCK_LOGS)
  const [showDialog, setShowDialog] = useState(false)
  const [form, setForm] = useState({ name: '', type: 'mcp', description: '' })

  const tabs: { key: 'skills' | 'market' | 'logs'; label: string; icon: typeof Puzzle }[] = [
    { key: 'skills', label: '技能管理', icon: Puzzle },
    { key: 'market', label: '技能市场', icon: Package },
    { key: 'logs', label: '调用日志', icon: ScrollText },
  ]

  const handleSave = () => {
    setSkills(prev => [...prev, { id: Date.now(), name: form.name, type: form.type as Skill['type'], description: form.description, status: 'active' }])
    setShowDialog(false)
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-1 p-1 rounded-lg" style={{ backgroundColor: 'var(--polaroid-warm)' }}>
        {tabs.map((t) => {
          const Icon = t.icon
          return (
            <button key={t.key} onClick={() => setActiveTab(t.key)}
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

      {/* 技能管理 */}
      {activeTab === 'skills' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button onClick={() => setShowDialog(true)}
              className="flex items-center gap-2 rounded-lg px-4 py-2 text-sm text-white"
              style={{ backgroundColor: 'var(--amber-primary)' }}>
              <Plus className="h-4 w-4" /> 注册技能
            </button>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {skills.map((skill) => (
              <div key={skill.id} className="rounded-xl border p-5" style={{ borderColor: 'var(--polaroid-border)', backgroundColor: 'var(--polaroid-white)' }}>
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: 'rgba(139, 92, 246, 0.1)' }}>
                      <Puzzle className="h-5 w-5 text-purple-500" />
                    </div>
                    <div>
                      <h3 className="font-medium" style={{ color: 'var(--polaroid-text)' }}>{skill.name}</h3>
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${SKILL_TYPES.find(t => t.value === skill.type)?.color || ''}`}>
                        {SKILL_TYPES.find(t => t.value === skill.type)?.label || skill.type}
                      </span>
                    </div>
                  </div>
                  <span className={`h-2 w-2 rounded-full ${skill.status === 'active' ? 'bg-green-500' : 'bg-gray-400'}`} />
                </div>
                <p className="text-xs mb-3" style={{ color: 'var(--polaroid-text-muted)' }}>{skill.description}</p>
                <div className="flex gap-2 pt-3 border-t" style={{ borderColor: 'var(--polaroid-border)' }}>
                  <button className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs border" style={{ borderColor: 'var(--polaroid-border)' }}>
                    <Zap className="h-3 w-3" /> 测试
                  </button>
                  <div className="flex-1" />
                  <button onClick={() => setSkills(prev => prev.filter(x => x.id !== skill.id))} className="p-1.5 rounded-lg hover:bg-red-50">
                    <Trash2 className="h-4 w-4 text-red-400" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 技能市场 */}
      {activeTab === 'market' && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[
            { name: 'Selenium Web', desc: 'Web自动化测试工具包', type: 'mcp', enabled: true },
            { name: 'JMeter性能', desc: '性能测试脚本执行', type: 'mcp', enabled: false },
            { name: 'SQL注入检测', desc: '安全测试SQL注入扫描', type: 'internal', enabled: false },
            { name: 'UI截图对比', desc: '视觉回归测试工具', type: 'mcp', enabled: true },
          ].map((item, i) => (
            <div key={i} className="rounded-xl border p-5" style={{ borderColor: 'var(--polaroid-border)', backgroundColor: 'var(--polaroid-white)' }}>
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg flex items-center justify-center bg-amber-50">
                    <Package className="h-5 w-5 text-amber-500" />
                  </div>
                  <div>
                    <h3 className="font-medium" style={{ color: 'var(--polaroid-text)' }}>{item.name}</h3>
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${SKILL_TYPES.find(t => t.value === item.type)?.color || ''}`}>
                      {SKILL_TYPES.find(t => t.value === item.type)?.label}
                    </span>
                  </div>
                </div>
              </div>
              <p className="text-xs mb-3" style={{ color: 'var(--polaroid-text-muted)' }}>{item.desc}</p>
              <button className={`w-full rounded-lg px-3 py-2 text-xs font-medium transition-colors ${item.enabled ? 'bg-gray-100 text-gray-500' : 'bg-amber-500 text-white hover:bg-amber-600'}`}>
                {item.enabled ? '已启用' : '一键启用'}
              </button>
            </div>
          ))}
        </div>
      )}

      {/* 调用日志 */}
      {activeTab === 'logs' && (
        <div className="rounded-xl border overflow-hidden" style={{ borderColor: 'var(--polaroid-border)' }}>
          <table className="w-full text-sm">
            <thead>
              <tr style={{ backgroundColor: 'var(--polaroid-warm)' }}>
                <th className="px-4 py-3 text-left font-medium" style={{ color: 'var(--polaroid-text)' }}>技能</th>
                <th className="px-4 py-3 text-left font-medium" style={{ color: 'var(--polaroid-text)' }}>调用者</th>
                <th className="px-4 py-3 text-left font-medium" style={{ color: 'var(--polaroid-text)' }}>状态</th>
                <th className="px-4 py-3 text-left font-medium" style={{ color: 'var(--polaroid-text)' }}>耗时</th>
                <th className="px-4 py-3 text-left font-medium" style={{ color: 'var(--polaroid-text)' }}>时间</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log.id} className="border-t" style={{ borderColor: 'var(--polaroid-border)' }}>
                  <td className="px-4 py-3 font-medium" style={{ color: 'var(--polaroid-text)' }}>{log.skill_name}</td>
                  <td className="px-4 py-3 text-sm" style={{ color: 'var(--polaroid-text-muted)' }}>{log.agent}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${log.status === 'success' ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>
                      {log.status === 'success' ? '成功' : '失败'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm" style={{ color: 'var(--polaroid-text-muted)' }}>{log.duration_ms}ms</td>
                  <td className="px-4 py-3 text-xs" style={{ color: 'var(--polaroid-text-muted)' }}>{log.created_at}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* 注册技能弹窗 */}
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
                <h3 className="text-lg font-semibold" style={{ color: 'var(--polaroid-text)' }}>注册技能</h3>
                <button onClick={() => setShowDialog(false)} className="p-1 rounded-lg hover:bg-gray-100">
                  <X className="h-5 w-5" style={{ color: 'var(--polaroid-text-muted)' }} />
                </button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: 'var(--polaroid-text)' }}>技能名称</label>
                  <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="w-full rounded-lg border bg-white px-3 py-2 text-sm outline-none"
                    style={{ borderColor: 'var(--polaroid-border)' }} />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: 'var(--polaroid-text)' }}>类型</label>
                  <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}
                    className="w-full rounded-lg border bg-white px-3 py-2 text-sm outline-none"
                    style={{ borderColor: 'var(--polaroid-border)' }}>
                    {SKILL_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: 'var(--polaroid-text)' }}>描述</label>
                  <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
                    rows={3}
                    className="w-full rounded-lg border bg-white px-3 py-2 text-sm outline-none resize-none"
                    style={{ borderColor: 'var(--polaroid-border)' }} />
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
