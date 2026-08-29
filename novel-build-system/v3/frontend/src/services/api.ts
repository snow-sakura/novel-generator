import { mockGenerateStream, SAMPLE_NOVEL, SAMPLE_CHAPTERS, mockGenerateOpenings, mockGenerateDialogue, type SSEMessage } from './sampleNovel'

const API_BASE = '/api/v3'

export function isGitHubPages(): boolean {
  return typeof window !== 'undefined' && window.location.hostname.includes('github.io')
}

// ─── SSE 流式客户端（通用，替代 7 份重复实现） ───

const DEFAULT_TIMEOUT = 600000  // 10 min
const DEFAULT_TIMEOUT_MSG = '请求超时'

interface SSEClientOptions {
  timeout?: number
  timeoutMsg?: string
  onEvent?: (event: string, data: unknown) => void
  onComplete?: () => void
  onError?: (msg: string) => void
}

interface SSEClientResult {
  controller: AbortController
}

type SSEOnEvent = (event: string, data: unknown) => void
type SSEOnComplete = () => void
type SSEOnError = (msg: string) => void

/**
 * 创建一个 SSE 流式请求客户端
 */
export function createSSEClient(
  url: string,
  body: Record<string, unknown>,
  opts: SSEClientOptions = {}
): SSEClientResult {
  const {
    timeout = DEFAULT_TIMEOUT,
    timeoutMsg = DEFAULT_TIMEOUT_MSG,
    onEvent = () => {},
    onComplete = () => {},
    onError = () => {},
  } = opts

  const controller = new AbortController()
  let timedOut = false
  const timeoutId = setTimeout(() => { timedOut = true; controller.abort() }, timeout)

  ;(async () => {
    try {
      const response = await fetch(`${API_BASE}${url}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: controller.signal,
      })
      clearTimeout(timeoutId)

      if (!response.ok) {
        const err: Record<string, string> = await response.json().catch(() => ({}))
        throw new Error(err.error || err.detail || `请求失败 (${response.status})`)
      }

      const reader = response.body!.getReader()
      const decoder = new TextDecoder()
      let buffer = ''
      let currentEvent = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''

        for (const line of lines) {
          if (line.startsWith('event: ')) {
            currentEvent = line.slice(7).trim()
          } else if (line.startsWith('data: ')) {
            const dataStr = line.slice(6).trim()
            try {
              const parsed = JSON.parse(dataStr)
              onEvent(currentEvent, parsed)
            } catch {
              onEvent(currentEvent, dataStr)
            }
          }
        }
      }
      onComplete()
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'AbortError') {
        onError(timedOut ? timeoutMsg : '已停止')
      } else {
        onError(err instanceof Error ? err.message : '网络错误')
      }
    }
  })()

  return { controller }
}

// ─── 配置 & 数据 ───

export interface ConfigCheckResult {
  provider: string
  configured: boolean
  error: string
  model: string
}

export interface ModelsResult {
  models: Array<{ id: string; name: string; provider: string }>
}

export interface GenresResult {
  gender: string
  genres: string[]
  styles: string[]
  [key: string]: unknown
}

export async function checkConfig(): Promise<ConfigCheckResult> {
  if (isGitHubPages()) {
    return { provider: 'Demo Mode', configured: true, error: '', model: '浏览器端模拟' }
  }
  try {
    const res = await fetch(`${API_BASE}/config/check`)
    if (!res.ok) return { provider: '', configured: false, error: '无法连接后端', model: '' }
    return res.json()
  } catch {
    return { provider: '', configured: false, error: '后端未启动', model: '' }
  }
}

export async function fetchModels(): Promise<ModelsResult> {
  if (isGitHubPages()) return { models: [] }
  try {
    const res = await fetch(`${API_BASE}/models/list`)
    if (!res.ok) return { models: [] }
    return res.json()
  } catch { return { models: [] } }
}

export async function fetchGenres(gender = '男频'): Promise<GenresResult> {
  if (isGitHubPages()) return { gender, genres: [], styles: [] }
  try {
    const res = await fetch(`${API_BASE}/genres/list?gender=${encodeURIComponent(gender)}`)
    if (!res.ok) return { gender, genres: [], styles: [] }
    return res.json()
  } catch { return { gender, genres: [], styles: [] } }
}

// ─── F7: 对比模式 - 生成开头版本 ───

export function generateOpenings(
  params: Record<string, unknown>,
  onEvent: SSEOnEvent,
  onComplete: SSEOnComplete,
  onError: SSEOnError
): SSEClientResult {
  return createSSEClient('/generate/openings', params, {
    timeout: 120000,
    timeoutMsg: '生成开头超时',
    onEvent(event, data) {
      if (event === 'opening_version' || event === 'openings_done' || event === 'log') {
        onEvent(event, data)
      } else if (event === 'error') {
        onError((data as Record<string, string>).message || '生成失败')
      }
    },
    onComplete,
    onError,
  })
}

// ─── 生成 ───

export function generateNovel(
  params: Record<string, unknown>,
  onEvent: SSEOnEvent,
  onComplete: SSEOnComplete,
  onError: SSEOnError,
  continueRecordId?: string | null
): SSEClientResult {
  const url = continueRecordId
    ? `/generate/continue?record_id=${continueRecordId}`
    : '/generate'

  console.log('[SSE] 开始请求:', url, params)
  return createSSEClient(url, params, {
    timeout: 600000,
    timeoutMsg: '请求超时（10分钟）',
    onEvent(event, data) {
      onEvent(event, data)
    },
    onComplete() {
      onComplete()
    },
    onError(msg) {
      onError(msg)
    },
  })
}

// ─── 生成记录轮询 ───

export async function fetchRecordStatus(recordId: number | string | null): Promise<{ id?: number; novel_id?: number | null; status?: string; completed_chapters?: number; total_chapters?: number; [key: string]: unknown } | null> {
  if (isGitHubPages() || !recordId) return null
  try {
    const res = await fetch(`${API_BASE}/records/${recordId}/status`)
    if (!res.ok) return null
    return res.json()
  } catch { return null }
}

// ─── 对话式生成 ───

export function chatGenerate(
  message: string,
  onEvent: SSEOnEvent,
  onComplete: SSEOnComplete,
  onError: SSEOnError
): SSEClientResult {
  return createSSEClient('/chat/generate', { message }, {
    timeout: 600000,
    timeoutMsg: '请求超时或已停止',
    onEvent(event, data) {
      onEvent(event, data)
    },
    onComplete,
    onError,
  })
}

// ─── F8: 角色对话生成 ───

export function generateDialogue(
  params: Record<string, unknown>,
  onEvent: SSEOnEvent,
  onComplete: SSEOnComplete,
  onError: SSEOnError
): SSEClientResult {
  return createSSEClient('/dialogue/generate', params, {
    timeout: 120000,
    timeoutMsg: '请求超时',
    onEvent(event, data) {
      if (event === 'dialogue_content') {
        onEvent('dialogue_content', data)
      } else if (event === 'dialogue_done') {
        onComplete()
      } else if (event === 'error') {
        onError((data as Record<string, string>).message || '生成失败')
      }
    },
    onComplete,
    onError,
  })
}

export async function generateDialogueDemo(
  _params: Record<string, unknown>,
  onEvent: SSEOnEvent,
  onComplete: SSEOnComplete,
  onError: SSEOnError
): Promise<{ controller: null }> {
  try {
    for await (const chunk of mockGenerateDialogue()) {
      if (chunk.event === 'dialogue_content') {
        onEvent('dialogue_content', chunk.data)
      }
    }
    onComplete()
  } catch (err) {
    onError(err instanceof Error ? err.message : 'Demo 对话生成失败')
  }
  return { controller: null }
}

// ─── F9: 写作助手 ───

export function assistContinue(
  params: Record<string, unknown>,
  onEvent: SSEOnEvent,
  onComplete: SSEOnComplete,
  onError: SSEOnError
): SSEClientResult {
  return createSSEClient('/assist/continue', params, {
    timeout: 120000,
    timeoutMsg: '请求超时',
    onEvent(event, data) {
      if (event === 'content') {
        onEvent('content', data)
      } else if (event === 'complete') {
        onComplete()
      } else if (event === 'error') {
        onError((data as Record<string, string>).message || '生成失败')
      }
    },
    onComplete,
    onError,
  })
}

export function assistRewrite(
  params: Record<string, unknown>,
  onEvent: SSEOnEvent,
  onComplete: SSEOnComplete,
  onError: SSEOnError
): SSEClientResult {
  return createSSEClient('/assist/rewrite', params, {
    timeout: 120000,
    timeoutMsg: '请求超时',
    onEvent(event, data) {
      if (event === 'content') {
        onEvent('content', data)
      } else if (event === 'complete') {
        onComplete()
      } else if (event === 'error') {
        onError((data as Record<string, string>).message || '生成失败')
      }
    },
    onComplete,
    onError,
  })
}

export async function assistContinueDemo(
  _params: Record<string, unknown>,
  onEvent: SSEOnEvent,
  onComplete: SSEOnComplete,
  _onError: SSEOnError
): Promise<{ controller: null }> {
  const samples = [
    '她推开门，刺眼的光线让陈默下意识地眯起了眼睛。\n\n等适应了光线，他才发现自己站在一条陌生的大街上。',
    '周围的行人来来往往，没有人注意到他的出现。\n\n陈默深吸一口气，决定先弄清楚自己在哪里。',
    '他掏出手机——没有信号。地图也无法加载。\n\n但就在这时，他的邮箱又响了。',
  ]
  for (const chunk of samples) {
    await new Promise(r => setTimeout(r, 200))
    onEvent('content', { text: chunk + '\n\n' })
  }
  onComplete()
  return { controller: null }
}

export async function assistRewriteDemo(
  _params: Record<string, unknown>,
  onEvent: SSEOnEvent,
  onComplete: SSEOnComplete,
  _onError: SSEOnError
): Promise<{ controller: null }> {
  const sample = '（按指令改写后的版本）天光刺破雾霭，陈默推开那扇沉重的门。街道上人影绰绰，却无人留意他的出现——仿佛他从未存在过。\n\n寂静的电话，空白的导航。只有邮箱里那封神秘邮件，还在闪烁。'
  for (const ch of sample.split('')) {
    await new Promise(r => setTimeout(r, 15))
    onEvent('content', { text: ch })
  }
  onComplete()
  return { controller: null }
}

// ─── F11: AI 配图 ───

interface IllustrationResult {
  chapter_index: number
  prompt: string
  url: string
  generated_at: string
}

export async function generateIllustration(
  novelId: number | string,
  chapterIndex: number,
  style = '写实插画'
): Promise<IllustrationResult> {
  if (isGitHubPages() || novelId === 0 || novelId === '0') {
    const prompts = [
      'A programmer working late at night in a dimly lit office, cinematic lighting',
      'A futuristic cityscape with neon lights and flying vehicles, cyberpunk style',
      'A mysterious figure standing in a rain-slicked street under a single streetlamp',
      'Two people facing each other across a table in a tense conversation',
    ]
    await new Promise(r => setTimeout(r, 800))
    return {
      chapter_index: chapterIndex,
      prompt: prompts[chapterIndex % prompts.length],
      url: `https://image.pollinations.ai/prompt/${encodeURIComponent(prompts[chapterIndex % prompts.length])}`,
      generated_at: new Date().toISOString(),
    }
  }
  const res = await fetch(`${API_BASE}/illustrations/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ novel_id: novelId, chapter_index: chapterIndex, style }),
  })
  if (!res.ok) {
    const err: Record<string, string> = await res.json().catch(() => ({}))
    throw new Error(err.detail || '配图生成失败')
  }
  return res.json()
}

export async function fetchIllustrations(novelId: number | string): Promise<unknown> {
  if (isGitHubPages() || novelId === 0 || novelId === '0') {
    return SAMPLE_NOVEL.illustrations || []
  }
  const res = await fetch(`${API_BASE}/illustrations/${novelId}`)
  if (!res.ok) throw new Error('获取配图列表失败')
  return res.json()
}

export async function deleteIllustration(novelId: number | string, chapterIndex: number): Promise<{ ok: boolean } | { [key: string]: unknown }> {
  if (isGitHubPages() || novelId === 0 || novelId === '0') return { ok: true }
  const res = await fetch(`${API_BASE}/illustrations/${novelId}/${chapterIndex}`, { method: 'DELETE' })
  if (!res.ok) throw new Error('删除配图失败')
  return res.json()
}

// ─── F13: 统计分析 ───

export async function analyzeNovel(novelId: number | string): Promise<AnalysisResult> {
  if (isGitHubPages() || novelId === 0 || novelId === '0') {
    return {
      word_frequency: [
        { word: '陈默', count: 18 }, { word: '邮件', count: 12 }, { word: '屏幕', count: 9 },
        { word: '未来', count: 8 }, { word: '代码', count: 7 }, { word: '眼睛', count: 6 },
        { word: '办公室', count: 5 }, { word: '时间', count: 5 }, { word: '手机', count: 4 },
        { word: '咖啡', count: 4 },
      ],
      char_appearances: [
        { name: '陈默', per_chapter: [5, 3, 4, 6], total: 18 },
      ],
      basic_stats: { total_words: 3215, chapter_count: 4, chapter_word_counts: [850, 780, 920, 665], reading_time_min: 8, chapter_titles: ['第一章 深夜邮件', '第二章 穿越时空的代码', '第三章 未来的警告', '第四章 交叉路口'] },
      emotion_curve: [
        { chapter: 1, phase: '起', emotion: '好奇', intensity: 2, label: '深夜收到神秘邮件' },
        { chapter: 2, phase: '起', emotion: '温暖', intensity: 3, label: '发现代码能改变现实' },
        { chapter: 3, phase: '承', emotion: '期待', intensity: 4, label: '探索能力边界' },
        { chapter: 4, phase: '转', emotion: '紧张', intensity: 5, label: '未来警告降临' },
      ],
    }
  }
  const res = await fetch(`${API_BASE}/analysis/${novelId}`, { method: 'POST' })
  if (!res.ok) throw new Error('分析失败')
  return res.json()
}

// ─── F12: TTS 语音合成 ───

interface TTSVoice {
  name: string
  id: string
}

export async function fetchTTSVoices(): Promise<TTSVoice[]> {
  if (isGitHubPages()) {
    return [
      { name: '晓晓 (女声 亲切)', id: 'zh-CN-XiaoxiaoNeural' },
      { name: '云希 (男声 阳光)', id: 'zh-CN-YunxiNeural' },
    ]
  }
  try {
    const res = await fetch(`${API_BASE}/tts/voices`)
    if (!res.ok) return []
    return res.json()
  } catch { return [] }
}

interface TTSGenerateResult {
  chapter_index: number
  audio_path: string | null
  duration_sec: number
}

export async function generateTTS(
  novelId: number | string,
  chapterIndex: number,
  voiceId = 'zh-CN-XiaoxiaoNeural',
  rate = '+0%',
  pitch = '+0Hz'
): Promise<TTSGenerateResult> {
  if (isGitHubPages() || novelId === 0 || novelId === '0') {
    return { chapter_index: chapterIndex, audio_path: null, duration_sec: 0 }
  }
  const res = await fetch(`${API_BASE}/tts/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ novel_id: novelId, chapter_index: chapterIndex, voice_id: voiceId, rate, pitch }),
  })
  if (!res.ok) {
    const err: Record<string, string> = await res.json().catch(() => ({}))
    throw new Error(err.detail || 'TTS 生成失败')
  }
  return res.json()
}

export async function generateAllTTS(
  novelId: number | string,
  voiceId = 'zh-CN-XiaoxiaoNeural',
  rate = '+0%',
  pitch = '+0Hz'
): Promise<{ novel_id: number | string; generated: number; chapters: unknown[]; [key: string]: unknown }> {
  if (isGitHubPages() || novelId === 0 || novelId === '0') {
    return { novel_id: novelId, generated: 0, chapters: [] }
  }
  const res = await fetch(`${API_BASE}/tts/generate_all`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ novel_id: novelId, voice_id: voiceId, rate, pitch }),
  })
  if (!res.ok) {
    const err: Record<string, string> = await res.json().catch(() => ({}))
    throw new Error(err.detail || 'TTS 批量生成失败')
  }
  return res.json()
}

export function getTTSAudioUrl(novelId: number | string, chapterIndex: number): string | null {
  if (isGitHubPages()) return null
  return `${API_BASE}/tts/audio/${novelId}/${chapterIndex}`
}

export async function fetchTTSStatus(novelId: number | string): Promise<TTSStatusResult> {
  if (isGitHubPages() || novelId === 0 || novelId === '0') {
    return { novel_id: novelId, total_chapters: 0, chapters: [] }
  }
  try {
    const res = await fetch(`${API_BASE}/tts/status/${novelId}`)
    if (!res.ok) return { novel_id: novelId, total_chapters: 0, chapters: [] }
    return res.json()
  } catch { return { novel_id: novelId, total_chapters: 0, chapters: [] } }
}

export async function deleteTTSAudio(novelId: number | string, chapterIndex: number): Promise<{ ok: boolean } | { [key: string]: unknown }> {
  if (isGitHubPages() || novelId === 0 || novelId === '0') return { ok: true }
  const res = await fetch(`${API_BASE}/tts/${novelId}/${chapterIndex}`, { method: 'DELETE' })
  if (!res.ok) throw new Error('删除 TTS 音频失败')
  return res.json()
}

// ─── F3: 金句管理 ───

export async function fetchQuotes(novelId: number | string): Promise<{ novel_id: number | string; novel_title?: string; stats?: Record<string, unknown>; chapters?: unknown[]; [key: string]: unknown }> {
  if (isGitHubPages() || novelId === 0 || novelId === '0') {
    return {
      novel_id: novelId,
      novel_title: '示例小说',
      stats: { total_quotes: 6, chapters_with_quotes: 3, total_chapters: 4, coverage: '3/4' },
      chapters: [
        {
          chapter_index: 0, chapter_title: '第一章 深夜邮件',
          quotes: [
            { id: 0, text: '每一个深夜敲下的代码，都是写给未来的情书。' },
            { id: 1, text: '时间不会倒流，但代码可以重写。' },
          ],
        },
        {
          chapter_index: 1, chapter_title: '第二章 穿越时空的代码',
          quotes: [
            { id: 2, text: '当过去成为变量，未来便是可执行的函数。' },
            { id: 3, text: '人生最难得的不是遇见奇迹，而是相信奇迹。' },
          ],
        },
        {
          chapter_index: 2, chapter_title: '第三章 未来的警告',
          quotes: [
            { id: 4, text: '最危险的不是未知，而是已知却被忽略的真相。' },
          ],
        },
        {
          chapter_index: 3, chapter_title: '第四章 交叉路口',
          quotes: [
            { id: 5, text: '每一个选择都是一条分支，而你我皆是代码的执行者。' },
          ],
        },
      ],
    }
  }
  const res = await fetch(`${API_BASE}/quotes/${novelId}`)
  if (!res.ok) throw new Error('获取金句失败')
  return res.json()
}

// ─── Demo 模式 ───

export async function generateOpeningsDemo(
  _params: Record<string, unknown>,
  onEvent: SSEOnEvent,
  onComplete: SSEOnComplete,
  onError: SSEOnError
): Promise<{ controller: null }> {
  try {
    for await (const chunk of mockGenerateOpenings()) {
      onEvent(chunk.event, chunk.data)
    }
    onComplete()
  } catch (err) { onError(err instanceof Error ? err.message : 'Demo 生成开头失败') }
  return { controller: null }
}

export async function generateNovelDemo(
  _params: Record<string, unknown>,
  onEvent: SSEOnEvent,
  onComplete: SSEOnComplete,
  onError: SSEOnError
): Promise<{ controller: null }> {
  try {
    for await (const chunk of mockGenerateStream()) {
      onEvent(chunk.event, chunk.data)
    }
    onComplete()
  } catch (err) { onError(err instanceof Error ? err.message : 'Demo 生成失败') }
  return { controller: null }
}

// ─── 类型定义 ───

export interface NovelListItem {
  id: number
  title: string
  gender: string
  genre: string
  style: string
  word_count: number
  actual_count: number
  model_used: string
  created_at: string
  [key: string]: unknown
}

export interface NovelDetail {
  id: number
  title: string
  seed_text: string
  gender: string
  genre: string
  style: string
  word_count: number
  actual_count: number
  content: string
  chapters: string
  outline: string
  model_used: string
  model_config: string
  created_at: string
  theme?: string
  emotion_curve?: string
  aesthetic_intensity?: string
  interpretation?: string
  character_bible?: string
  illustrations?: string
  [key: string]: unknown
}

export interface RecordItem {
  id: number
  novel_id: number | null
  status: string
  completed_chapters: number
  total_chapters: number
  seed_text: string
  error_message: string | null
  created_at: string
  updated_at: string
  params?: Record<string, unknown>
  content_sofar?: string
  thinking_logs?: Array<{ time: string; type: string; text: string; step?: string }>
  outline_data?: Record<string, unknown>
  emotion_curve?: unknown[]
  [key: string]: unknown
}

export interface RecordsResponse {
  total: number
  page: number
  size: number
  items: RecordItem[]
}

export interface AnalysisResult {
  word_frequency?: Array<{ word: string; count: number }>
  char_appearances?: Array<{ name: string; per_chapter: number[]; total: number }>
  basic_stats?: Record<string, unknown>
  emotion_curve?: Array<{ chapter: number; phase?: string; emotion: string; intensity: number; label?: string }>
  [key: string]: unknown
}

export interface TTSStatusResult {
  novel_id: number | string
  total_chapters: number
  chapters: unknown[]
  [key: string]: unknown
}

export interface CleanupResult {
  status: string
  cleaned: {
    orphaned_records: number
    orphaned_novels: number
    failed_novels: number
  }
}

// ─── CRUD ───

export async function fetchNovels(page = 1, size = 10): Promise<{ total: number; page: number; size: number; items: NovelListItem[] }> {
  if (isGitHubPages()) {
    return { total: 1, page, size, items: page === 1 ? [{
      id: 0, title: SAMPLE_NOVEL.title, gender: '男频',
      genre: SAMPLE_NOVEL.genre, style: SAMPLE_NOVEL.style,
      word_count: SAMPLE_NOVEL.word_count, actual_count: SAMPLE_NOVEL.actual_count,
      model_used: SAMPLE_NOVEL.model_used, created_at: SAMPLE_NOVEL.created_at,
    }] : [] }
  }
  const res = await fetch(`${API_BASE}/novels?page=${page}&size=${size}`)
  if (!res.ok) throw new Error('获取列表失败')
  return res.json()
}

export async function fetchCompletedNovels(page = 1, size = 10): Promise<{ total: number; page: number; size: number; items: NovelListItem[] }> {
  if (isGitHubPages()) return { total: 1, page, size, items: [] }
  const res = await fetch(`${API_BASE}/novels?page=${page}&size=${size}&status=completed`)
  if (!res.ok) throw new Error('获取列表失败')
  return res.json()
}

export async function fetchNovel(id: number | string): Promise<NovelDetail> {
  if (isGitHubPages() || id === 0 || id === '0') return SAMPLE_NOVEL as unknown as NovelDetail
  const res = await fetch(`${API_BASE}/novels/${id}`)
  if (!res.ok) throw new Error('获取小说失败')
  return res.json()
}

export async function deleteNovel(id: number | string): Promise<void> {
  if (isGitHubPages() || id === 0 || id === '0') return
  const res = await fetch(`${API_BASE}/novels/${id}`, { method: 'DELETE' })
  if (!res.ok) throw new Error('删除失败')
}

export async function updateBible(id: number | string, bible: Record<string, unknown>): Promise<void> {
  if (isGitHubPages() || id === 0 || id === '0') return
  const res = await fetch(`${API_BASE}/novels/${id}/bible`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ bible }),
  })
  if (!res.ok) throw new Error('保存设定档案失败')
}

export async function updateEmotionCurve(id: number | string, curve: Record<string, unknown>): Promise<void> {
  if (isGitHubPages() || id === 0 || id === '0') return
  const res = await fetch(`${API_BASE}/novels/${id}/emotion-curve`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ emotion_curve: curve }),
  })
  if (!res.ok) throw new Error('保存情感曲线失败')
}

export async function insertParagraph(
  novelId: number | string,
  chapterIndex: number,
  paragraphIndex: number,
  content: string
): Promise<{ status?: string; ok?: boolean; [key: string]: unknown }> {
  const res = await fetch(`${API_BASE}/paragraphs/insert`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ novel_id: novelId, chapter_index: chapterIndex, paragraph_index: paragraphIndex, content }),
  })
  if (!res.ok) throw new Error('插入段落失败')
  return res.json()
}

export function getExportUrl(id: number | string, format: string): string {
  if (isGitHubPages() || id === 0 || id === '0') return '#'
  return `${API_BASE}/novels/${id}/export?format=${format}`
}

export function getChapterExportUrl(id: number | string): string { return `${API_BASE}/novels/${id}/export/chapters` }
export function getOutlineExportUrl(id: number | string): string { return `${API_BASE}/novels/${id}/export/outline?format=markdown` }
export function getOutlineXmindUrl(id: number | string): string { return `${API_BASE}/novels/${id}/export/outline?format=xmind` }
export function getPackageExportUrl(id: number | string): string { return `${API_BASE}/novels/${id}/export/package` }

// ─── 模型配置持久化 ───

export async function fetchModelConfig(): Promise<{ provider?: string; label?: string; base_url?: string; model_id?: string; api_key?: string; [key: string]: unknown } | null> {
  if (isGitHubPages()) return null
  try {
    const res = await fetch(`${API_BASE}/model-config`)
    if (!res.ok) return null
    return res.json()
  } catch { return null }
}

export async function saveModelConfig(config: Record<string, unknown>): Promise<void> {
  if (isGitHubPages()) return
  try {
    await fetch(`${API_BASE}/model-config`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config),
    })
  } catch {}
}

// ─── 生成记录 ───

export async function fetchRecords(page = 1, size = 20): Promise<RecordsResponse> {
  if (isGitHubPages()) return { total: 0, page, size, items: [] }
  const res = await fetch(`${API_BASE}/records?page=${page}&size=${size}`)
  if (!res.ok) throw new Error('获取记录列表失败')
  return res.json()
}

export async function fetchRecord(id: number | string): Promise<RecordItem | null> {
  if (isGitHubPages() || id === 0) return null
  const res = await fetch(`${API_BASE}/records/${id}`)
  if (!res.ok) throw new Error('获取记录失败')
  return res.json()
}

export async function deleteRecord(id: number | string): Promise<void> {
  if (isGitHubPages() || id === 0) return
  const res = await fetch(`${API_BASE}/records/${id}`, { method: 'DELETE' })
  if (!res.ok) throw new Error('删除失败')
}

export async function cancelRecord(id: number | string | null): Promise<void> {
  if (isGitHubPages() || !id) return
  try {
    await fetch(`${API_BASE}/records/${id}/cancel`, { method: 'POST' })
  } catch {}
}

export async function cleanupData(): Promise<CleanupResult | null> {
  if (isGitHubPages()) return null
  const res = await fetch(`${API_BASE}/cleanup`, { method: 'POST' })
  if (!res.ok) throw new Error('清理失败')
  return res.json()
}

// ── V3 新增：主题推荐 API ──

export async function suggestTheme(seedText: string, genre: string, style: string): Promise<{ theme: string; [key: string]: unknown }> {
  if (isGitHubPages()) {
    const THEMES = ['救赎', '成长', '选择', '正义', '爱情', '自由', '牺牲', '希望', '孤独']
    return { theme: THEMES[Math.floor(Math.random() * THEMES.length)] }
  }
  try {
    const res = await fetch(`${API_BASE}/theme/suggest`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ seed_text: seedText, genre, style }),
    })
    if (!res.ok) throw new Error('主题推荐失败')
    return res.json()
  } catch {
    return { theme: '' }
  }
}

// ── V3 保留：润色 API ──

// Demo 模式润色模拟
async function* mockRefineStream(action: string, originalContent: string): AsyncGenerator<SSEMessage> {
  const mockResults: Record<string, string> = {
    rewrite: `（重写版本）${originalContent.split('').reverse().join('')}`,
    expand: `（扩写版本）${originalContent}\n\n这是扩写后增加的细节描写，让内容更加丰富饱满。`,
    compress: `（精简版本）${originalContent.slice(0, Math.floor(originalContent.length * 0.6))}`,
  }

  const result = mockResults[action] || mockResults.rewrite
  const chunkSize = 10
  for (let i = 0; i < result.length; i += chunkSize) {
    await new Promise(resolve => setTimeout(resolve, 50))
    yield { event: 'content', data: { text: result.slice(i, i + chunkSize) } }
  }
  yield { event: 'complete', data: { version: 1, total_versions: 1 } }
}

interface RefineParams {
  action: string
  original_content: string
  [key: string]: unknown
}

interface ParagraphVersionResult {
  id: number
  action: string
  content: string
  version: number
  created_at: string
}

export async function refineParagraph(
  params: RefineParams,
  onEvent: SSEOnEvent,
  onComplete: (data?: unknown) => void,
  onError: (err: { message: string }) => void
): Promise<AbortController | { abort: () => void }> {
  if (isGitHubPages()) {
    try {
      for await (const chunk of mockRefineStream(params.action, params.original_content)) {
        if (chunk.event === 'content') {
          onEvent('refine_content', chunk.data)
        } else if (chunk.event === 'complete') {
          onComplete(chunk.data)
        }
      }
    } catch (err) {
      onError({ message: err instanceof Error ? err.message : 'Demo 润色失败' })
    }
    return { abort: () => {} }
  }

  const { controller } = createSSEClient('/refine', params as unknown as Record<string, unknown>, {
    timeout: 120000,
    timeoutMsg: '润色超时',
    onEvent(event, data) {
      if (event === 'content') {
        onEvent('refine_content', data)
      } else if (event === 'complete') {
        onComplete(data)
      } else if (event === 'error') {
        onError(data as { message: string })
      }
    },
    onComplete() {}, // complete data already sent via 'complete' event
    onError(msg) {
      onError({ message: msg })
    },
  })

  return controller
}

export async function fetchParagraphVersions(
  novelId: number | string,
  chapterIndex: number,
  paragraphIndex: number
): Promise<{ versions: ParagraphVersionResult[] }> {
  if (isGitHubPages()) {
    return {
      versions: [
        {
          id: 1,
          action: 'rewrite',
          content: '这是模拟的润色版本内容。',
          version: 1,
          created_at: new Date().toISOString(),
        }
      ]
    }
  }
  const res = await fetch(
    `${API_BASE}/refine/versions?novel_id=${novelId}&chapter_index=${chapterIndex}&paragraph_index=${paragraphIndex}`
  )
  if (!res.ok) throw new Error('获取版本历史失败')
  return res.json()
}
