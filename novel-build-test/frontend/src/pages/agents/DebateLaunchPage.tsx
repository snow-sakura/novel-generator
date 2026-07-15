import { useState } from 'react'
import { useParams, useNavigate } from 'react-router'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import {
  MessageSquare,
  Loader2,
  CheckCircle2,
  XCircle,
  Scale,
  ArrowLeft,
  AlertTriangle,
} from 'lucide-react'
import { agentApi, type DebateRecord } from '@/lib/api-service'

/** 状态徽标 */
function StatusBadge({ consensus }: { consensus: boolean }) {
  if (consensus) {
    return (
      <Badge className="gap-1 bg-green-100 text-green-700 border-green-200">
        <CheckCircle2 className="h-3 w-3" /> 已达成共识
      </Badge>
    )
  }
  return (
    <Badge className="gap-1 bg-yellow-100 text-yellow-700 border-yellow-200">
      <AlertTriangle className="h-3 w-3" /> 未达成共识
    </Badge>
  )
}

export default function DebateLaunchPage() {
  const { id: projectId } = useParams()
  const navigate = useNavigate()

  const [topic, setTopic] = useState('')
  const [proSide, setProSide] = useState('')
  const [conSide, setConSide] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<DebateRecord | null>(null)
  const [activeTab, setActiveTab] = useState<'launch' | 'result'>('launch')

  const handleDebate = async () => {
    if (!topic.trim()) return
    setLoading(true)
    setResult(null)
    setActiveTab('result')

    try {
      const res = await agentApi.debate({
        topic: topic.trim(),
        pro_side: proSide.trim() || '支持该方案',
        con_side: conSide.trim() || '反对该方案',
        execution_id: projectId ? Number(projectId) : undefined,
      })
      setResult(res.data as unknown as DebateRecord)
    } catch (err: any) {
      setResult({
        id: 0,
        topic: topic,
        pro_side: proSide,
        con_side: conSide,
        rounds: [],
        consensus: false,
        consensus_summary: '发起辩论失败：' + (err?.response?.data?.detail || err.message),
        created_at: new Date().toISOString(),
      })
    } finally {
      setLoading(false)
    }
  }

  const canDebate = topic.trim().length > 0 && !loading

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* 页面标题 */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => navigate(projectId ? `/projects/${projectId}/agents` : '/agents')}>
          <ArrowLeft className="mr-1 h-4 w-4" />
          返回
        </Button>
        <div>
          <h2 className="text-xl font-bold tracking-tight">AI 辩论引擎</h2>
          <p className="text-sm text-muted-foreground">
            基于多模型对决的质量门禁辩论，支持 AutoGen 原生辩论与模拟回退
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* 左侧：辩论配置 */}
        <div className="lg:col-span-2 space-y-4">
          {activeTab === 'launch' ? (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">辩论配置</CardTitle>
                <CardDescription>设置议题和正反方立场，启动多轮辩论</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* 议题 */}
                <div className="space-y-2">
                  <Label>辩论议题 *</Label>
                  <Input
                    placeholder="例如：是否采用微服务架构？"
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                  />
                </div>

                {/* 正方观点 */}
                <div className="space-y-2">
                  <Label>正方立场</Label>
                  <Textarea
                    placeholder="正方观点，例如：微服务架构有利于独立部署和扩展..."
                    value={proSide}
                    onChange={(e) => setProSide(e.target.value)}
                    rows={3}
                  />
                  <p className="text-xs text-muted-foreground">
                    如果不填写，将使用默认正方立场
                  </p>
                </div>

                {/* 反方观点 */}
                <div className="space-y-2">
                  <Label>反方立场</Label>
                  <Textarea
                    placeholder="反方观点，例如：单体架构更适合当前业务阶段..."
                    value={conSide}
                    onChange={(e) => setConSide(e.target.value)}
                    rows={3}
                  />
                  <p className="text-xs text-muted-foreground">
                    如果不填写，将使用默认反方立场
                  </p>
                </div>

                <Separator />

                {/* 辩论机制说明 */}
                <div className="rounded-lg bg-muted/30 p-3 space-y-1 text-sm">
                  <div className="flex items-center gap-2 font-medium">
                    <Scale className="h-4 w-4 text-amber-600" />
                    辩论机制
                  </div>
                  <ul className="text-xs text-muted-foreground space-y-0.5 ml-6 list-disc">
                    <li>正方：DeepSeek-R1（L2），反方：GLM-4（L3）</li>
                    <li>最多 3 轮辩论，每轮结束后进行共识评估</li>
                    <li>共识阈值 0.7，未达成时由 Qwen-Max（L4）仲裁</li>
                  </ul>
                </div>
              </CardContent>
              <CardFooter>
                <Button onClick={handleDebate} disabled={!canDebate} className="w-full gap-2">
                  {loading ? (
                    <><Loader2 className="h-4 w-4 animate-spin" /> 辩论中...</>
                  ) : (
                    <><MessageSquare className="h-4 w-4" /> 发起辩论</>
                  )}
                </Button>
              </CardFooter>
            </Card>
          ) : (
            <Button variant="outline" className="w-full" onClick={() => setActiveTab('launch')}>
              返回配置
            </Button>
          )}
        </div>

        {/* 右侧：辩论结果 */}
        <div className="lg:col-span-3 space-y-4">
          {loading ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-16">
                <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
                <p className="mt-4 text-sm font-medium">辩论进行中...</p>
                <p className="text-xs text-muted-foreground mt-1">
                  正反方正在激烈交锋，请稍候
                </p>
              </CardContent>
            </Card>
          ) : result ? (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">辩论结果</CardTitle>
                  <StatusBadge consensus={result.consensus} />
                </div>
                <CardDescription>
                  议题：{result.topic}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* 共识摘要 */}
                {result.consensus_summary && (
                  <div className="rounded-lg bg-green-50 border border-green-200 p-3 text-sm text-green-800">
                    {result.consensus_summary}
                  </div>
                )}

                {/* 辩论轮次 */}
                {result.rounds && result.rounds.length > 0 ? (
                  result.rounds.map((round, idx) => (
                    <div key={idx} className="rounded-lg border border-gray-200 overflow-hidden">
                      <div className="bg-gray-50 px-3 py-2 text-xs font-semibold text-gray-600 border-b">
                        第 {round.round || idx + 1} 轮
                      </div>
                      <div className="p-3 space-y-3">
                        <div>
                          <span className="text-xs font-medium text-blue-600">正方：</span>
                          <p className="text-sm mt-1 whitespace-pre-wrap text-gray-700">
                            {round.pro_argument || '（无内容）'}
                          </p>
                        </div>
                        <div>
                          <span className="text-xs font-medium text-red-600">反方：</span>
                          <p className="text-sm mt-1 whitespace-pre-wrap text-gray-700">
                            {round.con_argument || '（无内容）'}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="rounded-lg bg-yellow-50 border border-yellow-200 p-3 text-sm text-yellow-800">
                    暂无辩论轮次记录
                  </div>
                )}

                {/* 最终决策 */}
                {result.consensus_summary && !result.consensus && (
                  <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 text-sm text-amber-800">
                    <span className="font-medium">仲裁结果：</span>
                    {result.consensus_summary}
                  </div>
                )}
              </CardContent>
              <CardFooter className="text-xs text-muted-foreground">
                辩论发起时间：{new Date(result.created_at).toLocaleString('zh-CN')}
              </CardFooter>
            </Card>
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                <MessageSquare className="h-12 w-12 text-gray-300 mb-4" />
                <p className="text-sm text-muted-foreground">
                  填写左侧配置后发起辩论
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  双模型 3 轮辩论 + 自动仲裁
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
