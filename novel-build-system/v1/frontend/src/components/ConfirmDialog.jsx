import { AlertTriangle, Info, CheckCircle, X } from 'lucide-react'
import { cn } from '../lib/utils'

const ICONS = {
  warning: AlertTriangle,
  info: Info,
  success: CheckCircle,
  danger: AlertTriangle,
}

const COLORS = {
  warning: 'text-amber-500 bg-amber-100',
  info: 'text-blue-500 bg-blue-100',
  success: 'text-green-500 bg-green-100',
  danger: 'text-red-500 bg-red-100',
}

export default function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  message,
  type = 'warning',
  confirmText = '确认',
  cancelText = '取消',
  confirmColor = 'danger',
}) {
  if (!open) return null

  const Icon = ICONS[type] || Info
  const iconColor = COLORS[type] || COLORS.info

  const buttonColors = {
    danger: 'bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white shadow-md',
    warning: 'bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white shadow-md',
    success: 'bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white shadow-md',
    info: 'bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 text-white shadow-md',
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-2xl w-[90vw] max-w-sm shadow-2xl p-6 text-center" onClick={e => e.stopPropagation()}>
        <div className={cn('w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4', iconColor)}>
          <Icon className="w-7 h-7" />
        </div>
        <h2 className="text-lg font-bold text-gray-900 mb-2">{title}</h2>
        <p className="text-sm text-gray-500 mb-6 leading-relaxed">{message}</p>
        <div className="flex gap-3 justify-center">
          <button onClick={onConfirm}
            className={cn('px-6 py-2.5 rounded-xl font-semibold transition-all text-sm', buttonColors[confirmColor] || buttonColors.danger)}>
            {confirmText}
          </button>
          <button onClick={onClose}
            className="px-6 py-2.5 bg-white border-2 border-gray-200 text-gray-600 rounded-xl font-semibold hover:bg-gray-50 hover:border-gray-300 transition-all text-sm">
            {cancelText}
          </button>
        </div>
      </div>
    </div>
  )
}
