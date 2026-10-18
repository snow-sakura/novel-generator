/**
 * E2E Mock 服务器（离线测试专用，零依赖）
 * - 托管 `dist` 静态产物（先执行 npm run build）
 * - 拦截 /api/v3/* 返回稳定 fixture，使 E2E 无需真实后端/LLM 密钥
 * 用法：node tests/mock-server.mjs   (默认 :5173)
 */
import { createServer } from 'node:http'
import { readFile } from 'node:fs/promises'
import { extname, join, normalize } from 'node:path'
import { fileURLToPath } from 'node:url'

const DIST = join(fileURLToPath(new URL('.', import.meta.url)), '..', 'dist')
const PORT = Number(process.env.E2E_PORT || 5173)

const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.mjs': 'text/javascript',
  '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.json': 'application/json',
  '.woff2': 'font/woff2', '.ico': 'image/x-icon',
}

const GENRES = {
  男频: ['都市脑洞', '都市生活', '都市修真', '异术超能', '灵气复苏', '末世危机', '科幻星际', '时空穿梭', '历史古代', '军事战争', '奇幻仙侠', '武侠江湖', '游戏体育', '悬疑灵异', '轻小说', '诸天无限', '影视综漫', '玄幻奇幻', '武斗江湖'],
  女频: ['古代言情', '现代言情', '浪漫青春', '幻想言情', '仙侠奇缘', '悬疑言情', '百合小说', 'GL 轻小说', '短篇小说', '现代婚宠', '豪门世家', '民国情缘', '宫斗宅斗', '种田经商', '末世女强', '星际机甲', '年代文', '种田重生'],
}
const STYLES = ['轻松搞笑', '热血爽文', '深情虐恋', '悬疑烧脑', '清新治愈', '暗黑写实', '史诗大气', '细腻温馨', '反转惊奇', '日常流水', '诗意唯美', '诙谐幽默', '紧张刺激', '催泪感人', '沙雕搞笑']

const PROMPTS = ['parse', 'outline', 'chapter', 'title'].map(name => ({
  name, version: 'v1.0', content: `【Mock Prompt · ${name}】\n你是番茄小说生成管线的 ${name} 智能体……（E2E fixture）`,
}))

const NOVEL_ITEM = {
  id: 1, title: '星穹残响', gender: '男频', genre: '科幻星际', style: '热血爽文',
  word_count: 3000, actual_count: 3215, model_used: 'mimo-v2.5-free',
  created_at: '2026-08-01T10:00:00', status: 'completed',
}

function json(res, data, code = 200) {
  res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8' })
  res.end(JSON.stringify(data))
}

function api(method, path, query) {
  if (method === 'GET') {
    if (path === '/api/v3/config/check') return { provider: 'opencode', configured: true, error: '', model: 'mimo-v2.5-free' }
    if (path === '/api/v3/models/list') return { models: [{ id: 'mimo-v2.5-free', name: 'MiMo V2.5 免费版' }, { id: 'deepseek-v4-flash-free', name: 'DeepSeek V4 Flash' }] }
    if (path === '/api/v3/genres/list') { const g = query.get('gender') || '男频'; return { gender: g, genres: GENRES[g] || GENRES['男频'], styles: STYLES } }
    if (path === '/api/v3/prompts') return PROMPTS
    if (path === '/api/v3/novels') return { total: 1, page: Number(query.get('page') || 1), size: Number(query.get('size') || 10), items: [NOVEL_ITEM] }
    if (/^\/api\/v3\/novels\/[^/]+$/.test(path)) return {
      ...NOVEL_ITEM,
      seed_text: '一个程序员收到了来自十年后的邮件',
      content: '## 第一章 深夜邮件\n\n正文段落（E2E fixture）。',
      chapters: JSON.stringify([{ title: '第一章 深夜邮件', summary: 'e2e' }]),
      outline: JSON.stringify({ chapters: [{ title: '第一章 深夜邮件', summary: 'e2e' }] }),
      bible: { characters: [] },
    }
    if (path === '/api/v3/records') return { total: 0, page: 1, size: Number(query.get('size') || 20), items: [] }
    if (/^\/api\/v3\/records\/[^/]+\/status$/.test(path)) return { status: 'completed', progress: 100 }
    if (path === '/api/v3/model-config') return { provider: 'opencode', label: 'OpenCode Zen', base_url: '', model_id: 'mimo-v2.5-free', api_key: '' }
    if (path === '/api/v3/tts/voices') return { voices: [{ id: 'zh-CN-XiaoxiaoNeural', name: '晓晓（女声）' }] }
    if (path.startsWith('/api/v3/quotes/')) return { quotes: [] }
    return {}
  }
  return { ok: true }
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost')
  const path = decodeURIComponent(url.pathname)

  if (path.startsWith('/api/')) return json(res, api(req.method, path, url.searchParams))

  // 静态资源（SPA fallback）
  let file = normalize(join(DIST, path === '/' ? 'index.html' : path))
  if (!file.startsWith(DIST)) { res.writeHead(403); return res.end() }
  try {
    const body = await readFile(file)
    res.writeHead(200, { 'Content-Type': MIME[extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-store' })
    res.end(body)
  } catch {
    try {
      const html = await readFile(join(DIST, 'index.html'))
      res.writeHead(200, { 'Content-Type': MIME['.html'] })
      res.end(html)
    } catch {
      res.writeHead(500); res.end('run `npm run build` first')
    }
  }
})

server.listen(PORT, () => console.log(`🍅 E2E mock server → http://localhost:${PORT} (dist + /api/v3 fixtures)`))
