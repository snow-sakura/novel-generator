import { create } from 'zustand'
import { isGitHubPages } from '../services/api'

export const STEPS = {
  IDLE: 'idle', PARSING: 'parsing', OUTLINING: 'outlining',
  WRITING: 'writing', TITLING: 'titling', DONE: 'done', ERROR: 'error',
} as const

export type StepKey = typeof STEPS[keyof typeof STEPS]

export const STEP_LABELS: Record<StepKey, string> = {
  idle: '等待开始', parsing: '要素解析', outlining: '大纲规划',
  writing: '逐章生成', titling: '生成标题', done: '已完成', error: '出错',
}

export const STEP_CONFIG: { key: StepKey; label: string; desc: string }[] = [
  { key: STEPS.PARSING, label: '要素解析', desc: '分析故事六要素' },
  { key: STEPS.OUTLINING, label: '大纲规划', desc: '构建章节结构' },
  { key: STEPS.WRITING, label: '逐章生成', desc: '创作小说正文' },
  { key: STEPS.TITLING, label: '生成标题', desc: '拟定小说标题' },
]

interface WordCountParams {
  word_count: number
  per_chapter_min: number
  per_chapter_max: number
}

interface ChapterCountParams {
  chapter_count: number
  per_chapter_min: number
  per_chapter_max: number
}

export function calcChapterCount({ word_count, per_chapter_min, per_chapter_max }: WordCountParams): number {
  const avg = (per_chapter_min + per_chapter_max) / 2
  return Math.max(1, Math.round(word_count / avg))
}

export function calcWordCount({ chapter_count, per_chapter_min, per_chapter_max }: ChapterCountParams): number {
  const avg = (per_chapter_min + per_chapter_max) / 2
  return Math.round(chapter_count * avg)
}

export const LENGTH_RANGES: Record<string, { label: string; min: number; max: number }> = {
  short: { label: '短篇', min: 800, max: 1500 },
  medium: { label: '中篇', min: 2000, max: 2500 },
  long: { label: '长篇', min: 2000, max: 2500 },
}

interface NovelParams {
  seed_text: string
  gender: string
  genre: string
  style: string
  selectedStyles: string[]
  styles: string
  novel_length: string
  word_count: number
  chapter_count: number
  per_chapter_min: number
  per_chapter_max: number
  custom_prompts: Record<string, string> | null
  pov: string
  pacing: string
  style_intensity: string
  enable_suspense: boolean
  enable_twist: boolean
  theme: string
  aesthetic_intensity: string
  [key: string]: unknown
}

const DEFAULT_PARAMS: NovelParams = {
  seed_text: '',
  gender: '男频',
  genre: '都市脑洞',
  style: '轻松搞笑',
  selectedStyles: ['轻松搞笑'],
  styles: '轻松搞笑',
  novel_length: 'short',
  word_count: 3000,
  chapter_count: 2,
  per_chapter_min: 800,
  per_chapter_max: 1500,
  custom_prompts: null,
  pov: '第三人称有限',
  pacing: '标准型',
  style_intensity: '中度',
  enable_suspense: true,
  enable_twist: true,
  theme: '',
  aesthetic_intensity: '中度',
}

const DEFAULT_CUSTOM_PROMPTS: Record<string, string> = {
  parse: '', outline: '', chapter: '', title: '',
}

export interface ModelConfigData {
  provider?: string
  model?: string
  api_key?: string
  base_url?: string
  [key: string]: unknown
}

interface NovelStoreState {
  generating: boolean
  connecting: boolean
  currentStep: StepKey
  currentContent: string
  currentTitle: string
  chapters: { title: string; index: number }[]
  chapterTexts: string[]
  eventLog: unknown[]
  thinkingLogs: unknown[]
  outlineThinking: unknown[]
  outlineTree: unknown
  emotionCurve: unknown
  errorMessage: string

  configChecked: boolean
  configOk: boolean
  configInfo: Record<string, unknown>

  demoMode: boolean
  params: NovelParams

  customModel: ModelConfigData | null
  defaultApiKey: string
  customPrompts: Record<string, string>

  abortController: AbortController | null
  currentRecordId: string | number | null
  continueRecordId: string | number | null
  generationNovelId: number | null

  setParams: (updates: Partial<NovelParams>) => void
  resetParams: () => void
  setCustomModel: (config: ModelConfigData | null) => void
  setDefaultApiKey: (key: string) => void
  setCustomPrompts: (updates: Record<string, string>) => void
  resetCustomPrompts: () => void
  setConfigStatus: (checked: boolean, ok: boolean, info: Record<string, unknown>) => void
  setDemoMode: (val: boolean) => void
  setAbortController: (ctrl: AbortController | null) => void
  setConnecting: (val: boolean) => void
  startGeneration: () => void
  setStep: (step: StepKey) => void
  appendContent: (text: string) => void
  addChapter: (chapter: { title: string; index: number }) => void
  appendChapterText: (text: string) => void
  setTitle: (title: string) => void
  addEvent: (event: unknown) => void
  addThinkingLog: (log: unknown) => void
  addOutlineThinking: (item: unknown) => void
  setOutlineTree: (tree: unknown) => void
  setEmotionCurve: (data: unknown) => void
  setCurrentRecordId: (id: string | number | null) => void
  setContinueRecordId: (id: string | number | null) => void
  setGenerationNovelId: (id: number | null) => void
  setError: (msg: string) => void
  finishGeneration: () => void
  reset: () => void
}

export const useNovelStore = create<NovelStoreState>((set) => ({
  generating: false,
  connecting: false,
  currentStep: STEPS.IDLE,
  currentContent: '',
  currentTitle: '',
  chapters: [],
  chapterTexts: [],
  eventLog: [],
  thinkingLogs: [],
  outlineThinking: [],
  outlineTree: null,
  emotionCurve: null,
  errorMessage: '',

  configChecked: false,
  configOk: false,
  configInfo: { provider: '', model: '', error: '' },

  demoMode: isGitHubPages(),
  params: { ...DEFAULT_PARAMS },

  customModel: null,
  defaultApiKey: '',
  customPrompts: { ...DEFAULT_CUSTOM_PROMPTS },

  abortController: null,
  currentRecordId: null,
  continueRecordId: null,
  generationNovelId: null,

  setParams: (updates) =>
    set((state) => ({ params: { ...state.params, ...updates } })),

  resetParams: () => set({ params: { ...DEFAULT_PARAMS }, customPrompts: { ...DEFAULT_CUSTOM_PROMPTS } }),

  setCustomModel: (config) => set({ customModel: config }),
  setDefaultApiKey: (key) => set({ defaultApiKey: key }),
  setCustomPrompts: (updates) =>
    set((state) => ({ customPrompts: { ...state.customPrompts, ...updates } })),
  resetCustomPrompts: () => set({ customPrompts: { ...DEFAULT_CUSTOM_PROMPTS } }),

  setConfigStatus: (checked, ok, info) =>
    set({ configChecked: checked, configOk: ok, configInfo: info }),
  setDemoMode: (val) => set({ demoMode: val }),

  setAbortController: (ctrl) => set({ abortController: ctrl }),
  setConnecting: (val) => set({ connecting: val }),

  startGeneration: () =>
    set({
      generating: true, currentStep: STEPS.PARSING, currentContent: '',
      currentTitle: '', chapters: [], chapterTexts: [],
      eventLog: [], thinkingLogs: [], outlineThinking: [],
      errorMessage: '', generationNovelId: null,
    }),

  setStep: (step) => set({ currentStep: step }),
  appendContent: (text) =>
    set((state) => ({ currentContent: state.currentContent + text })),
  addChapter: (chapter) =>
    set((state) => ({
      chapters: [...state.chapters, chapter],
      chapterTexts: [...state.chapterTexts, ''],
    })),
  appendChapterText: (text) =>
    set((state) => {
      if (state.chapterTexts.length === 0) return {}
      const texts = [...state.chapterTexts]
      texts[texts.length - 1] += text
      return { chapterTexts: texts, currentContent: state.currentContent + text }
    }),
  setTitle: (title) => set({ currentTitle: title }),
  addEvent: (event) =>
    set((state) => ({ eventLog: [...state.eventLog, event] })),
  addThinkingLog: (log) =>
    set((state) => ({ thinkingLogs: [...state.thinkingLogs, log] })),
  addOutlineThinking: (item) =>
    set((state) => ({ outlineThinking: [...state.outlineThinking, item] })),
  setOutlineTree: (tree) => set({ outlineTree: tree }),
  setEmotionCurve: (data) => set({ emotionCurve: data }),

  setCurrentRecordId: (id) => set({ currentRecordId: id }),
  setContinueRecordId: (id) => set({ continueRecordId: id }),
  setGenerationNovelId: (id) => set({ generationNovelId: id }),

  setError: (msg) =>
    set({ generating: false, currentStep: STEPS.ERROR, errorMessage: msg }),

  finishGeneration: () => set({ generating: false, currentStep: STEPS.DONE }),

  reset: () =>
    set({
      generating: false, currentStep: STEPS.IDLE, currentContent: '',
      currentTitle: '', chapters: [], chapterTexts: [],
      eventLog: [], thinkingLogs: [], outlineThinking: [],
      errorMessage: '', emotionCurve: null, currentRecordId: null, continueRecordId: null,
      generationNovelId: null, abortController: null,
    }),
}))

export function eventToStep(event: string): StepKey | null {
  switch (event) {
    case 'parse': case 'parse_done': return STEPS.PARSING
    case 'outline': case 'outline_done': case 'outline_thinking': return STEPS.OUTLINING
    case 'chapter_start': case 'chapter_end': case 'content': return STEPS.WRITING
    case 'title': return STEPS.TITLING
    case 'complete': return STEPS.DONE
    case 'error': return STEPS.ERROR
    default: return null
  }
}
