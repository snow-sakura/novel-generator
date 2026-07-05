import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useNovelStore } from '../stores/novelStore'
import { generateNovel, generateNovelDemo } from '../services/api'
import NovelForm from '../components/NovelForm'
import NovelReader from '../components/NovelReader'
import StepProgress from '../components/StepProgress'
import ConfigStatus from '../components/ConfigStatus'
import ThinkingLog from '../components/ThinkingLog'

export default function CreatePage() {
  const navigate = useNavigate()
  const {
    params, generating, currentContent, demoMode, customModel,
    startGeneration, setStep, appendContent, addChapter, setTitle,
    addEvent, addThinkingLog, addOutlineThinking, setError, finishGeneration, reset,
  } = useNovelStore()

  function handleGenerate() {
    startGeneration()

    const onEvent = (event, data) => {
      addEvent(event)

      switch (event) {
        case 'parse': setStep('parsing'); break
        case 'parse_done': break
        case 'outline': setStep('outlining'); break
        case 'outline_thinking':
          addOutlineThinking(data)
          break
        case 'outline_done':
          setStep('writing')
          break
        case 'chapter_start': addChapter(data); break
        case 'content': appendContent(data); break
        case 'title': setStep('titling'); break
        case 'complete':
          setTitle(data.title); finishGeneration()
          navigate(`/novel/${data.novel_id}`)
          break
        case 'log': {
          const msg = data.data || data
          let type = 'info'
          if (msg.startsWith('✅') || msg.startsWith('🎉')) type = 'success'
          else if (msg.startsWith('❌')) type = 'error'
          else if (msg.startsWith('⚠️')) type = 'warn'
          else if (msg.startsWith('📖') || msg.startsWith('📋')) type = 'chapter'
          addThinkingLog({ time: new Date().toLocaleTimeString('zh-CN', { hour12: false }), type, text: msg })
          break
        }
        case 'error': setError(data.message); break
      }
    }

    const onComplete = () => {}
    const onError = (msg) => setError(msg)

    // 构造请求参数
    const requestParams = {
      seed_text: params.seed_text, gender: params.gender, genre: params.genre,
      style: params.style, word_count: params.word_count,
      per_chapter_min: params.per_chapter_min, per_chapter_max: params.per_chapter_max,
      llm_config: customModel,
    }

    if (demoMode) { generateNovelDemo(requestParams, onEvent, onComplete, onError) }
    else { generateNovel(requestParams, onEvent, onComplete, onError) }
  }

  const showProgress = generating
  const showReader = generating || currentContent.length > 0

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">创作新小说</h1>
          <p className="text-gray-500 mt-1 text-sm">
            {demoMode ? '🎯 Demo 模式 — 输入任意文本，点击生成体验完整流程' : '输入一句话，AI 自动生成完整故事'}
          </p>
        </div>
        <ConfigStatus />
      </div>

      {useNovelStore.getState().currentStep === 'error' && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
          <div className="flex-1">
            <p className="text-sm font-medium text-red-800">生成失败</p>
            <p className="text-sm text-red-600 mt-1">{useNovelStore.getState().errorMessage}</p>
          </div>
          <button onClick={reset} className="text-sm text-red-500 hover:text-red-700 underline flex-shrink-0">重新开始</button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white rounded-xl border border-gray-200 p-5 sticky top-20">
            <NovelForm onGenerate={handleGenerate} />
          </div>
        </div>
        <div className="lg:col-span-3 space-y-4">
          {(showProgress || useNovelStore.getState().currentStep === 'error') && <StepProgress />}
          {generating && <ThinkingLog />}
          {showReader ? <NovelReader /> : (
            <div className="bg-white rounded-xl border border-gray-200 p-6 min-h-[360px] flex flex-col items-center justify-center">
              <div className="text-5xl mb-4">✍️</div>
              <p className="text-gray-400">填写左侧表单，点击「开始生成」</p>
              <p className="text-sm text-gray-300 mt-1">AI 将为你创作一篇完整的小说</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
