import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Trash2, Clock, BookOpen, Type, Cpu, FileText, Brain, Map, RefreshCw, ArrowUp, ListChecks, ChevronDown, ChevronUp, Eye, Loader2, Sparkles, FileDown, Palette, MessageSquare, Image, Volume2, BarChart3, Minus, Plus } from 'lucide-react'
import { fetchNovel, deleteNovel, insertParagraph, isGitHubPages, getPackageExportUrl, fetchRecord } from '../services/api'
import NovelReader from '../components/NovelReader'
import OutlineModal from '../components/OutlineModal'
import ChaptersModal from '../components/ChaptersModal'
import BibleViewer from '../components/BibleViewer'
import DialogueGenerator from '../components/DialogueGenerator'
import IllustrationGallery from '../components/IllustrationGallery'
import TTSController from '../components/TTSController'
import AnalysisPanel from '../components/AnalysisPanel'
import GoldenQuotesPanel from '../components/GoldenQuotesPanel'
import EmotionCurveChart from '../components/EmotionCurveChart'
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

const LAYER_LABELS = {
  strategy: '战略层',
  characters: '人物层',
  world: '世界观层',
  plot_structure: '结构层',
  rhythm: '节奏层',
  style_tone: '风格层',
}

const LABEL_MAP = {
  strategy: '战略层', characters: '人物层', world: '世界观层',
  plot_structure: '结构层', rhythm: '节奏层', style_tone: '风格层',
  chapters: '章节细纲', core_idea: '核心立意', theme: '思想主题',
  ending: '结局预判', protagonist: '主角', supporting: '配角',
  antagonist: '反派', relationships: '人物关系', time_space: '时空背景',
  rules: '规则体系', factions: '势力格局', three_acts: '三幕式',
  beat_sheet: '节拍表', golden_three: '黄金三章',
  satisfaction_points: '爽点布局', emotional_peaks: '泪点/痛点',
  pace_curve: '节奏曲线', perspective: '叙事视角',
  language: '语言风格', atmosphere: '氛围基调',
  high_concept: '高概念设定', unique_selling_point: '独特卖点',
  core_question: '核心问题', values: '价值观',
  type: '结局类型', final_scene: '最终场景',
  desire: '核心欲望', flaw: '核心缺陷', traits: '性格特质',
  arc: '成长弧线', motive: '动机', threat: '压迫感',
  value_opposition: '价值对立', era: '时代', locations: '场景',
  world_rules: '世界规则', power_system: '力量体系',
  social_structure: '社会结构', act1: '第一幕·建置',
  act2: '第二幕·对抗', act3: '第三幕·结局',
  hook: '钩子', function: '功能定位', summary: '概要',
  cliffhanger: '悬念', word_count_estimate: '字数预估',
  description: '描述', alignment: '立场', role: '作用',
  name: '姓名', age: '年龄', identity: '身份',
  tone: '故事基调', initial_state: '初始状态',
  love_interest: '情感线', conflict_point: '冲突点',
  core_conflict_source: '核心冲突根源', devices: '设定与伏笔',
  power_rules: '力量规则', key_items: '核心道具',
  foreshadowing: '伏笔清单', item: '伏笔内容',
  planned_reveal: '揭示时机', scenes: '场景列表',
  time_era: '时代背景', conflict_type: '冲突类型',
  inciting_incident: '激励事件', development: '发展方向',
  resolution_tendency: '结局倾向', world_tone: '世界观基调',
  beat: '节拍', chapter: '章节', content: '内容',
  narrative_style: '叙事风格',
  relationship: '关系', goal: '目标', background: '背景',
  conflict: '冲突', state: '状态', appearance: '外貌',
  ability: '能力', personality: '性格', speciality: '特长',
  weakness: '弱点', climax: '高潮', turning_point: '转折点',
  event: '事件', significance: '意义', growth: '成长',
  transformation: '蜕变', overview: '概览', style: '风格',
  setting: '设定', element: '元素', structure: '结构',
  character: '角色', story: '故事', worldview: '世界观',
  plot: '情节', intro: '简介', introduction: '简介',
  detail: '细节', info: '信息', status: '状态',
  position: '立场', emotion: '情感', relation: '关系',
  role_type: '角色类型', importance: '重要性',
  character_growth: '角色成长', character_arc: '角色弧线',
  chapter_range: '章节范围',
}

function buildTree(layerData, depth = 0, maxDepth = 3) {
  if (depth > maxDepth || !layerData || typeof layerData !== 'object') return []
  return Object.entries(layerData)
    .filter(([k, v]) => {
      if (/^\d+$/.test(k)) return false
      return v !== null && v !== undefined
    })
    .map(([k, v]) => {
      const label = LABEL_MAP[k] || k
      if (typeof v === 'string') return v.trim() ? { title: `${label}: ${v.replace(/^#+\s*/gm, '').trim()}` } : null
      if (typeof v === 'number') return { title: `${label}: ${v}` }
      if (Array.isArray(v)) {
        if (v.length === 0) return null
        const items = v.slice(0, 8).map(i => {
          if (typeof i === 'string') return i.replace(/^#+\s*/gm, '').trim()
          if (typeof i === 'object') return Object.entries(i).filter(([ik]) => !/^\d+$/.test(ik)).map(([ik, iv]) => `${LABEL_MAP[ik] || ik}: ${String(iv).replace(/^#+\s*/gm, '').trim()}`).join(' | ')
          return String(i)
        })
        return { title: label, children: items.map(item => ({ title: item })) }
      }
      if (typeof v === 'object') {
        const children = buildTree(v, depth + 1, maxDepth)
        if (children.length === 0) return null
        return { title: label, children }
      }
      return null
    })
    .filter(Boolean)
}

function ensureTree(outline) {
  if (!outline) return []
  if (outline._tree && Array.isArray(outline._tree)) return outline._tree
  return Object.entries(LAYER_LABELS)
    .filter(([k]) => outline[k])
    .map(([k, label]) => {
      let data = outline[k]
      if (typeof data === 'object' && data !== null && Object.keys(data).length === 1 && data[k]) {
        data = data[k]
      }
      return { title: label, children: buildTree(data) }
    })
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
  const [showBible, setShowBible] = useState(false)
  const [showDialogue, setShowDialogue] = useState(false)
  const [showIllustrations, setShowIllustrations] = useState(false)
  const [showTTS, setShowTTS] = useState(false)
  const [showAnalysis, setShowAnalysis] = useState(false)
  const [showQuotes, setShowQuotes] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [showInterpretation, setShowInterpretation] = useState(true)
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
      const data = await fetchNovel(id) as Record<string, any>
      setNovel(data)
      if (data.latest_record_id) {
        try {
          const rec = await fetchRecord(data.latest_record_id) as Record<string, any> | null
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
    toast.info('段落内容更新功能（V3 润色已保存至版本历史）')
  }

  async function handleInsertContent(text, chIdx, paraIdx) {
    try {
      await insertParagraph(id, chIdx, paraIdx, text)
      toast.success('金句已插入')
      const updated = await fetchNovel(id)
      setNovel(updated)
    } catch (err) {
      toast.error(err.message || '插入金句失败')
    }
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
    .map(k => {
      let data = outline[k]
      if (typeof data === 'object' && data !== null && Object.keys(data).length === 1 && data[k]) {
        data = data[k]
      }
      return { type: k, data }
    })

  return (
    <div className={`space-y-6 ${showTTS ? 'pb-28' : ''}`}>
      {/* ─── 行1：返回 + 操作（删除/继续生成） ─── */}
      <div className="flex items-center justify-between">
        <button onClick={() => navigate(-1)}
          className="flex items-center gap-1.5 px-3 py-2 text-xs text-gray-400 hover:text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-all">
          <ArrowLeft className="w-3.5 h-3.5" /> 返回
        </button>
        <div className="flex items-center gap-2">
          {!demoMode && novel.generation_status === 'failed' && novel.latest_record_id && (
            <button onClick={() => navigate(`/?continue=true&record_id=${novel.latest_record_id}`)}
              className="flex items-center gap-1 px-3 py-2 text-xs font-medium text-orange-600 bg-orange-50 border border-orange-200 rounded-xl hover:bg-orange-100 transition-all">
              <RefreshCw className="w-3 h-3" /> 继续生成
            </button>
          )}
          {!demoMode && (
            <button onClick={handleDelete} disabled={deleting}
              className="flex items-center gap-1 px-3 py-2 text-xs text-red-400 hover:text-red-600 border border-red-200 rounded-xl hover:bg-red-50 transition-all">
              {deleting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
            </button>
          )}
          {demoMode && <span className="text-xs bg-gray-100 text-gray-500 px-3 py-2 rounded-xl">Demo 预览</span>}
        </div>
      </div>

      {/* ─── 行2：功能 tab 导航 ─── */}
      {Object.keys(outline).length > 0 && (
        <div className="flex flex-wrap gap-2">
          <button onClick={() => setShowOutline(!showOutline)}
            className={cn(
              'flex items-center gap-1.5 px-4 py-2 text-xs font-medium rounded-xl border transition-all',
              showOutline ? 'bg-purple-50 text-purple-700 border-purple-200 shadow-sm' : 'bg-white text-gray-500 border-gray-200 hover:border-purple-200 hover:text-purple-600'
            )}>
            <Brain className="w-3.5 h-3.5" /> 大纲
          </button>
          {outlineLayerList.length > 0 && (
            <button onClick={() => setShowOutlineModal(true)}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-medium bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-xl hover:bg-indigo-100 transition-all shadow-sm">
              <Map className="w-3.5 h-3.5" /> 大纲生成结果
            </button>
          )}
          {chapters.length > 0 && (
            <button onClick={() => setShowChaptersModal(true)}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-medium bg-rose-50 text-rose-700 border border-rose-200 rounded-xl hover:bg-rose-100 transition-all shadow-sm">
              <ListChecks className="w-3.5 h-3.5" /> 章节细纲
            </button>
          )}
          <button onClick={() => setShowBible(true)}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200 rounded-xl hover:bg-amber-100 transition-all shadow-sm">
            <BookOpen className="w-3.5 h-3.5" /> 设定档案
          </button>
          {novel.bible?.characters?.length >= 2 && (
            <button onClick={() => setShowDialogue(true)}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-medium bg-sky-50 text-sky-700 border border-sky-200 rounded-xl hover:bg-sky-100 transition-all shadow-sm">
              <MessageSquare className="w-3.5 h-3.5" /> 角色对话
            </button>
          )}
          {chapters.length > 0 && (
            <>
              <button onClick={() => setShowIllustrations(true)}
                className="flex items-center gap-1.5 px-4 py-2 text-xs font-medium bg-purple-50 text-purple-700 border border-purple-200 rounded-xl hover:bg-purple-100 transition-all shadow-sm">
                <Image className="w-3.5 h-3.5" /> AI 配图
              </button>
              <button onClick={() => setShowTTS(prev => !prev)}
                className={cn(
                  'flex items-center gap-1.5 px-4 py-2 text-xs font-medium rounded-xl border transition-all shadow-sm',
                  showTTS ? 'bg-purple-500 text-white border-purple-500' : 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100'
                )}>
                <Volume2 className="w-3.5 h-3.5" /> 朗读
              </button>
            </>
          )}
          <button onClick={() => setShowAnalysis(true)}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-xl hover:bg-emerald-100 transition-all shadow-sm">
            <BarChart3 className="w-3.5 h-3.5" /> 分析
          </button>
          <button onClick={() => setShowQuotes(true)}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200 rounded-xl hover:bg-amber-100 transition-all shadow-sm">
            <Sparkles className="w-3.5 h-3.5" /> 金句
          </button>
        </div>
      )}

      {/* ─── 行3：下载/导出 ─── */}
      {!demoMode && (
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-gray-400 font-medium uppercase tracking-wider mr-1">导出</span>
          <div className="flex items-center gap-1">
            {[
              { key: 'markdown', label: 'MD', icon: FileText },
              { key: 'txt', label: 'TXT', icon: FileText },
              { key: 'epub', label: 'EPUB', icon: BookOpen },
              { key: 'pdf', label: 'PDF', icon: FileText },
            ].map(f => (
              <a key={f.key} href={`/api/v3/novels/${id}/export?format=${f.key}`} download
                className="flex items-center gap-1 px-3 py-1.5 text-xs bg-white border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-500 hover:text-gray-700 transition-all">
                <f.icon className="w-3 h-3" />{f.label}
              </a>
            ))}
          </div>
          <a href={getPackageExportUrl(id)} download
            className="flex items-center gap-1 px-3 py-1.5 text-xs gradient-brand text-white rounded-lg hover:shadow-sm transition-all ml-1">
            <FileDown className="w-3 h-3" /> ZIP
          </a>
        </div>
      )}

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
              {novel.theme && <span className="flex items-center gap-1 bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full border border-emerald-200/50"><Sparkles className="w-3 h-3" /> 主题：{novel.theme}</span>}
              {novel.aesthetic_intensity && novel.aesthetic_intensity !== '中度' && (
                <span className="flex items-center gap-1 bg-rose-50 text-rose-700 px-2 py-0.5 rounded-full border border-rose-200/50">
                  <Palette className="w-3 h-3" /> 美学：{novel.aesthetic_intensity}
                </span>
              )}
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

      {/* ─── F2: 情感曲线 ─── */}
      {novel.emotion_curve && novel.emotion_curve.length > 0 && (
        <EmotionCurveChart data={novel.emotion_curve} />
      )}

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

      {/* ─── 小说正文（集成 V3 润色） ─── */}
      <NovelReader
        novelId={id}
        initialContent={novel.content}
        initialChapters={chapters}
        onContentChange={handleContentChange}
        onInsertContent={handleInsertContent}
      />

      {/* ─── F5: 文末解读 ─── */}
      {novel.interpretation && (
        <div className="mt-6 bg-gradient-to-br from-indigo-50/70 to-purple-50/70 rounded-xl border border-indigo-100/60 overflow-hidden">
          <button onClick={() => setShowInterpretation(!showInterpretation)}
            className="w-full flex items-center justify-between px-5 py-3 text-xs font-medium text-indigo-600 hover:bg-indigo-50/50 transition-colors">
            <span className="flex items-center gap-1.5">
              <BookOpen className="w-3.5 h-3.5" />
              故事解读
            </span>
            {showInterpretation ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
          {showInterpretation && (
            <div className="px-5 pb-4">
              <div className="text-[10px] font-semibold text-indigo-400 uppercase tracking-wider mb-2">—— 编者按</div>
              <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-wrap">{novel.interpretation}</p>
            </div>
          )}
        </div>
      )}

      {/* ─── 大纲生成结果弹窗 ─── */}
      {showOutlineModal && (
        <OutlineModal outlineThinking={outlineLayerList} onClose={() => setShowOutlineModal(false)} emotionCurve={novel?.emotion_curve} />
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

      {/* ─── F6: 设定档案弹窗 ─── */}
      {showBible && (
        <BibleViewer
          bible={novel.bible || {}}
          novelId={id}
          onClose={() => setShowBible(false)}
        />
      )}

      {/* ─── F8: 角色对话弹窗 ─── */}
      {showDialogue && (
        <DialogueGenerator
          bible={novel.bible || {}}
          novelId={id}
          chapters={chapters}
          demoMode={demoMode}
          onClose={() => setShowDialogue(false)}
          onInsert={(text, chIdx) => handleInsertContent(text, chIdx, -1)}
        />
      )}

      {/* ─── F11: AI 配图弹窗 ─── */}
      {showIllustrations && (
        <IllustrationGallery
          novelId={id}
          chapters={chapters}
          demoMode={demoMode}
          onClose={() => setShowIllustrations(false)}
        />
      )}

      {/* ─── F12: 语音合成 ─── */}
      {showTTS && (
        <TTSController
          novelId={id}
          content={novel.content}
          chapters={chapters}
          onClose={() => setShowTTS(false)}
        />
      )}

      {/* ─── F3: 金句管理 ─── */}
      {showQuotes && (
        <GoldenQuotesPanel
          novelId={id}
          demoMode={demoMode}
          onClose={() => setShowQuotes(false)}
        />
      )}

      {/* ─── F13: 统计分析 ─── */}
      {showAnalysis && (
        <AnalysisPanel
          novelId={id}
          demoMode={demoMode}
          onClose={() => setShowAnalysis(false)}
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