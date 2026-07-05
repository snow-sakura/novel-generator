import { create } from 'zustand'
import { isGitHubPages } from '../services/api'

export const STEPS = {
  IDLE: 'idle', PARSING: 'parsing', OUTLINING: 'outlining',
  WRITING: 'writing', TITLING: 'titling', DONE: 'done', ERROR: 'error',
}

/** 根据 word_count / per_chapter_min/max 自动计算 chapter_count */
export function calcChapterCount({ word_count, per_chapter_min, per_chapter_max }) {
  const avg = (per_chapter_min + per_chapter_max) / 2
  return Math.max(1, Math.round(word_count / avg))
}

/** 根据 chapter_count / per_chapter_min/max 计算 word_count */
export function calcWordCount({ chapter_count, per_chapter_min, per_chapter_max }) {
  const avg = (per_chapter_min + per_chapter_max) / 2
  return Math.round(chapter_count * avg)
}

const DEFAULT_PARAMS = {
  seed_text: '',
  gender: '男频',
  genre: '都市脑洞',
  style: '轻松搞笑',
  word_count: 3000,
  chapter_count: 2,
  per_chapter_min: 800,
  per_chapter_max: 2500,
  custom_prompts: null, // { parse, outline, chapter, title } — 自定义覆盖
}

const DEFAULT_CUSTOM_PROMPTS = {
  parse: '',
  outline: '',
  chapter: '',
  title: '',
}

export const useNovelStore = create((set) => ({
  generating: false,
  currentStep: STEPS.IDLE,
  currentContent: '',
  currentTitle: '',
  chapters: [],
  eventLog: [],
  thinkingLogs: [],
  outlineThinking: [],
  errorMessage: '',

  configChecked: false,
  configOk: false,
  configInfo: { provider: '', model: '', error: '' },

  demoMode: isGitHubPages(),
  params: { ...DEFAULT_PARAMS },

  // 自定义模型配置（null = 使用 OpenCode 默认）
  customModel: null, // { provider, base_url, model, api_key }

  // 默认 OpenCode 的 API Key（UI 可见可编辑）
  defaultApiKey: '',

  // 自定义提示词（Tab B 编辑内容）
  customPrompts: { ...DEFAULT_CUSTOM_PROMPTS },

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

  startGeneration: () =>
    set({
      generating: true, currentStep: STEPS.PARSING, currentContent: '',
      currentTitle: '', chapters: [], eventLog: [], thinkingLogs: [],
      outlineThinking: [], errorMessage: '',
    }),

  setStep: (step) => set({ currentStep: step }),
  appendContent: (text) =>
    set((state) => ({ currentContent: state.currentContent + text })),
  addChapter: (chapter) =>
    set((state) => ({ chapters: [...state.chapters, chapter] })),
  setTitle: (title) => set({ currentTitle: title }),
  addEvent: (event) =>
    set((state) => ({ eventLog: [...state.eventLog, event] })),
  addThinkingLog: (log) =>
    set((state) => ({ thinkingLogs: [...state.thinkingLogs, log] })),
  addOutlineThinking: (item) =>
    set((state) => ({ outlineThinking: [...state.outlineThinking, item] })),

  // 生成记录
  currentRecordId: null,
  continueRecordId: null,

  setCurrentRecordId: (id) => set({ currentRecordId: id }),
  setContinueRecordId: (id) => set({ continueRecordId: id }),

  setError: (msg) =>
    set({ generating: false, currentStep: STEPS.ERROR, errorMessage: msg }),

  finishGeneration: () => set({ generating: false, currentStep: STEPS.DONE }),

  reset: () =>
    set({
      generating: false, currentStep: STEPS.IDLE, currentContent: '',
      currentTitle: '', chapters: [], eventLog: [], thinkingLogs: [],
      outlineThinking: [], errorMessage: '',
      currentRecordId: null, continueRecordId: null,
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
