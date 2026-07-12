import { clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

/** 合并 Tailwind 类名 */
export function cn(...inputs) {
  return twMerge(clsx(inputs))
}

/** 简短的唯一 ID */
let _id = 0
export function uid() { return ++_id }

/** Toast 通知系统 */
const listeners = new Set()
let toasts = []

export const toast = {
  success(message, duration = 3000) {
    addToast({ type: 'success', message, duration })
  },
  error(message, duration = 4000) {
    addToast({ type: 'error', message, duration })
  },
  info(message, duration = 3000) {
    addToast({ type: 'info', message, duration })
  },
  warn(message, duration = 3500) {
    addToast({ type: 'warn', message, duration })
  },
}

function addToast(t) {
  const id = uid()
  const item = { ...t, id }
  toasts = [...toasts, item]
  listeners.forEach(fn => fn(toasts))
  if (t.duration > 0) {
    setTimeout(() => removeToast(id), t.duration)
  }
}

export function removeToast(id) {
  toasts = toasts.filter(t => t.id !== id)
  listeners.forEach(fn => fn(toasts))
}

export function subscribeToasts(fn) {
  listeners.add(fn)
  fn(toasts)
  return () => listeners.delete(fn)
}
