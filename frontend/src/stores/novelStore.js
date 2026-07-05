import { create } from 'zustand'
import { isGitHubPages } from '../services/api'

/** 生成步骤枚举 */
export const STEPS = {
  IDLE: 'idle',
  PARSING: 'parsing',
  OUTLINING: 'outlining',
  WRITING: 'writing',
  TITLING: 'titling',
  DONE: 'done',
  ERROR: 'error',
}

const STEP_ORDER = [STEPS.PARSING, STEPS.OUTLINING, STEPS.WRITING, STEPS.TITLING]

/** 全局小说状态 */
export const useNovelStore = create((set) => ({
  // 生成状态
  generating: false,
  currentStep: STEPS.IDLE,
  currentContent: '',
  currentTitle: '',
  chapters: [],
  eventLog: [],
  thinkingLogs: [],
  errorMessage: '',

  // 配置检查
  configChecked: false,
  configOk: false,
  configInfo: { provider: '', model: '', error: '' },

  // Demo 模式
  demoMode: isGitHubPages(),

  // 参数
  params: {
    seed_text: '',
    genre: '玄幻',
    style: '简洁直白',
    word_count: 3000,
  },

  // 操作
  setParams: (updates) =>
    set((state) => ({ params: { ...state.params, ...updates } })),

  setConfigStatus: (checked, ok, info) =>
    set({ configChecked: checked, configOk: ok, configInfo: info }),

  setDemoMode: (val) => set({ demoMode: val }),

  startGeneration: () =>
    set({
      generating: true,
      currentStep: STEPS.PARSING,
      currentContent: '',
      currentTitle: '',
      chapters: [],
      eventLog: [],
      thinkingLogs: [],
      errorMessage: '',
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

  setError: (msg) =>
    set({
      generating: false,
      currentStep: STEPS.ERROR,
      errorMessage: msg,
    }),

  finishGeneration: () =>
    set({ generating: false, currentStep: STEPS.DONE }),

  reset: () =>
    set({
      generating: false,
      currentStep: STEPS.IDLE,
      currentContent: '',
      currentTitle: '',
      chapters: [],
      eventLog: [],
      thinkingLogs: [],
      errorMessage: '',
    }),
}))

/** 根据 event 名称映射步骤 */
export function eventToStep(event) {
  switch (event) {
    case 'parse':
    case 'parse_done':
      return STEPS.PARSING
    case 'outline':
    case 'outline_done':
      return STEPS.OUTLINING
    case 'chapter_start':
    case 'chapter_end':
    case 'content':
      return STEPS.WRITING
    case 'title':
      return STEPS.TITLING
    case 'complete':
      return STEPS.DONE
    case 'error':
      return STEPS.ERROR
    default:
      return null
  }
}
