import { useState, Suspense } from 'react'
import { useParams, useNavigate } from 'react-router'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowLeft, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { getModuleByKey } from '@/lib/modules'

/**
 * 模块详情页 — 左侧菜单 + 右侧内嵌内容
 *
 * 两级导航结构：
 *   Level 1: 首页大模块卡片
 *   Level 2: 模块页面（本页）— 左侧菜单切换，右侧内容内嵌渲染
 *
 * 切换菜单不会跳转页面，只在右侧区域切换组件。
 */
export default function ModuleDetailPage() {
  const { moduleKey } = useParams<{ moduleKey: string }>()
  const navigate = useNavigate()
  const mod = getModuleByKey(moduleKey ?? '')

  // 默认选中第一个子功能
  const [selectedKey, setSelectedKey] = useState<string>(
    mod?.subFeatures[0]?.key ?? ''
  )

  if (!mod) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" onClick={() => navigate('/')}>
          <ArrowLeft className="mr-1 h-4 w-4" />
          返回首页
        </Button>
        <div
          className="flex h-64 items-center justify-center rounded-xl border-2 border-dashed"
          style={{ borderColor: 'var(--polaroid-border)', backgroundColor: 'var(--polaroid-warm)' }}
        >
          <span className="text-sm" style={{ color: 'var(--polaroid-text-muted)' }}>
            模块不存在
          </span>
        </div>
      </div>
    )
  }

  const selectedFeature = mod.subFeatures.find((f) => f.key === selectedKey)
  const FeatureComponent = selectedFeature?.component

  return (
    <div className="flex h-full gap-0">
      {/* ===== 左侧菜单 ===== */}
      <aside
        className="w-56 shrink-0 border-r flex flex-col"
        style={{
          backgroundColor: 'var(--polaroid-white)',
          borderColor: 'var(--polaroid-border)',
        }}
      >
        {/* 返回按钮 + 模块标题 */}
        <div className="p-4 border-b" style={{ borderColor: 'var(--polaroid-border)' }}>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/')}
            className="gap-1 mb-3 -ml-2"
            style={{ color: 'var(--polaroid-text-muted)' }}
          >
            <ArrowLeft className="h-4 w-4" />
            返回首页
          </Button>
          <div className="flex items-center gap-2">
            <div
              className="flex h-8 w-8 items-center justify-center rounded-lg"
              style={{ backgroundColor: mod.color + '18' }}
            >
              <mod.icon className="h-4 w-4" style={{ color: mod.color }} />
            </div>
            <div>
              <h2 className="text-sm font-semibold" style={{ color: 'var(--polaroid-text)' }}>
                {mod.title}
              </h2>
              <p className="text-[11px]" style={{ color: 'var(--polaroid-text-muted)' }}>
                {mod.subFeatures.length} 项功能
              </p>
            </div>
          </div>
        </div>

        {/* 菜单列表 */}
        <nav className="flex-1 p-2 space-y-1 overflow-y-auto">
          {mod.subFeatures.map((feature) => {
            const isActive = selectedKey === feature.key
            return (
              <button
                key={feature.key}
                onClick={() => setSelectedKey(feature.key)}
                className={cn(
                  'flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-left transition-all',
                )}
                style={{
                  backgroundColor: isActive ? feature.color + '15' : 'transparent',
                  color: isActive ? feature.color : 'var(--polaroid-text)',
                }}
                onMouseEnter={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.backgroundColor = 'var(--polaroid-warm)'
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.backgroundColor = 'transparent'
                  }
                }}
              >
                <feature.icon className="h-4 w-4 shrink-0" />
                <div className="min-w-0">
                  <div className="text-sm font-medium truncate">{feature.title}</div>
                  <div
                    className="text-[11px] truncate"
                    style={{ color: 'var(--polaroid-text-muted)' }}
                  >
                    {feature.subtitle}
                  </div>
                </div>
              </button>
            )
          })}
        </nav>
      </aside>

      {/* ===== 右侧内嵌内容区 ===== */}
      <main className="flex-1 overflow-auto p-6" style={{ backgroundColor: 'var(--polaroid-cream)' }}>
        <AnimatePresence mode="wait">
          {FeatureComponent && (
            <motion.div
              key={selectedKey}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
              className="h-full"
            >
              <Suspense
                fallback={
                  <div className="flex items-center justify-center py-20">
                    <Loader2 className="h-6 w-6 animate-spin" style={{ color: 'var(--amber-primary)' }} />
                  </div>
                }
              >
                <FeatureComponent />
              </Suspense>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  )
}
