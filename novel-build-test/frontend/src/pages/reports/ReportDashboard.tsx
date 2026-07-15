import { useState } from 'react'
import { motion } from 'framer-motion'
import { GitCompareArrows } from 'lucide-react'

interface Report {
  id: number
  execution_id: number
  name: string
  total_cases: number
  passed: number
  failed: number
  skipped: number
  pass_rate: number
  duration: number
  created_at: string
}

const MOCK_REPORTS: Report[] = [
  { id: 1, execution_id: 1, name: '全流程测试 #1 报告', total_cases: 50, passed: 45, failed: 3, skipped: 2, pass_rate: 90, duration: 2700, created_at: '2026-07-14 11:15' },
  { id: 2, execution_id: 2, name: '快速冒烟测试 报告', total_cases: 20, passed: 18, failed: 2, skipped: 0, pass_rate: 90, duration: 1800, created_at: '2026-07-14 09:30' },
  { id: 3, execution_id: 5, name: '性能压力测试 报告', total_cases: 30, passed: 12, failed: 15, skipped: 3, pass_rate: 40, duration: 1800, created_at: '2026-07-13 16:30' },
]

export default function ReportDashboard() {
  const [reports] = useState<Report[]>(MOCK_REPORTS)
  const [selectedReports, setSelectedReports] = useState<number[]>([])
  const [showCompare, setShowCompare] = useState(false)

  const toggleSelect = (id: number) => {
    setSelectedReports(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
  }

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}分${secs}秒`
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold" style={{ color: 'var(--polaroid-text)' }}>测试报告</h2>
          <p className="text-sm" style={{ color: 'var(--polaroid-text-muted)' }}>查看测试结果统计与分析</p>
        </div>
        {selectedReports.length >= 2 && (
          <button onClick={() => setShowCompare(true)}
            className="flex items-center gap-2 rounded-lg px-4 py-2 text-sm text-white transition-opacity hover:opacity-90"
            style={{ backgroundColor: 'var(--amber-primary)' }}>
            <GitCompareArrows className="h-4 w-4" /> 对比选中 ({selectedReports.length})
          </button>
        )}
      </div>

      {/* 报告列表 */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {reports.map((report) => (
          <motion.div key={report.id} whileHover={{ y: -2 }}
            className="rounded-xl border p-5 space-y-3 cursor-pointer"
            style={{ borderColor: selectedReports.includes(report.id) ? 'var(--amber-primary)' : 'var(--polaroid-border)', backgroundColor: 'var(--polaroid-white)' }}
            onClick={() => toggleSelect(report.id)}>
            <div className="flex items-start justify-between">
              <h3 className="font-medium" style={{ color: 'var(--polaroid-text)' }}>{report.name}</h3>
              <input type="checkbox" checked={selectedReports.includes(report.id)} onChange={() => toggleSelect(report.id)}
                className="h-4 w-4 rounded" style={{ accentColor: 'var(--amber-primary)' }} />
            </div>
            
            <div className="grid grid-cols-4 gap-2 text-center">
              <div className="p-2 rounded-lg bg-gray-50">
                <p className="text-lg font-bold" style={{ color: 'var(--polaroid-text)' }}>{report.total_cases}</p>
                <p className="text-xs" style={{ color: 'var(--polaroid-text-muted)' }}>总用例</p>
              </div>
              <div className="p-2 rounded-lg bg-green-50">
                <p className="text-lg font-bold text-green-600">{report.passed}</p>
                <p className="text-xs" style={{ color: 'var(--polaroid-text-muted)' }}>通过</p>
              </div>
              <div className="p-2 rounded-lg bg-red-50">
                <p className="text-lg font-bold text-red-600">{report.failed}</p>
                <p className="text-xs" style={{ color: 'var(--polaroid-text-muted)' }}>失败</p>
              </div>
              <div className="p-2 rounded-lg bg-gray-100">
                <p className="text-lg font-bold text-gray-500">{report.skipped}</p>
                <p className="text-xs" style={{ color: 'var(--polaroid-text-muted)' }}>跳过</p>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2 border-t" style={{ borderColor: 'var(--polaroid-border)' }}>
              <div>
                <span className="text-2xl font-bold" style={{ color: report.pass_rate >= 80 ? '#10B981' : report.pass_rate >= 60 ? '#F59E0B' : '#EF4444' }}>
                  {report.pass_rate}%
                </span>
                <span className="text-xs ml-1" style={{ color: 'var(--polaroid-text-muted)' }}>通过率</span>
              </div>
              <span className="text-xs" style={{ color: 'var(--polaroid-text-muted)' }}>{formatDuration(report.duration)}</span>
            </div>
          </motion.div>
        ))}
      </div>

      {/* 对比弹窗 */}
      {showCompare && selectedReports.length >= 2 && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setShowCompare(false)}>
          <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-xl"
            style={{ border: '1px solid var(--polaroid-border)' }}>
            <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--polaroid-text)' }}>报告对比</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ backgroundColor: 'var(--polaroid-warm)' }}>
                    <th className="px-4 py-2 text-left" style={{ color: 'var(--polaroid-text)' }}>指标</th>
                    {selectedReports.map(id => {
                      const r = reports.find(x => x.id === id)
                      return <th key={id} className="px-4 py-2 text-center" style={{ color: 'var(--polaroid-text)' }}>{r?.name}</th>
                    })}
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-t" style={{ borderColor: 'var(--polaroid-border)' }}>
                    <td className="px-4 py-2" style={{ color: 'var(--polaroid-text-muted)' }}>总用例</td>
                    {selectedReports.map(id => {
                      const r = reports.find(x => x.id === id)
                      return <td key={id} className="px-4 py-2 text-center font-medium">{r?.total_cases}</td>
                    })}
                  </tr>
                  <tr className="border-t" style={{ borderColor: 'var(--polaroid-border)' }}>
                    <td className="px-4 py-2" style={{ color: 'var(--polaroid-text-muted)' }}>通过</td>
                    {selectedReports.map(id => {
                      const r = reports.find(x => x.id === id)
                      return <td key={id} className="px-4 py-2 text-center text-green-600 font-medium">{r?.passed}</td>
                    })}
                  </tr>
                  <tr className="border-t" style={{ borderColor: 'var(--polaroid-border)' }}>
                    <td className="px-4 py-2" style={{ color: 'var(--polaroid-text-muted)' }}>失败</td>
                    {selectedReports.map(id => {
                      const r = reports.find(x => x.id === id)
                      return <td key={id} className="px-4 py-2 text-center text-red-600 font-medium">{r?.failed}</td>
                    })}
                  </tr>
                  <tr className="border-t" style={{ borderColor: 'var(--polaroid-border)' }}>
                    <td className="px-4 py-2" style={{ color: 'var(--polaroid-text-muted)' }}>通过率</td>
                    {selectedReports.map(id => {
                      const r = reports.find(x => x.id === id)
                      return <td key={id} className="px-4 py-2 text-center font-bold" style={{ color: r && r.pass_rate >= 80 ? '#10B981' : '#EF4444' }}>{r?.pass_rate}%</td>
                    })}
                  </tr>
                  <tr className="border-t" style={{ borderColor: 'var(--polaroid-border)' }}>
                    <td className="px-4 py-2" style={{ color: 'var(--polaroid-text-muted)' }}>耗时</td>
                    {selectedReports.map(id => {
                      const r = reports.find(x => x.id === id)
                      return <td key={id} className="px-4 py-2 text-center">{r ? formatDuration(r.duration) : '-'}</td>
                    })}
                  </tr>
                </tbody>
              </table>
            </div>
            <button onClick={() => setShowCompare(false)}
              className="w-full mt-4 rounded-lg px-4 py-2 text-sm border transition-colors hover:bg-gray-50"
              style={{ borderColor: 'var(--polaroid-border)', color: 'var(--polaroid-text-muted)' }}>关闭</button>
          </motion.div>
        </div>
      )}
    </div>
  )
}
