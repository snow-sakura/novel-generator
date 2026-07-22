import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router'
import { motion, AnimatePresence } from 'framer-motion'
import {
  BarChart3,
  BookOpen,
  Boxes,
  Bug,
  Clock,
  FolderKanban,
  TestTube,
} from 'lucide-react'
import PolaroidCard from '@/components/polaroid/PolaroidCard'
import { getModulesByGroup, groupOrder, type Module } from '@/lib/modules'
import { dashboardApi, type DashboardStats } from '@/lib/api-service'

const metricColors = {
  primary: { bg: '#fef3c7', text: '#92400e', icon: '#d97706' },
  success: { bg: '#d1fae5', text: '#065f46', icon: '#059669' },
  info: { bg: '#dbeafe', text: '#1e40af', icon: '#2563eb' },
  warning: { bg: '#fce7f3', text: '#9d174d', icon: '#db2777' },
} as const

export default function DashboardPage() {
  const navigate = useNavigate()
  const grouped = getModulesByGroup()
  const [activeGroup, setActiveGroup] = useState(groupOrder[0])
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    dashboardApi.stats()
      .then((res) => setStats(res.data))
      .catch(() => { /* stats 不可用时静默降级 */ })
      .finally(() => setLoading(false))
  }, [])

  const currentMods: Module[] = grouped.get(activeGroup) ?? []
  const useThreeCol = activeGroup === 'AI 智能体' || activeGroup === 'AI 测试' || activeGroup === 'AI 应用' || activeGroup === '个人设置'
  const useFourCol = activeGroup === 'AI 配置'

  return (
    <div className="flex flex-col h-full p-6 mx-auto max-w-7xl overflow-auto">
      {/* ===== 顶部标题 ===== */}
      <div className="mb-6 text-center">
        <h1 className="text-2xl font-bold" style={{ color: 'var(--polaroid-text)' }}>
          AISQA · AI 测试平台
        </h1>
        <p className="mt-1 text-sm" style={{ color: 'var(--polaroid-text-muted)' }}>
          全局概览与模块导航
        </p>
      </div>

      {/* ===== 统计卡片（4 个核心指标） ===== */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6"
      >
        {/* 项目数 */}
        <StatsCard
          icon={FolderKanban}
          label="项目总数"
          value={stats?.total_projects ?? '-'}
          color={metricColors.primary}
          loading={loading}
        />
        {/* 需求数 */}
        <StatsCard
          icon={BookOpen}
          label="需求总数"
          value={stats?.total_requirements ?? '-'}
          color={metricColors.info}
          loading={loading}
        />
        {/* 执行数 */}
        <StatsCard
          icon={BarChart3}
          label="测试执行"
          value={stats?.total_executions ?? '-'}
          color={metricColors.success}
          loading={loading}
        />
        {/* 通过率 */}
        <StatsCard
          icon={TestTube}
          label="通过率"
          value={stats ? `${stats.pass_rate}%` : '-'}
          color={metricColors.warning}
          loading={loading}
        />
      </motion.div>

      {/* ===== 第二行: 待办 + 趋势摘要 ===== */}
      {stats && !loading && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="flex flex-wrap gap-3 mb-6"
        >
          <TodoBadge icon={Clock} label="待审核" count={stats.pending_reviews} />
          <TodoBadge icon={Bug} label="近期失败" count={stats.recent_failed_cases} variant="danger" />
          <TodoBadge icon={Boxes} label="过期环境" count={stats.expired_environments} variant="warning" />
          {stats.trend.length > 0 && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs"
              style={{ backgroundColor: 'var(--polaroid-warm)', color: 'var(--polaroid-text-muted)' }}>
              <BarChart3 className="h-3.5 w-3.5" />
              <span>近 7 日执行: {stats.trend.reduce((s, d) => s + d.count, 0)} 次</span>
            </div>
          )}
        </motion.div>
      )}

      {/* ===== 横向 Tab 栏 ===== */}
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

      {/* ===== 卡片网格 ===== */}
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

/** 统计卡片组件 */
function StatsCard({
  icon: Icon,
  label,
  value,
  color,
  loading,
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  value: string | number
  color: { bg: string; text: string; icon: string }
  loading: boolean
}) {
  return (
    <div
      className="flex items-center gap-3 p-4 rounded-xl transition-shadow hover:shadow-md"
      style={{ backgroundColor: color.bg }}
    >
      <div
        className="flex items-center justify-center w-10 h-10 rounded-lg shrink-0"
        style={{ backgroundColor: color.icon + '20' }}
      >
        <span style={{ color: color.icon }}><Icon className="h-5 w-5" /></span>
      </div>
      <div className="min-w-0">
        <p className="text-xs font-medium opacity-70" style={{ color: color.text }}>
          {label}
        </p>
        <p className="text-xl font-bold truncate" style={{ color: color.text }}>
          {loading ? (
            <span className="inline-block w-12 h-5 rounded animate-pulse" style={{ backgroundColor: color.icon + '30' }} />
          ) : (
            value
          )}
        </p>
      </div>
    </div>
  )
}

/** 待办标签 */
function TodoBadge({
  icon: Icon,
  label,
  count,
  variant = 'default',
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  count: number
  variant?: 'default' | 'danger' | 'warning'
}) {
  const colors = {
    default: { bg: 'var(--polaroid-warm)', text: 'var(--polaroid-text-muted)', dot: '#6b7280' },
    danger: { bg: '#fef2f2', text: '#991b1b', dot: '#dc2626' },
    warning: { bg: '#fffbeb', text: '#92400e', dot: '#d97706' },
  }
  const c = colors[variant]

  return (
    <div
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs"
      style={{ backgroundColor: c.bg, color: c.text }}
    >
      <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: c.dot }} />
      <Icon className="h-3.5 w-3.5 shrink-0" />
      <span>{label}</span>
      <span className="font-bold">{count}</span>
    </div>
  )
}
