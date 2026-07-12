import { useEffect, useState } from 'react'
import { CheckCircle, XCircle, AlertTriangle, Info, X } from 'lucide-react'
import { subscribeToasts, removeToast } from '../lib/utils'
import { cn } from '../lib/utils'

const ICONS = {
  success: CheckCircle,
  error: XCircle,
  warn: AlertTriangle,
  info: Info,
}

const COLORS = {
  success: { bg: 'bg-emerald-50 border-emerald-200', text: 'text-emerald-800', icon: 'text-emerald-500' },
  error: { bg: 'bg-red-50 border-red-200', text: 'text-red-800', icon: 'text-red-500' },
  warn: { bg: 'bg-amber-50 border-amber-200', text: 'text-amber-800', icon: 'text-amber-500' },
  info: { bg: 'bg-blue-50 border-blue-200', text: 'text-blue-800', icon: 'text-blue-500' },
}

export default function ToastContainer() {
  const [items, setItems] = useState([])

  useEffect(() => {
    return subscribeToasts(setItems)
  }, [])

  if (items.length === 0) return null

  return (
    <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2 max-w-sm w-full pointer-events-none">
      {items.map(t => {
        const Icon = ICONS[t.type] || Info
        const colors = COLORS[t.type] || COLORS.info
        return (
          <div
            key={t.id}
            className={cn(
              'pointer-events-auto flex items-start gap-3 px-4 py-3 rounded-xl border shadow-lg',
              'animate-fade-in-down',
              colors.bg
            )}
          >
            <Icon className={cn('w-5 h-5 flex-shrink-0 mt-0.5', colors.icon)} />
            <p className={cn('text-sm flex-1', colors.text)}>{t.message}</p>
            <button
              onClick={() => removeToast(t.id)}
              className={cn('flex-shrink-0 p-0.5 rounded hover:opacity-70 transition-opacity', colors.text)}
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )
      })}
    </div>
  )
}
