import { useState, useEffect, useCallback } from 'react'
import { X, Loader2, Image, RefreshCw, Trash2, ChevronLeft, ChevronRight } from 'lucide-react'
import { generateIllustration, fetchIllustrations, deleteIllustration } from '../services/api'
import { toast } from '../lib/utils'

const CHAPTER_NAMES = ['第一章', '第二章', '第三章', '第四章', '第五章', '第六章', '第七章', '第八章', '第九章', '第十章']

export default function IllustrationGallery({ novelId, chapters, demoMode, onClose }) {
  const [illustrations, setIllustrations] = useState([])
  const [loading, setLoading] = useState(new Set())
  const [selectedIndex, setSelectedIndex] = useState(null)
  const [fetching, setFetching] = useState(true)
  const [imgErrors, setImgErrors] = useState({})
  const [autoTriggered, setAutoTriggered] = useState(false)

  const load = useCallback(async () => {
    setFetching(true)
    try {
      const data = await fetchIllustrations(novelId) as any[]
      setIllustrations(data || [])
    } catch (e) {
      console.error('加载配图失败', e)
    }
    setFetching(false)
  }, [novelId])

  useEffect(() => { load() }, [load])

  const totalChapters = chapters?.length || 4
  useEffect(() => {
    if (!fetching && !autoTriggered && !demoMode) {
      const missingChapters = Array.from({ length: totalChapters }, (_, i) => i)
        .filter(i => !illustrations.find(ill => ill.chapter_index === i))
      if (missingChapters.length > 0) {
        setAutoTriggered(true)
        handleGenerate(missingChapters[0])
      }
    }
  }, [fetching, autoTriggered])

  const handleGenerate = async (chapterIndex) => {
    setLoading(prev => new Set(prev).add(chapterIndex))
    try {
      const img = await generateIllustration(novelId, chapterIndex)
      setIllustrations(prev => {
        const filtered = prev.filter(i => i.chapter_index !== chapterIndex)
        return [...filtered, img]
      })
    } catch (e) {
      toast.error(e.message || '配图生成失败')
    }
    setLoading(prev => {
      const next = new Set(prev)
      next.delete(chapterIndex)
      return next
    })
  }

  const handleDelete = async (chapterIndex) => {
    setLoading(prev => new Set(prev).add(`del-${chapterIndex}`))
    try {
      await deleteIllustration(novelId, chapterIndex)
      setIllustrations(prev => prev.filter(i => i.chapter_index !== chapterIndex))
    } catch (e) {
      toast.error(e.message || '删除失败')
    }
    setLoading(prev => {
      const next = new Set(prev)
      next.delete(`del-${chapterIndex}`)
      return next
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden m-4" onClick={e => e.stopPropagation()}>
        {/* 头部 */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <Image className="w-5 h-5 text-purple-500" />
            <h2 className="text-lg font-bold text-gray-900">AI 配图</h2>
            <span className="text-xs text-gray-400">（{illustrations.length}/{totalChapters} 章已配图）</span>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors" aria-label="关闭">
            <X className="w-4 h-4 text-gray-400" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto max-h-[calc(90vh-70px)]">
          {fetching ? (
            <div className="flex items-center justify-center py-16 text-gray-400">
              <Loader2 className="w-5 h-5 animate-spin mr-2" /> 加载中...
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {Array.from({ length: totalChapters }, (_, i) => {
                const img = illustrations.find(ill => ill.chapter_index === i)
                const isGenerating = loading.has(i)
                const isDeleting = loading.has(`del-${i}`)

                return (
                  <div key={i} className="rounded-xl border border-gray-200 overflow-hidden bg-white hover:shadow-md transition-shadow">
                    {/* 配图区域 */}
                    <div className="relative aspect-video bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center overflow-hidden">
                      {img ? (
                        <>
                          {imgErrors[i] ? (
                            <div className="flex flex-col items-center text-gray-400">
                              <Image className="w-8 h-8 mb-1" />
                              <span className="text-xs">图片加载失败</span>
                            </div>
                          ) : (
                            <img src={img.url} alt={img.prompt} className="w-full h-full object-cover"
                              onError={() => setImgErrors(prev => ({...prev, [i]: true}))} />
                          )}
                          <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent opacity-0 hover:opacity-100 transition-opacity flex items-end p-3">
                            <div className="flex gap-1">
                              <button onClick={() => handleGenerate(i)} disabled={isGenerating}
                                className="flex items-center gap-1 px-2 py-1 text-xs bg-white/90 rounded-lg hover:bg-white transition-colors">
                                {isGenerating ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
                                重新生成
                              </button>
                              <button onClick={() => handleDelete(i)} disabled={isDeleting} aria-label="删除配图"
                                className="flex items-center gap-1 px-2 py-1 text-xs bg-white/90 rounded-lg hover:bg-white text-red-500 transition-colors">
                                {isDeleting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
                              </button>
                            </div>
                          </div>
                        </>
                      ) : (
                        <div className="flex flex-col items-center text-gray-400">
                          <Image className="w-10 h-10 mb-2 opacity-50" />
                          <span className="text-xs">暂无配图</span>
                        </div>
                      )}
                    </div>

                    {/* 底部信息 */}
                    <div className="p-3">
                      <div className="flex items-center justify-between mb-1">
                        <h3 className="text-sm font-semibold text-gray-800">{CHAPTER_NAMES[i] || `第${i + 1}章`}</h3>
                        <span className="text-[10px] text-gray-400">{chapters?.[i]?.title || ''}</span>
                      </div>
                      {!img && (
                        <button onClick={() => handleGenerate(i)} disabled={isGenerating}
                          className="w-full flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium text-purple-600 bg-purple-50 border border-purple-200 rounded-lg hover:bg-purple-100 transition-colors disabled:opacity-50">
                          {isGenerating ? (
                            <><Loader2 className="w-3 h-3 animate-spin" /> 生成中...</>
                          ) : (
                            <><Image className="w-3 h-3" /> 生成配图</>
                          )}
                        </button>
                      )}
                      {img && img.prompt && (
                        <p className="text-[10px] text-gray-400 mt-1 line-clamp-2">{img.prompt}</p>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
