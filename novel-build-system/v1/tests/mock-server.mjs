/**
 * E2E Mock 服务器（V1 冒烟测试专用，零依赖）
 * - 托管 `dist` 静态产物（先执行 npm run build）
 * - 拦截 /api/v1/* 返回稳定 fixture，无需真实后端/LLM 密钥
 * 用法：node tests/mock-server.mjs   (默认 :5173)
 */
import { createServer } from 'node:http'
import { readFile } from 'node:fs/promises'
import { extname, join, normalize } from 'node:path'
import { fileURLToPath } from 'node:url'

const DIST = join(fileURLToPath(new URL('.', import.meta.url)), '..', 'frontend', 'dist')
const PORT = Number(process.env.E2E_PORT || 5173)

const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.json': 'application/json',
  '.woff2': 'font/woff2', '.ico': 'image/x-icon', '.xmind': 'application/octet-stream',
}

const GENRES = {
  男频: ['都市脑洞', '都市生活', '都市修真', '异术超能', '灵气复苏', '末世危机', '科幻星际', '时空穿梭', '历史古代', '军事战争', '奇幻仙侠', '武侠江湖', '游戏体育', '悬疑灵异', '轻小说', '诸天无限', '影视综漫', '玄幻奇幻', '武斗江湖'],
  女频: ['古代言情', '现代言情', '浪漫青春', '幻想言情', '仙侠奇缘', '悬疑言情', '百合小说', 'GL 轻小说', '短篇小说', '现代婚宠', '豪门世家', '民国情缘', '宫斗宅斗', '种田经商', '末世女强', '星际机甲', '年代文', '种田重生'],
}
const STYLES = ['轻松搞笑', '热血爽文', '深情虐恋', '悬疑烧脑', '清新治愈', '暗黑写实', '史诗大气', '细腻温馨', '反转惊奇', '日常流水', '诗意唯美', '诙谐幽默', '紧张刺激', '催泪感人', '沙雕搞笑']

const PROMPTS = ['parse', 'outline', 'chapter', 'title'].map(name => ({
  name, version: 'v1.0', content: `【Mock Prompt · ${name}】V1 管线提示词片段（E2E fixture）`,
}))

const NOVEL_ITEM = {
  id: 1, title: '村长代码系统', gender: '男频', genre: '玄幻奇幻', style: '轻松搞笑',
  word_count: 3000, actual_count: 3120, model_used: 'mimo-v2.5-free',
  created_at: '2026-08-01T10:00:00', status: 'completed',
}
const NOVEL_DETAIL = {
  ...NOVEL_ITEM,
  seed_text: '一个程序员穿越到了异世界，发现自己变成了一个小村庄的村长',
  content: '## 第一章 醒在村长炕上\n\n李然睁开眼，屋顶是熏黑的椽子，手里攥着一把麦穗。眼前浮起半透明的编译面板——“村务系统 v0.1 编译中…”（E2E fixture）',
  chapters: JSON.stringify([{ title: '第一章 醒在村长炕上', summary: '程序员穿越成村长，获得编译面板' }]),
  outline: JSON.stringify({
    chapters: [{ title: '第一章 醒在村长炕上', summary: '程序员穿越成村长，获得编译面板' }],
    elements: { character: '李然', time: '异世界', place: '小村庄', cause: '穿越', process: '编译村务', result: '振兴村庄' },
  }),
  bible: { characters: [] },
}

function json(res, data, code = 200) {
  res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8' })
  res.end(JSON.stringify(data))
}

function api(method, path, query) {
  if (method === 'GET') {
    if (path === '/api/v1/config/check') return { provider: 'agnes', configured: true, error: '', model: 'agnes-2.5-pro' }
    if (path === '/api/v1/models/list') return { models: [{ id: 'mimo-v2.5-free', name: 'MiMo V2.5 免费版' }, { id: 'agnes-2.5-pro', name: 'AGNES 2.5 Pro' }] }
    if (path === '/api/v1/genres/list') { const g = query.get('gender') || '男频'; return { gender: g, genres: GENRES[g] || GENRES['男频'], styles: STYLES } }
    if (path === '/api/v1/prompts') return PROMPTS
    if (path === '/api/v1/novels') return { total: 1, page: Number(query.get('page') || 1), size: Number(query.get('size') || 10), items: [NOVEL_ITEM] }
    if (/^\/api\/v1\/novels\/[^/]+$/.test(path)) return NOVEL_DETAIL
    return {}
  }
  return { ok: true }
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost')
  const path = decodeURIComponent(url.pathname)

  if (path.startsWith('/api/')) return json(res, api(req.method, path, url.searchParams))

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

server.listen(PORT, () => console.log(`🍅 V1 E2E mock server → http://localhost:${PORT} (dist + /api/v1 fixtures)`))
