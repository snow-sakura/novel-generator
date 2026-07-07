import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Trash2, Clock, BookOpen, Type, Cpu, Download, FileText, Brain, Map, RefreshCw, List, ChevronDown, ChevronUp, ArrowUp, Layers, Users, Globe, Layout, Zap, PenTool, ListChecks } from 'lucide-react'
import { fetchNovel, deleteNovel, isGitHubPages, getChapterExportUrl, getOutlineExportUrl, getOutlineXmindUrl, getPackageExportUrl, fetchRecord } from '../services/api'
import { cn } from '../lib/utils'

const OUTLINE_LABELS = {
  strategy: { icon: Layers, label: '1. 战略层', color: 'text-purple-600', bg: 'bg-purple-50' },
  characters: { icon: Users, label: '2. 人物层', color: 'text-blue-600', bg: 'bg-blue-50' },
  world: { icon: Globe, label: '3. 设定层', color: 'text-teal-600', bg: 'bg-teal-50' },
  plot_structure: { icon: Layout, label: '4. 结构层', color: 'text-orange-600', bg: 'bg-orange-50' },
  rhythm: { icon: Zap, label: '5. 节奏层', color: 'text-pink-600', bg: 'bg-pink-50' },
  style_tone: { icon: PenTool, label: '6. 风格层', color: 'text-indigo-600', bg: 'bg-indigo-50' },
  chapters: { icon: ListChecks, label: '7. 章节细纲', color: 'text-rose-600', bg: 'bg-rose-50' },
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
    if (!window.confirm('确定删除？')) return
    try { await deleteNovel(id); navigate('/history') }
    catch (err) { alert('删除失败：' + err.message) }
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
      return <p className={cn('text-xs', depth > 1 ? 'text-gray-500 ml-3' : 'text-gray-700')}>{value}</p>
    }
    if (typeof value === 'number') {
      return <p className="text-xs text-gray-500 ml-3">{value.toLocaleString()}</p>
    }
    if (Array.isArray(value)) {
      return (
        <div className="space-y-1">
          {value.map((item, i) => {
            if (typeof item === 'string') {
              return <p key={i} className="text-xs text-gray-600 ml-3">• {item}</p>
            }
            if (typeof item === 'object') {
              const itemTitle = item.title || item.name || item.beat || `#${i + 1}`
              return (
                <div key={i} className="ml-3 p-2 bg-gray-50 rounded-lg">
                  {itemTitle && <p className="text-xs font-medium text-gray-800 mb-1">{itemTitle}</p>}
                  {Object.entries(item).filter(([k]) => !['title', 'name', 'beat'].includes(k)).map(([k, v]) => (
                    <div key={k} className="flex gap-1">
                      <span className="text-[11px] text-gray-400 w-14 flex-shrink-0">{FIELD_LABELS[k] || k}</span>
                      <span className="text-[11px] text-gray-600">{String(v)}</span>
                    </div>
                  ))}
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
        <div className="space-y-1.5 ml-2">
          {Object.entries(value).map(([k, v]) => {
            const label = FIELD_LABELS[k] || k
            if (typeof v === 'object' && v !== null) {
              return (
                <div key={k}>
                  <p className="text-xs font-medium text-gray-700 mt-1">{label}</p>
                  {renderOutlineValue(v, depth + 1)}
                </div>
              )
            }
            if (typeof v === 'string' && v.trim()) {
              return (
                <div key={k} className="flex gap-1">
                  <span className="text-[11px] text-gray-400 w-16 flex-shrink-0">{label}</span>
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

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-6 h-6 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" /></div>

  if (error) return <div className="text-center py-16"><p className="text-red-500">{error}</p><button onClick={() => navigate(-1)} className="mt-4 text-orange-500 hover:underline">返回</button></div>

  if (!novel) return null

  const chapters = Array.isArray(novel.chapters) ? novel.chapters : []
  const outline = novel.outline || {}

  return (
    <div className="space-y-6">
      {/* 顶栏 */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-gray-500 hover:text-gray-700 transition-colors">
          <ArrowLeft className="w-4 h-4" />返回
        </button>
        <div className="flex items-center gap-2 flex-wrap">
          {!demoMode && (
            <>
              <div className="flex items-center gap-1">
                <a href={`/api/v1/novels/${id}/export?format=markdown`} download
                  className="flex items-center gap-1 px-2.5 py-1.5 text-xs bg-white border rounded-lg hover:bg-gray-50 text-gray-600">
                  <FileText className="w-3 h-3" />MD
                </a>
                <a href={`/api/v1/novels/${id}/export?format=txt`} download
                  className="flex items-center gap-1 px-2.5 py-1.5 text-xs bg-white border rounded-lg hover:bg-gray-50 text-gray-600">
                  <FileText className="w-3 h-3" />TXT
                </a>
                <a href={`/api/v1/novels/${id}/export?format=pdf`} download
                  className="flex items-center gap-1 px-2.5 py-1.5 text-xs bg-white border rounded-lg hover:bg-gray-50 text-gray-600">
                  <FileText className="w-3 h-3" />PDF
                </a>
              </div>
              <a href={getPackageExportUrl(id)} download
                className="flex items-center gap-1 px-2.5 py-1.5 text-xs bg-orange-50 text-orange-700 border border-orange-200 rounded-lg hover:bg-orange-100 transition-colors font-medium">
                <Download className="w-3 h-3" />下载ZIP
              </a>
              <a href={getChapterExportUrl(id)} download
                className="flex items-center gap-1 px-2.5 py-1.5 text-xs bg-white border rounded-lg hover:bg-gray-50 text-gray-600">
                <Download className="w-3 h-3" />章节ZIP
              </a>
              <a href={getOutlineExportUrl(id)} download
                className="flex items-center gap-1 px-2.5 py-1.5 text-xs bg-white border rounded-lg hover:bg-gray-50 text-gray-600">
                <Brain className="w-3 h-3" />大纲MD
              </a>
              <a href={getOutlineXmindUrl(id)} download
                className="flex items-center gap-1 px-2.5 py-1.5 text-xs bg-white border rounded-lg hover:bg-gray-50 text-gray-600">
                <Map className="w-3 h-3" />大纲XMind
              </a>
            </>
          )}
          {!demoMode && novel.generation_status === 'failed' && novel.latest_record_id && (
            <button onClick={() => navigate(`/?continue=true&record_id=${novel.latest_record_id}`)}
              className="flex items-center gap-1 px-2.5 py-1.5 text-xs bg-orange-50 text-orange-700 border border-orange-200 rounded-lg hover:bg-orange-100 transition-colors">
              <RefreshCw className="w-3 h-3" />继续生成
            </button>
          )}
          {!demoMode && (
            <button onClick={handleDelete}
              className="flex items-center gap-1 px-2.5 py-1.5 text-xs text-red-400 hover:text-red-600 border border-red-200 rounded-lg hover:bg-red-50 transition-colors">
              <Trash2 className="w-3 h-3" />删除
            </button>
          )}
          {demoMode && <span className="text-xs bg-gray-100 text-gray-500 px-3 py-1.5 rounded-lg">Demo 预览</span>}
        </div>
      </div>

      {/* 小说信息 */}
      <div>
        <div className="flex items-center gap-3">
          <h1 className="text-3xl font-bold text-gray-900">{novel.title || '未命名小说'}</h1>
          {novel.generation_status === 'failed' && (
            <span className="px-2 py-0.5 text-xs bg-red-50 text-red-600 border border-red-200 rounded-full flex items-center gap-1">
              <RefreshCw className="w-3 h-3" /> 生成中断
            </span>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-3 mt-3 text-sm text-gray-500">
          <span className="bg-orange-50 text-orange-700 px-2 py-0.5 rounded-full text-xs">{novel.gender}</span>
          <span className="flex items-center gap-1"><BookOpen className="w-3.5 h-3.5" /> {novel.genre}</span>
          <span className="flex items-center gap-1"><Type className="w-3.5 h-3.5" /> {novel.style}</span>
          <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> {novel.created_at ? new Date(novel.created_at).toLocaleString('zh-CN') : ''}</span>
          <span className="flex items-center gap-1"><Cpu className="w-3.5 h-3.5" /> {novel.model_used}</span>
          <span>{novel.actual_count?.toLocaleString()} 字（目标 {novel.word_count} 字）</span>
          {novel.time_cost && <span>耗时 {novel.time_cost.toFixed(1)}秒</span>}
          {novel.per_chapter_min && <span>每章 {novel.per_chapter_min}-{novel.per_chapter_max} 字</span>}
        </div>
      </div>

      {/* 生成日志 */}
      {thinkingLogs.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <button onClick={() => setShowLogs(!showLogs)}
            className="flex items-center gap-1.5 w-full text-left text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors">
            <RefreshCw className="w-4 h-4 text-orange-500" />
            生成日志
            <span className="text-xs text-gray-400 font-normal">（{thinkingLogs.length} 条）</span>
            {showLogs ? <ChevronUp className="w-3.5 h-3.5 ml-auto" /> : <ChevronDown className="w-3.5 h-3.5 ml-auto" />}
          </button>
          {showLogs && (
            <div className="mt-3 max-h-80 overflow-y-auto space-y-0.5 bg-gray-50 rounded-lg p-3">
              {thinkingLogs.map((log, i) => (
                <div key={i} className="flex items-start gap-2 py-0.5 text-sm leading-relaxed">
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
          )}
        </div>
      )}

      {/* 创作大纲 — 全层次可折叠展示 */}
      {outline && Object.keys(OUTLINE_LABELS).some(k => outline[k] || outline.elements?.[k]) && (
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <h3 className="text-sm font-medium text-gray-800 mb-3 flex items-center gap-1.5">
            <Brain className="w-4 h-4 text-orange-500" />
            创作大纲
          </h3>
          <div className="space-y-2">
            {Object.entries(OUTLINE_LABELS).map(([key, meta]) => {
              const data = outline[key] || outline.elements?.[key]
              if (!data) return null
              const isOpen = openOutlineSections[key]
              return (
                <div key={key} className={cn('border rounded-xl overflow-hidden transition-all', meta.bg)}>
                  <button onClick={() => toggleOutlineSection(key)}
                    className="flex items-center gap-2 w-full text-left px-3 py-2.5 hover:opacity-80 transition-opacity">
                    <meta.icon className={cn('w-4 h-4', meta.color)} />
                    <span className={cn('text-sm font-medium', meta.color)}>{meta.label}</span>
                    {isOpen ? <ChevronUp className="w-3.5 h-3.5 ml-auto text-gray-400" /> : <ChevronDown className="w-3.5 h-3.5 ml-auto text-gray-400" />}
                  </button>
                  {isOpen && (
                    <div className="px-3 pb-3">
                      {renderOutlineValue(data)}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* 章节导航 */}
      {chapters.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-1.5 mb-2 text-sm font-medium text-gray-700">
            <List className="w-4 h-4 text-orange-500" />
            章节导航
            <span className="text-xs text-gray-400 font-normal">（{chapters.length} 章）</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {chapters.map((ch, i) => (
              <button key={i} onClick={() => scrollToChapter(i)}
                className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium bg-gray-50 hover:bg-orange-50 hover:text-orange-700 border border-gray-200 hover:border-orange-300 rounded-lg transition-all">
                <span className="w-4 h-4 rounded-full bg-gray-200 text-gray-500 flex items-center justify-center text-[10px] font-bold">
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
        <button onClick={scrollToTop}
          className="fixed bottom-8 z-50 w-11 h-11 rounded-full bg-gradient-to-br from-orange-400 to-rose-400 text-white shadow-lg hover:shadow-xl hover:scale-105 active:scale-95 transition-all flex items-center justify-center"
          style={{ right: 'max(1rem, calc((100vw - 1024px) / 2 + 1rem))' }}>
          <ArrowUp className="w-5 h-5" />
        </button>
      )}
    </div>
  )
}

/* 章节内容渲染 */
function ChapterContent({ content, chapters }) {
  if (!content) return null

  const blocks = content.split(/(?=## )/).filter(Boolean)
  if (blocks.length <= 1) {
    return <div className="bg-white rounded-xl border border-gray-200 p-6 md:p-8 novel-content" dangerouslySetInnerHTML={{ __html: renderMD(content) }} />
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
              <span className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-orange-400 to-rose-400 text-white flex items-center justify-center text-sm font-bold shadow-sm">{i + 1}</span>
              <h2 className="text-xl font-bold text-gray-900 m-0">{title}</h2>
            </div>
            <div className="novel-content" dangerouslySetInnerHTML={{ __html: renderMD(body) }} />
          </section>
        )
      })}
    </div>
  )
}

function renderMD(text) {
  if (!text) return ''
  let html = text
    .replace(/^### (.+)$/gm, '<h3 class="text-lg font-bold my-3 text-gray-800">$1</h3>')
    .replace(/^## (.+)$/gm, '<h2 class="text-xl font-bold my-4 text-gray-900 text-left">$1</h2>')
    .replace(/^# (.+)$/gm, '<h1 class="text-2xl font-bold my-5 text-gray-900 text-left">$1</h1>')
    .replace(/\*\*(.+?)\*\*/g, '<strong class="font-semibold">$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/\n\n/g, '</p><p class="text-base leading-relaxed mb-4 text-gray-800">')
    .replace(/\n/g, '<br/>')
  return '<p class="text-base leading-relaxed mb-4 text-gray-800">' + html + '</p>'
}
