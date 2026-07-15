/**
 * 通用占位页面 — 待实现的功能模块
 */
export default function PlaceholderPage({ title }: { title: string }) {
  return (
    <div
      className="flex h-64 items-center justify-center rounded-xl border-2 border-dashed"
      style={{ borderColor: 'var(--polaroid-border)', backgroundColor: 'var(--polaroid-warm)' }}
    >
      <span className="text-sm" style={{ color: 'var(--polaroid-text-muted)' }}>
        {title} — 待实现
      </span>
    </div>
  )
}
