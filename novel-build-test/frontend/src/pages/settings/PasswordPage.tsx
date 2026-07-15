import { useState } from 'react'
import { Lock } from 'lucide-react'

export default function PasswordPage() {
  const [saved, setSaved] = useState(false)
  const [form, setForm] = useState({ current: '', newPass: '', confirm: '' })

  const handleSave = () => { setSaved(true); setTimeout(() => setSaved(false), 2000) }

  return (
    <div className="max-w-xl space-y-5">
      <h3 className="text-lg font-semibold" style={{ color: 'var(--polaroid-text)' }}>修改密码</h3>
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--polaroid-text)' }}>当前密码</label>
          <input type="password" value={form.current} onChange={(e) => setForm({ ...form, current: e.target.value })}
            className="w-full rounded-lg border bg-white px-3 py-2 text-sm outline-none focus:border-[var(--amber-primary)]"
            style={{ borderColor: 'var(--polaroid-border)' }} />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--polaroid-text)' }}>新密码</label>
          <input type="password" value={form.newPass} onChange={(e) => setForm({ ...form, newPass: e.target.value })}
            className="w-full rounded-lg border bg-white px-3 py-2 text-sm outline-none focus:border-[var(--amber-primary)]"
            style={{ borderColor: 'var(--polaroid-border)' }} />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--polaroid-text)' }}>确认新密码</label>
          <input type="password" value={form.confirm} onChange={(e) => setForm({ ...form, confirm: e.target.value })}
            className="w-full rounded-lg border bg-white px-3 py-2 text-sm outline-none focus:border-[var(--amber-primary)]"
            style={{ borderColor: 'var(--polaroid-border)' }} />
        </div>
      </div>
      <button onClick={handleSave}
        className="flex items-center gap-2 rounded-lg px-4 py-2 text-sm text-white transition-opacity hover:opacity-90"
        style={{ backgroundColor: 'var(--amber-primary)' }}>
        <Lock className="h-4 w-4" />
        {saved ? '已修改 ✓' : '修改密码'}
      </button>
    </div>
  )
}
