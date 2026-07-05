import { useState } from 'react'
import { Sparkles, AlertTriangle } from 'lucide-react'
import { useNovelStore } from '../stores/novelStore'
import { cn } from '../lib/utils'

const GENRES = ['玄幻', '都市', '悬疑', '言情', '科幻', '历史']
const STYLES = ['简洁直白', '文艺抒情', '幽默诙谐', '冷峻写实']

export default function NovelForm({ onGenerate }) {
  const { params, setParams, generating, configChecked, configOk, configInfo } = useNovelStore()
  const [error, setError] = useState('')

  function handleSubmit(e) {
    e.preventDefault()
    setError('')

    if (!params.seed_text.trim()) {
      setError('请输入一句话作为小说种子')
      return
    }
    if (params.seed_text.trim().length < 4) {
      setError('种子句至少 4 个字')
      return
    }
    if (configChecked && !configOk) {
      setError(`模型未配置：${configInfo.error}`)
      return
    }
    onGenerate()
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* 配置警告 */}
      {configChecked && !configOk && (
        <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-700">
          <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium">模型未配置</p>
            <p className="mt-0.5">{configInfo.error}</p>
            <p className="mt-1">请在 <code className="bg-amber-100 px-1 rounded">backend/.env</code> 中填写正确的 API Key 后重启后端</p>
          </div>
        </div>
      )}

      {/* 种子句输入 */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">
          一句话种子 <span className="text-red-500">*</span>
        </label>
        <textarea
          value={params.seed_text}
          onChange={(e) => setParams({ seed_text: e.target.value })}
          placeholder="例如：一个少年在废弃图书馆发现了一本会发光的书..."
          rows={3}
          className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-orange-400 focus:ring-2 focus:ring-orange-100 outline-none resize-none transition-all"
          disabled={generating}
        />
      </div>

      {/* 题材和风格 */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">题材</label>
          <div className="flex flex-wrap gap-2">
            {GENRES.map((g) => (
              <button
                key={g}
                type="button"
                onClick={() => setParams({ genre: g })}
                disabled={generating}
                className={cn(
                  'px-3 py-1.5 rounded-lg text-sm border transition-all',
                  params.genre === g
                    ? 'bg-orange-500 text-white border-orange-500'
                    : 'bg-white text-gray-600 border-gray-200 hover:border-orange-300'
                )}
              >
                {g}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">风格</label>
          <div className="flex flex-wrap gap-2">
            {STYLES.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setParams({ style: s })}
                disabled={generating}
                className={cn(
                  'px-3 py-1.5 rounded-lg text-sm border transition-all',
                  params.style === s
                    ? 'bg-orange-500 text-white border-orange-500'
                    : 'bg-white text-gray-600 border-gray-200 hover:border-orange-300'
                )}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 字数 */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">
          目标字数：<span className="text-orange-600 font-bold">{params.word_count.toLocaleString()}</span>
        </label>
        <input
          type="range"
          min={500}
          max={10000}
          step={500}
          value={params.word_count}
          onChange={(e) => setParams({ word_count: Number(e.target.value) })}
          disabled={generating}
          className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-orange-500"
        />
        <div className="flex justify-between text-xs text-gray-400 mt-1">
          <span>500 短篇</span>
          <span>5000 中篇</span>
          <span>10000 长篇</span>
        </div>
      </div>

      {/* 错误提示 */}
      {error && (
        <p className="text-red-500 text-sm flex items-start gap-1.5">
          <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <span>{error}</span>
        </p>
      )}

      {/* 提交按钮 */}
      <button
        type="submit"
        disabled={generating}
        className={cn(
          'w-full py-3 rounded-xl font-medium transition-colors flex items-center justify-center gap-2',
          generating
            ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
            : configChecked && !configOk
            ? 'bg-amber-400 hover:bg-amber-500 text-white'
            : 'bg-orange-500 hover:bg-orange-600 text-white'
        )}
      >
        <Sparkles className="w-5 h-5" />
        {generating ? '生成中...' : '开始生成小说'}
      </button>
    </form>
  )
}
