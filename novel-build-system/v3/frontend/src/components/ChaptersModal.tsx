import { useState } from 'react'
import { X, ListChecks, Eye } from 'lucide-react'
import { cn } from '../lib/utils'

const CHAPTER_COLORS = [
  { border: 'border-l-orange-400', header: 'bg-orange-50/60', dot: '#f97316', numBg: 'bg-orange-500' },
  { border: 'border-l-blue-400', header: 'bg-blue-50/60', dot: '#3b82f6', numBg: 'bg-blue-500' },
  { border: 'border-l-emerald-400', header: 'bg-emerald-50/60', dot: '#10b981', numBg: 'bg-emerald-500' },
  { border: 'border-l-purple-400', header: 'bg-purple-50/60', dot: '#a855f7', numBg: 'bg-purple-500' },
  { border: 'border-l-rose-400', header: 'bg-rose-50/60', dot: '#f43f5e', numBg: 'bg-rose-500' },
]

function ChapterCard({ chapter, index, content }) {
  const colors = CHAPTER_COLORS[index % CHAPTER_COLORS.length]

  return (
    <div className={cn('rounded-xl border-2 overflow-hidden', 'border-gray-200', 'bg-white')}>
      <div className={cn('flex items-center gap-2 px-4 py-3 border-b', 'border-gray-200', colors.header)}>
        <span className={cn('flex-shrink-0 w-6 h-6 rounded-full text-white flex items-center justify-center text-[10px] font-bold', colors.numBg)}>
          {index + 1}
        </span>
        <span className="text-sm font-semibold text-gray-800">{chapter.title || `第${index + 1}章`}</span>
        {content && (
          <span className="ml-auto text-[10px] text-gray-400 bg-white px-2 py-0.5 rounded-full border border-gray-200">
            {content.length} 字
          </span>
        )}
      </div>
      <div className="px-4 py-3 space-y-3">
        {chapter.summary && (
          <div className="flex gap-2">
            <span className="text-xs font-medium text-gray-500 flex-shrink-0 w-10">概要</span>
            <p className="text-xs text-gray-700 leading-relaxed">{chapter.summary}</p>
          </div>
        )}
        <div className="flex flex-wrap gap-2">
          {chapter.hook && (
            <span className="inline-flex items-center gap-1 text-[10px] px-2 py-1 bg-purple-50 text-purple-700 rounded-lg border border-purple-200">
               钩子: {chapter.hook}
            </span>
          )}
          {chapter.cliffhanger && (
            <span className="inline-flex items-center gap-1 text-[10px] px-2 py-1 bg-amber-50 text-amber-700 rounded-lg border border-amber-200">
               悬念: {chapter.cliffhanger}
            </span>
          )}
          {chapter.function && (
            <span className="inline-flex items-center gap-1 text-[10px] px-2 py-1 bg-blue-50 text-blue-700 rounded-lg border border-blue-200">
               定位: {chapter.function}
            </span>
          )}
        </div>
        {chapter.scenes && chapter.scenes.length > 0 && (
          <div>
            <span className="text-[10px] font-medium text-gray-400 uppercase tracking-wider">场景列表</span>
            <div className="flex flex-wrap gap-1 mt-1">
              {chapter.scenes.map((s, si) => (
                <span key={si} className="text-[10px] px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded">{s}</span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default function ChaptersModal({ chapters, chapterTexts, onClose, onViewChapter }) {
  const [activeIndex, setActiveIndex] = useState(0)

  return (
    <div className="modal-overlay animate-fade-in" onClick={onClose}>
      <div className="bg-white rounded-2xl w-[90vw] max-w-3xl max-h-[85vh] flex flex-col shadow-2xl border border-gray-100 animate-scale-in" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 flex-shrink-0">
          <div className="flex items-center gap-2">
            <ListChecks className="w-5 h-5 text-orange-500" />
            <h2 className="text-lg font-bold text-gray-900">章节细纲</h2>
            <span className="text-xs text-gray-400">（共 {chapters.length} 章）</span>
          </div>
          <button onClick={onClose} className="btn-ghost p-1.5"><X className="w-5 h-5" /></button>
        </div>

        <div className="flex border-b border-gray-100 overflow-x-auto px-4">
          {chapters.map((ch, i) => (
            <button key={i} onClick={() => setActiveIndex(i)}
              className={cn(
                'flex items-center gap-1.5 px-3 py-3 text-xs font-medium border-b-2 transition-all whitespace-nowrap',
                activeIndex === i
                  ? 'border-orange-500 text-orange-700'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              )}>
              <span className={cn(
                'flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold transition-all',
                activeIndex === i
                  ? 'bg-orange-500 text-white'
                  : 'bg-gray-200 text-gray-500'
              )}>
                {i + 1}
              </span>
              {ch.title || `第${i + 1}章`}
              {chapterTexts[i] && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          <div className="relative">
            <ChapterCard chapter={chapters[activeIndex]} index={activeIndex} content={chapterTexts[activeIndex] || ''} />
            {chapterTexts[activeIndex] && (
              <button onClick={() => onViewChapter(activeIndex)}
                className="absolute top-3 right-3 flex items-center gap-1 text-[10px] font-medium text-orange-600 bg-white border border-orange-200 px-2 py-1 rounded-lg hover:bg-orange-50 transition-colors shadow-sm">
                <Eye className="w-3 h-3" />
                查看正文
              </button>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between px-6 py-3 border-t border-gray-100 bg-gray-50/50 rounded-b-2xl">
          <span className="text-xs text-gray-400">
            {chapters.filter((_, i) => chapterTexts[i]).length}/{chapters.length} 章已生成
          </span>
          <span className="text-xs text-gray-400">
            {activeIndex + 1} / {chapters.length}
          </span>
        </div>
      </div>
    </div>
  )
}
