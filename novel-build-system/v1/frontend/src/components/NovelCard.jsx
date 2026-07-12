import { useNavigate } from 'react-router-dom'
import { Clock, BookOpen, Type, Download } from 'lucide-react'

export default function NovelCard({ novel }) {
  const navigate = useNavigate()

  const dateStr = novel.created_at
    ? new Date(novel.created_at).toLocaleDateString('zh-CN')
    : ''

  const pkgUrl = `/api/v1/novels/${novel.id}/export/package`

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md hover:border-orange-200 transition-all group">
      <div onClick={() => navigate(`/novel/${novel.id}`)} className="cursor-pointer">
        <h3 className="font-bold text-gray-900 text-lg mb-2 truncate">
          {novel.title || '未命名小说'}
        </h3>
        <div className="flex items-center gap-4 text-sm text-gray-500 mb-3">
          <span className="flex items-center gap-1">
            <BookOpen className="w-3.5 h-3.5" />
            {novel.genre}
          </span>
          <span className="flex items-center gap-1">
            <Type className="w-3.5 h-3.5" />
            {novel.style}
          </span>
          <span className="flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" />
            {dateStr}
          </span>
        </div>
        <p className="text-sm text-gray-400">
          字数：<span className="text-gray-600">{novel.actual_count?.toLocaleString() || 0}</span>
        </p>
      </div>

      <div className="mt-3 pt-3 border-t border-gray-100">
        <a href={pkgUrl} download
          onClick={e => e.stopPropagation()}
          className="flex items-center justify-center gap-1.5 w-full py-2 text-xs font-medium text-orange-600 bg-orange-50 hover:bg-orange-100 border border-orange-200 rounded-lg transition-colors">
          <Download className="w-3.5 h-3.5" />
          下载压缩包
        </a>
      </div>
    </div>
  )
}
