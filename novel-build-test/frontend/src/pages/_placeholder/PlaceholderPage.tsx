import { Construction } from 'lucide-react'

/**
 * PlaceholderPage — 模块占位页面
 *
 * 用于尚未实现完整 CRUD 的模块，
 * 后续批次中会被真正的页面替换。
 */
export default function PlaceholderPage({ title }: { title: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-24">
      <Construction className="mb-4 h-16 w-16" style={{ color: 'var(--amber-primary)', opacity: 0.5 }} />
      <h2 className="text-xl font-semibold" style={{ color: 'var(--polaroid-text)' }}>
        {title}
      </h2>
      <p className="mt-2 text-sm" style={{ color: 'var(--polaroid-text-muted)' }}>
        模块正在建设中，将在后续批次实现完整 CRUD
      </p>
    </div>
  )
}
