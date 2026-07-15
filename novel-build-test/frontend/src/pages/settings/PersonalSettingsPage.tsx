import { useState } from 'react'
import { motion } from 'framer-motion'
import { User, Lock, Bell, Palette, Save, Camera } from 'lucide-react'
import { useAuthStore } from '@/lib/auth-store'

interface FormData {
  displayName: string
  email: string
  phone: string
  bio: string
}

interface PasswordForm {
  currentPassword: string
  newPassword: string
  confirmPassword: string
}

interface NotifySettings {
  emailNotify: boolean
  browserNotify: boolean
  executeNotify: boolean
  reportNotify: boolean
}

export default function PersonalSettingsPage() {
  const { user } = useAuthStore()
  const [activeTab, setActiveTab] = useState<'profile' | 'password' | 'notify' | 'appearance'>('profile')
  const [saved, setSaved] = useState(false)

  const [form, setForm] = useState<FormData>({
    displayName: user?.display_name ?? '',
    email: user?.email ?? '',
    phone: '',
    bio: '',
  })

  const [passwordForm, setPasswordForm] = useState<PasswordForm>({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  })

  const [notify, setNotify] = useState<NotifySettings>({
    emailNotify: true,
    browserNotify: true,
    executeNotify: true,
    reportNotify: false,
  })

  const [theme, setTheme] = useState<'light' | 'dark' | 'system'>('light')

  const handleSave = () => {
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const tabs = [
    { key: 'profile' as const, label: '基本信息', icon: User },
    { key: 'password' as const, label: '修改密码', icon: Lock },
    { key: 'notify' as const, label: '通知设置', icon: Bell },
    { key: 'appearance' as const, label: '外观偏好', icon: Palette },
  ]

  return (
    <div className="space-y-5">
      {/* 顶部 Tab 栏 */}
      <div className="flex gap-1 p-1 rounded-lg" style={{ backgroundColor: 'var(--polaroid-warm)' }}>
        {tabs.map((t) => {
          const Icon = t.icon
          const isActive = activeTab === t.key
          return (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key)}
              className="flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all"
              style={{
                backgroundColor: isActive ? 'var(--polaroid-white)' : 'transparent',
                color: isActive ? 'var(--amber-primary)' : 'var(--polaroid-text-muted)',
                boxShadow: isActive ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
              }}
            >
              <Icon className="h-4 w-4" />
              {t.label}
            </button>
          )
        })}
      </div>

      {/* 内容区 */}
      <motion.div
        key={activeTab}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
      >
        {/* 基本信息 */}
        {activeTab === 'profile' && (
          <div className="max-w-xl space-y-5">
            <h3 className="text-lg font-semibold" style={{ color: 'var(--polaroid-text)' }}>基本信息</h3>

            {/* 头像 */}
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

            {/* 表单 */}
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
        )}

        {/* 修改密码 */}
        {activeTab === 'password' && (
          <div className="max-w-xl space-y-5">
            <h3 className="text-lg font-semibold" style={{ color: 'var(--polaroid-text)' }}>修改密码</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--polaroid-text)' }}>当前密码</label>
                <input type="password" value={passwordForm.currentPassword}
                  onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                  className="w-full rounded-lg border bg-white px-3 py-2 text-sm outline-none focus:border-[var(--amber-primary)]"
                  style={{ borderColor: 'var(--polaroid-border)' }} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--polaroid-text)' }}>新密码</label>
                <input type="password" value={passwordForm.newPassword}
                  onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                  className="w-full rounded-lg border bg-white px-3 py-2 text-sm outline-none focus:border-[var(--amber-primary)]"
                  style={{ borderColor: 'var(--polaroid-border)' }} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--polaroid-text)' }}>确认新密码</label>
                <input type="password" value={passwordForm.confirmPassword}
                  onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
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
        )}

        {/* 通知设置 */}
        {activeTab === 'notify' && (
          <div className="max-w-xl space-y-5">
            <h3 className="text-lg font-semibold" style={{ color: 'var(--polaroid-text)' }}>通知设置</h3>
            <div className="space-y-3">
              {[
                { key: 'emailNotify' as const, label: '邮件通知', desc: '通过邮件接收重要通知' },
                { key: 'browserNotify' as const, label: '浏览器通知', desc: '启用浏览器桌面推送' },
                { key: 'executeNotify' as const, label: '执行完成通知', desc: '测试执行完成后通知' },
                { key: 'reportNotify' as const, label: '报告生成通知', desc: '测试报告生成后通知' },
              ].map((item) => (
                <div key={item.key} className="flex items-center justify-between rounded-lg border p-4"
                  style={{ borderColor: 'var(--polaroid-border)', backgroundColor: 'var(--polaroid-white)' }}>
                  <div>
                    <p className="text-sm font-medium" style={{ color: 'var(--polaroid-text)' }}>{item.label}</p>
                    <p className="text-xs mt-0.5" style={{ color: 'var(--polaroid-text-muted)' }}>{item.desc}</p>
                  </div>
                  <button
                    onClick={() => setNotify({ ...notify, [item.key]: !notify[item.key] })}
                    className="relative h-6 w-11 rounded-full transition-colors"
                    style={{ backgroundColor: notify[item.key] ? 'var(--amber-primary)' : '#D1D5DB' }}>
                    <span className="absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform"
                      style={{ transform: notify[item.key] ? 'translateX(20px)' : 'translateX(0)' }} />
                  </button>
                </div>
              ))}
            </div>
            <button onClick={handleSave}
              className="flex items-center gap-2 rounded-lg px-4 py-2 text-sm text-white transition-opacity hover:opacity-90"
              style={{ backgroundColor: 'var(--amber-primary)' }}>
              <Save className="h-4 w-4" />
              {saved ? '已保存 ✓' : '保存设置'}
            </button>
          </div>
        )}

        {/* 外观偏好 */}
        {activeTab === 'appearance' && (
          <div className="max-w-xl space-y-5">
            <h3 className="text-lg font-semibold" style={{ color: 'var(--polaroid-text)' }}>外观偏好</h3>
            <div className="grid grid-cols-3 gap-4">
              {(['light', 'dark', 'system'] as const).map((t) => (
                <button key={t} onClick={() => setTheme(t)}
                  className="rounded-xl border-2 p-5 text-center transition-all"
                  style={{
                    borderColor: theme === t ? 'var(--amber-primary)' : 'var(--polaroid-border)',
                    backgroundColor: theme === t ? 'color-mix(in srgb, var(--amber-primary) 8%, white)' : 'var(--polaroid-white)',
                  }}>
                  <div className="h-16 w-full rounded-lg mb-3"
                    style={{ backgroundColor: t === 'dark' ? '#1F2937' : t === 'light' ? '#FEFDFB' : 'linear-gradient(135deg, #FEFDFB 50%, #1F2937 50%)' }} />
                  <span className="text-sm font-medium" style={{ color: 'var(--polaroid-text)' }}>
                    {t === 'light' ? '浅色' : t === 'dark' ? '深色' : '跟随系统'}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}
      </motion.div>
    </div>
  )
}
