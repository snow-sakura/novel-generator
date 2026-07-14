import { useNavigate } from 'react-router'
import PolaroidCard from '@/components/polaroid/PolaroidCard'
import PolaroidGrid from '@/components/polaroid/PolaroidGrid'
import {
  FolderKanban,
  FileText,
  Server,
  Package,
  BookOpen,
  Settings,
} from 'lucide-react'

/**
 * 首页 — 暖白拍立得卡片矩阵
 *
 * 公共模块卡片（顶部）+ 测试类型卡片（底部，待启用）
 */
export default function DashboardPage() {
  const navigate = useNavigate()

  /** 公共模块卡片 */
  const publicModules = [
    {
      key: 'projects',
      title: '项目管理',
      subtitle: '测试项目与团队管理',
      metric: '-',
      metricLabel: '个项目',
      icon: <FolderKanban className="h-7 w-7" />,
      color: '#F59E0B',
      badge: { label: '就绪', variant: 'default' as const },
      onClick: () => navigate('/projects'),
    },
    {
      key: 'requirements',
      title: '需求管理',
      subtitle: '测试需求与功能模块',
      metric: '-',
      metricLabel: '个需求',
      icon: <FileText className="h-7 w-7" />,
      color: '#3B82F6',
      badge: { label: '就绪', variant: 'default' as const },
      onClick: () => navigate('/requirements'),
    },
    {
      key: 'environments',
      title: '测试环境',
      subtitle: '环境配置与部署管理',
      metric: '-',
      metricLabel: '个环境',
      icon: <Server className="h-7 w-7" />,
      color: '#10B981',
      badge: { label: '就绪', variant: 'default' as const },
      onClick: () => navigate('/environments'),
    },
    {
      key: 'assets',
      title: '测试资产库',
      subtitle: '测试数据与脚本资产',
      metric: '-',
      metricLabel: '个资产',
      icon: <Package className="h-7 w-7" />,
      color: '#8B5CF6',
      badge: { label: '就绪', variant: 'default' as const },
      onClick: () => navigate('/assets'),
    },
    {
      key: 'knowledge',
      title: 'AI 知识库',
      subtitle: '向量知识管理与语义检索',
      metric: '-',
      metricLabel: '条知识',
      icon: <BookOpen className="h-7 w-7" />,
      color: '#EC4899',
      badge: { label: '就绪', variant: 'default' as const },
      onClick: () => navigate('/knowledge'),
    },
    {
      key: 'settings',
      title: '系统设置',
      subtitle: '模型 / 提示词 / 工具',
      icon: <Settings className="h-7 w-7" />,
      color: '#6B7280',
      badge: { label: '配置', variant: 'muted' as const },
      onClick: () => navigate('/settings'),
    },
  ]

  return (
    <div className="space-y-10">
      {/* 欢迎区域 */}
      <div>
        <h1 className="text-2xl font-bold" style={{ color: 'var(--polaroid-text)' }}>
          AISQA · AI 测试平台
        </h1>
        <p className="mt-1 text-sm" style={{ color: 'var(--polaroid-text-muted)' }}>
          选择模块开始工作，公共模块和测试类型均已就绪
        </p>
      </div>

      {/* 公共模块卡片组 */}
      <PolaroidGrid title="公共模块" columns={5}>
        {publicModules.map((mod) => (
          <PolaroidCard
            key={mod.key}
            icon={mod.icon}
            color={mod.color}
            title={mod.title}
            subtitle={mod.subtitle}
            metric={mod.metric}
            metricLabel={mod.metricLabel}
            badge={mod.badge}
            onClick={mod.onClick}
          />
        ))}
      </PolaroidGrid>

      {/* 测试类型区域 — 暂不可用 */}
      <div>
        <h2
          className="mb-4 text-lg font-semibold tracking-wide"
          style={{ color: 'var(--polaroid-text)', opacity: 0.5 }}
        >
          测试类型
          <span className="ml-2 text-xs font-normal" style={{ color: 'var(--polaroid-text-muted)' }}>
            (后续版本开放)
          </span>
        </h2>
        <div className="grid grid-cols-5 gap-6">
          {['冒烟测试', '功能测试', 'API测试', 'UI测试', '回归测试'].map((name) => (
            <div
              key={name}
              className="flex h-48 cursor-not-allowed items-center justify-center rounded-xl border-2 border-dashed opacity-40"
              style={{ borderColor: 'var(--polaroid-border)', backgroundColor: 'var(--polaroid-warm)' }}
            >
              <span className="text-sm" style={{ color: 'var(--polaroid-text-muted)' }}>
                {name}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
