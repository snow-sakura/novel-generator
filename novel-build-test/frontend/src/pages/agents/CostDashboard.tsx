import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  LineChart,
  Line,
} from 'recharts'
import {
  DollarSign,
  Cpu,
  Activity,
  ArrowLeft,
  RefreshCw,
} from 'lucide-react'
import { agentApi, type CostStats } from '@/lib/api-service'

/** 饼图颜色 */
const COLORS = ['#F59E0B', '#3B82F6', '#10B981', '#8B5CF6', '#EC4899']

/**
 * CostDashboard — AI 智能体成本仪表盘
 *
 * 2.5.9 功能：
 * - 总览卡片：总费用、总 Token、总调用次数
 * - PieChart：按模型费用分布
 * - BarChart：每日费用趋势
 * - 最近执行记录列表
 */
export default function CostDashboard() {
  const { id: projectId } = useParams()
  const navigate = useNavigate()
  const [stats, setStats] = useState<CostStats | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchStats = async () => {
    setLoading(true)
    try {
      const res = await agentApi.costs()
      setStats(res.data as unknown as CostStats)
    } catch {
      setStats(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchStats()
  }, [])

  /** 模拟模型费用分布数据（后端目前返回聚合数据，待扩展） */
  const modelData = stats?.model_usage?.length
    ? stats.model_usage
    : [
        { model: 'DeepSeek-V3', cost: 0.85, calls: 42, tokens: 128000 },
        { model: 'Qwen-Max', cost: 0.62, calls: 28, tokens: 96000 },
        { model: 'GLM-4', cost: 0.38, calls: 15, tokens: 64000 },
        { model: 'Moonshot-v1', cost: 0.15, calls: 8, tokens: 32000 },
      ]

  /** 模拟每日费用趋势 */
  const dailyData = stats?.daily_costs?.length
    ? stats.daily_costs
    : [
        { date: '07-08', cost: 0.32, calls: 5 },
        { date: '07-09', cost: 0.56, calls: 8 },
        { date: '07-10', cost: 0.21, calls: 3 },
        { date: '07-11', cost: 0.78, calls: 12 },
        { date: '07-12', cost: 0.45, calls: 7 },
        { date: '07-13', cost: 0.93, calls: 15 },
        { date: '07-14', cost: 0.67, calls: 10 },
      ]

  const totalCost = stats?.total_cost ?? modelData.reduce((s, m) => s + m.cost, 0)
  const totalTokens = stats?.total_tokens ?? modelData.reduce((s, m) => s + m.tokens, 0)
  const totalCalls = stats?.total_calls ?? modelData.reduce((s, m) => s + m.calls, 0)

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate(projectId ? `/projects/${projectId}/agents` : '/agents')}>
            <ArrowLeft className="mr-1 h-4 w-4" />
            返回
          </Button>
          <div>
            <h2 className="text-xl font-bold tracking-tight">成本统计仪表盘</h2>
            <p className="text-sm text-muted-foreground">
              AI 智能体调用费用、Token 消耗与模型使用趋势
            </p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={fetchStats} disabled={loading}>
          <RefreshCw className={`h-3 w-3 mr-1 ${loading ? 'animate-spin' : ''}`} />
          刷新
        </Button>
      </div>

      {loading && !stats ? (
        <div className="grid gap-4 md:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <Skeleton className="h-4 w-20 mb-2" />
                <Skeleton className="h-8 w-32" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <>
          {/* 总览卡片 */}
          <div className="grid gap-4 md:grid-cols-3">
            <Card className="border-[var(--polaroid-border)] shadow-polaroid">
              <CardHeader className="flex flex-row items-center gap-3 pb-2">
                <div className="rounded-lg bg-amber-50 p-2">
                  <DollarSign className="h-5 w-5" style={{ color: 'var(--amber-primary)' }} />
                </div>
                <CardTitle className="text-sm font-medium" style={{ color: 'var(--polaroid-text-muted)' }}>
                  总费用
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" style={{ color: 'var(--polaroid-text)' }}>
                  ¥{totalCost.toFixed(4)}
                </div>
              </CardContent>
            </Card>

            <Card className="border-[var(--polaroid-border)] shadow-polaroid">
              <CardHeader className="flex flex-row items-center gap-3 pb-2">
                <div className="rounded-lg bg-blue-50 p-2">
                  <Cpu className="h-5 w-5 text-blue-600" />
                </div>
                <CardTitle className="text-sm font-medium" style={{ color: 'var(--polaroid-text-muted)' }}>
                  总 Token
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" style={{ color: 'var(--polaroid-text)' }}>
                  {totalTokens.toLocaleString()}
                </div>
              </CardContent>
            </Card>

            <Card className="border-[var(--polaroid-border)] shadow-polaroid">
              <CardHeader className="flex flex-row items-center gap-3 pb-2">
                <div className="rounded-lg bg-green-50 p-2">
                  <Activity className="h-5 w-5 text-green-600" />
                </div>
                <CardTitle className="text-sm font-medium" style={{ color: 'var(--polaroid-text-muted)' }}>
                  总调用次数
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" style={{ color: 'var(--polaroid-text)' }}>
                  {totalCalls}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* 图表行 */}
          <div className="grid gap-6 md:grid-cols-2">
            {/* 按模型费用分布（饼图） */}
            <Card className="border-[var(--polaroid-border)] shadow-polaroid">
              <CardHeader>
                <CardTitle className="text-base" style={{ color: 'var(--polaroid-text)' }}>
                  模型费用分布
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={280}>
                  <PieChart>
                    <Pie
                      data={modelData}
                      dataKey="cost"
                      nameKey="model"
                      cx="50%"
                      cy="50%"
                      outerRadius={90}
                      label={(entry: any) =>
                        `${entry.model || ''} ${(entry.percent * 100).toFixed(0)}%`
                      }
                    >
                      {modelData.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: any) => `¥${Number(value).toFixed(4)}`} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* 每日费用趋势（柱状图） */}
            <Card className="border-[var(--polaroid-border)] shadow-polaroid">
              <CardHeader>
                <CardTitle className="text-base" style={{ color: 'var(--polaroid-text)' }}>
                  每日费用趋势
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={dailyData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" fontSize={12} />
                    <YAxis fontSize={12} />
                    <Tooltip formatter={(value: any) => `¥${Number(value).toFixed(4)}`} />
                    <Bar dataKey="cost" fill={COLORS[0]} radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* 调用次数趋势（折线图） */}
          <Card className="border-[var(--polaroid-border)] shadow-polaroid">
            <CardHeader>
              <CardTitle className="text-base" style={{ color: 'var(--polaroid-text)' }}>
                调用次数趋势
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={dailyData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" fontSize={12} />
                  <YAxis fontSize={12} />
                  <Tooltip />
                  <Line
                    type="monotone"
                    dataKey="calls"
                    stroke={COLORS[1]}
                    strokeWidth={2}
                    dot={{ fill: COLORS[1], r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* 最近执行记录 */}
          {stats?.recent_executions && stats.recent_executions.length > 0 && (
            <Card className="border-[var(--polaroid-border)] shadow-polaroid">
              <CardHeader>
                <CardTitle className="text-base" style={{ color: 'var(--polaroid-text)' }}>
                  最近执行
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y">
                  {stats.recent_executions.slice(0, 5).map((exec) => (
                    <div
                      key={exec.id}
                      className="flex items-center justify-between px-4 py-3 text-sm"
                    >
                      <span className="text-muted-foreground">
                        {exec.task_type}
                      </span>
                      <span className="font-mono text-xs">¥{exec.cost?.toFixed(4) || '0'}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  )
}
