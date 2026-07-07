import { Download } from 'lucide-react'
import { getExportUrl } from '../services/api'

export default function ExportBar({ novelId }) {
  const formats = [
    { key: 'markdown', label: 'Markdown' },
    { key: 'txt', label: '纯文本' },
    { key: 'pdf', label: 'PDF' },
  ]

  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-gray-500 mr-1">导出：</span>
      {formats.map((fmt) => (
        <a
          key={fmt.key}
          href={getExportUrl(novelId, fmt.key)}
          download
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-white border border-gray-200 rounded-lg hover:bg-gray-50 hover:border-gray-300 transition-colors text-gray-600"
        >
          <Download className="w-3.5 h-3.5" />
          {fmt.label}
        </a>
      ))}
    </div>
  )
}
