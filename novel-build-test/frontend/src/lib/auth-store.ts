import { create } from 'zustand'
import { TOKEN_KEY, REFRESH_TOKEN_KEY } from './constants'

/** 用户信息接口 */
interface User {
  id: number
  username: string
  display_name: string
  role: string
}

/** 认证状态接口 */
interface AuthState {
  token: string | null
  refreshToken: string | null
  user: User | null
  isAuthenticated: boolean
  /** 设置认证信息（登录成功后调用） */
  setAuth: (token: string, refreshToken: string, user: User) => void
  /** 退出登录 */
  logout: () => void
  /** 从本地存储加载 Token */
  loadFromStorage: () => void
}

/**
 * 认证状态管理
 * 使用 Zustand 管理全局认证状态，Token 同时持久化到 localStorage
 */
export const useAuthStore = create<AuthState>((set) => ({
  token: null,
  refreshToken: null,
  user: null,
  isAuthenticated: false,

  setAuth: (token, refreshToken, user) => {
    localStorage.setItem(TOKEN_KEY, token)
    localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken)
    set({ token, refreshToken, user, isAuthenticated: true })
  },

  logout: () => {
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(REFRESH_TOKEN_KEY)
    set({ token: null, refreshToken: null, user: null, isAuthenticated: false })
  },

  loadFromStorage: () => {
    const token = localStorage.getItem(TOKEN_KEY)
    if (token) {
      set({ token, isAuthenticated: true })
    }
  },
}))
