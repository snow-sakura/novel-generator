import { type ReactNode } from 'react'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'

export interface PolaroidCardProps {
  /** 卡片子元素（用于自定义内容模式） */
  children?: ReactNode
  /** 卡片图标/视觉元素 */
  icon?: ReactNode
  /** 卡片颜色标识（用于背景色块） */
  color?: string
  /** 标题 */
  title?: string
  /** 副标题/描述 */
  subtitle?: string
  /** 主要统计数字（大字） */
  metric?: string
  /** 指标标签 */
  metricLabel?: string
  /** 底部签名区内容 */
  signature?: string
  /** 状态标签 */
  badge?: { label: string; variant?: 'default' | 'amber' | 'rose' | 'muted' }
  /** 智能体状态 */
  status?: 'active' | 'pending' | 'beta'
  /** 上次运行时间 */
  lastRunTime?: string
  /** 点击回调 */
  onClick?: () => void
  /** 是否禁用（半透明） */
  disabled?: boolean
  /** 自定义类名 */
  className?: string
  /** 自定义旋转角度 */
  rotate?: number
}

/**
 * PolaroidCard — 暖白拍立得风格卡片
 *
 * 模仿拍立得相纸外观：
 * - 纯白背景 + 暖色阴影
 * - 轻微随机旋转（-2deg ~ +2deg）
 * - 底部留白签名区
 * - 悬浮动画：上移 + 回正 + 阴影加深
 */
export default function PolaroidCard({
  children,
  icon,
  color,
  title,
  subtitle,
  metric,
  metricLabel,
  signature,
  badge,
  status,
  lastRunTime,
  onClick,
  disabled = false,
  className,
  rotate,
}: PolaroidCardProps) {
  const rotation = rotate ?? (Math.random() * 4 - 2) // -2 ~ +2

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{
        y: -8,
        rotate: 0,
        scale: 1.02,
        transition: { type: 'spring', stiffness: 300, damping: 20 },
      }}
      whileTap={{ scale: 0.97 }}
      onClick={onClick}
      className={cn(
        'relative cursor-pointer select-none rounded-xl bg-white p-4 transition-colors flex flex-col',
        'shadow-polaroid h-[220px]',
        disabled && 'opacity-50 pointer-events-none',
        onClick && 'cursor-pointer',
        className,
      )}
      style={{ transform: `rotate(${rotation}deg)` }}
    >
      {/* 图标区域 */}
      {icon && (
        <div className="mb-3 flex items-center justify-center">
          {color ? (
            <div
              className="flex h-14 w-14 items-center justify-center rounded-full"
              style={{ backgroundColor: color + '20' }}
            >
              <span className={cn('h-7 w-7', color && `text-[${color}]`)}>
                {icon}
              </span>
            </div>
          ) : (
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-amber-50">
              <span className="text-amber-600">{icon}</span>
            </div>
          )}
        </div>
      )}

      {/* 自定义内容（children 模式，覆盖默认渲染） */}
      {children ? (
        <div className="flex-1">{children}</div>
      ) : (
        <div className="flex-1 flex flex-col">
      {/* 标题区 */}
      <div className="mb-1 text-center">
        <h3 className="text-base font-semibold text-[var(--polaroid-text)]">
          {title ?? ""}
        </h3>
        {subtitle && (
          <p className="mt-0.5 text-xs text-[var(--polaroid-text-muted)]">
            {subtitle}
          </p>
        )}
      </div>

      {/* 统计数字 */}
      {metric && (
        <div className="my-2 text-center">
          <span className="text-2xl font-bold text-[var(--amber-primary)]">
            {metric}
          </span>
          {metricLabel && (
            <span className="ml-1 text-xs text-[var(--polaroid-text-muted)]">
              {metricLabel}
            </span>
          )}
        </div>
      )}

      {/* 状态标签 */}
      {badge && (
        <div className="mb-2 flex justify-center">
          <span
            className={cn(
              'inline-block rounded-full px-2.5 py-0.5 text-xs font-medium',
              badge.variant === 'amber' && 'bg-amber-100 text-amber-700',
              badge.variant === 'rose' && 'bg-rose-100 text-rose-700',
              badge.variant === 'muted' && 'bg-gray-100 text-gray-500',
              (!badge.variant || badge.variant === 'default') && 'bg-amber-50 text-amber-600',
            )}
          >
            {badge.label}
          </span>
        </div>
      )}

      {/* 智能体状态 + 上次运行时间 */}
      {(status || lastRunTime) && (
        <div className="mb-2 flex items-center justify-between text-[11px]">
          {status && (
            <span
              className={cn(
                'inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-medium',
                status === 'active' && 'bg-emerald-50 text-emerald-600',
                status === 'pending' && 'bg-amber-50 text-amber-600',
                status === 'beta' && 'bg-purple-50 text-purple-600',
              )}
            >
              <span
                className={cn(
                  'h-1.5 w-1.5 rounded-full',
                  status === 'active' && 'bg-emerald-500',
                  status === 'pending' && 'bg-amber-500',
                  status === 'beta' && 'bg-purple-500',
                )}
              />
              {status === 'active' ? '已就绪' : status === 'pending' ? '待接入' : 'Beta'}
            </span>
          )}
          {lastRunTime && (
            <span style={{ color: 'var(--polaroid-text-muted)' }}>
              {lastRunTime}
            </span>
          )}
        </div>
      )}

      {/* 底部签名区（拍立得标志性留白） */}
      {signature && (
        <div className="mt-auto pt-2 border-t border-[var(--polaroid-border)] text-center">
          <span className="text-[11px] italic tracking-wide text-[var(--polaroid-text-muted)]">
            {signature}
          </span>
        </div>
      )}
      </div>
      )}

    </motion.div>
  )
}
