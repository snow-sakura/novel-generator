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
        // 从数据库加载已保存的模型配置
        fetchModelConfig().then(cfg => {
          if (cfg && cfg.provider && data.models?.find(mo => mo.provider === cfg.provider)) {
            const m = data.models.find(mo => mo.provider === cfg.provider)
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={handleClose}>
      <div className="bg-white rounded-2xl w-[90vw] max-w-2xl max-h-[85vh] flex flex-col shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 flex-shrink-0">
          <div className="flex items-center gap-2">
            <SettingsIcon className="w-5 h-5 text-orange-500" />
            <h2 className="text-lg font-bold text-gray-900">设置</h2>
          </div>
          <button onClick={handleClose} className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
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
            className="px-6 py-2.5 bg-gradient-to-r from-orange-500 to-rose-500 text-white rounded-xl font-medium hover:from-orange-600 hover:to-rose-600 transition-all shadow-sm text-sm">
            完成
          </button>
        </div>
      </div>
    </div>
  )
}