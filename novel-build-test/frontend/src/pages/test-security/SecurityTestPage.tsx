import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ShieldAlert, Search, Eye, Loader2, Bug, AlertTriangle, Info, CheckCircle, X } from 'lucide-react'
import { securityTestApi, SecurityScanItem } from '../../lib/api-service'

const SEVERITY_CONFIG = {
  critical: { label: '严重', color: '#ef4444', bg: '#fef2f2' },
  high: { label: '高危', color: '#f97316', bg: '#fff7ed' },
  medium: { label: '中危', color: '#eab308', bg: '#fefce8' },
  low: { label: '低危', color: '#3b82f6', bg: '#eff6ff' },
}

interface ScanResult {
  id: number
  name: string
  severity: 'critical' | 'high' | 'medium' | 'low'
  status: 'open' | 'fixed'
  cve: string
  location: string
  discoveryDate: string
}

interface Report {
  id: number
  name: string
  scanDate: string
  totalVulns: number
  criticalCount: number
  highCount: number
  passed: boolean
}

export default function SecurityTestPage() {
  const [activeTab, setActiveTab] = useState<'sec-scan' | 'sec-report'>('sec-scan')
  const [scans, setScans] = useState<SecurityScanItem[]>([])
  const [scanResults, setScanResults] = useState<ScanResult[]>([])
  const [reports, setReports] = useState<Report[]>([])
  const [scanning, setScanning] = useState(false)
  const [selectedReport, setSelectedReport] = useState<Report | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    (async () => {
      setLoading(true)
      setError(null)
      try {
        const res = await securityTestApi.list({ page: 1, page_size: 100 })
        const items = res.data.items || []
        setScans(items)

        const results: ScanResult[] = []
        const reportList: Report[] = []
        for (const scan of items) {
          reportList.push({
            id: scan.id,
            name: scan.name,
            scanDate: scan.created_at ? new Date(scan.created_at).toLocaleDateString('zh-CN') : '-',
            totalVulns: 0,
            criticalCount: scan.severity === 'critical' ? 1 : 0,
            highCount: scan.severity === 'high' ? 1 : 0,
            passed: scan.status === 'completed',
          })
          if (scan.status === 'completed') {
            results.push({
              id: scan.id,
              name: scan.name,
              severity: (scan.severity || 'low') as ScanResult['severity'],
              status: scan.status === 'completed' ? 'fixed' : 'open',
              cve: `SCAN-${scan.id}`,
              location: scan.result_summary || '-',
              discoveryDate: scan.created_at ? new Date(scan.created_at).toLocaleDateString('zh-CN') : '-',
            })
          }
        }
        setScanResults(results)
        setReports(reportList)
      } catch (e) {
        console.error('Failed to load security scans', e)
        setError(e instanceof Error ? e.message : 'Failed to load security scans')
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  const tabs = [
    { key: 'sec-scan', label: '漏洞扫描' },
    { key: 'sec-report', label: '安全报告' },
  ]

  const handleStartScan = async () => {
    setScanning(true)
    try {
      const scanRes = await securityTestApi.create({ name: `扫描-${new Date().toLocaleString('zh-CN')}` })
      await securityTestApi.run(scanRes.data.id)
      // Reload data after scan
      const listRes = await securityTestApi.list({ page: 1, page_size: 100 })
      setScans(listRes.data.items || [])
    } catch {
      console.error('Failed to start scan')
    } finally {
      setScanning(false)
    }
  }

  const markFixed = async (id: number) => {
    // In the real API, marking fixed isn't directly supported, so we just update the UI
    setScanResults(prev => prev.map(x => x.id === id ? { ...x, status: 'fixed' as const } : x))
  }

  const SeverityBadge = ({ severity }: { severity: string }) => {
    const cfg = SEVERITY_CONFIG[severity as keyof typeof SEVERITY_CONFIG] || SEVERITY_CONFIG.low
    return (
      <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium"
        style={{ backgroundColor: cfg.bg, color: cfg.color }}>
        {severity === 'critical' ? <ShieldAlert className="h-3 w-3" /> : severity === 'high' ? <AlertTriangle className="h-3 w-3" /> : <Info className="h-3 w-3" />}
        {cfg.label}
      </span>
    )
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

      {/* 漏洞扫描 */}
      {activeTab === 'sec-scan' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)' }}>
                <Bug className="h-5 w-5 text-red-500" />
              </div>
              <div>
                <p className="text-sm font-medium" style={{ color: 'var(--polaroid-text)' }}>漏洞扫描引擎</p>
                <p className="text-xs" style={{ color: 'var(--polaroid-text-muted)' }}>{scans.length > 0 ? `上次扫描: ${new Date(scans[0].created_at).toLocaleString('zh-CN')}` : '暂无扫描记录'}</p>
              </div>
            </div>
            <button onClick={handleStartScan} disabled={scanning}
              className="flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm text-white transition-opacity hover:opacity-90 disabled:opacity-50"
              style={{ backgroundColor: scanning ? '#6b7280' : 'var(--amber-primary)' }}>
              {scanning ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
              {scanning ? '扫描中...' : '启动扫描'}
            </button>
          </div>

          {/* Summary cards */}
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin" style={{ color: 'var(--amber-primary)' }} />
            </div>
          ) : (
            <>
              <div className="grid gap-4 grid-cols-4">
                {(['critical', 'high', 'medium', 'low'] as const).map((sev) => {
                  const count = scanResults.filter(v => v.severity === sev && v.status === 'open').length
                  const cfg = SEVERITY_CONFIG[sev]
                  return (
                    <div key={sev} className="rounded-xl border p-4" style={{ borderColor: 'var(--polaroid-border)', backgroundColor: 'var(--polaroid-white)' }}>
                      <p className="text-xs font-medium mb-1" style={{ color: 'var(--polaroid-text-muted)' }}>{cfg.label}</p>
                      <p className="text-2xl font-bold" style={{ color: cfg.color }}>{count}</p>
                      <p className="text-xs mt-1" style={{ color: 'var(--polaroid-text-muted)' }}>未修复</p>
                    </div>
                  )
                })}
              </div>

              {/* Vulnerability table */}
              <div className="rounded-xl border overflow-hidden" style={{ borderColor: 'var(--polaroid-border)' }}>
                <table className="w-full text-sm">
                  <thead>
                    <tr style={{ backgroundColor: 'var(--polaroid-warm)' }}>
                      <th className="px-4 py-3 text-left font-medium" style={{ color: 'var(--polaroid-text)' }}>漏洞名称</th>
                      <th className="px-4 py-3 text-left font-medium" style={{ color: 'var(--polaroid-text)' }}>严重程度</th>
                      <th className="px-4 py-3 text-left font-medium" style={{ color: 'var(--polaroid-text)' }}>编号</th>
                      <th className="px-4 py-3 text-left font-medium" style={{ color: 'var(--polaroid-text)' }}>位置</th>
                      <th className="px-4 py-3 text-left font-medium" style={{ color: 'var(--polaroid-text)' }}>状态</th>
                      <th className="px-4 py-3 text-left font-medium" style={{ color: 'var(--polaroid-text)' }}>发现日期</th>
                      <th className="px-4 py-3 text-right font-medium" style={{ color: 'var(--polaroid-text)' }}>操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    {scanResults.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-4 py-8 text-center text-sm" style={{ color: 'var(--polaroid-text-muted)' }}>暂无漏洞数据</td>
                      </tr>
                    ) : (
                      scanResults.map((v) => (
                        <tr key={v.id} className="border-t hover:bg-gray-50/50" style={{ borderColor: 'var(--polaroid-border)' }}>
                          <td className="px-4 py-3 font-medium text-sm" style={{ color: 'var(--polaroid-text)' }}>{v.name}</td>
                          <td className="px-4 py-3"><SeverityBadge severity={v.severity} /></td>
                          <td className="px-4 py-3 font-mono text-xs" style={{ color: 'var(--polaroid-text-muted)' }}>{v.cve}</td>
                          <td className="px-4 py-3 font-mono text-xs" style={{ color: 'var(--polaroid-text-muted)' }}>{v.location}</td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${v.status === 'open' ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'}`}>
                              {v.status === 'open' ? <AlertTriangle className="h-3 w-3" /> : <CheckCircle className="h-3 w-3" />}
                              {v.status === 'open' ? 'Open' : 'Fixed'}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-xs" style={{ color: 'var(--polaroid-text-muted)' }}>{v.discoveryDate}</td>
                          <td className="px-4 py-3 text-right">
                            {v.status === 'open' ? (
                              <button onClick={() => markFixed(v.id)}
                                className="rounded-lg px-2.5 py-1 text-xs border transition-colors hover:bg-green-50"
                                style={{ borderColor: 'var(--polaroid-border)', color: '#16a34a' }}>
                                标记修复
                              </button>
                            ) : (
                              <span className="text-xs" style={{ color: 'var(--polaroid-text-muted)' }}>已修复</span>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      )}

      {/* 安全报告 */}
      {activeTab === 'sec-report' && (
        <div className="space-y-4">
          <div className="rounded-xl border overflow-hidden" style={{ borderColor: 'var(--polaroid-border)' }}>
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin" style={{ color: 'var(--amber-primary)' }} />
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ backgroundColor: 'var(--polaroid-warm)' }}>
                    <th className="px-4 py-3 text-left font-medium" style={{ color: 'var(--polaroid-text)' }}>报告名称</th>
                    <th className="px-4 py-3 text-left font-medium" style={{ color: 'var(--polaroid-text)' }}>扫描日期</th>
                    <th className="px-4 py-3 text-left font-medium" style={{ color: 'var(--polaroid-text)' }}>漏洞总数</th>
                    <th className="px-4 py-3 text-left font-medium" style={{ color: 'var(--polaroid-text)' }}>严重/高危</th>
                    <th className="px-4 py-3 text-left font-medium" style={{ color: 'var(--polaroid-text)' }}>结果</th>
                    <th className="px-4 py-3 text-right font-medium" style={{ color: 'var(--polaroid-text)' }}>操作</th>
                  </tr>
                </thead>
                <tbody>
                  {reports.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-sm" style={{ color: 'var(--polaroid-text-muted)' }}>暂无报告</td>
                    </tr>
                  ) : (
                    reports.map((r) => (
                      <tr key={r.id} className="border-t hover:bg-gray-50/50" style={{ borderColor: 'var(--polaroid-border)' }}>
                        <td className="px-4 py-3 font-medium" style={{ color: 'var(--polaroid-text)' }}>{r.name}</td>
                        <td className="px-4 py-3 text-sm" style={{ color: 'var(--polaroid-text-muted)' }}>{r.scanDate}</td>
                        <td className="px-4 py-3 text-sm" style={{ color: 'var(--polaroid-text-muted)' }}>{r.totalVulns}</td>
                        <td className="px-4 py-3">
                          <span className="text-sm" style={{ color: r.criticalCount > 0 ? '#ef4444' : 'var(--polaroid-text-muted)' }}>
                            {r.criticalCount} / {r.highCount}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${r.passed ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>
                            {r.passed ? <CheckCircle className="h-3 w-3" /> : <AlertTriangle className="h-3 w-3" />}
                            {r.passed ? '通过' : '未通过'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button onClick={() => setSelectedReport(r)}
                            className="flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs border transition-colors hover:bg-gray-50"
                            style={{ borderColor: 'var(--polaroid-border)', color: 'var(--polaroid-text-muted)' }}>
                            <Eye className="h-3 w-3" /> 查看报告
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* 查看报告弹窗 */}
      <AnimatePresence>
        {selectedReport && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
            onClick={() => setSelectedReport(null)}>
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl"
              style={{ border: '1px solid var(--polaroid-border)' }}>
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-lg font-semibold" style={{ color: 'var(--polaroid-text)' }}>
                  {selectedReport.name}
                </h3>
                <button onClick={() => setSelectedReport(null)} className="p-1 rounded-lg hover:bg-gray-100">
                  <X className="h-5 w-5" style={{ color: 'var(--polaroid-text-muted)' }} />
                </button>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="rounded-lg border p-4" style={{ borderColor: 'var(--polaroid-border)' }}>
                    <p className="text-xs" style={{ color: 'var(--polaroid-text-muted)' }}>扫描日期</p>
                    <p className="text-sm font-medium mt-1" style={{ color: 'var(--polaroid-text)' }}>{selectedReport.scanDate}</p>
                  </div>
                  <div className="rounded-lg border p-4" style={{ borderColor: 'var(--polaroid-border)' }}>
                    <p className="text-xs" style={{ color: 'var(--polaroid-text-muted)' }}>漏洞总数</p>
                    <p className="text-sm font-medium mt-1" style={{ color: 'var(--polaroid-text)' }}>{selectedReport.totalVulns}</p>
                  </div>
                  <div className="rounded-lg border p-4" style={{ borderColor: 'var(--polaroid-border)' }}>
                    <p className="text-xs" style={{ color: 'var(--polaroid-text-muted)' }}>严重/高危</p>
                    <p className="text-sm font-medium mt-1" style={{ color: '#ef4444' }}>{selectedReport.criticalCount} / {selectedReport.highCount}</p>
                  </div>
                  <div className="rounded-lg border p-4" style={{ borderColor: 'var(--polaroid-border)' }}>
                    <p className="text-xs" style={{ color: 'var(--polaroid-text-muted)' }}>扫描结果</p>
                    <p className={`text-sm font-medium mt-1 ${selectedReport.passed ? 'text-green-600' : 'text-red-600'}`}>
                      {selectedReport.passed ? '通过' : '未通过'}
                    </p>
                  </div>
                </div>

                <div className="rounded-lg border p-4" style={{ borderColor: 'var(--polaroid-border)' }}>
                  <p className="text-sm font-medium mb-2" style={{ color: 'var(--polaroid-text)' }}>修复建议</p>
                  <p className="text-xs leading-relaxed" style={{ color: 'var(--polaroid-text-muted)' }}>
                    建议优先修复严重和高危漏洞。严重漏洞需在 24 小时内修复，高危漏洞需在 7 天内修复。
                    当前扫描结果显示系统存在安全风险，建议立即安排安全工程师进行修复。
                  </p>
                </div>

                <div className="flex justify-end">
                  <button onClick={() => setSelectedReport(null)}
                    className="rounded-lg px-4 py-2 text-sm text-white transition-opacity hover:opacity-90"
                    style={{ backgroundColor: 'var(--amber-primary)' }}>
                    关闭
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
