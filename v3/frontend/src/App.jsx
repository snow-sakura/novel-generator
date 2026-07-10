import { useState, useEffect } from 'react'
import { BrowserRouter, Routes, Route, Link, useLocation } from 'react-router-dom'
import { FileText, History, Sparkles, MessageSquare, BookOpen, Settings, ChevronDown, Github } from 'lucide-react'
import CreatePage from './pages/CreatePage'
import NovelPage from './pages/NovelPage'
import HistoryPage from './pages/HistoryPage'
import ChatPage from './pages/ChatPage'
import PromptRefPage from './pages/PromptRefPage'
import SettingsModal from './components/SettingsModal'
import ToastContainer from './components/ToastContainer'
import { cn } from './lib/utils'

const NAV_ITEMS = [
  { to: '/', icon: FileText, label: '创作' },
  { to: '/chat', icon: MessageSquare, label: '对话' },
  { to: '/prompts', icon: BookOpen, label: '模板' },
  { to: '/history', icon: History, label: '历史' },
]

function NavLink({ to, icon: Icon, label }) {
  const location = useLocation()
  const active = location.pathname === to

  return (
    <Link
      to={to}
      className={cn(
        'relative flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-medium transition-all duration-200',
        active
          ? 'text-white gradient-brand shadow-sm shadow-orange-200/50'
          : 'text-gray-500 hover:text-gray-800 hover:bg-gray-100/60'
      )}
    >
      {active && (
        <span className="absolute inset-0 rounded-xl gradient-brand opacity-100 animate-fade-in" />
      )}
      <Icon className="relative w-4 h-4 z-10" />
      <span className="relative z-10 hidden sm:inline">{label}</span>
    </Link>
  )
}

function Navbar() {
  const [showSettings, setShowSettings] = useState(false)
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    function onScroll() { setScrolled(window.scrollY > 10) }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <nav className={cn(
      'sticky top-0 z-50 transition-all duration-300',
      scrolled ? 'bg-white/90 backdrop-blur-xl shadow-sm border-b border-gray-200/50' : 'bg-white/95 border-b border-gray-100'
    )}>
      <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2.5 group">
          <div className="w-8 h-8 rounded-xl gradient-brand flex items-center justify-center shadow-sm group-hover:shadow-md transition-all duration-200 group-hover:scale-105 group-hover:rotate-3">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <span className="text-base font-bold gradient-text">
            番茄小说 V3
          </span>
        </Link>
        <div className="flex items-center gap-1">
          {NAV_ITEMS.map(item => (
            <NavLink key={item.to} {...item} />
          ))}
          <div className="w-px h-6 bg-gray-200 mx-1 hidden sm:block" />
          <button onClick={() => setShowSettings(true)}
            className={cn(
              'flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-all duration-200',
              showSettings ? 'text-orange-600 bg-orange-50' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100/60'
            )}>
            <Settings className="w-4 h-4" />
            <span className="hidden sm:inline">设置</span>
          </button>
        </div>
      </div>
      <SettingsModal open={showSettings} onClose={() => setShowSettings(false)} />
    </nav>
  )
}

function PageTransition({ children }) {
  const location = useLocation()
  return (
    <div key={location.pathname} className="animate-fade-in-up">
      {children}
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-novel-bg">
        <Navbar />
        <main className="max-w-5xl mx-auto px-4 py-6">
          <Routes>
            <Route path="/" element={<PageTransition><CreatePage /></PageTransition>} />
            <Route path="/novel/:id" element={<PageTransition><NovelPage /></PageTransition>} />
            <Route path="/history" element={<PageTransition><HistoryPage /></PageTransition>} />
            <Route path="/chat" element={<PageTransition><ChatPage /></PageTransition>} />
            <Route path="/prompts" element={<PageTransition><PromptRefPage /></PageTransition>} />
          </Routes>
        </main>
        <footer className="text-center py-6 text-xs text-gray-300 border-t border-gray-100/50 mt-8">
           <span>番茄小说生成器 V3 · AI Novel Generator</span>
        </footer>
        <ToastContainer />
      </div>
    </BrowserRouter>
  )
}
