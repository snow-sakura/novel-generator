import { create } from 'zustand'
import { isGitHubPages } from '../services/api'

export const STEPS = {
  IDLE: 'idle', PARSING: 'parsing', OUTLINING: 'outlining',
  WRITING: 'writing', TITLING: 'titling', DONE: 'done', ERROR: 'error',
}

const DEFAULT_PARAMS = {
  seed_text: '',
  gender: '男频',
  genre: '都市脑洞',
  style: '轻松搞笑',
  word_count: 3000,
  per_chapter_min: 800,
  per_chapter_max: 2500,
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

  // 自定义模型配置
  customModel: null, // { provider, base_url, model, api_key }

  setParams: (updates) =>
    set((state) => ({ params: { ...state.params, ...updates } })),

  resetParams: () => set({ params: { ...DEFAULT_PARAMS } }),

  setCustomModel: (config) => set({ customModel: config }),

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

  setError: (msg) =>
    set({ generating: false, currentStep: STEPS.ERROR, errorMessage: msg }),

  finishGeneration: () => set({ generating: false, currentStep: STEPS.DONE }),

  reset: () =>
    set({
      generating: false, currentStep: STEPS.IDLE, currentContent: '',
      currentTitle: '', chapters: [], eventLog: [], thinkingLogs: [],
      outlineThinking: [], errorMessage: '',
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
