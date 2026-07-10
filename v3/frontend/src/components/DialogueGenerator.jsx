import { useState, useRef, useEffect } from 'react'
import { X, MessageSquare, Send, Loader2, Check, User, FileDown } from 'lucide-react'
import { cn } from '../lib/utils'
import { generateDialogue, generateDialogueDemo } from '../services/api'

export default function DialogueGenerator({ bible, novelId, chapters = [], demoMode, onClose, onInsert }) {
  const characters = (bible?.characters || []).filter(c => c.name && c.name.length <= 6)
  const [selected, setSelected] = useState([])
  const [scenario, setScenario] = useState('')
  const [generating, setGenerating] = useState(false)
  const [dialogue, setDialogue] = useState('')
  const [targetChapter, setTargetChapter] = useState(0)
  const [inserted, setInserted] = useState(false)
  const contentRef = useRef(null)

  useEffect(() => {
    if (contentRef.current) contentRef.current.scrollTop = contentRef.current.scrollHeight
  }, [dialogue])

  function toggleCharacter(name) {
    setSelected(prev =>
      prev.includes(name) ? prev.filter(n => n !== name) : [...prev, name]
    )
  }

  function getChar(name) { return characters.find(c => c.name === name) || { name, traits: '', description: '' } }

  async function handleGenerate() {
    if (selected.length < 2 || !scenario.trim()) return
    setGenerating(true)
    setDialogue('')
    setInserted(false)

    const charProfiles = selected.map(name => getChar(name))
    const params = { characters: charProfiles, scenario: scenario.trim() }

    const onEvent = (event, data) => {
      if (event === 'dialogue_content') {
        setDialogue(prev => prev + data.text)
      }
    }
    const onComplete = () => setGenerating(false)
    const onError = (msg) => {
      setDialogue(prev => prev + `\n\n[生成失败: ${msg}]`)
      setGenerating(false)
    }

    try {
      if (demoMode) {
        await generateDialogueDemo(params, onEvent, onComplete, onError)
      } else {
        await new Promise(resolve => {
          generateDialogue(params, onEvent, () => { onComplete(); resolve() }, (msg) => { onError(msg); resolve() })
        })
      }
    } catch (e) {
      onError(e.message || '生成失败')
    }
  }

  async function handleInsert() {
    if (!dialogue.trim() || !onInsert) return
    const formatted = `\n\n${dialogue.trim()}\n\n`
    await onInsert(formatted, targetChapter)
    setInserted(true)
  }

  function renderDialogue() {
    if (!dialogue) return null
    const lines = dialogue.split('\n')
    return lines.map((line, i) => {
      const match = line.match(/^([^：:]+)[：:]/)
      if (match) {
        const charName = match[1].trim()
        const isSelected = selected.includes(charName)
        return (
          <div key={i} className={cn(
            'flex items-start gap-2 mb-2',
            isSelected && 'bg-indigo-50/50 rounded-lg px-3 py-1.5 -mx-3'
          )}>
            {isSelected && (
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-indigo-100 flex items-center justify-center mt-0.5">
                <User className="w-3 h-3 text-indigo-500" />
              </span>
            )}
            <div className="flex-1">
              {isSelected ? (
                <><span className="text-xs font-semibold text-indigo-700">{charName}</span><span className="text-sm text-gray-700 ml-1">{line.slice(charName.length + 1)}</span></>
              ) : (
                <span className={cn(
                  'text-sm leading-relaxed',
                  line.startsWith('（') || line.startsWith('(') ? 'text-gray-400 italic' : 'text-gray-600'
                )}>{line}</span>
              )}
            </div>
          </div>
        )
      }
      return (
        <p key={i} className={cn(
          'text-sm leading-relaxed mb-1',
          line.startsWith('（') || line.startsWith('(') ? 'text-gray-400 italic px-3' : 'text-gray-600'
        )}>{line || '\u00A0'}</p>
      )
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 w-full max-w-2xl max-h-[85vh] flex flex-col m-4 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100 flex-shrink-0">
          <div className="flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-indigo-500" />
            <span className="text-sm font-semibold text-gray-800">角色对话</span>
          </div>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {characters.length === 0 ? (
            <div className="text-center py-8 text-xs text-gray-400">暂无角色数据，请先生成小说</div>
          ) : (
            <>
              <div>
                <label className="text-xs font-medium text-gray-500 mb-2 block">选择角色（至少 2 个）</label>
                <div className="flex flex-wrap gap-1.5">
                  {characters.map(c => (
                    <button key={c.name} onClick={() => toggleCharacter(c.name)}
                      className={cn(
                        'flex items-center gap-1 px-2.5 py-1.5 text-xs rounded-lg border transition-all',
                        selected.includes(c.name)
                          ? 'bg-indigo-50 text-indigo-700 border-indigo-300'
                          : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
                      )}>
                      {selected.includes(c.name) && <Check className="w-3 h-3" />}
                      {c.name}
                      {c.role && <span className="text-[10px] text-gray-400 ml-0.5">({c.role})</span>}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-gray-500 mb-2 block">对话场景</label>
                <textarea value={scenario} onChange={e => setScenario(e.target.value)}
                  placeholder="例如：主角和反派在决战前的对峙；或者：两人在咖啡馆偶遇..."
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl resize-none outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-300 transition-all"
                  rows={3} />
              </div>

              <button onClick={handleGenerate} disabled={selected.length < 2 || !scenario.trim() || generating}
                className={cn(
                  'w-full flex items-center justify-center gap-1.5 py-2 text-sm font-medium rounded-xl transition-all',
                  selected.length >= 2 && scenario.trim()
                    ? 'bg-indigo-500 text-white hover:bg-indigo-600'
                    : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                )}>
                {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                {generating ? '生成中...' : '生成对话'}
              </button>

              {dialogue && (
                <div>
                  <div ref={contentRef} className="bg-gray-50 rounded-xl p-4 border border-gray-100 max-h-80 overflow-y-auto mb-3">
                    {renderDialogue()}
                  </div>

                  {!inserted && onInsert && chapters.length > 0 && (
                    <div className="flex items-center gap-2">
                      <select value={targetChapter} onChange={e => setTargetChapter(Number(e.target.value))}
                        className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 text-gray-600 bg-white flex-1">
                        {chapters.map((ch, i) => (
                          <option key={i} value={i}>{ch.title || `第${i + 1}章`}</option>
                        ))}
                      </select>
                      <button onClick={handleInsert}
                        className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 transition-colors whitespace-nowrap">
                        <FileDown className="w-3 h-3" /> 插入对话
                      </button>
                    </div>
                  )}

                  {inserted && (
                    <div className="text-center py-2 text-xs text-emerald-600 font-medium bg-emerald-50 rounded-lg">
                      ✅ 对话已插入到指定章节末尾
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
