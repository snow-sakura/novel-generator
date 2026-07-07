import { clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

/** 合并 Tailwind 类名 */
export function cn(...inputs) {
  return twMerge(clsx(inputs))
}
