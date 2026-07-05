import { useState } from 'react'
import { MessageSquare, Edit3, Eye } from 'lucide-react'
import { cn } from '../lib/utils'
import { useNovelStore } from '../stores/novelStore'

const DEFAULT_PROMPTS = {
  parse: {
    label: '要素解析 Prompt',
    content: `你是一位专业的小说创作助手。根据用户输入的一句话，提取并补全以下故事六要素，以 JSON 格式输出，key 使用英文：
character（人物身份背景）, time（时代时间段）, place（主要场景）, cause（起点）, process（发展方向）, result（结局倾向）`,
  },
  outline: {
    label: '大纲规划 Prompt',
    content: `根据以下故事要素，规划一篇{gender}频道{genre}题材、{style}风格、约{word_count}字的小说章节大纲。

每章目标字数约 {chapter_words} 字。第1章必须吸引读者（"黄金三章"原则）。每章给出标题和100字概要。以JSON数组格式输出，每项含title和summary。`,
  },
  chapter: {
    label: '逐章生成 Prompt',
    content: `你正在创作{gender}频道{genre}题材、{style}风格的小说。

当前章节：{chapter_title}
【重要】本章目标字数约 {target_words} 字。

要求：- 每段100-200字 - 对话与描写交替 - 保持风格统一 - 输出Markdown - 不要在内容中重复输出章节标题`,
  },
  title: {
    label: '标题生成 Prompt',
    content: `根据小说全文，为这篇{gender}频道{genre}题材的小说起一个吸引人的标题。贴合主题、有网文吸引力、5-15字。直接输出标题，不要多余内容。`,
  },
}

const PROMPT_KEYS = ['parse', 'outline', 'chapter', 'title']

export default function PromptDisplay({ gender = '男频', genre = '都市脑洞', style = '轻松搞笑' }) {
  const [viewTab, setViewTab] = useState('default') // 'default' | 'custom'
  const [activeKey, setActiveKey] = useState('parse')
  const { customPrompts, setCustomPrompts, generating } = useNovelStore()

  const defaultTabs = Object.entries(DEFAULT_PROMPTS)
  const currentDefault = DEFAULT_PROMPTS[activeKey]

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      {/* 视图切换 */}
      <div className="flex border-b border-gray-200">
        <button type="button" onClick={() => setViewTab('default')}
          className={cn(
            'flex-1 py-2 text-xs font-medium transition-colors flex items-center justify-center gap-1',
            viewTab === 'default'
              ? 'text-orange-600 border-b-2 border-orange-500 bg-orange-50'
              : 'text-gray-500 hover:text-gray-700 bg-white'
          )}>
          <Eye className="w-3 h-3" /> 默认提示词
        </button>
        <button type="button" onClick={() => setViewTab('custom')}
          className={cn(
            'flex-1 py-2 text-xs font-medium transition-colors flex items-center justify-center gap-1',
            viewTab === 'custom'
              ? 'text-orange-600 border-b-2 border-orange-500 bg-orange-50'
              : 'text-gray-500 hover:text-gray-700 bg-white'
          )}>
          <Edit3 className="w-3 h-3" /> 自定义提示词
        </button>
      </div>

      {viewTab === 'default' ? (
        /* ---- 默认提示词（只读） ---- */
        <div>
          <div className="flex border-b border-gray-100 overflow-x-auto">
            {defaultTabs.map(([key, tab]) => (
              <button key={key} type="button" onClick={() => setActiveKey(key)}
                className={cn(
                  'flex-shrink-0 px-3 py-2 text-xs font-medium transition-colors',
                  activeKey === key
                    ? 'text-orange-600 border-b-2 border-orange-500'
                    : 'text-gray-500 hover:text-gray-700'
                )}>
                {tab.label}
              </button>
            ))}
          </div>
          <div className="p-3">
            <div className="flex items-start gap-2 text-xs text-gray-400 mb-2">
              <MessageSquare className="w-3 h-3 mt-0.5 flex-shrink-0" />
              <span>系统提示词（System Prompt），变量将被实际值替换</span>
            </div>
            <pre className="text-xs text-gray-700 leading-relaxed whitespace-pre-wrap font-mono bg-gray-50 p-3 rounded-lg border border-gray-100 max-h-48 overflow-y-auto">
              {currentDefault?.content || ''}
            </pre>
          </div>
        </div>
      ) : (
        /* ---- 自定义提示词（可编辑） ---- */
        <div>
          <div className="flex border-b border-gray-100 overflow-x-auto">
            {PROMPT_KEYS.map(key => (
              <button key={key} type="button" onClick={() => setActiveKey(key)}
                className={cn(
                  'flex-shrink-0 px-3 py-2 text-xs font-medium transition-colors',
                  activeKey === key
                    ? 'text-orange-600 border-b-2 border-orange-500'
                    : 'text-gray-500 hover:text-gray-700'
                )}>
                {DEFAULT_PROMPTS[key].label}
              </button>
            ))}
          </div>
          <div className="p-3">
            <div className="flex items-start gap-2 text-xs text-gray-400 mb-2">
              <Edit3 className="w-3 h-3 mt-0.5 flex-shrink-0" />
              <span>留空则使用默认提示词。编辑后自动保存。</span>
            </div>
            <textarea value={customPrompts[activeKey] || ''}
              onChange={e => setCustomPrompts({ [activeKey]: e.target.value })}
              disabled={generating}
              placeholder={currentDefault?.content || ''}
              rows={8}
              className="w-full px-3 py-2 text-xs font-mono leading-relaxed border border-gray-200 rounded-lg focus:border-orange-400 focus:ring-2 focus:ring-orange-100 outline-none resize-y" />
          </div>
        </div>
      )}
    </div>
  )
}
