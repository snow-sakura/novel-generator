import { BrowserRouter, Routes, Route, Link, useLocation } from 'react-router-dom'
import { FileText, History, Sparkles } from 'lucide-react'
import CreatePage from './pages/CreatePage'
import NovelPage from './pages/NovelPage'
import HistoryPage from './pages/HistoryPage'

function NavLink({ to, icon: Icon, label }) {
  const location = useLocation()
  const active = location.pathname === to

  return (
    <Link
      to={to}
      className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
        active
          ? 'bg-orange-100 text-orange-700'
          : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
      }`}
    >
      <Icon className="w-4 h-4" />
      {label}
    </Link>
  )
}

function Navbar() {
  return (
    <nav className="bg-white border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2 text-lg font-bold text-orange-600">
          <Sparkles className="w-5 h-5" />
          番茄小说生成器
        </Link>
        <div className="flex items-center gap-1">
          <NavLink to="/" icon={FileText} label="创作" />
          <NavLink to="/history" icon={History} label="历史" />
        </div>
      </div>
    </nav>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <main className="max-w-5xl mx-auto px-4 py-6">
          <Routes>
            <Route path="/" element={<CreatePage />} />
            <Route path="/novel/:id" element={<NovelPage />} />
            <Route path="/history" element={<HistoryPage />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  )
}
