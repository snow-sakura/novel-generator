import { useState, useEffect } from 'react'
import { X, Cpu, BookOpen, Settings as SettingsIcon } from 'lucide-react'
import { useNovelStore } from '../stores/novelStore'
import { fetchModels, fetchModelConfig, saveModelConfig } from '../services/api'
import ModelConfig from './ModelConfig'
import PromptDisplay from './PromptDisplay'
import { cn } from '../lib/utils'

export default function SettingsModal({ open, onClose }) {
  const { params, customModel, setCustomModel } = useNovelStore()
  const [models, setModels] = useState([])
  const [defaultModel, setDefaultModel] = useState(null)
  const [tab, setTab] = useState('model')
  const [modelsError, setModelsError] = useState('')
  const [saveError, setSaveError] = useState('')
  const [saving, setSaving] = useState(false)
  const [reloadCount, setReloadCount] = useState(0)

  useEffect(() => {
    if (!open) return
    let cancelled = false
    setModelsError('')
    setSaveError('')

    async function loadModelOptions() {
      try {
        const data = await fetchModels()
        if (cancelled) return
        const availableModels = data.models || []
        setModels(availableModels)
        setDefaultModel(data.default || null)

        const cfg = await fetchModelConfig()
        if (cancelled) return
        // from_env 表示 .env 默认配置，不作为自定义覆盖，仅用于展示默认面板
        const providerModel = availableModels.find(mo => mo.provider === cfg?.provider)
        if (cfg && !cfg.from_env && cfg.provider && providerModel) {
          setCustomModel({
            provider: cfg.provider,
            label: cfg.label || providerModel.label || cfg.provider,
            base_url: cfg.base_url || providerModel.base_url || '',
            model: cfg.model_id,
            api_key: cfg.api_key || '',
          })
        } else {
          setCustomModel(null)
        }
      } catch (error) {
        if (!cancelled) {
          setModels([])
          setModelsError(error.message || '获取模型列表失败')
        }
      }
    }

    loadModelOptions()
    return () => { cancelled = true }
  }, [open, reloadCount, setCustomModel])

  async function handleClose() {
    if (saving) return
    if (!customModel?.provider || !customModel.model) {
      onClose()
      return
    }

    const m = models.find(mo => mo.provider === customModel.provider)
    setSaving(true)
    setSaveError('')
    try {
      await saveModelConfig({
        provider: customModel.provider,
        label: customModel.label || m?.label || customModel.provider,
        base_url: customModel.base_url || m?.base_url || '',
        model_id: customModel.model,
        api_key: customModel.api_key || '',
      })
      onClose()
    } catch (error) {
      setSaveError(error.message || '保存模型配置失败')
    } finally {
      setSaving(false)
    }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={handleClose}>
      <div className="bg-white rounded-2xl w-[90vw] max-w-2xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
        {/* 头部 */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-400 to-rose-500 flex items-center justify-center">
              <SettingsIcon className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">设置</h2>
              <p className="text-xs text-gray-500">配置模型和自定义提示词</p>
            </div>
          </div>
          <button onClick={handleClose} aria-label="关闭" className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* TAB 导航 */}
        <div className="flex border-b border-gray-100 bg-white">
          <button onClick={() => setTab('model')}
            className={cn(
              'flex-1 py-3.5 text-sm font-medium transition-all flex items-center justify-center gap-2 relative',
              tab === 'model'
                ? 'text-orange-600 bg-orange-50'
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
            )}>
            <Cpu className="w-4 h-4" />
            模型配置
            {tab === 'model' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-orange-500 to-rose-500" />
            )}
          </button>
          <button onClick={() => setTab('prompts')}
            className={cn(
              'flex-1 py-3.5 text-sm font-medium transition-all flex items-center justify-center gap-2 relative',
              tab === 'prompts'
                ? 'text-orange-600 bg-orange-50'
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
            )}>
            <BookOpen className="w-4 h-4" />
            提示词
            {tab === 'prompts' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-orange-500 to-rose-500" />
            )}
          </button>
        </div>

        {/* 内容区域 */}
        <div className="flex-1 overflow-y-auto p-6">
          {tab === 'model' ? (
            modelsError ? (
              <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                <p>模型列表加载失败：{modelsError}</p>
                <button
                  onClick={() => setReloadCount(count => count + 1)}
                  className="mt-3 font-medium underline"
                >
                  重试加载
                </button>
              </div>
            ) : <ModelConfig models={models} defaultModel={defaultModel} />
          ) : (
            <div>
              <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-xl">
                <p className="text-xs text-amber-700 leading-relaxed">
                  <span className="font-semibold">提示说明：</span>自定义提示词将覆盖默认模板，留空则使用默认提示词。支持使用 <code className="bg-amber-100 px-1 rounded">{'{变量名}'}</code> 占位符。
                </p>
              </div>
              <PromptDisplay gender={params.gender} genre={params.genre} style={params.style} />
            </div>
          )}
        </div>

        {/* 底部按钮 */}
        <div className="flex-shrink-0 border-t border-gray-100 px-6 py-4 bg-gray-50/50 flex items-center justify-between">
          <div className="text-xs text-red-600">
            {saveError}
          </div>
          <button onClick={handleClose} disabled={saving}
            className="px-6 py-2.5 bg-gradient-to-r from-orange-500 to-rose-500 text-white rounded-xl font-medium hover:from-orange-600 hover:to-rose-600 transition-all shadow-sm hover:shadow-md text-sm">
            {saving ? '保存中...' : '完成'}
          </button>
        </div>
      </div>
    </div>
  )
}
