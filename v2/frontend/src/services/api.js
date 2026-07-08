import { mockGenerateStream, SAMPLE_NOVEL, SAMPLE_CHAPTERS } from './sampleNovel'

const API_BASE = '/api/v2'

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

export async function fetchModels() {
  if (isGitHubPages()) return { models: [] }
  try {
    const res = await fetch(`${API_BASE}/models/list`)
    if (!res.ok) return { models: [] }
    return res.json()
  } catch { return { models: [] } }
}

export async function fetchGenres(gender = '男频') {
  if (isGitHubPages()) return { gender, genres: [], styles: [] }
  try {
    const res = await fetch(`${API_BASE}/genres/list?gender=${encodeURIComponent(gender)}`)
    if (!res.ok) return { gender, genres: [], styles: [] }
    return res.json()
  } catch { return { gender, genres: [], styles: [] } }
}

// ─── 生成 ───

export function generateNovel(params, onEvent, onComplete, onError, continueRecordId) {
  const controller = new AbortController()
  let timedOut = false
  const timeoutId = setTimeout(() => { timedOut = true; controller.abort() }, 600000)

  const url = continueRecordId
    ? `${API_BASE}/generate/continue?record_id=${continueRecordId}`
    : `${API_BASE}/generate`

  console.log('[SSE] 开始请求:', url, params)
  fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
    signal: controller.signal,
  })
    .then(async (response) => {
      clearTimeout(timeoutId)
      console.log('[SSE] 连接成功, status:', response.status)
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
            try {
              const parsed = JSON.parse(dataStr)
              console.log('[SSE]', currentEvent, parsed)
              onEvent(currentEvent, parsed)
            } catch {
              console.log('[SSE]', currentEvent, dataStr)
              onEvent(currentEvent, dataStr)
            }
          }
        }
      }
      onComplete()
    })
    .catch((err) => {
      clearTimeout(timeoutId)
      console.log('[SSE] 请求失败:', err.message)
      if (err.name === 'AbortError') onError(timedOut ? '请求超时（10分钟）' : '已停止')
      else onError(err.message || '网络错误')
    })
  return { controller }
}

// ─── 生成记录轮询 ───

export async function fetchRecordStatus(recordId) {
  if (isGitHubPages() || !recordId) return null
  try {
    const res = await fetch(`${API_BASE}/records/${recordId}/status`)
    if (!res.ok) return null
    return res.json()
  } catch { return null }
}

// ─── 对话式生成 ───

export function chatGenerate(message, onEvent, onComplete, onError) {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 600000)

  fetch(`${API_BASE}/chat/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message }),
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
            try {
              const parsed = JSON.parse(dataStr)
              console.log('[SSE]', currentEvent, parsed)
              onEvent(currentEvent, parsed)
            } catch {
              console.log('[SSE]', currentEvent, dataStr)
              onEvent(currentEvent, dataStr)
            }
          }
        }
      }
      onComplete()
    })
    .catch((err) => {
      clearTimeout(timeoutId)
      console.log('[SSE] 对话请求失败:', err.message)
      if (err.name === 'AbortError') onError('请求超时或已停止')
      else onError(err.message || '网络错误')
    })
  return { controller }
}

// ─── Demo 模式 ───

export async function generateNovelDemo(params, onEvent, onComplete, onError) {
  try {
    for await (const chunk of mockGenerateStream()) {
      onEvent(chunk.event, chunk.data)
    }
    onComplete()
  } catch (err) { onError(err.message || 'Demo 生成失败') }
  return { controller: null }
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

export async function fetchCompletedNovels(page = 1, size = 10) {
  if (isGitHubPages()) return { total: 1, page, size, items: [] }
  const res = await fetch(`${API_BASE}/novels?page=${page}&size=${size}&status=completed`)
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
export function getOutlineExportUrl(id) { return `${API_BASE}/novels/${id}/export/outline?format=markdown` }
export function getOutlineXmindUrl(id) { return `${API_BASE}/novels/${id}/export/outline?format=xmind` }
export function getPackageExportUrl(id) { return `${API_BASE}/novels/${id}/export/package` }

// ─── 模型配置持久化 ───

export async function fetchModelConfig() {
  if (isGitHubPages()) return null
  try {
    const res = await fetch(`${API_BASE}/model-config`)
    if (!res.ok) return null
    return res.json()
  } catch { return null }
}

export async function saveModelConfig(config) {
  if (isGitHubPages()) return
  try {
    await fetch(`${API_BASE}/model-config`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config),
    })
  } catch {}
}

// ─── 生成记录 ───

export async function fetchRecords(page = 1, size = 20) {
  if (isGitHubPages()) return { total: 0, page, size, items: [] }
  const res = await fetch(`${API_BASE}/records?page=${page}&size=${size}`)
  if (!res.ok) throw new Error('获取记录列表失败')
  return res.json()
}

export async function fetchRecord(id) {
  if (isGitHubPages() || id === 0) return null
  const res = await fetch(`${API_BASE}/records/${id}`)
  if (!res.ok) throw new Error('获取记录失败')
  return res.json()
}

export async function deleteRecord(id) {
  if (isGitHubPages() || id === 0) return
  const res = await fetch(`${API_BASE}/records/${id}`, { method: 'DELETE' })
  if (!res.ok) throw new Error('删除失败')
}

export async function cancelRecord(id) {
  if (isGitHubPages() || !id) return
  try {
    await fetch(`${API_BASE}/records/${id}/cancel`, { method: 'POST' })
  } catch {}
}

export async function cleanupData() {
  if (isGitHubPages()) return null
  const res = await fetch(`${API_BASE}/cleanup`, { method: 'POST' })
  if (!res.ok) throw new Error('清理失败')
  return res.json()
}

// ── V2 新增：润色 API ──

// Demo 模式润色模拟
async function* mockRefineStream(action, originalContent) {
  const mockResults = {
    rewrite: `（重写版本）${originalContent.split('').reverse().join('')}`,
    expand: `（扩写版本）${originalContent}\n\n这是扩写后增加的细节描写，让内容更加丰富饱满。`,
    compress: `（精简版本）${originalContent.slice(0, Math.floor(originalContent.length * 0.6))}`,
  }

  const result = mockResults[action] || mockResults.rewrite
  const chunkSize = 10
  for (let i = 0; i < result.length; i += chunkSize) {
    await new Promise(resolve => setTimeout(resolve, 50))
    yield { event: 'content', data: { text: result.slice(i, i + chunkSize) } }
  }
  yield { event: 'complete', data: { version: 1, total_versions: 1 } }
}

export async function refineParagraph(params, onEvent, onComplete, onError) {
  if (isGitHubPages()) {
    // Demo 模式
    try {
      for await (const chunk of mockRefineStream(params.action, params.original_content)) {
        if (chunk.event === 'content') {
          onEvent('refine_content', chunk.data)
        } else if (chunk.event === 'complete') {
          onComplete(chunk.data)
        }
      }
    } catch (err) {
      onError({ message: err.message || 'Demo 润色失败' })
    }
    return { abort: () => {} }
  }

  const controller = new AbortController()
  let timeoutId = null

  try {
    timeoutId = setTimeout(() => controller.abort(), 120000) // 2分钟超时

    const response = await fetch(`${API_BASE}/refine`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
      signal: controller.signal,
    })

    clearTimeout(timeoutId)

    if (!response.ok) {
      const err = await response.json().catch(() => ({}))
      throw new Error(err.error || err.detail || `请求失败 (${response.status})`)
    }

    const reader = response.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''

    const processStream = async () => {
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
          } else if (line.startsWith('data: ') && currentEvent) {
            try {
              const data = JSON.parse(line.slice(6))
              if (currentEvent === 'content') {
                onEvent('refine_content', data)
              } else if (currentEvent === 'complete') {
                onComplete(data)
              } else if (currentEvent === 'error') {
                onError(data)
              }
            } catch (e) {
              console.warn('SSE 解析失败:', e)
            }
            currentEvent = ''
          }
        }
      }
    }

    await processStream()
  } catch (err) {
    if (timeoutId) clearTimeout(timeoutId)
    if (err.name !== 'AbortError') {
      onError({ message: err.message || '网络错误' })
    }
  }

  return controller
}

export async function fetchParagraphVersions(novelId, chapterIndex, paragraphIndex) {
  if (isGitHubPages()) {
    // Demo 模式返回模拟数据
    return {
      versions: [
        {
          id: 1,
          action: 'rewrite',
          content: '这是模拟的润色版本内容。',
          version: 1,
          created_at: new Date().toISOString(),
        }
      ]
    }
  }
  const res = await fetch(
    `${API_BASE}/refine/versions?novel_id=${novelId}&chapter_index=${chapterIndex}&paragraph_index=${paragraphIndex}`
  )
  if (!res.ok) throw new Error('获取版本历史失败')
  return res.json()
}

