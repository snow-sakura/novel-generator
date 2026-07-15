import { useState } from 'react'
import { Save, Camera } from 'lucide-react'
import { useAuthStore } from '@/lib/auth-store'

export default function ProfilePage() {
  const { user } = useAuthStore()
  const [saved, setSaved] = useState(false)
  const [form, setForm] = useState({
    displayName: user?.display_name ?? '',
    email: user?.email ?? '',
    phone: '',
    bio: '',
  })

  const handleSave = () => { setSaved(true); setTimeout(() => setSaved(false), 2000) }

  return (
    <div className="max-w-xl space-y-5">
      <h3 className="text-lg font-semibold" style={{ color: 'var(--polaroid-text)' }}>基本信息</h3>

      <div className="flex items-center gap-4">
        <div className="relative">
          <div className="h-20 w-20 rounded-full flex items-center justify-center text-2xl font-bold text-white"
            style={{ backgroundColor: 'var(--amber-primary)' }}>
            {form.displayName.charAt(0) || 'U'}
          </div>
          <button className="absolute -bottom-1 -right-1 h-7 w-7 rounded-full bg-white border flex items-center justify-center shadow-sm hover:bg-gray-50"
            style={{ borderColor: 'var(--polaroid-border)' }}>
            <Camera className="h-3.5 w-3.5" style={{ color: 'var(--polaroid-text-muted)' }} />
          </button>
        </div>
        <div>
          <p className="text-sm font-medium" style={{ color: 'var(--polaroid-text)' }}>{form.displayName || '未设置昵称'}</p>
          <p className="text-xs" style={{ color: 'var(--polaroid-text-muted)' }}>点击更换头像</p>
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--polaroid-text)' }}>昵称</label>
          <input value={form.displayName} onChange={(e) => setForm({ ...form, displayName: e.target.value })}
            className="w-full rounded-lg border bg-white px-3 py-2 text-sm outline-none focus:border-[var(--amber-primary)]"
            style={{ borderColor: 'var(--polaroid-border)' }} />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--polaroid-text)' }}>邮箱</label>
          <input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })}
            className="w-full rounded-lg border bg-white px-3 py-2 text-sm outline-none focus:border-[var(--amber-primary)]"
            style={{ borderColor: 'var(--polaroid-border)' }} />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--polaroid-text)' }}>手机号</label>
          <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })}
            placeholder="选填"
            className="w-full rounded-lg border bg-white px-3 py-2 text-sm outline-none focus:border-[var(--amber-primary)]"
            style={{ borderColor: 'var(--polaroid-border)' }} />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--polaroid-text)' }}>个人简介</label>
          <textarea value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })}
            rows={3} placeholder="介绍一下自己..."
            className="w-full rounded-lg border bg-white px-3 py-2 text-sm outline-none resize-none focus:border-[var(--amber-primary)]"
            style={{ borderColor: 'var(--polaroid-border)' }} />
        </div>
      </div>

      <button onClick={handleSave}
        className="flex items-center gap-2 rounded-lg px-4 py-2 text-sm text-white transition-opacity hover:opacity-90"
        style={{ backgroundColor: 'var(--amber-primary)' }}>
        <Save className="h-4 w-4" />
        {saved ? '已保存 ✓' : '保存修改'}
      </button>
    </div>
  )
}
