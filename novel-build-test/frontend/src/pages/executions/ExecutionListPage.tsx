import { useState } from 'react'
import { motion } from 'framer-motion'
import { Loader2, CheckCircle2, XCircle, Clock, Eye } from 'lucide-react'

interface Execution {
  id: number
  name: string
  project_id: number
  status: 'running' | 'completed' | 'failed' | 'pending'
  progress: number
  started_at: string
  completed_at: string | null
  summary: { total: number; passed: number; failed: number; skipped: number } | null
}

const MOCK_EXECUTIONS: Execution[] = [
  { id: 1, name: '全流程测试 #1', project_id: 1, status: 'completed', progress: 100, started_at: '2026-07-14 10:30', completed_at: '2026-07-14 11:15', summary: { total: 50, passed: 45, failed: 3, skipped: 2 } },
  { id: 2, name: '快速冒烟测试', project_id: 1, status: 'completed', progress: 100, started_at: '2026-07-14 09:00', completed_at: '2026-07-14 09:30', summary: { total: 20, passed: 18, failed: 2, skipped: 0 } },
  { id: 3, name: '接口自动化测试', project_id: 2, status: 'running', progress: 65, started_at: '2026-07-14 11:00', completed_at: null, summary: null },
  { id: 4, name: '安全扫描任务', project_id: 2, status: 'pending', progress: 0, started_at: '2026-07-14 12:00', completed_at: null, summary: null },
  { id: 5, name: '性能压力测试', project_id: 1, status: 'failed', progress: 45, started_at: '2026-07-13 16:00', completed_at: '2026-07-13 16:30', summary: { total: 30, passed: 12, failed: 15, skipped: 3 } },
]

const STATUS_CONFIG = {
  running: { icon: Loader2, color: 'text-blue-500', bg: 'bg-blue-50', label: '执行中', spin: true },
  completed: { icon: CheckCircle2, color: 'text-green-500', bg: 'bg-green-50', label: '已完成', spin: false },
  failed: { icon: XCircle, color: 'text-red-500', bg: 'bg-red-50', label: '失败', spin: false },
  pending: { icon: Clock, color: 'text-gray-400', bg: 'bg-gray-100', label: '待执行', spin: false },
}

export default function ExecutionListPage() {
  const [executions] = useState<Execution[]>(MOCK_EXECUTIONS)
  const [selectedExecution, setSelectedExecution] = useState<Execution | null>(null)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold" style={{ color: 'var(--polaroid-text)' }}>执行记录</h2>
          <p className="text-sm" style={{ color: 'var(--polaroid-text-muted)' }}>查看测试执行历史与实时状态</p>
        </div>
      </div>

      {/* 统计卡片 */}
      <div className="grid gap-4 md:grid-cols-4">
        {[
          { label: '总执行数', value: executions.length, color: '#6B7280' },
          { label: '已完成', value: executions.filter(e => e.status === 'completed').length, color: '#10B981' },
          { label: '执行中', value: executions.filter(e => e.status === 'running').length, color: '#3B82F6' },
          { label: '失败', value: executions.filter(e => e.status === 'failed').length, color: '#EF4444' },
        ].map((stat) => (
          <div key={stat.label} className="rounded-xl border p-4" style={{ borderColor: 'var(--polaroid-border)', backgroundColor: 'var(--polaroid-white)' }}>
            <p className="text-sm" style={{ color: 'var(--polaroid-text-muted)' }}>{stat.label}</p>
            <p className="text-2xl font-bold mt-1" style={{ color: stat.color }}>{stat.value}</p>
          </div>
        ))}
      </div>

      {/* 执行列表 */}
      <div className="rounded-xl border overflow-hidden" style={{ borderColor: 'var(--polaroid-border)' }}>
        <table className="w-full text-sm">
          <thead>
            <tr style={{ backgroundColor: 'var(--polaroid-warm)' }}>
              <th className="px-4 py-3 text-left font-medium" style={{ color: 'var(--polaroid-text)' }}>任务名称</th>
              <th className="px-4 py-3 text-left font-medium" style={{ color: 'var(--polaroid-text)' }}>状态</th>
              <th className="px-4 py-3 text-left font-medium" style={{ color: 'var(--polaroid-text)' }}>进度</th>
              <th className="px-4 py-3 text-left font-medium" style={{ color: 'var(--polaroid-text)' }}>测试结果</th>
              <th className="px-4 py-3 text-left font-medium" style={{ color: 'var(--polaroid-text)' }}>开始时间</th>
              <th className="px-4 py-3 text-right font-medium" style={{ color: 'var(--polaroid-text)' }}>操作</th>
            </tr>
          </thead>
          <tbody>
            {executions.map((exec) => {
              const config = STATUS_CONFIG[exec.status]
              const Icon = config.icon
              return (
                <tr key={exec.id} className="border-t hover:bg-gray-50/50" style={{ borderColor: 'var(--polaroid-border)' }}>
                  <td className="px-4 py-3 font-medium" style={{ color: 'var(--polaroid-text)' }}>{exec.name}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${config.bg} ${config.color}`}>
                      <Icon className={`h-3 w-3 ${config.spin ? 'animate-spin' : ''}`} />
                      {config.label}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all" style={{ width: `${exec.progress}%`, backgroundColor: exec.status === 'failed' ? '#EF4444' : '#10B981' }} />
                    </div>
                    <span className="text-xs" style={{ color: 'var(--polaroid-text-muted)' }}>{exec.progress}%</span>
                  </td>
                  <td className="px-4 py-3 text-xs" style={{ color: 'var(--polaroid-text-muted)' }}>
                    {exec.summary ? (
                      <span>
                        <span className="text-green-600">{exec.summary.passed}通过</span> / 
                        <span className="text-red-600">{exec.summary.failed}失败</span> / 
                        <span>{exec.summary.skipped}跳过</span>
                      </span>
                    ) : '-'}
                  </td>
                  <td className="px-4 py-3 text-xs" style={{ color: 'var(--polaroid-text-muted)' }}>{exec.started_at}</td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => setSelectedExecution(exec)} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
                      <Eye className="h-4 w-4" style={{ color: 'var(--polaroid-text-muted)' }} />
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* 详情弹窗 */}
      {selectedExecution && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setSelectedExecution(null)}>
          <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl"
            style={{ border: '1px solid var(--polaroid-border)' }}>
            <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--polaroid-text)' }}>{selectedExecution.name}</h3>
            {selectedExecution.summary && (
              <div className="grid grid-cols-4 gap-3 mb-4">
                <div className="text-center p-3 rounded-lg bg-gray-50">
                  <p className="text-2xl font-bold" style={{ color: 'var(--polaroid-text)' }}>{selectedExecution.summary.total}</p>
                  <p className="text-xs" style={{ color: 'var(--polaroid-text-muted)' }}>总用例</p>
                </div>
                <div className="text-center p-3 rounded-lg bg-green-50">
                  <p className="text-2xl font-bold text-green-600">{selectedExecution.summary.passed}</p>
                  <p className="text-xs" style={{ color: 'var(--polaroid-text-muted)' }}>通过</p>
                </div>
                <div className="text-center p-3 rounded-lg bg-red-50">
                  <p className="text-2xl font-bold text-red-600">{selectedExecution.summary.failed}</p>
                  <p className="text-xs" style={{ color: 'var(--polaroid-text-muted)' }}>失败</p>
                </div>
                <div className="text-center p-3 rounded-lg bg-gray-100">
                  <p className="text-2xl font-bold text-gray-500">{selectedExecution.summary.skipped}</p>
                  <p className="text-xs" style={{ color: 'var(--polaroid-text-muted)' }}>跳过</p>
                </div>
              </div>
            )}
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span style={{ color: 'var(--polaroid-text-muted)' }}>开始时间</span><span>{selectedExecution.started_at}</span></div>
              {selectedExecution.completed_at && (
                <div className="flex justify-between"><span style={{ color: 'var(--polaroid-text-muted)' }}>完成时间</span><span>{selectedExecution.completed_at}</span></div>
              )}
            </div>
            <button onClick={() => setSelectedExecution(null)}
              className="w-full mt-4 rounded-lg px-4 py-2 text-sm border transition-colors hover:bg-gray-50"
              style={{ borderColor: 'var(--polaroid-border)', color: 'var(--polaroid-text-muted)' }}>关闭</button>
          </motion.div>
        </div>
      )}
    </div>
  )
}
