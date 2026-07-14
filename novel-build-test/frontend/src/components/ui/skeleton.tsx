import { cn } from '@/lib/utils'

/**
 * Skeleton 骨架屏组件
 * 用于内容加载时的占位显示
 */
function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('animate-pulse rounded-md bg-primary/10', className)}
      {...props}
    />
  )
}

export { Skeleton }
