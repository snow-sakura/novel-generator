import { clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

/** 合并 Tailwind 类名 */
export function cn(...inputs) {
  return twMerge(clsx(inputs))
}

/**
 * 轻量 Toast 通知
 */
let _toastContainer = null
function _getContainer() {
  if (!_toastContainer) {
    _toastContainer = document.createElement('div')
    _toastContainer.style.cssText = 'position:fixed;top:20px;right:20px;z-index:9999;display:flex;flex-direction:column;gap:8px;pointer-events:none;'
    document.body.appendChild(_toastContainer)
  }
  return _toastContainer
}

function _showToast(message, type = 'info') {
  const el = document.createElement('div')
  const colors = {
    success: 'background:#065f46;color:#fff;',
    error: 'background:#991b1b;color:#fff;',
    info: 'background:#1e40af;color:#fff;',
  }
  el.style.cssText = `${colors[type] || colors.info}padding:12px 20px;border-radius:12px;font-size:14px;font-weight:500;box-shadow:0 4px 12px rgba(0,0,0,.15);pointer-events:auto;opacity:0;transform:translateX(40px);transition:all .3s ease;max-width:360px;word-break:break-word;`
  el.textContent = message
  _getContainer().appendChild(el)
  requestAnimationFrame(() => { el.style.opacity = '1'; el.style.transform = 'translateX(0)' })
  setTimeout(() => {
    el.style.opacity = '0'
    el.style.transform = 'translateX(40px)'
    setTimeout(() => el.remove(), 300)
  }, 3000)
}

export const toast = {
  success: (msg) => _showToast(msg, 'success'),
  error: (msg) => _showToast(msg, 'error'),
  info: (msg) => _showToast(msg, 'info'),
}

/**
 * HTML 转义，防止 XSS
 */
function escapeHtml(text) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

/**
 * 统一的 Markdown 渲染函数
 * @param {string} text - 要渲染的 Markdown 文本
 * @param {Object} options - 配置选项
 * @param {string} options.size - 字体大小 ('sm' | 'base' | 'lg')
 * @param {boolean} options.showBorders - 是否显示标题边框
 * @param {boolean} options.showLists - 是否支持列表
 * @returns {string} 渲染后的 HTML 字符串
 */
export function renderMarkdown(text, options = {}) {
  const { size = 'base', showBorders = false, showLists = false } = options
  
  if (!text) return ''
  
  // 根据 size 选择对应的样式
  const sizeClasses = {
    sm: {
      h1: 'text-xl font-bold my-5 text-gray-900',
      h2: 'text-lg font-bold my-4 text-gray-900',
      h3: 'text-base font-bold my-3 text-gray-800',
      p: 'text-sm leading-relaxed mb-3 text-gray-700',
      strong: 'font-semibold text-gray-800',
      em: 'text-gray-600',
      li: 'ml-4 mb-1 text-gray-700',
    },
    base: {
      h1: 'text-2xl font-bold my-5 text-gray-900',
      h2: 'text-xl font-bold my-4 text-gray-900',
      h3: 'text-lg font-bold my-3 text-gray-800',
      p: 'text-base leading-relaxed mb-4 text-gray-800',
      strong: 'font-semibold',
      em: '',
      li: 'ml-4 mb-1',
    },
    lg: {
      h1: 'text-3xl font-bold my-6 text-gray-900',
      h2: 'text-2xl font-bold my-5 text-gray-900',
      h3: 'text-xl font-bold my-4 text-gray-800',
      p: 'text-lg leading-relaxed mb-5 text-gray-800',
      strong: 'font-semibold',
      em: '',
      li: 'ml-4 mb-2',
    },
  }
  
  const classes = sizeClasses[size] || sizeClasses.base
  
  let html = escapeHtml(text)
    // 标题
    .replace(/^### (.+)$/gm, `<h3 class="${classes.h3}${showBorders ? ' pb-1 border-b border-gray-100' : ''}">$1</h3>`)
    .replace(/^## (.+)$/gm, `<h2 class="${classes.h2}${showBorders ? ' pb-2 border-b border-gray-200' : ''}">$1</h2>`)
    .replace(/^# (.+)$/gm, `<h1 class="${classes.h1}${showBorders ? ' pb-2 border-b border-gray-200' : ''}">$1</h1>`)
    // 粗体和斜体
    .replace(/\*\*(.+?)\*\*/g, `<strong class="${classes.strong}">$1</strong>`)
    .replace(/\*(.+?)\*/g, `<em class="${classes.em}">$1</em>`)
  
  // 列表支持
  if (showLists) {
    html = html
      .replace(/^- (.+)$/gm, `<li class="${classes.li}">• $1</li>`)
      .replace(/^(\d+)\. (.+)$/gm, `<li class="${classes.li}">$1. $2</li>`)
  }
  
  // 段落处理
  html = html
    .replace(/\n\n/g, `</p><p class="${classes.p}">`)
    .replace(/\n/g, '<br/>')
  
  return `<p class="${classes.p}">${html}</p>`
}
