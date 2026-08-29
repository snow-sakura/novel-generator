import { useState, lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, Link, useLocation } from 'react-router-dom'
import { FileText, History, Sparkles, MessageSquare, BookOpen, Settings, Loader2 } from 'lucide-react'
import SettingsModal from './components/SettingsModal'
import ErrorBoundary from './components/ErrorBoundary'

// 懒加载页面组件
const CreatePage = lazy(() => import('./pages/CreatePage'))
const NovelPage = lazy(() => import('./pages/NovelPage'))
const HistoryPage = lazy(() => import('./pages/HistoryPage'))
const ChatPage = lazy(() => import('./pages/ChatPage'))
const PromptRefPage = lazy(() => import('./pages/PromptRefPage'))

// 页面切换动画包装器
function AnimatedPage({ children }) {
  return <div className="page-enter">{children}</div>
}

// 加载中组件
function PageLoader() {
  return (
    <div className="flex items-center justify-center h-64">
      <div className="flex flex-col items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-400 to-rose-500 flex items-center justify-center shadow-md">
          <Loader2 className="w-5 h-5 text-white animate-spin" />
        </div>
        <p className="text-sm text-gray-400 font-medium">加载中...</p>
      </div>
    </div>
  )
}

function NavLink({ to, icon: Icon, label }) {
  const location = useLocation()
  const active = location.pathname === to

  return (
    <Link
      to={to}
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
        active
          ? 'bg-orange-100 text-orange-700 shadow-sm'
          : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
      }`}
    >
      <Icon className="w-4 h-4" />
      <span className="hidden sm:inline">{label}</span>
    </Link>
  )
}

function Navbar() {
  const [showSettings, setShowSettings] = useState(false)

  return (
    <nav className="bg-white border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-4 h-12 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2 text-base font-bold text-orange-600 hover:text-orange-700 transition-colors">
          <Sparkles className="w-4 h-4" />
          <span>番茄小说生成器</span>
        </Link>
        <div className="flex items-center gap-1">
          <NavLink to="/" icon={FileText} label="创作" />
          <NavLink to="/chat" icon={MessageSquare} label="对话" />
          <NavLink to="/prompts" icon={BookOpen} label="模板" />
          <NavLink to="/history" icon={History} label="历史" />
          <button onClick={() => setShowSettings(true)} aria-label="设置"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-all">
            <Settings className="w-4 h-4" />
            <span className="hidden sm:inline">设置</span>
          </button>
        </div>
      </div>
      <SettingsModal open={showSettings} onClose={() => setShowSettings(false)} />
    </nav>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <ErrorBoundary>
        <div className="min-h-screen bg-gray-50">
          <Navbar />
          <main className="max-w-6xl mx-auto px-4 py-5">
            <Suspense fallback={<PageLoader />}>
              <Routes>
                <Route path="/" element={<AnimatedPage><CreatePage /></AnimatedPage>} />
                <Route path="/novel/:id" element={<AnimatedPage><NovelPage /></AnimatedPage>} />
                <Route path="/history" element={<AnimatedPage><HistoryPage /></AnimatedPage>} />
                <Route path="/chat" element={<AnimatedPage><ChatPage /></AnimatedPage>} />
                <Route path="/prompts" element={<AnimatedPage><PromptRefPage /></AnimatedPage>} />
              </Routes>
            </Suspense>
          </main>
        </div>
      </ErrorBoundary>
    </BrowserRouter>
  )
}
