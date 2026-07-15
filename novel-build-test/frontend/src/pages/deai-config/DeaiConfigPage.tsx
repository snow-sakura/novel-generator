import { useState } from 'react'
import { Plus, Trash2, Mic, BookOpen, Shield, Gauge } from 'lucide-react'

const STYLE_OPTIONS = [
  { value: 'formal', label: '专业正式', desc: '学术论文、技术文档风格' },
  { value: 'casual', label: '口语化', desc: '轻松自然、贴近日常' },
  { value: 'neutral', label: '中性默认', desc: '平衡专业与可读性' },
]

const INTENSITY_OPTIONS = [
  { value: 'off', label: '关闭', desc: '不做处理' },
  { value: 'light', label: '轻度', desc: '微调句式' },
  { value: 'medium', label: '中度', desc: '明显去AI化' },
  { value: 'heavy', label: '重度', desc: '深度拟人化' },
]

const MOCK_TERMS = [
  { id: 1, term: '值得注意的是', replacement: '', category: '连接词' },
  { id: 2, term: '总而言之', replacement: '总之', category: '总结词' },
  { id: 3, term: '综上所述', replacement: '上面说的这些', category: '总结词' },
]

const MOCK_BLACKLIST = [
  { id: 1, word: '值得注意的是', replacement: '' },
  { id: 2, word: '总而言之', replacement: '总之' },
  { id: 3, word: '不言而喻', replacement: '很明显' },
  { id: 4, word: '毋庸置疑', replacement: '' },
]

export default function DeaiConfigPage() {
  const [activeTab, setActiveTab] = useState<'style' | 'terms' | 'blacklist' | 'intensity'>('style')
  const [style, setStyle] = useState('neutral')
  const [intensity, setIntensity] = useState('medium')
  const [terms, setTerms] = useState(MOCK_TERMS)
  const [blacklist, setBlacklist] = useState(MOCK_BLACKLIST)
  const [newTerm, setNewTerm] = useState({ term: '', replacement: '', category: '' })
  const [newWord, setNewWord] = useState({ word: '', replacement: '' })

  const tabs: { key: 'style' | 'terms' | 'blacklist' | 'intensity'; label: string; icon: typeof Mic }[] = [
    { key: 'style', label: '语言风格', icon: Mic },
    { key: 'intensity', label: '强度控制', icon: Gauge },
    { key: 'terms', label: '领域术语', icon: BookOpen },
    { key: 'blacklist', label: '词频黑名单', icon: Shield },
  ]

  const addTerm = () => {
    if (!newTerm.term) return
    setTerms(prev => [...prev, { id: Date.now(), ...newTerm }])
    setNewTerm({ term: '', replacement: '', category: '' })
  }

  const addWord = () => {
    if (!newWord.word) return
    setBlacklist(prev => [...prev, { id: Date.now(), ...newWord }])
    setNewWord({ word: '', replacement: '' })
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

      {/* 语言风格 */}
      {activeTab === 'style' && (
        <div className="space-y-4">
          <h3 className="font-medium" style={{ color: 'var(--polaroid-text)' }}>选择语言风格</h3>
          <div className="grid gap-3 md:grid-cols-3">
            {STYLE_OPTIONS.map((opt) => (
              <button key={opt.value} onClick={() => setStyle(opt.value)}
                className="text-left rounded-xl border p-4 transition-all"
                style={{
                  borderColor: style === opt.value ? 'var(--amber-primary)' : 'var(--polaroid-border)',
                  backgroundColor: style === opt.value ? 'rgba(245, 158, 11, 0.05)' : 'var(--polaroid-white)',
                }}>
                <div className="flex items-center gap-2 mb-2">
                  <div className="h-4 w-4 rounded-full border-2 flex items-center justify-center"
                    style={{ borderColor: style === opt.value ? 'var(--amber-primary)' : '#D1D5DB' }}>
                    {style === opt.value && <div className="h-2 w-2 rounded-full" style={{ backgroundColor: 'var(--amber-primary)' }} />}
                  </div>
                  <span className="font-medium" style={{ color: 'var(--polaroid-text)' }}>{opt.label}</span>
                </div>
                <p className="text-xs" style={{ color: 'var(--polaroid-text-muted)' }}>{opt.desc}</p>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 强度控制 */}
      {activeTab === 'intensity' && (
        <div className="space-y-4">
          <h3 className="font-medium" style={{ color: 'var(--polaroid-text)' }}>去AI味强度</h3>
          <div className="grid gap-3 md:grid-cols-4">
            {INTENSITY_OPTIONS.map((opt) => (
              <button key={opt.value} onClick={() => setIntensity(opt.value)}
                className="text-center rounded-xl border p-4 transition-all"
                style={{
                  borderColor: intensity === opt.value ? 'var(--amber-primary)' : 'var(--polaroid-border)',
                  backgroundColor: intensity === opt.value ? 'rgba(245, 158, 11, 0.05)' : 'var(--polaroid-white)',
                }}>
                <div className="h-8 w-8 rounded-full mx-auto mb-2 flex items-center justify-center"
                  style={{ backgroundColor: intensity === opt.value ? 'var(--amber-primary)' : '#E5E7EB' }}>
                  <Gauge className="h-4 w-4" style={{ color: intensity === opt.value ? 'white' : '#9CA3AF' }} />
                </div>
                <span className="font-medium text-sm" style={{ color: 'var(--polaroid-text)' }}>{opt.label}</span>
                <p className="text-xs mt-1" style={{ color: 'var(--polaroid-text-muted)' }}>{opt.desc}</p>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 领域术语 */}
      {activeTab === 'terms' && (
        <div className="space-y-4">
          <div className="flex gap-2">
            <input value={newTerm.term} onChange={(e) => setNewTerm({ ...newTerm, term: e.target.value })}
              placeholder="术语" className="flex-1 rounded-lg border bg-white px-3 py-2 text-sm outline-none"
              style={{ borderColor: 'var(--polaroid-border)' }} />
            <input value={newTerm.replacement} onChange={(e) => setNewTerm({ ...newTerm, replacement: e.target.value })}
              placeholder="替换词（可选）" className="flex-1 rounded-lg border bg-white px-3 py-2 text-sm outline-none"
              style={{ borderColor: 'var(--polaroid-border)' }} />
            <input value={newTerm.category} onChange={(e) => setNewTerm({ ...newTerm, category: e.target.value })}
              placeholder="分类" className="w-24 rounded-lg border bg-white px-3 py-2 text-sm outline-none"
              style={{ borderColor: 'var(--polaroid-border)' }} />
            <button onClick={addTerm}
              className="flex items-center gap-1 rounded-lg px-3 py-2 text-sm text-white"
              style={{ backgroundColor: 'var(--amber-primary)' }}>
              <Plus className="h-4 w-4" />
            </button>
          </div>
          <div className="rounded-xl border overflow-hidden" style={{ borderColor: 'var(--polaroid-border)' }}>
            <table className="w-full text-sm">
              <thead>
                <tr style={{ backgroundColor: 'var(--polaroid-warm)' }}>
                  <th className="px-4 py-3 text-left font-medium" style={{ color: 'var(--polaroid-text)' }}>术语</th>
                  <th className="px-4 py-3 text-left font-medium" style={{ color: 'var(--polaroid-text)' }}>替换词</th>
                  <th className="px-4 py-3 text-left font-medium" style={{ color: 'var(--polaroid-text)' }}>分类</th>
                  <th className="px-4 py-3 text-right font-medium" style={{ color: 'var(--polaroid-text)' }}>操作</th>
                </tr>
              </thead>
              <tbody>
                {terms.map((t) => (
                  <tr key={t.id} className="border-t" style={{ borderColor: 'var(--polaroid-border)' }}>
                    <td className="px-4 py-3 font-medium" style={{ color: 'var(--polaroid-text)' }}>{t.term}</td>
                    <td className="px-4 py-3" style={{ color: 'var(--polaroid-text-muted)' }}>{t.replacement || '-'}</td>
                    <td className="px-4 py-3"><span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs">{t.category}</span></td>
                    <td className="px-4 py-3 text-right">
                      <button onClick={() => setTerms(prev => prev.filter(x => x.id !== t.id))} className="p-1.5 rounded-lg hover:bg-red-50">
                        <Trash2 className="h-4 w-4 text-red-400" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 词频黑名单 */}
      {activeTab === 'blacklist' && (
        <div className="space-y-4">
          <div className="flex gap-2">
            <input value={newWord.word} onChange={(e) => setNewWord({ ...newWord, word: e.target.value })}
              placeholder="禁用词" className="flex-1 rounded-lg border bg-white px-3 py-2 text-sm outline-none"
              style={{ borderColor: 'var(--polaroid-border)' }} />
            <input value={newWord.replacement} onChange={(e) => setNewWord({ ...newWord, replacement: e.target.value })}
              placeholder="替换词（可选）" className="flex-1 rounded-lg border bg-white px-3 py-2 text-sm outline-none"
              style={{ borderColor: 'var(--polaroid-border)' }} />
            <button onClick={addWord}
              className="flex items-center gap-1 rounded-lg px-3 py-2 text-sm text-white"
              style={{ backgroundColor: 'var(--amber-primary)' }}>
              <Plus className="h-4 w-4" />
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {blacklist.map((b) => (
              <span key={b.id} className="inline-flex items-center gap-2 rounded-full bg-red-50 px-3 py-1.5 text-sm text-red-700">
                {b.word}
                {b.replacement && <span className="text-red-400">→ {b.replacement}</span>}
                <button onClick={() => setBlacklist(prev => prev.filter(x => x.id !== b.id))} className="hover:text-red-900">
                  <Trash2 className="h-3 w-3" />
                </button>
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
