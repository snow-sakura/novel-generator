import { useState } from 'react'

export default function AppearancePage() {
  const [theme, setTheme] = useState<'light' | 'dark' | 'system'>('light')

  return (
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
  )
}
