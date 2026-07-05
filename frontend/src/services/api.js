import { mockGenerateStream, SAMPLE_NOVEL, SAMPLE_CHAPTERS } from './sampleNovel'

const API_BASE = '/api/v1'

/** 检测是否运行在 GitHub Pages 环境 */
export function isGitHubPages() {
  return (
    typeof window !== 'undefined' &&
    window.location.hostname.includes('github.io')
  )
}

/**
 * 检查模型配置状态
 * 在 GitHub Pages Demo 模式下返回 mock 数据
 */
export async function checkConfig() {
  if (isGitHubPages()) {
    return {
      provider: 'Demo Mode',
      configured: true,
      error: '',
      model: '浏览器端模拟（无需后端）',
    }
  }
  try {
    const res = await fetch(`${API_BASE}/config/check`)
    if (!res.ok) return { provider: '', configured: false, error: '无法连接后端服务', model: '' }
    return res.json()
  } catch {
    return { provider: '', configured: false, error: '后端服务未启动，请先启动后端', model: '' }
  }
}

/**
 * 流式生成小说（生产模式）
 * 使用后端 SSE API
 */
export function generateNovel(params, onEvent, onComplete, onError) {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 180000)

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
          if (line.startsWith('event: ')) {
            currentEvent = line.slice(7).trim()
          } else if (line.startsWith('data: ')) {
            const dataStr = line.slice(6).trim()
            try {
              const data = JSON.parse(dataStr)
              onEvent(currentEvent, data)
            } catch {
              onEvent(currentEvent, dataStr)
            }
          }
        }
      }
      onComplete()
    })
    .catch((err) => {
      clearTimeout(timeoutId)
      if (err.name === 'AbortError') {
        onError('生成超时，请检查模型配置后重试')
      } else {
        onError(err.message || '网络错误，请重试')
      }
    })

  return controller
}

/**
 * 流式生成小说（Demo 模式）
 * 使用本地预生成数据模拟 SSE 事件流
 */
export async function generateNovelDemo(params, onEvent, onComplete, onError) {
  try {
    for await (const chunk of mockGenerateStream()) {
      onEvent(chunk.event, chunk.data)
    }
    onComplete()
  } catch (err) {
    onError(err.message || 'Demo 模式生成失败')
  }
}

/** 获取小说列表（Demo 模式返回样例数据） */
export async function fetchNovels(page = 1, size = 10) {
  if (isGitHubPages()) {
    const allNovels = [
      {
        id: 0,
        title: SAMPLE_NOVEL.title,
        seed_text: SAMPLE_NOVEL.seed_text,
        genre: SAMPLE_NOVEL.genre,
        style: SAMPLE_NOVEL.style,
        word_count: SAMPLE_NOVEL.word_count,
        actual_count: SAMPLE_NOVEL.actual_count,
        model_used: SAMPLE_NOVEL.model_used,
        time_cost: SAMPLE_NOVEL.time_cost,
        created_at: SAMPLE_NOVEL.created_at,
      },
    ]
    return {
      total: 1,
      page,
      size,
      items: page === 1 ? allNovels : [],
    }
  }
  const res = await fetch(`${API_BASE}/novels?page=${page}&size=${size}`)
  if (!res.ok) throw new Error('获取列表失败')
  return res.json()
}

/** 获取小说详情（Demo 模式返回样例数据） */
export async function fetchNovel(id) {
  if (isGitHubPages() || id === 0 || id === '0') {
    return SAMPLE_NOVEL
  }
  const res = await fetch(`${API_BASE}/novels/${id}`)
  if (!res.ok) throw new Error('获取小说失败')
  return res.json()
}

/** 删除小说（Demo 模式静默成功） */
export async function deleteNovel(id) {
  if (isGitHubPages() || id === 0 || id === '0') {
    return
  }
  const res = await fetch(`${API_BASE}/novels/${id}`, { method: 'DELETE' })
  if (!res.ok) throw new Error('删除失败')
}

/** 获取导出下载链接 */
export function getExportUrl(id, format) {
  if (isGitHubPages() || id === 0 || id === '0') {
    // Demo 模式：生成 Blob 供下载
    const blob = new Blob(['Demo 模式下不支持导出功能'], { type: 'text/plain;charset=utf-8' })
    return URL.createObjectURL(blob)
  }
  return `${API_BASE}/novels/${id}/export?format=${format}`
}
