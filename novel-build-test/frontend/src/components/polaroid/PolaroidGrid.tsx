import { type ReactNode } from 'react'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'

export interface PolaroidGridProps {
  /** 卡片组标题 */
  title?: string
  /** 卡片元素 */
  children: ReactNode
  /** 列数 (1-5，默认 5) */
  columns?: 1 | 2 | 3 | 4 | 5
  /** 自定义类名 */
  className?: string
}

/**
 * PolaroidGrid — 拍立得卡片矩阵容器
 *
 * 以 CSS Grid 布局排列 PolaroidCard，
 * 带交错入场动画效果。
 */
export default function PolaroidGrid({
  title,
  children,
  columns = 5,
  className,
}: PolaroidGridProps) {
  const colClass = {
    1: 'grid-cols-1',
    2: 'grid-cols-1 sm:grid-cols-2',
    3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4',
    5: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5',
  }[columns]

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.08 },
    },
  }

  return (
    <div className={cn('space-y-4', className)}>
      {title && (
        <h2 className="text-lg font-semibold tracking-wide text-[var(--polaroid-text)]">
          {title}
        </h2>
      )}
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className={cn('grid gap-6', colClass)}
      >
        {children}
      </motion.div>
    </div>
  )
}
