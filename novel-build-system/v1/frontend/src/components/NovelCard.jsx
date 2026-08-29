import { useNavigate } from 'react-router-dom'
import { Clock, BookOpen, Type, Download, ChevronRight } from 'lucide-react'

export default function NovelCard({ novel }) {
  const navigate = useNavigate()

  const dateStr = novel.created_at
    ? new Date(novel.created_at).toLocaleDateString('zh-CN')
    : ''

  const pkgUrl = `/api/v1/novels/${novel.id}/export/package`

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-lg hover:border-orange-200 transition-all group cursor-pointer"
      onClick={() => navigate(`/novel/${novel.id}`)}>
      <div className="flex items-start justify-between gap-2 mb-3">
        <h3 className="font-bold text-gray-900 text-lg line-clamp-2 group-hover:text-orange-600 transition-colors">
          {novel.title || '未命名小说'}
        </h3>
        <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-orange-500 transition-colors flex-shrink-0 mt-0.5" />
      </div>
      
      <div className="flex items-center gap-2 flex-wrap mb-3">
        <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-gradient-to-r from-orange-100 to-rose-100 text-orange-700 rounded-lg text-xs font-semibold">
          {novel.gender}
        </span>
        <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-gray-100 text-gray-600 rounded-lg text-xs font-medium">
          <BookOpen className="w-3 h-3" />
          {novel.genre}
        </span>
        <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-gray-100 text-gray-600 rounded-lg text-xs font-medium">
          <Type className="w-3 h-3" />
          {novel.style}
        </span>
      </div>

      <div className="flex items-center justify-between text-sm">
        <span className="text-gray-500 flex items-center gap-1.5">
          <Clock className="w-3.5 h-3.5 text-gray-400" />
          {dateStr}
        </span>
        <span className="font-bold text-gray-800">
          {novel.actual_count?.toLocaleString() || 0} 字
        </span>
      </div>

      <div className="mt-4 pt-3 border-t border-gray-100">
        <a href={pkgUrl} download
          onClick={e => e.stopPropagation()}
          className="flex items-center justify-center gap-1.5 w-full py-2.5 text-xs font-semibold text-orange-600 bg-gradient-to-r from-orange-50 to-rose-50 hover:from-orange-100 hover:to-rose-100 border border-orange-200 rounded-xl transition-all shadow-sm hover:shadow-md">
          <Download className="w-3.5 h-3.5" />
          下载压缩包
        </a>
      </div>
    </div>
  )
}
