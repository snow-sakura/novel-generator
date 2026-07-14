import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

/**
 * 合并 Tailwind CSS 类名，自动处理冲突
 * 组合了 clsx 的条件类名能力和 tailwind-merge 的冲突解决能力
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
