import { clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

/** 合并 Tailwind 类名 */
export function cn(...inputs: (string | undefined | null | false | Record<string, boolean | undefined | null>)[]): string {
  return twMerge(clsx(inputs))
}

/** 简短的唯一 ID */
let _id = 0
export function uid(): number { return ++_id }

interface ToastItem {
  id: number
  type: 'success' | 'error' | 'info' | 'warn'
  message: string
  duration: number
}

/** Toast 通知系统 */
const listeners = new Set<(toasts: ToastItem[]) => void>()
let toasts: ToastItem[] = []

export const toast = {
  success(message: string, duration = 3000): void {
    addToast({ type: 'success', message, duration })
  },
  error(message: string, duration = 4000): void {
    addToast({ type: 'error', message, duration })
  },
  info(message: string, duration = 3000): void {
    addToast({ type: 'info', message, duration })
  },
  warn(message: string, duration = 3500): void {
    addToast({ type: 'warn', message, duration })
  },
}

function addToast(t: Omit<ToastItem, 'id'>): void {
  const id = uid()
  const item: ToastItem = { ...t, id }
  toasts = [...toasts, item]
  listeners.forEach(fn => fn(toasts))
  if (t.duration > 0) {
    setTimeout(() => removeToast(id), t.duration)
  }
}

export function removeToast(id: number): void {
  toasts = toasts.filter(t => t.id !== id)
  listeners.forEach(fn => fn(toasts))
}

export function subscribeToasts(fn: (toasts: ToastItem[]) => void): () => void {
  listeners.add(fn)
  fn(toasts)
  return () => listeners.delete(fn)
}

interface Point {
  x: number
  y: number
}

/** SVG 平滑曲线路径（Catmull-Rom → Cubic Bézier） */
export function smoothLine(points: Point[]): string {
  if (!points || points.length < 2) return ''
  if (points.length === 2) return `M${points[0].x},${points[0].y} L${points[1].x},${points[1].y}`
  let d = `M${points[0].x},${points[0].y}`
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = i === 0 ? points[0] : points[i - 1]
    const p1 = points[i]
    const p2 = points[i + 1]
    const p3 = i + 2 < points.length ? points[i + 2] : points[i + 1]
    const cp1x = p1.x + (p2.x - p0.x) / 6
    const cp1y = p1.y + (p2.y - p0.y) / 6
    const cp2x = p2.x - (p3.x - p1.x) / 6
    const cp2y = p2.y - (p3.y - p1.y) / 6
    d += ` C${cp1x},${cp1y} ${cp2x},${cp2y} ${p2.x},${p2.y}`
  }
  return d
}

/** 简易 Markdown → HTML */
export function renderMD(text: string): string {
  if (!text) return ''
  let html = text
    .replace(/^### (.+)$/gm, '</p><h3 class="text-lg font-bold my-3 text-gray-800 text-left">$1</h3><p>')
    .replace(/^## (.+)$/gm, '</p><h2 class="text-xl font-bold my-4 text-gray-900 text-left">$1</h2><p>')
    .replace(/^# (.+)$/gm, '</p><h1 class="text-2xl font-bold my-5 text-gray-900 text-left">$1</h1><p>')
    .replace(/\*\*(.+?)\*\*/g, '<strong class="font-semibold">$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/\n\n/g, '</p><p class="text-base leading-relaxed mb-4 text-gray-700">')
    .replace(/\n/g, '<br/>')
  return '<p class="text-base leading-relaxed mb-4 text-gray-700">' + html + '</p>'
}
