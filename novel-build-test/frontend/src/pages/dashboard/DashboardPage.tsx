import { useState } from 'react'
import { useNavigate } from 'react-router'
import { motion, AnimatePresence } from 'framer-motion'
import PolaroidCard from '@/components/polaroid/PolaroidCard'
import { getModulesByGroup, groupOrder, type Module } from '@/lib/modules'

/**
 * 首页 — 横向 Tab + 拍立得卡片矩阵
 *
 * 顶部 Tab 切换分组，下方展示对应分组的卡片网格
 * AI 智能体分组使用 3 列固定网格，其他分组自适应
 */
export default function DashboardPage() {
  const navigate = useNavigate()
  const grouped = getModulesByGroup()
  const [activeGroup, setActiveGroup] = useState(groupOrder[0])

  const currentMods: Module[] = grouped.get(activeGroup) ?? []
  const useThreeCol = activeGroup === 'AI 智能体' || activeGroup === 'AI 测试' || activeGroup === 'AI 应用' || activeGroup === '个人设置'
  const useFourCol = activeGroup === 'AI 配置'

  return (
    <div className="flex flex-col h-full p-6 mx-auto max-w-7xl overflow-auto">
      {/* ===== 欢迎区域（居中） ===== */}
      <div className="mb-6 text-center">
        <h1 className="text-2xl font-bold" style={{ color: 'var(--polaroid-text)' }}>
          AISQA · AI 测试平台
        </h1>
        <p className="mt-1 text-sm" style={{ color: 'var(--polaroid-text-muted)' }}>
          选择模块开始工作，点击卡片查看模块下的功能菜单
        </p>
      </div>

      {/* ===== 横向 Tab 栏（sticky） ===== */}
      <div
        className="flex gap-1 p-1 rounded-xl mb-6 overflow-x-auto shrink-0"
        style={{ backgroundColor: 'var(--polaroid-white)', border: '1px solid var(--polaroid-border)' }}
      >
        {groupOrder.map((group) => {
          const mods = grouped.get(group)
          if (!mods || mods.length === 0) return null
          const isActive = activeGroup === group

          return (
            <button
              key={group}
              onClick={() => setActiveGroup(group)}
              className="relative flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium whitespace-nowrap transition-all duration-200"
              style={{
                backgroundColor: isActive ? 'var(--amber-primary)' : 'transparent',
                color: isActive ? 'white' : 'var(--polaroid-text)',
              }}
              onMouseEnter={(e) => {
                if (!isActive) e.currentTarget.style.backgroundColor = 'var(--polaroid-warm)'
              }}
              onMouseLeave={(e) => {
                if (!isActive) e.currentTarget.style.backgroundColor = 'transparent'
              }}
            >
              <span>{group}</span>
              <span
                className="text-xs rounded-full px-1.5 py-0.5"
                style={{
                  backgroundColor: isActive ? 'rgba(255,255,255,0.25)' : 'var(--polaroid-warm)',
                  color: isActive ? 'white' : 'var(--polaroid-text-muted)',
                }}
              >
                {mods.length}
              </span>
            </button>
          )
        })}
      </div>

      {/* ===== 卡片网格区域 ===== */}
      <div className="flex-1 min-h-0">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeGroup}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.2 }}
            className="grid gap-4 h-full content-start"
            style={{
              gridTemplateColumns: useThreeCol
                ? 'repeat(3, minmax(0, 1fr))'
                : useFourCol
                  ? 'repeat(4, minmax(0, 1fr))'
                  : 'repeat(auto-fill, minmax(240px, 1fr))',
            }}
          >
            {currentMods.map((mod, i) => {
              const Icon = mod.icon
              return (
                <motion.div
                  key={mod.key}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: i * 0.04, duration: 0.2 }}
                >
                  <PolaroidCard
                    icon={<Icon className="h-7 w-7" />}
                    color={mod.color}
                    title={mod.title}
                    subtitle={mod.subtitle}
                    signature={mod.signature}
                    badge={{ label: `${mod.subFeatures.length} 项功能`, variant: 'default' }}
                    status={mod.status}
                    lastRunTime={mod.lastRunTime}
                    onClick={() => navigate(`/modules/${mod.key}`)}
                  />
                </motion.div>
              )
            })}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  )
}
