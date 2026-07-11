import { useNavigate } from 'react-router-dom'
import { Clock, BookOpen, Type, Download, ChevronRight, Sparkles } from 'lucide-react'
import { cn } from '../lib/utils'

export default function NovelCard({ novel, index = 0 }) {
  const navigate = useNavigate()
  const dateStr = novel.created_at
    ? new Date(novel.created_at).toLocaleDateString('zh-CN', { year: 'numeric', month: 'short', day: 'numeric' })
    : ''
  const pkgUrl = `/api/v3/novels/${novel.id}/export/package`

  return (
    <div
      className={cn(
        'bg-white rounded-xl border border-gray-200 overflow-hidden transition-all duration-200 card-hover animate-fade-in-up flex flex-col',
      )}
      style={{ animationDelay: `${index * 60}ms` }}
    >
      <div onClick={() => navigate(`/novel/${novel.id}`)} className="cursor-pointer p-5 flex-1 flex flex-col">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex-shrink-0 w-10 h-10 rounded-xl gradient-brand flex items-center justify-center shadow-sm">
            <BookOpen className="w-5 h-5 text-white" />
          </div>
          <ChevronRight className="w-4 h-4 text-gray-300 flex-shrink-0 mt-1 group-hover:text-orange-400 group-hover:translate-x-0.5 transition-all" />
        </div>
        <h3 className="font-bold text-gray-900 text-base leading-snug line-clamp-2 mb-2">
          {novel.title || '未命名小说'}
        </h3>

        <div className="flex flex-wrap items-start gap-1.5 mb-3 min-h-[28px]">
          {novel.gender && (
            <span className="tag bg-orange-50 text-orange-700 border-orange-200/50">
              {novel.gender}
            </span>
          )}
          {novel.genre && (
            <span className="tag bg-blue-50 text-blue-700 border-blue-200/50">
              <BookOpen className="w-2.5 h-2.5" /> {novel.genre}
            </span>
          )}
          {novel.style && (
            <span className="tag bg-purple-50 text-purple-700 border-purple-200/50">
              <Type className="w-2.5 h-2.5" /> {novel.style}
            </span>
          )}
        </div>

        <div className="mt-auto">
          <div className="flex items-center gap-4 text-xs text-gray-400">
            {novel.actual_count > 0 && (
              <span className="flex items-center gap-1">
                <Sparkles className="w-3 h-3" />
                {novel.actual_count.toLocaleString()} 字
              </span>
            )}
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {dateStr}
            </span>
          </div>

          {novel.generation_status === 'failed' && (
            <span className="inline-flex items-center gap-1 mt-2 px-2 py-0.5 bg-red-50 text-red-500 rounded-full text-[10px] font-medium">
              生成中断
            </span>
          )}
        </div>
      </div>

      <div className="px-5 py-3 border-t border-gray-100 bg-gray-50/50 flex-shrink-0">
        <a href={pkgUrl} download onClick={e => e.stopPropagation()}
          className="flex items-center justify-center gap-1.5 w-full py-2 text-xs font-medium text-orange-600 bg-orange-50 hover:bg-orange-100 border border-orange-200 rounded-lg transition-all duration-150">
          <Download className="w-3.5 h-3.5" />
          下载压缩包
        </a>
      </div>
    </div>
  )
}