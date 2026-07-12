import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Trash2, Clock, BookOpen, Type, Cpu, Download, FileText, Brain, Map, RefreshCw, ArrowUp, Layers, Users, Globe, Layout, Zap, PenTool, ListChecks, ChevronDown, ChevronUp, Eye, Share2, Loader2, Sparkles, FileDown, ChevronRight, Minus, Plus, X } from 'lucide-react'
import { fetchNovel, deleteNovel, isGitHubPages, getChapterExportUrl, getOutlineExportUrl, getOutlineXmindUrl, getPackageExportUrl, fetchRecord } from '../services/api'
import NovelReader from '../components/NovelReader'
import OutlineModal from '../components/OutlineModal'
import ChaptersModal from '../components/ChaptersModal'
import { cn, toast } from '../lib/utils'

const TREE_NODE_COLORS = [
  { dot: '#9333ea', bg: 'bg-purple-50', border: 'border-purple-200', text: 'text-purple-700' },
  { dot: '#2563eb', bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-700' },
  { dot: '#059669', bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-700' },
  { dot: '#d97706', bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-700' },
  { dot: '#e11d48', bg: 'bg-pink-50', border: 'border-pink-200', text: 'text-pink-700' },
  { dot: '#6366f1', bg: 'bg-indigo-50', border: 'border-indigo-200', text: 'text-indigo-700' },
  { dot: '#f97316', bg: 'bg-orange-50', border: 'border-orange-200', text: 'text-orange-700' },
]

function OutlineTreeNode({ node, depth = 0, colorIndex = 0 }) {
  const [collapsed, setCollapsed] = useState(depth >= 2)
  const title = node?.title || ''
  const children = node?.children
  const hasChildren = children && children.length > 0
  const color = TREE_NODE_COLORS[colorIndex % TREE_NODE_COLORS.length]

  if (!title) return null

  return (
    <div className="select-none">
      <div
        className={cn(
          'flex items-start gap-2 py-1.5 px-2 rounded-lg transition-colors cursor-pointer hover:bg-gray-50/80 group',
          depth === 0 && 'font-semibold',
        )}
        style={{ paddingLeft: `${12 + depth * 20}px` }}
        onClick={() => hasChildren && setCollapsed(!collapsed)}
      >
        {hasChildren ? (
          <span className="flex-shrink-0 w-5 h-5 mt-0.5 rounded flex items-center justify-center bg-gray-100 group-hover:bg-gray-200 transition-colors">
            {collapsed ? (
              <Plus className="w-3 h-3 text-gray-400" />
            ) : (
              <Minus className="w-3 h-3 text-gray-400" />
            )}
          </span>
        ) : (
          <span className="flex-shrink-0 w-5 h-5 mt-0.5 flex items-center justify-center">
            <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: color.dot }} />
          </span>
        )}
        {depth === 0 ? (
          <span className={cn('text-sm', color.text)}>{title}</span>
        ) : depth === 1 ? (
          <span className="text-sm font-medium text-gray-800">{title}</span>
        ) : (
          <span className="text-xs text-gray-600 leading-5">{title}</span>
        )}
      </div>
      {hasChildren && !collapsed && (
        <div className="animate-fade-in-down">
          {children.map((child, i) => (
            <OutlineTreeNode
              key={i}
              node={child}
              depth={depth + 1}
              colorIndex={depth === 0 ? colorIndex : colorIndex + 1}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function ensureTree(outline) {
  if (!outline) return []
  if (outline._tree && Array.isArray(outline._tree)) return outline._tree
  return []
}

export default function NovelPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [novel, setNovel] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [thinkingLogs, setThinkingLogs] = useState([])
  const [showLogs, setShowLogs] = useState(false)
  const [showScrollTop, setShowScrollTop] = useState(false)
  const [showOutline, setShowOutline] = useState(false)
  const [showOutlineModal, setShowOutlineModal] = useState(false)
  const [showChaptersModal, setShowChaptersModal] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const demoMode = isGitHubPages() || id === '0'

  useEffect(() => { loadNovel() }, [id])

  useEffect(() => {
    function onScroll() { setShowScrollTop(window.scrollY > 400) }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  async function loadNovel() {
    setLoading(true); setError('')
    try {
      const data = await fetchNovel(id)
      setNovel(data)
      if (data.latest_record_id) {
        try {
          const rec = await fetchRecord(data.latest_record_id)
          if (rec && rec.thinking_logs?.length > 0) {
            setThinkingLogs(rec.thinking_logs)
          }
        } catch {}
      }
    } catch (err) { setError(err.message) }
    finally { setLoading(false) }
  }

  async function handleDelete() {
    if (!window.confirm('确定删除这部小说？删除后不可恢复。')) return
    setDeleting(true)
    try {
      await deleteNovel(id)
      toast.success('已删除')
      navigate('/history')
    } catch (err) { toast.error('删除失败: ' + err.message) }
    finally { setDeleting(false) }
  }

  function scrollToTop() { window.scrollTo({ top: 0, behavior: 'smooth' }) }
  function handleContentChange(text, chIdx, paraIdx) {
    toast.info('段落内容更新功能（V2 润色已保存至版本历史）')
  }

  if (loading) return (
    <div className="flex flex-col items-center justify-center h-80 gap-4">
      <div className="w-10 h-10 border-[3px] border-orange-500 border-t-transparent rounded-full animate-spin" />
      <p className="text-sm text-gray-400 animate-pulse-soft">加载中...</p>
    </div>
  )

  if (error) return (
    <div className="text-center py-20">
      <div className="w-16 h-16 rounded-2xl bg-red-50 flex items-center justify-center mx-auto mb-4">
        <span className="text-3xl">😅</span>
      </div>
      <p className="text-red-500 mb-4 font-medium">{error}</p>
      <button onClick={() => navigate(-1)} className="text-orange-500 hover:text-orange-700 text-sm underline">返回上一页</button>
    </div>
  )

  if (!novel) return null

  let chapters = novel.chapters
  if (typeof chapters === 'string') { try { chapters = JSON.parse(chapters) } catch { chapters = [] } }
  chapters = Array.isArray(chapters) ? chapters : []
  const outline = novel.outline || {}
  const outlineLayerList = ['strategy', 'characters', 'world', 'plot_structure', 'rhythm', 'style_tone']
    .filter(k => outline[k])
    .map(k => ({ type: k, data: outline[k] }))

  return (
    <div className="space-y-6">
      {/* ─── 顶栏 ─── */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)}
            className="flex items-center gap-1 px-3 py-2 text-xs text-gray-400 hover:text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-all">
            <ArrowLeft className="w-3.5 h-3.5" /> 返回
          </button>
        </div>

        <div className="flex items-center gap-1.5 flex-wrap">
          {!demoMode && novel.generation_status === 'failed' && novel.latest_record_id && (
            <button onClick={() => navigate(`/?continue=true&record_id=${novel.latest_record_id}`)}
              className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-orange-600 bg-orange-50 border border-orange-200 rounded-lg hover:bg-orange-100 transition-all">
              <RefreshCw className="w-3 h-3" /> 继续生成
            </button>
          )}

          {Object.keys(outline).length > 0 && (
            <>
              <button onClick={() => setShowOutline(!showOutline)}
                className={cn(
                  'flex items-center gap-1 px-3 py-1.5 text-xs font-medium border rounded-lg transition-all',
                  showOutline ? 'bg-purple-50 text-purple-700 border-purple-200' : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
                )}>
                <Brain className="w-3 h-3" /> 大纲
              </button>
              {outlineLayerList.length > 0 && (
                <button onClick={() => setShowOutlineModal(true)}
                  className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-lg hover:bg-indigo-100 transition-all">
                  <Map className="w-3 h-3" /> 大纲生成结果
                </button>
              )}
              {chapters.length > 0 && (
                <button onClick={() => setShowChaptersModal(true)}
                  className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium bg-rose-50 text-rose-700 border border-rose-200 rounded-lg hover:bg-rose-100 transition-all">
                  <ListChecks className="w-3 h-3" /> 章节细纲
                </button>
              )}
            </>
          )}

          {!demoMode && (
            <div className="flex items-center gap-1">
              {[
                { key: 'markdown', label: 'MD', icon: FileText },
                { key: 'txt', label: 'TXT', icon: FileText },
                { key: 'pdf', label: 'PDF', icon: FileText },
              ].map(f => (
                <a key={f.key} href={`/api/v2/novels/${id}/export?format=${f.key}`} download
                  className="flex items-center gap-1 px-2 py-1.5 text-xs bg-white border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-600 transition-all">
                  <f.icon className="w-3 h-3" />{f.label}
                </a>
              ))}
            </div>
          )}

          {!demoMode && (
            <>
              <a href={getPackageExportUrl(id)} download
                className="flex items-center gap-1 px-2.5 py-1.5 text-xs gradient-brand text-white rounded-lg hover:shadow-sm transition-all">
                <FileDown className="w-3 h-3" /> ZIP
              </a>
              <button onClick={handleDelete} disabled={deleting}
                className="flex items-center gap-1 px-2.5 py-1.5 text-xs text-red-400 hover:text-red-600 border border-red-200 rounded-lg hover:bg-red-50 transition-all">
                {deleting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
              </button>
            </>
          )}
          {demoMode && <span className="text-xs bg-gray-100 text-gray-500 px-3 py-1.5 rounded-lg">Demo 预览</span>}
        </div>
      </div>

      {/* ─── 小说信息 ─── */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm gradient-card">
        <div className="flex items-start gap-4">
          <div className="flex-shrink-0 w-14 h-14 rounded-2xl gradient-brand flex items-center justify-center shadow-sm">
            <BookOpen className="w-7 h-7 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl font-bold text-gray-900">{novel.title || '未命名小说'}</h1>
              {novel.generation_status === 'failed' && (
                <span className="px-2.5 py-0.5 text-xs bg-red-50 text-red-600 border border-red-200 rounded-full flex items-center gap-1">
                  <RefreshCw className="w-3 h-3" /> 生成中断
                </span>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-2 mt-2 text-xs text-gray-500">
              {novel.gender && <span className="px-2 py-0.5 bg-orange-50 text-orange-700 rounded-full font-medium border border-orange-200/50">{novel.gender}</span>}
              {novel.genre && <span className="flex items-center gap-1 bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full border border-blue-200/50"><BookOpen className="w-3 h-3" /> {novel.genre}</span>}
              {novel.style && <span className="flex items-center gap-1 bg-purple-50 text-purple-700 px-2 py-0.5 rounded-full border border-purple-200/50"><Type className="w-3 h-3" /> {novel.style}</span>}
            </div>
            <div className="flex flex-wrap items-center gap-3 mt-2.5 text-xs text-gray-400">
              <span className="flex items-center gap-1"><Cpu className="w-3 h-3" /> {novel.model_used || '-'}</span>
              <span className="flex items-center gap-1"><Sparkles className="w-3 h-3" /> {novel.actual_count?.toLocaleString() || '?'} / {novel.word_count?.toLocaleString() || '?'} 字</span>
              {novel.time_cost && <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {novel.time_cost.toFixed(1)}s</span>}
              {novel.created_at && <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {new Date(novel.created_at).toLocaleString('zh-CN')}</span>}
              {novel.per_chapter_min && <span>每章 {novel.per_chapter_min}-{novel.per_chapter_max} 字</span>}
            </div>
          </div>
        </div>
      </div>

      {/* ─── 生成日志 ─── */}
      {thinkingLogs.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
          <button onClick={() => setShowLogs(!showLogs)}
            className="flex items-center gap-1.5 w-full text-left px-4 py-3.5 text-sm font-medium text-gray-600 hover:text-gray-800 transition-colors hover:bg-gray-50/50">
            <RefreshCw className="w-4 h-4 text-orange-500" />
            生成日志
            <span className="text-xs text-gray-400 font-normal">（{thinkingLogs.length} 条）</span>
            <ChevronUp className={cn('w-3.5 h-3.5 ml-auto transition-transform', !showLogs && 'rotate-180')} />
          </button>
          {showLogs && (
            <div className="px-4 pb-3.5 max-h-60 overflow-y-auto bg-gray-50/50 rounded-b-xl">
              {thinkingLogs.map((log, i) => (
                <div key={i} className="flex items-start gap-2 py-0.5 text-xs leading-relaxed">
                  <span className="text-[10px] text-gray-400 font-mono flex-shrink-0 mt-0.5 select-none">{log.time}</span>
                  <span className={cn(
                    'flex-1',
                    log.type === 'success' && 'text-green-700',
                    log.type === 'error' && 'text-red-600',
                    log.type === 'warn' && 'text-amber-700',
                    log.type === 'chapter' && 'text-orange-700',
                    (!log.type || log.type === 'info') && 'text-gray-600',
                  )}>{log.text}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ─── 创作大纲（树形） ─── */}
      {showOutline && (
        (() => {
          const tree = ensureTree(outline)
          return tree.length > 0 ? (
            <div className="bg-white rounded-xl border border-gray-200 p-5 animate-fade-in-down shadow-sm">
              <h3 className="text-sm font-semibold text-gray-800 mb-3 flex items-center gap-1.5">
                <Brain className="w-4 h-4 text-orange-500" />
                创作大纲
                <span className="text-xs text-gray-400 font-normal">（{tree.length} 个分支）</span>
              </h3>
              <div className="divide-y divide-gray-100">
                {tree.map((node, i) => (
                  <OutlineTreeNode key={i} node={node} depth={0} colorIndex={i} />
                ))}
              </div>
            </div>
          ) : null
        })()
      )}

      {/* ─── 章节导航 ─── */}
      {chapters.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
          <div className="flex items-center gap-1.5 mb-3 text-sm font-medium text-gray-700">
            <Eye className="w-4 h-4 text-orange-500" />
            章节导航
            <span className="text-xs text-gray-400 font-normal">（{chapters.length} 章）</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {chapters.map((ch, i) => (
              <button key={i} onClick={() => {
                const el = document.getElementById(`ch-${i}`)
                if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
              }}
                className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium bg-gray-50 hover:bg-orange-50 hover:text-orange-700 border border-gray-200 hover:border-orange-300 rounded-lg transition-all">
                <span className="w-4 h-4 rounded-full bg-gray-200 text-gray-500 flex items-center justify-center text-[9px] font-bold">{i + 1}</span>
                <span className="truncate max-w-[120px]">{ch.title || `第${i+1}章`}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ─── 小说正文（集成 V2 润色） ─── */}
      <NovelReader
        novelId={id}
        initialContent={novel.content}
        initialChapters={chapters}
        onContentChange={handleContentChange}
      />

      {/* ─── 大纲生成结果弹窗 ─── */}
      {showOutlineModal && (
        <OutlineModal outlineThinking={outlineLayerList} onClose={() => setShowOutlineModal(false)} />
      )}

      {/* ─── 章节细纲弹窗 ─── */}
      {showChaptersModal && (
        <ChaptersModal
          chapters={chapters}
          chapterTexts={[]}
          onClose={() => setShowChaptersModal(false)}
          onViewChapter={(i) => setShowChaptersModal(false)}
        />
      )}

      {/* ─── 回到顶部 ─── */}
      {showScrollTop && (
        <button onClick={scrollToTop}
          className="fixed bottom-8 z-50 w-11 h-11 rounded-full gradient-brand text-white shadow-lg hover:shadow-xl hover:scale-110 active:scale-95 transition-all flex items-center justify-center animate-fade-in"
          style={{ right: 'max(1rem, calc((100vw - 1024px) / 2 + 1rem))' }}>
          <ArrowUp className="w-5 h-5" />
        </button>
      )}
    </div>
  )
}