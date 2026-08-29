import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Trash2, Clock, BookOpen, Type, Cpu, Download, FileText, Brain, Map, RefreshCw, List, ChevronDown, ChevronUp, ArrowUp, Layers, Users, Globe, Layout, Zap, PenTool, ListChecks } from 'lucide-react'
import { fetchNovel, deleteNovel, isGitHubPages, getChapterExportUrl, getOutlineExportUrl, getOutlineXmindUrl, getPackageExportUrl, fetchRecord } from '../services/api'
import { cn } from '../lib/utils'
import ConfirmDialog from '../components/ConfirmDialog'
import { renderMarkdown } from '../lib/utils'

const renderMD = (text) => renderMarkdown(text, { size: 'base' })

const OUTLINE_LABELS = {
  strategy: { icon: Layers, label: '1. 战略层', color: 'text-purple-600', bg: 'bg-purple-50', border: 'border-purple-200' },
  characters: { icon: Users, label: '2. 人物层', color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-200' },
  world: { icon: Globe, label: '3. 设定层', color: 'text-teal-600', bg: 'bg-teal-50', border: 'border-teal-200' },
  plot_structure: { icon: Layout, label: '4. 结构层', color: 'text-orange-600', bg: 'bg-orange-50', border: 'border-orange-200' },
  rhythm: { icon: Zap, label: '5. 节奏层', color: 'text-pink-600', bg: 'bg-pink-50', border: 'border-pink-200' },
  style_tone: { icon: PenTool, label: '6. 风格层', color: 'text-indigo-600', bg: 'bg-indigo-50', border: 'border-indigo-200' },
  chapters: { icon: ListChecks, label: '7. 章节细纲', color: 'text-rose-600', bg: 'bg-rose-50', border: 'border-rose-200' },
}

const FIELD_LABELS = {
  core_idea: '核心立意', high_concept: '高概念设定', unique_selling_point: '独特卖点',
  theme: '思想主题', core_question: '核心问题', values: '价值观',
  ending: '结局预判', type: '结局类型', final_scene: '最终场景',
  protagonist: '主角', name: '姓名', age: '年龄', identity: '身份',
  desire: '核心欲望', flaw: '核心缺陷', traits: '性格特质', arc: '成长弧线',
  supporting: '配角', antagonist: '反派', motive: '动机', threat: '压迫感',
  value_opposition: '价值对立', relationships: '人物关系',
  time_space: '时空背景', era: '时代', locations: '场景',
  rules: '规则体系', world_rules: '世界规则', power_system: '力量体系',
  social_structure: '社会结构', factions: '势力格局', description: '描述',
  alignment: '立场', three_acts: '三幕式', act1: '第一幕·建置',
  act2: '第二幕·对抗', act3: '第三幕·结局',
  beat_sheet: '节拍表', beat: '节拍', chapter_range: '章节范围',
  golden_three: '黄金三章', hook: '钩子', function: '功能定位',
  satisfaction_points: '爽点布局', emotional_peaks: '泪点/痛点', pace_curve: '节奏曲线',
  perspective: '叙事视角', language: '语言风格', atmosphere: '氛围基调',
  summary: '概要', cliffhanger: '悬念', word_count_estimate: '字数预估',
  role: '作用',
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
  const [openOutlineSections, setOpenOutlineSections] = useState({})
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [activeOutlineTab, setActiveOutlineTab] = useState('strategy')
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
          if (rec && rec.thinking_logs && rec.thinking_logs.length > 0) {
            setThinkingLogs(rec.thinking_logs)
            setShowLogs(true)
          }
        } catch {}
      }
    } catch (err) { setError(err.message) }
    finally { setLoading(false) }
  }

  async function handleDelete() {
    setShowDeleteConfirm(true)
  }

  async function confirmDelete() {
    setShowDeleteConfirm(false)
    try { await deleteNovel(id); navigate('/history') }
    catch (err) { setError('删除失败：' + err.message) }
  }

  function scrollToChapter(index) {
    const el = document.getElementById(`ch-${index}`)
    if (el) { el.scrollIntoView({ behavior: 'smooth', block: 'start' }) }
  }

  function scrollToTop() {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function toggleOutlineSection(key) {
    setOpenOutlineSections(prev => ({ ...prev, [key]: !prev[key] }))
  }

  function renderOutlineValue(value, depth = 0) {
    if (value === null || value === undefined) return null
    if (typeof value === 'string' && value.trim()) {
      return <p className={cn('text-xs leading-relaxed', depth > 1 ? 'text-gray-500 ml-3' : 'text-gray-700')}>{value}</p>
    }
    if (typeof value === 'number') {
      return <p className="text-xs text-gray-500 ml-3">{value.toLocaleString()}</p>
    }
    if (Array.isArray(value)) {
      return (
        <div className="space-y-1.5">
          {value.map((item, i) => {
            if (typeof item === 'string') {
              return <p key={i} className="text-xs text-gray-600 ml-3">• {item}</p>
            }
            if (typeof item === 'object') {
              const itemTitle = item.title || item.name || item.beat || `#${i + 1}`
              return (
                <div key={i} className="ml-3 p-2.5 bg-white rounded-lg border border-gray-100">
                  {itemTitle && <p className="text-xs font-medium text-gray-800 mb-1.5">{itemTitle}</p>}
                  <div className="space-y-1">
                    {Object.entries(item).filter(([k]) => !['title', 'name', 'beat'].includes(k)).map(([k, v]) => (
                      <div key={k} className="flex gap-2">
                        <span className="text-[11px] text-gray-400 w-16 flex-shrink-0">{FIELD_LABELS[k] || k}</span>
                        <span className="text-[11px] text-gray-600">{String(v)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )
            }
            return null
          })}
        </div>
      )
    }
    if (typeof value === 'object') {
      return (
        <div className="space-y-2 ml-2">
          {Object.entries(value).map(([k, v]) => {
            const label = FIELD_LABELS[k] || k
            if (typeof v === 'object' && v !== null) {
              return (
                <div key={k}>
                  <p className="text-xs font-medium text-gray-700 mt-2 mb-1">{label}</p>
                  {renderOutlineValue(v, depth + 1)}
                </div>
              )
            }
            if (typeof v === 'string' && v.trim()) {
              return (
                <div key={k} className="flex gap-2">
                  <span className="text-[11px] text-gray-400 w-20 flex-shrink-0">{label}</span>
                  <span className="text-xs text-gray-600">{v}</span>
                </div>
              )
            }
            return null
          })}
        </div>
      )
    }
    return null
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="flex flex-col items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-400 to-rose-500 flex items-center justify-center shadow-md">
          <RefreshCw className="w-5 h-5 text-white animate-spin" />
        </div>
        <p className="text-sm text-gray-400 font-medium">加载中...</p>
      </div>
    </div>
  )

  if (error) return (
    <div className="text-center py-16">
      <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-red-100 to-rose-100 flex items-center justify-center mx-auto mb-4 shadow-inner">
        <RefreshCw className="w-8 h-8 text-red-500" />
      </div>
      <p className="text-red-500 mb-4 font-medium">{error}</p>
      <button onClick={() => navigate(-1)} className="px-5 py-2.5 bg-gradient-to-r from-orange-500 to-rose-500 text-white rounded-xl font-semibold hover:from-orange-600 hover:to-rose-600 transition-all shadow-md text-sm">
        返回
      </button>
    </div>
  )

  if (!novel) return null

  const chapters = Array.isArray(novel.chapters) ? novel.chapters : []
  const outline = novel.outline || {}
  const outlineKeys = Object.keys(OUTLINE_LABELS).filter(k => outline[k] || outline.elements?.[k])

  return (
    <div className="space-y-5">
      {/* 顶栏 */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <button onClick={() => navigate(-1)} aria-label="返回" className="flex items-center gap-1.5 text-gray-500 hover:text-gray-700 transition-colors text-sm font-medium">
          <ArrowLeft className="w-4 h-4" />
          返回
        </button>
        <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
          {!demoMode && (
            <>
              <div className="flex items-center gap-0.5 sm:gap-1 bg-gray-100 rounded-lg p-0.5">
                <a href={`/api/v1/novels/${id}/export?format=markdown`} download aria-label="导出 Markdown"
                  className="flex items-center gap-1 px-2 py-1.5 text-xs bg-white rounded-md hover:bg-gray-50 text-gray-600 transition-colors font-medium">
                  <FileText className="w-3 h-3" /><span className="hidden sm:inline">MD</span><span className="sm:hidden">.md</span>
                </a>
                <a href={`/api/v1/novels/${id}/export?format=txt`} download aria-label="导出 TXT"
                  className="flex items-center gap-1 px-2 py-1.5 text-xs bg-white rounded-md hover:bg-gray-50 text-gray-600 transition-colors font-medium">
                  <FileText className="w-3 h-3" />TXT
                </a>
                <a href={`/api/v1/novels/${id}/export?format=pdf`} download aria-label="导出 PDF"
                  className="flex items-center gap-1 px-2 py-1.5 text-xs bg-white rounded-md hover:bg-gray-50 text-gray-600 transition-colors font-medium">
                  <FileText className="w-3 h-3" />PDF
                </a>
              </div>
              <a href={getPackageExportUrl(id)} download aria-label="下载完整压缩包"
                className="flex items-center gap-1 px-2.5 sm:px-3 py-1.5 text-xs bg-gradient-to-r from-orange-500 to-rose-500 text-white rounded-lg hover:from-orange-600 hover:to-rose-600 transition-all shadow-sm font-semibold">
                <Download className="w-3 h-3" /><span className="hidden sm:inline">下载ZIP</span><span className="sm:hidden">ZIP</span>
              </a>
              <a href={getChapterExportUrl(id)} download aria-label="下载逐章 ZIP"
                className="hidden sm:flex items-center gap-1 px-3 py-1.5 text-xs bg-white border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-600 transition-colors font-medium">
                <Download className="w-3 h-3" />章节ZIP
              </a>
              <a href={getOutlineExportUrl(id)} download aria-label="下载大纲 Markdown"
                className="hidden sm:flex items-center gap-1 px-3 py-1.5 text-xs bg-white border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-600 transition-colors font-medium">
                <Brain className="w-3 h-3" />大纲MD
              </a>
              <a href={getOutlineXmindUrl(id)} download aria-label="下载大纲 XMind"
                className="hidden sm:flex items-center gap-1 px-3 py-1.5 text-xs bg-white border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-600 transition-colors font-medium">
                <Map className="w-3 h-3" />大纲XMind
              </a>
            </>
          )}
          {!demoMode && novel.generation_status === 'failed' && novel.latest_record_id && (
            <button onClick={() => navigate(`/?continue=true&record_id=${novel.latest_record_id}`)} aria-label="继续生成"
              className="flex items-center gap-1 px-2.5 sm:px-3 py-1.5 text-xs bg-orange-50 text-orange-700 border border-orange-200 rounded-lg hover:bg-orange-100 transition-colors font-medium">
              <RefreshCw className="w-3 h-3" /><span className="hidden sm:inline">继续生成</span>
            </button>
          )}
          {!demoMode && (
            <button onClick={handleDelete} aria-label="删除小说"
              className="flex items-center gap-1 px-2.5 sm:px-3 py-1.5 text-xs text-red-400 hover:text-red-600 border border-red-200 rounded-lg hover:bg-red-50 transition-colors font-medium">
              <Trash2 className="w-3 h-3" /><span className="hidden sm:inline">删除</span>
            </button>
          )}
          {demoMode && <span className="text-xs bg-gray-100 text-gray-500 px-3 py-1.5 rounded-lg font-medium">Demo 预览</span>}
        </div>
      </div>

      {/* 小说信息 */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
        <div className="flex items-center gap-3 mb-4">
          <h1 className="text-2xl font-bold text-gray-900">{novel.title || '未命名小说'}</h1>
          {novel.generation_status === 'failed' && (
            <span className="px-3 py-1 text-xs bg-red-50 text-red-600 border border-red-200 rounded-full flex items-center gap-1.5 font-medium">
              <RefreshCw className="w-3 h-3" /> 生成中断
            </span>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-3 text-sm">
          <span className="bg-gradient-to-r from-orange-100 to-rose-100 text-orange-700 px-3 py-1 rounded-lg text-xs font-semibold">{novel.gender}</span>
          <span className="flex items-center gap-1.5 text-gray-600"><BookOpen className="w-4 h-4 text-gray-400" /> {novel.genre}</span>
          <span className="flex items-center gap-1.5 text-gray-600"><Type className="w-4 h-4 text-gray-400" /> {novel.style}</span>
          <span className="flex items-center gap-1.5 text-gray-500"><Clock className="w-4 h-4 text-gray-400" /> {novel.created_at ? new Date(novel.created_at).toLocaleString('zh-CN') : ''}</span>
          <span className="flex items-center gap-1.5 text-gray-500"><Cpu className="w-4 h-4 text-gray-400" /> {novel.model_used}</span>
          <span className="font-bold text-gray-800">{novel.actual_count?.toLocaleString()} 字</span>
          <span className="text-gray-400">目标 {novel.word_count} 字</span>
          {novel.time_cost && <span className="text-gray-400">耗时 {novel.time_cost.toFixed(1)}s</span>}
          {novel.per_chapter_min && <span className="text-gray-400">每章 {novel.per_chapter_min}-{novel.per_chapter_max} 字</span>}
        </div>
      </div>

      {/* 生成日志 */}
      {thinkingLogs.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
          <button onClick={() => setShowLogs(!showLogs)} aria-label={showLogs ? '收起日志' : '展开日志'}
            className="flex items-center gap-2 w-full text-left px-4 py-3.5 hover:bg-gray-50 transition-colors border-b border-gray-100">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-orange-400 to-rose-500 flex items-center justify-center">
              <RefreshCw className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="text-sm font-semibold text-gray-700">生成日志</span>
            <span className="text-xs text-gray-400">({thinkingLogs.length} 条)</span>
            {showLogs ? <ChevronUp className="w-4 h-4 ml-auto text-gray-400" /> : <ChevronDown className="w-4 h-4 ml-auto text-gray-400" />}
          </button>
          {showLogs && (
            <div className="max-h-64 overflow-y-auto p-4 bg-gray-50">
              <div className="space-y-1">
                {thinkingLogs.map((log, i) => (
                  <div key={i} className="flex items-start gap-2 py-1.5 text-sm leading-relaxed">
                    <span className="text-[11px] text-gray-400 font-mono flex-shrink-0 mt-0.5 select-none">{log.time}</span>
                    <span className={cn(
                      'flex-1',
                      log.type === 'success' && 'text-green-700',
                      log.type === 'error' && 'text-red-600',
                      log.type === 'warn' && 'text-amber-700',
                      log.type === 'chapter' && 'text-orange-700',
                      (!log.type || log.type === 'info') && 'text-gray-700',
                    )}>{log.text}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* 创作大纲 — Tab 切换展示 */}
      {outlineKeys.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
          <div className="px-4 py-3.5 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-orange-400 to-rose-500 flex items-center justify-center">
                <Brain className="w-3.5 h-3.5 text-white" />
              </div>
              <span className="text-sm font-bold text-gray-800">创作大纲</span>
            </div>
          </div>
          
          {/* 大纲 Tab 导航 */}
          <div className="flex gap-1.5 p-2 bg-gray-50 border-b border-gray-100 overflow-x-auto">
            {outlineKeys.map(key => {
              const meta = OUTLINE_LABELS[key]
              return (
                <button
                  key={key}
                  onClick={() => setActiveOutlineTab(key)}
                  className={cn(
                    'flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all whitespace-nowrap',
                    activeOutlineTab === key
                      ? 'bg-white text-orange-600 shadow-sm border border-orange-200'
                      : 'text-gray-500 hover:text-gray-700 hover:bg-white/50'
                  )}
                >
                  <meta.icon className={cn('w-3.5 h-3.5', activeOutlineTab === key ? meta.color : '')} />
                  {meta.label}
                </button>
              )
            })}
          </div>

          {/* 大纲内容 */}
          <div className="p-4">
            {outlineKeys.map(key => {
              if (activeOutlineTab !== key) return null
              const meta = OUTLINE_LABELS[key]
              const data = outline[key] || outline.elements?.[key]
              return (
                <div key={key} className={cn('rounded-xl border-2 p-4', meta.bg, meta.border)}>
                  <div className="flex items-center gap-2 mb-3">
                    <meta.icon className={cn('w-5 h-5', meta.color)} />
                    <span className={cn('text-sm font-bold', meta.color)}>{meta.label}</span>
                  </div>
                  <div className="bg-white rounded-xl p-4 shadow-sm">
                    {renderOutlineValue(data)}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* 章节导航 */}
      {chapters.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-orange-400 to-rose-500 flex items-center justify-center">
              <List className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="text-sm font-bold text-gray-800">章节导航</span>
            <span className="text-xs text-gray-400">({chapters.length} 章)</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {chapters.map((ch, i) => (
              <button key={i} onClick={() => scrollToChapter(i)}
                className="flex items-center gap-2 px-3.5 py-2 text-xs font-semibold bg-gray-50 hover:bg-gradient-to-r hover:from-orange-50 hover:to-rose-50 hover:text-orange-700 border border-gray-200 hover:border-orange-300 rounded-xl transition-all shadow-sm hover:shadow-md">
                <span className="w-6 h-6 rounded-full bg-gradient-to-br from-orange-400 to-rose-400 text-white flex items-center justify-center text-[10px] font-bold shadow-sm">
                  {i + 1}
                </span>
                <span className="truncate max-w-[120px]">{ch.title || `第${i+1}章`}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 小说内容 */}
      <ChapterContent content={novel.content} chapters={chapters} />

      {/* 回到顶部按钮 */}
      {showScrollTop && (
        <button onClick={scrollToTop} aria-label="回到顶部"
          className="fixed bottom-6 sm:bottom-8 right-4 sm:right-8 z-50 w-12 h-12 rounded-full bg-gradient-to-br from-orange-400 to-rose-500 text-white shadow-xl hover:shadow-2xl hover:scale-110 active:scale-95 transition-all flex items-center justify-center">
          <ArrowUp className="w-5 h-5" />
        </button>
      )}

      {/* 删除确认对话框 */}
      <ConfirmDialog
        open={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={confirmDelete}
        title="确定删除？"
        message="删除后将无法恢复，是否继续？"
        type="danger"
        confirmText="删除"
        cancelText="取消"
        confirmColor="danger"
      />
    </div>
  )
}

/* 章节内容渲染 */
function ChapterContent({ content, chapters }) {
  if (!content) return null

  const blocks = content.split(/(?=## )/).filter(Boolean)
  if (blocks.length <= 1) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-6 md:p-8">
        <div className="novel-content" dangerouslySetInnerHTML={{ __html: renderMD(content) }} />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {blocks.map((block, i) => {
        const titleMatch = block.match(/^## (.+)/)
        const title = titleMatch ? titleMatch[1].trim() : (chapters[i]?.title || `第${i+1}章`)
        const body = block.replace(/^## .+\n+/, '')
        return (
          <section key={i} id={`ch-${i}`} className="bg-white rounded-xl border border-gray-200 p-6 md:p-8 scroll-mt-24">
            <div className="flex items-center gap-3 mb-5 pb-3 border-b border-gray-100">
              <span className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-orange-400 to-rose-400 text-white flex items-center justify-center text-sm font-bold shadow-sm">
                {i + 1}
              </span>
              <h2 className="text-xl font-bold text-gray-900 m-0">{title}</h2>
            </div>
            <div className="novel-content" dangerouslySetInnerHTML={{ __html: renderMD(body) }} />
          </section>
        )
      })}
    </div>
  )
}
