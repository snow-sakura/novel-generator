import { create } from 'zustand'

const INITIAL_MESSAGE = {
  role: 'assistant',
  content: '你好！我是番茄小说生成助手。告诉我你想要的故事灵感，我会为你自动生成一部完整的小说。\n\n比如：*「一个外卖员在送餐途中意外获得了一本会发光的古书」*',
}

export const useChatStore = create((set) => ({
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
  updateLastMessageFull: (updates) =>
    set((state) => {
      const msgs = [...state.messages]
      if (msgs.length > 0) {
        msgs[msgs.length - 1] = { ...msgs[msgs.length - 1], ...updates }
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
