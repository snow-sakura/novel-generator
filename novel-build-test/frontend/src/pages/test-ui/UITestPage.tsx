import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { CheckCircle, XCircle, Monitor, Smartphone, Tablet, Image, Trash2, Loader2 } from 'lucide-react'
import { uiTestApi } from '../../lib/api-service'

interface VisualTest {
  id: number
  name: string
  baseline: string
  current: string
  diffPercentage: number
  status: 'pass' | 'fail'
}

interface ResponsiveTest {
  id: number
  pageName: string
  desktop: 'pass' | 'fail'
  tablet: 'pass' | 'fail'
  mobile: 'pass' | 'fail'
  overall: 'pass' | 'fail'
}

const MOCK_RESPONSIVE_TESTS: ResponsiveTest[] = [
  { id: 1, pageName: '首页', desktop: 'pass', tablet: 'pass', mobile: 'pass', overall: 'pass' },
  { id: 2, pageName: '小说阅读页', desktop: 'pass', tablet: 'pass', mobile: 'fail', overall: 'fail' },
  { id: 3, pageName: '搜索页面', desktop: 'pass', tablet: 'fail', mobile: 'fail', overall: 'fail' },
  { id: 4, pageName: '用户设置', desktop: 'pass', tablet: 'pass', mobile: 'pass', overall: 'pass' },
  { id: 5, pageName: '创作中心', desktop: 'pass', tablet: 'pass', mobile: 'pass', overall: 'pass' },
  { id: 6, pageName: '管理员后台', desktop: 'pass', tablet: 'fail', mobile: 'fail', overall: 'fail' },
]

const StatusIcon = ({ status }: { status: 'pass' | 'fail' }) =>
  status === 'pass'
    ? <CheckCircle className="h-4 w-4 text-green-500" />
    : <XCircle className="h-4 w-4 text-red-500" />

export default function UITestPage() {
  const [activeTab, setActiveTab] = useState<'ui-visual' | 'ui-responsive'>('ui-visual')
  const [visualTests, setVisualTests] = useState<VisualTest[]>([])
  const [responsiveTests] = useState<ResponsiveTest[]>(MOCK_RESPONSIVE_TESTS)
  const [loading, setLoading] = useState(true)
  const [diffLoading, setDiffLoading] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const loadData = async () => {
      setLoading(true)
      setError(null)
      try {
        const res = await uiTestApi.listBaselines({ page: 1, page_size: 100 })
        const items = res.data.items || []
        setVisualTests(
          items.map((b) => ({
            id: b.id,
            name: b.name,
            baseline: `v${b.id}`,
            current: 'current',
            diffPercentage: 0,
            status: 'pass' as const,
          }))
        )
      } catch (e) {
        console.error('Failed to load baselines', e)
        setError(e instanceof Error ? e.message : 'Failed to load baselines')
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [])

  const tabs = [
    { key: 'ui-visual', label: '视觉回归' },
    { key: 'ui-responsive', label: '响应式测试' },
  ]

  const handleDelete = async (id: number) => {
    if (!window.confirm('确定删除该基线？')) return
    try {
      await uiTestApi.deleteBaseline(id)
      setVisualTests(prev => prev.filter(v => v.id !== id))
    } catch {
      console.error('Failed to delete baseline')
    }
  }

  const handleVisualDiff = async (baselineId: number) => {
    setDiffLoading(baselineId)
    try {
      const res = await uiTestApi.visualDiff({ baseline_id: baselineId, screenshot_url: '' })
      setVisualTests(prev => prev.map(v =>
        v.id === baselineId
          ? { ...v, diffPercentage: res.data.diff_percent, status: res.data.diff_percent > 5 ? 'fail' as const : 'pass' as const }
          : v
      ))
    } catch {
      console.error('Failed to run visual diff')
    } finally {
      setDiffLoading(null)
    }
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4 flex items-center gap-2">
          <span className="text-sm">{error}</span>
          <button onClick={() => setError(null)} className="ml-auto text-red-500 hover:text-red-700">&times;</button>
        </div>
      )}
      {/* Tab 栏 */}
      <div className="flex gap-1 p-1 rounded-lg" style={{ backgroundColor: 'var(--polaroid-warm)' }}>
        {tabs.map((t) => (
          <button key={t.key} onClick={() => setActiveTab(t.key as typeof activeTab)}
            className="flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all"
            style={{
              backgroundColor: activeTab === t.key ? 'var(--polaroid-white)' : 'transparent',
              color: activeTab === t.key ? 'var(--amber-primary)' : 'var(--polaroid-text-muted)',
              boxShadow: activeTab === t.key ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
            }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* 视觉回归 */}
      {activeTab === 'ui-visual' && (
        <div className="space-y-4">
          {/* Summary */}
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin" style={{ color: 'var(--amber-primary)' }} />
            </div>
          ) : (
            <>
              <div className="grid gap-4 grid-cols-3">
                <div className="rounded-xl border p-5" style={{ borderColor: 'var(--polaroid-border)', backgroundColor: 'var(--polaroid-white)' }}>
                  <p className="text-sm" style={{ color: 'var(--polaroid-text-muted)' }}>测试总数</p>
                  <p className="text-2xl font-bold mt-1" style={{ color: 'var(--polaroid-text)' }}>{visualTests.length}</p>
                </div>
                <div className="rounded-xl border p-5" style={{ borderColor: 'var(--polaroid-border)', backgroundColor: 'var(--polaroid-white)' }}>
                  <p className="text-sm" style={{ color: 'var(--polaroid-text-muted)' }}>通过</p>
                  <p className="text-2xl font-bold mt-1 text-green-600">{visualTests.filter(t => t.status === 'pass').length}</p>
                </div>
                <div className="rounded-xl border p-5" style={{ borderColor: 'var(--polaroid-border)', backgroundColor: 'var(--polaroid-white)' }}>
                  <p className="text-sm" style={{ color: 'var(--polaroid-text-muted)' }}>失败</p>
                  <p className="text-2xl font-bold mt-1 text-red-500">{visualTests.filter(t => t.status === 'fail').length}</p>
                </div>
              </div>

              {/* Test cards */}
              <div className="grid gap-4 md:grid-cols-2">
                {visualTests.length === 0 ? (
                  <div className="col-span-full text-center py-12 text-sm" style={{ color: 'var(--polaroid-text-muted)' }}>暂无视觉基线数据</div>
                ) : (
                  visualTests.map((test) => {
                    const barColor = test.diffPercentage > 5 ? '#ef4444' : test.diffPercentage > 1 ? '#f97316' : '#22c55e'
                    return (
                      <motion.div key={test.id} whileHover={{ y: -2 }}
                        className="rounded-xl border p-5 space-y-3"
                        style={{ borderColor: 'var(--polaroid-border)', backgroundColor: 'var(--polaroid-white)' }}>
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: 'rgba(99, 102, 241, 0.1)' }}>
                              <Image className="h-5 w-5 text-indigo-500" />
                            </div>
                            <div>
                              <h3 className="font-medium text-sm" style={{ color: 'var(--polaroid-text)' }}>{test.name}</h3>
                              <p className="text-xs" style={{ color: 'var(--polaroid-text-muted)' }}>
                                基线: {test.baseline} → 当前: {test.current}
                              </p>
                            </div>
                          </div>
                          <StatusIcon status={test.status} />
                        </div>

                        {/* Diff percentage */}
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs" style={{ color: 'var(--polaroid-text-muted)' }}>差异比例</span>
                            <span className="text-xs font-medium" style={{ color: barColor }}>{test.diffPercentage}%</span>
                          </div>
                          <div className="h-2 w-full rounded-full bg-gray-100 overflow-hidden">
                            <div className="h-full rounded-full transition-all" style={{ width: `${Math.min(test.diffPercentage * 10, 100)}%`, backgroundColor: barColor }} />
                          </div>
                        </div>

                        <div className="flex items-center gap-2 pt-2 border-t" style={{ borderColor: 'var(--polaroid-border)' }}>
                          <button
                            onClick={() => handleVisualDiff(test.id)}
                            disabled={diffLoading === test.id}
                            className="flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs border transition-colors hover:bg-gray-50 disabled:opacity-50"
                            style={{ borderColor: 'var(--polaroid-border)', color: 'var(--polaroid-text-muted)' }}
                          >
                            {diffLoading === test.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Image className="h-3 w-3" />}
                            执行对比
                          </button>
                          <button
                            onClick={() => handleDelete(test.id)}
                            className="flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs border transition-colors hover:bg-red-50 disabled:opacity-50"
                            style={{ borderColor: 'var(--polaroid-border)', color: '#ef4444' }}
                          >
                            <Trash2 className="h-3 w-3" />
                            删除
                          </button>
                          <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${test.status === 'pass' ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>
                            <StatusIcon status={test.status} />
                            {test.status === 'pass' ? '通过' : '未通过'}
                          </span>
                          <span className="text-xs" style={{ color: 'var(--polaroid-text-muted)' }}>
                            {test.diffPercentage < 1 ? '无明显差异' : test.diffPercentage < 5 ? '轻微差异' : '显著差异'}
                          </span>
                        </div>
                      </motion.div>
                    )
                  })
                )}
              </div>
            </>
          )}
        </div>
      )}

      {/* 响应式测试 */}
      {activeTab === 'ui-responsive' && (
        <div className="space-y-4">
          {/* Summary */}
          <div className="grid gap-4 grid-cols-4">
            <div className="rounded-xl border p-5" style={{ borderColor: 'var(--polaroid-border)', backgroundColor: 'var(--polaroid-white)' }}>
              <p className="text-sm" style={{ color: 'var(--polaroid-text-muted)' }}>测试页面</p>
              <p className="text-2xl font-bold mt-1" style={{ color: 'var(--polaroid-text)' }}>{responsiveTests.length}</p>
            </div>
            {(['desktop', 'tablet', 'mobile'] as const).map((device) => {
              const passCount = responsiveTests.filter(t => t[device] === 'pass').length
              return (
                <div key={device} className="rounded-xl border p-5" style={{ borderColor: 'var(--polaroid-border)', backgroundColor: 'var(--polaroid-white)' }}>
                  <div className="flex items-center gap-2 mb-1">
                    {device === 'desktop' ? <Monitor className="h-4 w-4" /> : device === 'tablet' ? <Tablet className="h-4 w-4" /> : <Smartphone className="h-4 w-4" />}
                    <p className="text-sm capitalize" style={{ color: 'var(--polaroid-text-muted)' }}>{device}</p>
                  </div>
                  <p className="text-2xl font-bold mt-1" style={{ color: 'var(--polaroid-text)' }}>{passCount}/{responsiveTests.length}</p>
                </div>
              )
            })}
          </div>

          {/* Results table */}
          <div className="rounded-xl border overflow-hidden" style={{ borderColor: 'var(--polaroid-border)' }}>
            <table className="w-full text-sm">
              <thead>
                <tr style={{ backgroundColor: 'var(--polaroid-warm)' }}>
                  <th className="px-4 py-3 text-left font-medium" style={{ color: 'var(--polaroid-text)' }}>页面名称</th>
                  <th className="px-4 py-3 text-center font-medium" style={{ color: 'var(--polaroid-text)' }}>
                    <div className="flex items-center justify-center gap-1"><Monitor className="h-3.5 w-3.5" /> Desktop</div>
                  </th>
                  <th className="px-4 py-3 text-center font-medium" style={{ color: 'var(--polaroid-text)' }}>
                    <div className="flex items-center justify-center gap-1"><Tablet className="h-3.5 w-3.5" /> Tablet</div>
                  </th>
                  <th className="px-4 py-3 text-center font-medium" style={{ color: 'var(--polaroid-text)' }}>
                    <div className="flex items-center justify-center gap-1"><Smartphone className="h-3.5 w-3.5" /> Mobile</div>
                  </th>
                  <th className="px-4 py-3 text-center font-medium" style={{ color: 'var(--polaroid-text)' }}>总体结果</th>
                </tr>
              </thead>
              <tbody>
                {responsiveTests.map((t) => (
                  <tr key={t.id} className="border-t hover:bg-gray-50/50" style={{ borderColor: 'var(--polaroid-border)' }}>
                    <td className="px-4 py-3 font-medium" style={{ color: 'var(--polaroid-text)' }}>{t.pageName}</td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex justify-center"><StatusIcon status={t.desktop} /></div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex justify-center"><StatusIcon status={t.tablet} /></div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex justify-center"><StatusIcon status={t.mobile} /></div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${t.overall === 'pass' ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>
                        <StatusIcon status={t.overall} />
                        {t.overall === 'pass' ? '通过' : '未通过'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
