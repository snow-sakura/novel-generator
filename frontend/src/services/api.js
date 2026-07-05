import { mockGenerateStream, SAMPLE_NOVEL, SAMPLE_CHAPTERS } from './sampleNovel'

const API_BASE = '/api/v1'

export function isGitHubPages() {
  return typeof window !== 'undefined' && window.location.hostname.includes('github.io')
}

// ─── 配置 & 数据 ───

export async function checkConfig() {
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

/** 获取国产模型列表 */
export async function fetchModels() {
  if (isGitHubPages()) return { models: [] }
  try {
    const res = await fetch(`${API_BASE}/models/list`)
    if (!res.ok) return { models: [] }
    return res.json()
  } catch { return { models: [] } }
}

/** 获取题材列表（按频道） */
export async function fetchGenres(gender = '男频') {
  if (isGitHubPages()) return { gender, genres: [], styles: [] }
  try {
    const res = await fetch(`${API_BASE}/genres/list?gender=${encodeURIComponent(gender)}`)
    if (!res.ok) return { gender, genres: [], styles: [] }
    return res.json()
  } catch { return { gender, genres: [], styles: [] } }
}

// ─── 生成 ───

export function generateNovel(params, onEvent, onComplete, onError) {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 600000)

  fetch(`${API_BASE}/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
    signal: controller.signal,
  })
    .then(async (response) => {
      clearTimeout(timeoutId)
      if (!response.ok) {
        const err = await response.json().catch(() => ({}))
        throw new Error(err.error || `请求失败 (${response.status})`)
      }
      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''
        let currentEvent = ''
        for (const line of lines) {
          if (line.startsWith('event: ')) currentEvent = line.slice(7).trim()
          else if (line.startsWith('data: ')) {
            const dataStr = line.slice(6).trim()
            try { onEvent(currentEvent, JSON.parse(dataStr)) }
            catch { onEvent(currentEvent, dataStr) }
          }
        }
      }
      onComplete()
    })
    .catch((err) => {
      clearTimeout(timeoutId)
      if (err.name === 'AbortError') onError('生成超时')
      else onError(err.message || '网络错误')
    })
  return controller
}

// ─── Demo 模式 ───

export async function generateNovelDemo(params, onEvent, onComplete, onError) {
  try {
    for await (const chunk of mockGenerateStream()) {
      onEvent(chunk.event, chunk.data)
    }
    onComplete()
  } catch (err) { onError(err.message || 'Demo 生成失败') }
}

// ─── CRUD ───

export async function fetchNovels(page = 1, size = 10) {
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

export async function fetchNovel(id) {
  if (isGitHubPages() || id === 0 || id === '0') return SAMPLE_NOVEL
  const res = await fetch(`${API_BASE}/novels/${id}`)
  if (!res.ok) throw new Error('获取小说失败')
  return res.json()
}

export async function deleteNovel(id) {
  if (isGitHubPages() || id === 0 || id === '0') return
  const res = await fetch(`${API_BASE}/novels/${id}`, { method: 'DELETE' })
  if (!res.ok) throw new Error('删除失败')
}

export function getExportUrl(id, format) {
  if (isGitHubPages() || id === 0 || id === '0') return '#'
  return `${API_BASE}/novels/${id}/export?format=${format}`
}

export function getChapterExportUrl(id) { return `${API_BASE}/novels/${id}/export/chapters` }
export function getOutlineExportUrl(id) { return `${API_BASE}/novels/${id}/export/outline` }
