import axios, {
  type AxiosError,
  type InternalAxiosRequestConfig,
} from 'axios'
import {
  API_BASE_URL,
  TOKEN_KEY,
  REFRESH_TOKEN_KEY,
} from './constants'

/** 创建 Axios 实例，设置基础 URL 和超时时间 */
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30_000,
  headers: { 'Content-Type': 'application/json' },
})

/* ── 请求拦截器：自动附加 JWT ── */
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = localStorage.getItem(TOKEN_KEY)
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error: AxiosError) => Promise.reject(error),
)

/* ── 响应拦截器：401 时自动刷新 Token ── */
let isRefreshing = false
let pendingQueue: Array<{
  resolve: (token: string) => void
  reject: (err: unknown) => void
}> = []

/** 用刷新 Token 换取新 Token */
async function refreshToken(): Promise<string> {
  const refresh = localStorage.getItem(REFRESH_TOKEN_KEY)
  if (!refresh) throw new Error('无刷新令牌')

  const res = await axios.post(`${API_BASE_URL}/auth/refresh`, {
    refresh_token: refresh,
  })
  const { access_token, refresh_token: newRefresh } = res.data

  localStorage.setItem(TOKEN_KEY, access_token)
  if (newRefresh) localStorage.setItem(REFRESH_TOKEN_KEY, newRefresh)

  return access_token
}

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & {
      _retry?: boolean
    }

    // 非 401 或已重试过，直接拒绝
    if (error.response?.status !== 401 || originalRequest._retry) {
      return Promise.reject(error)
    }

    // 正在刷新中，将后续请求排队
    if (isRefreshing) {
      return new Promise<string>((resolve, reject) => {
        pendingQueue.push({ resolve, reject })
      }).then((token) => {
        if (originalRequest.headers) {
          originalRequest.headers.Authorization = `Bearer ${token}`
        }
        return apiClient(originalRequest)
      })
    }

    originalRequest._retry = true
    isRefreshing = true

    try {
      const newToken = await refreshToken()

      // 处理排队中的请求
      for (const item of pendingQueue) {
        item.resolve(newToken)
      }
      pendingQueue = []

      if (originalRequest.headers) {
        originalRequest.headers.Authorization = `Bearer ${newToken}`
      }
      return apiClient(originalRequest)
    } catch (refreshError) {
      for (const item of pendingQueue) {
        item.reject(refreshError)
      }
      pendingQueue = []

      // 刷新失败，清除本地令牌并跳转登录页
      localStorage.removeItem(TOKEN_KEY)
      localStorage.removeItem(REFRESH_TOKEN_KEY)
      window.location.href = '/login'

      return Promise.reject(refreshError)
    } finally {
      isRefreshing = false
    }
  },
)

export default apiClient
