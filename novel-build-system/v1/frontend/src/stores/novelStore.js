import { create } from 'zustand'
import { isGitHubPages } from '../services/api'

export const STEPS = {
  IDLE: 'idle', PARSING: 'parsing', OUTLINING: 'outlining',
  WRITING: 'writing', TITLING: 'titling', DONE: 'done', ERROR: 'error',
}

export const STEP_LABELS = {
  idle: '等待开始', parsing: '要素解析', outlining: '大纲规划',
  writing: '逐章生成', titling: '生成标题', done: '已完成', error: '出错',
}

export const STEP_CONFIG = [
  { key: STEPS.PARSING, label: '要素解析', desc: '分析故事六要素' },
  { key: STEPS.OUTLINING, label: '大纲规划', desc: '构建章节结构' },
  { key: STEPS.WRITING, label: '逐章生成', desc: '创作小说正文' },
  { key: STEPS.TITLING, label: '生成标题', desc: '拟定小说标题' },
]

export function calcChapterCount({ word_count, per_chapter_min, per_chapter_max }) {
  const avg = (per_chapter_min + per_chapter_max) / 2
  return Math.max(1, Math.round(word_count / avg))
}

export function calcWordCount({ chapter_count, per_chapter_min, per_chapter_max }) {
  const avg = (per_chapter_min + per_chapter_max) / 2
  return Math.round(chapter_count * avg)
}

const DEFAULT_PARAMS = {
  seed_text: '',
  gender: '男频',
  genre: '都市脑洞',
  style: '轻松搞笑',
  selectedStyles: ['轻松搞笑'],
  styles: '轻松搞笑',
  word_count: 3000,
  chapter_count: 2,
  per_chapter_min: 800,
  per_chapter_max: 2500,
  custom_prompts: null,
}

const DEFAULT_CUSTOM_PROMPTS = {
  parse: '', outline: '', chapter: '', title: '',
}

export const useNovelStore = create((set) => ({
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
  errorMessage: '',

  configChecked: false,
  configOk: false,
  configInfo: { provider: '', model: '', error: '' },

  demoMode: isGitHubPages(),
  params: { ...DEFAULT_PARAMS },

  customModel: null,
  defaultApiKey: '',
  customPrompts: { ...DEFAULT_CUSTOM_PROMPTS },

  // 用于停止生成
  abortController: null,

  // 生成记录
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

  // YYY 停止生成
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
      errorMessage: '', currentRecordId: null, continueRecordId: null,
      generationNovelId: null, abortController: null,
    }),
}))

export function eventToStep(event) {
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
