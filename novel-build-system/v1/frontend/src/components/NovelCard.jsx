import { useNavigate } from 'react-router-dom'
import { Clock, BookOpen, Type, Download, ChevronRight, Trash2 } from 'lucide-react'

export default function NovelCard({ novel, onDelete, selected, onToggle }) {
  const navigate = useNavigate()

  const dateStr = novel.created_at
    ? new Date(novel.created_at).toLocaleDateString('zh-CN')
    : ''

  const pkgUrl = `/api/v1/novels/${novel.id}/export/package`

  const handleDelete = (e) => {
    e.stopPropagation()
    if (onDelete) {
      onDelete(novel.id)
    }
  }

  const handleToggle = (e) => {
    e.stopPropagation()
    if (onToggle) {
      onToggle(novel.id)
    }
  }

  return (
    <div className={`bg-white rounded-xl border p-5 hover:shadow-lg transition-all group cursor-pointer flex flex-col h-[280px] ${selected ? 'border-orange-400 ring-2 ring-orange-100' : 'border-gray-200 hover:border-orange-200'}`}
      onClick={() => navigate(`/novel/${novel.id}`)}>
      {/* 标题区域 - 固定高度 */}
      <div className="flex items-start justify-between gap-2 mb-3 h-10">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <input
            type="checkbox"
            checked={selected || false}
            onChange={handleToggle}
            onClick={e => e.stopPropagation()}
            className="w-4 h-4 rounded border-gray-300 text-orange-500 focus:ring-orange-400 cursor-pointer flex-shrink-0"
          />
          <h3 className="font-bold text-gray-900 text-lg line-clamp-2 group-hover:text-orange-600 transition-colors">
            {novel.title || '未命名小说'}
          </h3>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          <button onClick={handleDelete}
            className="p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all opacity-0 group-hover:opacity-100"
            title="删除小说">
            <Trash2 className="w-4 h-4" />
          </button>
          <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-orange-500 transition-colors" />
        </div>
      </div>
      
      {/* 标签区域 - 固定高度，两行显示 */}
      <div className="mb-3 h-14 overflow-hidden">
        {/* 第一行：频道和题材 */}
        <div className="flex items-center gap-2 mb-1.5">
          <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-gradient-to-r from-orange-100 to-rose-100 text-orange-700 rounded-lg text-xs font-semibold flex-shrink-0">
            {novel.gender}
          </span>
          <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-gray-100 text-gray-600 rounded-lg text-xs font-medium flex-shrink-0">
            <BookOpen className="w-3 h-3" />
            {novel.genre}
          </span>
        </div>
        {/* 第二行：风格 - 单行截断 */}
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-gray-100 text-gray-600 rounded-lg text-xs font-medium w-full">
            <Type className="w-3 h-3 flex-shrink-0" />
            <span className="truncate block">{novel.style}</span>
          </span>
        </div>
      </div>

      {/* 信息区域 - 固定在底部 */}
      <div className="mt-auto">
        <div className="flex items-center justify-between text-sm mb-4">
          <span className="text-gray-500 flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-gray-400" />
            {dateStr}
          </span>
          <span className="font-bold text-gray-800">
            {novel.actual_count?.toLocaleString() || 0} 字
          </span>
        </div>

        <div className="pt-3 border-t border-gray-100">
          <a href={pkgUrl} download
            onClick={e => e.stopPropagation()}
            className="flex items-center justify-center gap-1.5 w-full py-2.5 text-xs font-semibold text-orange-600 bg-gradient-to-r from-orange-50 to-rose-50 hover:from-orange-100 hover:to-rose-100 border border-orange-200 rounded-xl transition-all shadow-sm hover:shadow-md">
            <Download className="w-3.5 h-3.5" />
            下载压缩包
          </a>
        </div>
      </div>
    </div>
  )
}
