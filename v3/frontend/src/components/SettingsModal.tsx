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
  const [tab, setTab] = useState('model')

  useEffect(() => {
    if (open) {
      fetchModels().then(data => {
        setModels(data.models || [])
        fetchModelConfig().then((cfg: any) => {
          if (cfg && cfg.provider && data.models?.find((mo: any) => mo.provider === cfg.provider)) {
            const m: any = data.models.find((mo: any) => mo.provider === cfg.provider)
            setCustomModel({
              provider: cfg.provider,
              base_url: cfg.base_url || m?.base_url || '',
              model: cfg.model_id,
              api_key: cfg.api_key || '',
            })
          } else {
            setCustomModel(null)
          }
        })
      })
    }
  }, [open])

  function handleClose() {
    if (customModel) {
      const m = models.find(mo => mo.provider === customModel.provider)
      saveModelConfig({
        provider: customModel.provider,
        label: m?.label || customModel.provider,
        base_url: customModel.base_url || m?.base_url || '',
        model_id: customModel.model,
        api_key: customModel.api_key || '',
      })
    } else {
      saveModelConfig({
        provider: '',
        label: '',
        base_url: '',
        model_id: '',
        api_key: '',
      })
    }
    onClose()
  }

  if (!open) return null

  return (
    <div className="modal-overlay animate-fade-in" onClick={handleClose}>
      <div className="bg-white rounded-2xl w-[90vw] max-w-2xl max-h-[85vh] flex flex-col shadow-2xl border border-gray-100 animate-scale-in" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 flex-shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl gradient-brand flex items-center justify-center shadow-sm">
              <SettingsIcon className="w-4 h-4 text-white" />
            </div>
            <h2 className="text-lg font-bold text-gray-900">设置</h2>
          </div>
          <button onClick={handleClose} className="btn-ghost p-1.5">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex border-b border-gray-100 flex-shrink-0">
          <button onClick={() => setTab('model')}
            className={cn(
              'flex-1 py-3 text-sm font-medium transition-colors flex items-center justify-center gap-2',
              tab === 'model'
                ? 'text-orange-600 border-b-2 border-orange-500 bg-orange-50'
                : 'text-gray-500 hover:text-gray-700 bg-white'
            )}>
            <Cpu className="w-4 h-4" />
            模型配置
          </button>
          <button onClick={() => setTab('prompts')}
            className={cn(
              'flex-1 py-3 text-sm font-medium transition-colors flex items-center justify-center gap-2',
              tab === 'prompts'
                ? 'text-orange-600 border-b-2 border-orange-500 bg-orange-50'
                : 'text-gray-500 hover:text-gray-700 bg-white'
            )}>
            <BookOpen className="w-4 h-4" />
            提示词
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {tab === 'model' && (
            <div>
              <h3 className="text-sm font-semibold text-gray-800 mb-3">选择生成模型</h3>
              <ModelConfig models={models} />
            </div>
          )}
          {tab === 'prompts' && (
            <div>
              <h3 className="text-sm font-semibold text-gray-800 mb-3">自定义提示词</h3>
              <p className="text-xs text-gray-400 mb-4">自定义 Agent 提示词，留空则使用默认提示词。</p>
              <PromptDisplay gender={params.gender} genre={params.genre} style={params.style} />
            </div>
          )}
        </div>

        <div className="flex-shrink-0 border-t border-gray-100 px-6 py-4 flex justify-end">
          <button onClick={handleClose}
            className="px-6 py-2.5 gradient-brand text-white rounded-xl font-medium hover:shadow-md transition-all shadow-sm text-sm">
            完成
          </button>
        </div>
      </div>
    </div>
  )
}