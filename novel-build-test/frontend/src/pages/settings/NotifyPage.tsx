import { useState } from 'react'
import { Save } from 'lucide-react'

export default function NotifyPage() {
  const [saved, setSaved] = useState(false)
  const [notify, setNotify] = useState({
    email: true, browser: true, execute: true, report: false,
  })

  const handleSave = () => { setSaved(true); setTimeout(() => setSaved(false), 2000) }

  const items = [
    { key: 'email' as const, label: '邮件通知', desc: '通过邮件接收重要通知' },
    { key: 'browser' as const, label: '浏览器通知', desc: '启用浏览器桌面推送' },
    { key: 'execute' as const, label: '执行完成通知', desc: '测试执行完成后通知' },
    { key: 'report' as const, label: '报告生成通知', desc: '测试报告生成后通知' },
  ]

  return (
    <div className="max-w-xl space-y-5">
      <h3 className="text-lg font-semibold" style={{ color: 'var(--polaroid-text)' }}>通知设置</h3>
      <div className="space-y-3">
        {items.map((item) => (
          <div key={item.key} className="flex items-center justify-between rounded-lg border p-4"
            style={{ borderColor: 'var(--polaroid-border)', backgroundColor: 'var(--polaroid-white)' }}>
            <div>
              <p className="text-sm font-medium" style={{ color: 'var(--polaroid-text)' }}>{item.label}</p>
              <p className="text-xs mt-0.5" style={{ color: 'var(--polaroid-text-muted)' }}>{item.desc}</p>
            </div>
            <button onClick={() => setNotify({ ...notify, [item.key]: !notify[item.key] })}
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
  )
}
