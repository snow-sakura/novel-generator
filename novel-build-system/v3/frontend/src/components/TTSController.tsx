import React, { useState, useEffect, useRef, useCallback } from 'react'
import { Play, Pause, Square, SkipBack, SkipForward, Volume2, ChevronUp, ChevronDown, Headphones, Download, Cloud, Globe } from 'lucide-react'
import { fetchTTSVoices, generateTTS, generateAllTTS, getTTSAudioUrl, fetchTTSStatus, deleteTTSAudio } from '../services/api'

function extractChapters(content) {
  if (!content) return []
  const parts = content.split(/(?=## )/g).filter(Boolean)
  return parts.map((p, i) => {
    const titleMatch = p.match(/^## (.+)\n\n/)
    const title = titleMatch ? titleMatch[1].trim() : `第${i + 1}章`
    const body = p.replace(/^## .+?\n\n/, '').trim()
    return { index: i, title, body }
  })
}

function splitSentences(text) {
  return text.split(/(?<=[。！？\n])/g).map(s => s.trim()).filter(Boolean)
}

export default function TTSController({ novelId, content, chapters, onClose }) {
  const [chaptersList] = useState(() => extractChapters(content))
  const [currentCh, setCurrentCh] = useState(0)
  const [mode, setMode] = useState('server')
  const [serverStatus, setServerStatus] = useState(null)
  const [generating, setGenerating] = useState(false)
  const [playing, setPlaying] = useState(false)
  const [paused, setPaused] = useState(false)
  const [rate, setRate] = useState(1)
  const [voices, setVoices] = useState([])
  const [serverVoices, setServerVoices] = useState([])
  const [selectedVoice, setSelectedVoice] = useState(null)
  const [selectedServerVoice, setSelectedServerVoice] = useState('zh-CN-XiaoxiaoNeural')
  const [currentSentence, setCurrentSentence] = useState('')
  const [expanded, setExpanded] = useState(true)
  const utteranceRef = useRef(null)
  const sentenceIndexRef = useRef(0)
  const sentencesRef = useRef([])
  const audioRef = useRef(null)

  useEffect(() => {
    fetchTTSVoices().then(v => setServerVoices(v))
    if (novelId && novelId !== '0') {
      fetchTTSStatus(novelId).then(s => setServerStatus(s))
    }
    const loadVoices = () => {
      const all = window.speechSynthesis?.getVoices() || []
      const zh = all.filter(v => v.lang.startsWith('zh'))
      setVoices(zh.length > 0 ? zh : all)
      if (!selectedVoice) {
        const prefer = zh.find(v => v.name.includes('Ting') || v.name.includes('Mei') || v.name.includes('Chinese'))
        setSelectedVoice(prefer || zh[0] || all[0] || null)
      }
    }
    loadVoices()
    window.speechSynthesis?.addEventListener('voiceschanged', loadVoices)
    return () => window.speechSynthesis?.removeEventListener('voiceschanged', loadVoices)
  }, [novelId])

  useEffect(() => {
    sentenceIndexRef.current = 0
    const ch = chaptersList[currentCh]
    sentencesRef.current = ch ? splitSentences(ch.body) : []
    setCurrentSentence('')
    const el = document.getElementById(`ch-${currentCh}`)
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [currentCh, chaptersList])

  const handleGenerateChapter = useCallback(async () => {
    if (!novelId || novelId === '0') return
    setGenerating(true)
    try {
      await generateTTS(novelId, currentCh, selectedServerVoice)
      const status = await fetchTTSStatus(novelId)
      setServerStatus(status)
    } catch (e) {
      console.error('TTS 生成失败:', e)
    }
    setGenerating(false)
  }, [novelId, currentCh, selectedServerVoice])

  const handleGenerateAll = useCallback(async () => {
    if (!novelId || novelId === '0') return
    setGenerating(true)
    try {
      await generateAllTTS(novelId, selectedServerVoice)
      const status = await fetchTTSStatus(novelId)
      setServerStatus(status)
    } catch (e) {
      console.error('全本 TTS 生成失败:', e)
    }
    setGenerating(false)
  }, [novelId, selectedServerVoice])

  const currentChapter = chaptersList[currentCh]
  const chapterAudioUrl = novelId && novelId !== '0' ? getTTSAudioUrl(novelId, currentCh) : null
  const chapterGenerated = serverStatus?.chapters?.find(c => c.chapter_index === currentCh)?.generated

  const speakBrowser = useCallback(() => {
    window.speechSynthesis?.cancel()
    if (!sentencesRef.current.length) return
    const utter = new SpeechSynthesisUtterance()
    utter.text = sentencesRef.current[sentenceIndexRef.current] || ''
    utter.lang = 'zh-CN'
    utter.rate = rate
    utter.voice = selectedVoice
    utter.onstart = () => setCurrentSentence(utter.text)
    utter.onend = () => {
      sentenceIndexRef.current++
      if (sentenceIndexRef.current < sentencesRef.current.length) {
        speakBrowser()
      } else {
        if (currentCh < chaptersList.length - 1) setCurrentCh(prev => prev + 1)
        else { setPlaying(false); setPaused(false); setCurrentSentence('') }
      }
    }
    utter.onerror = () => { setPlaying(false); setPaused(false) }
    utteranceRef.current = utter
    window.speechSynthesis?.speak(utter)
  }, [rate, selectedVoice, currentCh, chaptersList.length])

  const speakServer = useCallback(() => {
    if (!audioRef.current) return
    audioRef.current.play()
      .then(() => setPlaying(true))
      .catch(() => setPlaying(false))
  }, [])

  const handlePlay = useCallback(() => {
    if (mode === 'server' && chapterAudioUrl && chapterGenerated) {
      if (!audioRef.current) {
        const audio = new Audio(chapterAudioUrl)
        audio.onended = () => {
          if (currentCh < chaptersList.length - 1) setCurrentCh(prev => prev + 1)
          else { setPlaying(false); setCurrentSentence('') }
        }
        audio.onerror = () => { setPlaying(false) }
        audioRef.current = audio
      }
      audioRef.current.currentTime = 0
      audioRef.current.play().then(() => setPlaying(true)).catch(() => setPlaying(false))
      return
    }
    if (paused && window.speechSynthesis?.speaking) {
      window.speechSynthesis.resume()
      setPaused(false)
      setPlaying(true)
      return
    }
    setPlaying(true)
    setPaused(false)
    speakBrowser()
  }, [mode, chapterAudioUrl, chapterGenerated, currentCh, chaptersList.length, paused, speakBrowser])

  const handlePause = useCallback(() => {
    if (mode === 'server' && audioRef.current) {
      audioRef.current.pause()
      setPaused(true)
      setPlaying(false)
      return
    }
    if (window.speechSynthesis?.speaking) {
      window.speechSynthesis.pause()
      setPaused(true)
      setPlaying(false)
    }
  }, [mode])

  const handleStop = useCallback(() => {
    if (mode === 'server' && audioRef.current) {
      audioRef.current.pause()
      audioRef.current.currentTime = 0
    }
    window.speechSynthesis?.cancel()
    setPlaying(false)
    setPaused(false)
    setCurrentSentence('')
    sentenceIndexRef.current = 0
  }, [mode])

  const handlePrev = useCallback(() => {
    handleStop()
    audioRef.current = null
    setCurrentCh(prev => Math.max(0, prev - 1))
  }, [handleStop])

  const handleNext = useCallback(() => {
    handleStop()
    audioRef.current = null
    setCurrentCh(prev => Math.min(chaptersList.length - 1, prev + 1))
  }, [handleStop, chaptersList.length])

  const handleRateChange = useCallback((newRate) => {
    setRate(newRate)
    if (playing || paused) {
      const wasPlaying = playing
      handleStop()
      sentenceIndexRef.current = 0
      if (wasPlaying) setTimeout(() => { setPlaying(true); speakBrowser() }, 50)
    }
  }, [playing, paused, handleStop, speakBrowser])

  const progress = chaptersList.length > 0 ? `${currentCh + 1} / ${chaptersList.length}` : ''

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-gray-200 shadow-[0_-4px_20px_rgba(0,0,0,0.08)]">
      <button onClick={() => setExpanded(!expanded)}
        className="absolute -top-5 left-1/2 -translate-x-1/2 w-10 h-5 bg-white border border-gray-200 rounded-t-lg flex items-center justify-center text-gray-400 hover:text-gray-600">
        {expanded ? <ChevronDown className="w-3 h-3" /> : <ChevronUp className="w-3 h-3" />}
      </button>

      {expanded && (
        <div className="px-4 py-3">
          {(playing || paused) && currentSentence && (
            <div className="mb-2 text-xs text-gray-500 text-center line-clamp-2 max-w-2xl mx-auto italic">
              “{currentSentence}”
            </div>
          )}

          <div className="flex items-center justify-between gap-4 max-w-3xl mx-auto">
            <div className="flex items-center gap-2 min-w-0 flex-shrink-0">
              <Headphones className="w-4 h-4 text-purple-500 flex-shrink-0" />
              <span className="text-xs font-medium text-gray-700 truncate max-w-[140px]">
                {currentChapter?.title || ''}
              </span>
              <span className="text-[10px] text-gray-400">{progress}</span>
            </div>

            <div className="flex items-center gap-1">
              <button onClick={handlePrev} disabled={currentCh === 0}
                className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg disabled:opacity-30 transition-colors">
                <SkipBack className="w-4 h-4" />
              </button>
              {playing ? (
                <button onClick={handlePause}
                  className="p-2 text-white bg-purple-500 hover:bg-purple-600 rounded-full transition-colors">
                  <Pause className="w-4 h-4" />
                </button>
              ) : (
                <button onClick={handlePlay}
                  className="p-2 text-white bg-purple-500 hover:bg-purple-600 rounded-full transition-colors">
                  <Play className="w-4 h-4" />
                </button>
              )}
              <button onClick={handleStop} disabled={!playing && !paused}
                className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg disabled:opacity-30 transition-colors">
                <Square className="w-4 h-4" />
              </button>
              <button onClick={handleNext} disabled={currentCh >= chaptersList.length - 1}
                className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg disabled:opacity-30 transition-colors">
                <SkipForward className="w-4 h-4" />
              </button>
            </div>

            <div className="flex items-center gap-3">
              {novelId && novelId !== '0' && (
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => setMode(mode === 'server' ? 'browser' : 'server')}
                    className={`flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium border transition-colors ${mode === 'server' ? 'bg-purple-50 text-purple-600 border-purple-200' : 'bg-gray-50 text-gray-500 border-gray-200'}`}
                    title={mode === 'server' ? '服务器语音' : '浏览器语音'}>
                    {mode === 'server' ? <Cloud className="w-3 h-3" /> : <Globe className="w-3 h-3" />}
                    {mode === 'server' ? '服务端' : '浏览器'}
                  </button>
                  {mode === 'server' && (
                    <>
                      {chapterGenerated ? (
                        <a href={chapterAudioUrl} download={`chapter_${currentCh + 1}.mp3`}
                          className="p-1 text-gray-400 hover:text-purple-600 transition-colors" title="下载音频">
                          <Download className="w-3.5 h-3.5" />
                        </a>
                      ) : (
                        <button onClick={handleGenerateChapter} disabled={generating}
                          className="text-[10px] px-1.5 py-0.5 bg-purple-50 text-purple-600 rounded hover:bg-purple-100 disabled:opacity-40 transition-colors">
                          {generating ? '生成中...' : '生成'}
                        </button>
                      )}
                      <button onClick={handleGenerateAll} disabled={generating}
                        className="text-[10px] px-1.5 py-0.5 bg-purple-50 text-purple-600 rounded hover:bg-purple-100 disabled:opacity-40 transition-colors">
                        {generating ? '生成中...' : '全本'}
                      </button>
                    </>
                  )}
                </div>
              )}

              {mode === 'browser' && (
                <>
                  <div className="flex items-center gap-1.5">
                    <Volume2 className="w-3 h-3 text-gray-400" />
                    <input type="range" min="0.5" max="2" step="0.25" value={rate}
                      onChange={e => handleRateChange(parseFloat(e.target.value))}
                      className="w-16 h-1 accent-purple-500" />
                    <span className="text-[10px] text-gray-400 w-6">{rate}x</span>
                  </div>
                  <select value={selectedVoice?.name || ''}
                    onChange={e => {
                      const v = voices.find(vv => vv.name === e.target.value)
                      if (v) { setSelectedVoice(v) }
                    }}
                    className="text-[10px] border border-gray-200 rounded px-1 py-0.5 text-gray-600 max-w-[100px]">
                    {voices.map(v => (
                      <option key={v.name} value={v.name}>{v.name}</option>
                    ))}
                  </select>
                </>
              )}

              {mode === 'server' && serverVoices.length > 0 && (
                <select value={selectedServerVoice}
                  onChange={e => setSelectedServerVoice(e.target.value)}
                  className="text-[10px] border border-gray-200 rounded px-1 py-0.5 text-gray-600 max-w-[100px]">
                  {serverVoices.map(v => (
                    <option key={v.id} value={v.id}>{v.name}</option>
                  ))}
                </select>
              )}

              <button onClick={onClose}
                className="text-[10px] text-gray-400 hover:text-gray-600 px-1.5 py-0.5 rounded hover:bg-gray-100">
                关闭
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
