import { create } from 'zustand'

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

interface ChatStoreState {
  messages: ChatMessage[]
  generating: boolean
  currentStep: string | null
  novelData: Record<string, unknown> | null
  currentRecordId: string | number | null
  abortController: AbortController | null

  addMessage: (msg: ChatMessage) => void
  updateLastMessage: (content: string) => void
  setGenerating: (val: boolean) => void
  setCurrentStep: (step: string | null) => void
  setNovelData: (data: Record<string, unknown> | null) => void
  updateNovelData: (updates: Record<string, unknown>) => void
  setCurrentRecordId: (id: string | number | null) => void
  setAbortController: (ctrl: AbortController | null) => void
  reset: () => void
}

const INITIAL_MESSAGE: ChatMessage = {
  role: 'assistant',
  content: '你好！我是番茄小说生成助手。告诉我你想要的故事灵感，我会为你自动生成一部完整的小说。\n\n比如：*「一个外卖员在送餐途中意外获得了一本会发光的古书」*',
}

export const useChatStore = create<ChatStoreState>((set) => ({
  messages: [INITIAL_MESSAGE],
  generating: false,
  currentStep: null,
  novelData: null,
  currentRecordId: null,
  abortController: null,

  addMessage: (msg) =>
    set((state) => ({ messages: [...state.messages, msg] })),
  updateLastMessage: (content) =>
    set((state) => {
      const msgs = [...state.messages]
      if (msgs.length > 0) {
        msgs[msgs.length - 1] = { ...msgs[msgs.length - 1], content }
      }
      return { messages: msgs }
    }),
  setGenerating: (val) => set({ generating: val }),
  setCurrentStep: (step) => set({ currentStep: step }),
  setNovelData: (data) => set({ novelData: data }),
  updateNovelData: (updates) =>
    set((state) => ({ novelData: { ...(state.novelData || {}), ...updates } })),
  setCurrentRecordId: (id) => set({ currentRecordId: id }),
  setAbortController: (ctrl) => set({ abortController: ctrl }),

  reset: () =>
    set({
      messages: [INITIAL_MESSAGE], generating: false,
      currentStep: null, novelData: null,
      currentRecordId: null, abortController: null,
    }),
}))
