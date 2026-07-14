import { useState } from 'react'
import { Outlet, useNavigate, useLocation } from 'react-router'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useAuthStore } from '@/lib/auth-store'
import AiAssistantFloating from '@/components/ai-chat/AiAssistantFloating'
import {
  LayoutDashboard,
  FolderKanban,
  FileText,
  Server,
  Package,
  BookOpen,
  Settings,
  ChevronLeft,
  ChevronRight,
  LogOut,
  User,
} from 'lucide-react'

/** 公共模块导航项 */
const publicNavItems = [
  { label: '首页', path: '/', icon: <LayoutDashboard className="h-5 w-5" /> },
  { label: '项目管理', path: '/projects', icon: <FolderKanban className="h-5 w-5" /> },
  { label: '需求管理', path: '/requirements', icon: <FileText className="h-5 w-5" /> },
  { label: '测试环境', path: '/environments', icon: <Server className="h-5 w-5" /> },
  { label: '测试资产库', path: '/assets', icon: <Package className="h-5 w-5" /> },
  { label: 'AI 知识库', path: '/knowledge', icon: <BookOpen className="h-5 w-5" /> },
]

/** 底部导航 */
const bottomNavItems = [
  { label: '设置', path: '/settings', icon: <Settings className="h-5 w-5" /> },
]

/** 页面标题映射 */
const pageTitles: Record<string, string> = {
  '/': '首页',
  '/projects': '项目管理',
  '/requirements': '需求管理',
  '/environments': '测试环境',
  '/assets': '测试资产库',
  '/knowledge': 'AI 知识库',
  '/settings': '系统设置',
}

export default function MainLayout() {
  const [collapsed, setCollapsed] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()
  const { user, logout } = useAuthStore()

  const currentTitle = pageTitles[location.pathname] ?? 'AISQA'

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const isActive = (path: string) => {
    if (path === '/') return location.pathname === '/'
    return location.pathname.startsWith(path)
  }

  return (
    <div className="flex h-screen overflow-hidden" style={{ backgroundColor: 'var(--polaroid-cream)' }}>
      {/* ===== 暖色侧边栏 ===== */}
      <aside
        className={cn(
          'flex flex-col border-r transition-all duration-300',
          collapsed ? 'w-16' : 'w-56',
        )}
        style={{
          backgroundColor: 'var(--sidebar-background)',
          borderColor: 'var(--sidebar-border)',
          color: 'var(--sidebar-foreground)',
        }}
      >
        {/* Logo */}
        <div className="flex h-14 items-center justify-center border-b px-4" style={{ borderColor: 'var(--sidebar-border)' }}>
          {collapsed ? (
            <span className="text-lg font-bold" style={{ color: 'var(--amber-primary)' }}>A</span>
          ) : (
            <span className="text-lg font-bold tracking-wide" style={{ color: 'var(--amber-primary)' }}>
              AISQA
            </span>
          )}
        </div>

        {/* 导航菜单 */}
        <nav className="flex-1 space-y-1 px-2 py-4">
          {publicNavItems.map((item) => {
            const active = isActive(item.path)
            return (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className={cn(
                  'flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                )}
                style={{
                  backgroundColor: active ? 'var(--amber-primary)' : 'transparent',
                  color: active ? 'var(--sidebar-primary-foreground)' : 'var(--sidebar-foreground)',
                  opacity: active ? 1 : 0.7,
                }}
                onMouseEnter={(e) => {
                  if (!active) {
                    e.currentTarget.style.backgroundColor = 'var(--sidebar-accent)'
                    e.currentTarget.style.opacity = '1'
                  }
                }}
                onMouseLeave={(e) => {
                  if (!active) {
                    e.currentTarget.style.backgroundColor = 'transparent'
                    e.currentTarget.style.opacity = '0.7'
                  }
                }}
                title={collapsed ? item.label : undefined}
              >
                <span className="shrink-0">{item.icon}</span>
                {!collapsed && <span>{item.label}</span>}
              </button>
            )
          })}
        </nav>

        {/* 底部导航 */}
        <div className="border-t px-2 py-2" style={{ borderColor: 'var(--sidebar-border)' }}>
          {bottomNavItems.map((item) => {
            const active = isActive(item.path)
            return (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className={cn(
                  'flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                )}
                style={{
                  backgroundColor: active ? 'var(--amber-primary)' : 'transparent',
                  color: active ? 'var(--sidebar-primary-foreground)' : 'var(--sidebar-foreground)',
                  opacity: active ? 1 : 0.7,
                }}
                onMouseEnter={(e) => {
                  if (!active) {
                    e.currentTarget.style.backgroundColor = 'var(--sidebar-accent)'
                    e.currentTarget.style.opacity = '1'
                  }
                }}
                onMouseLeave={(e) => {
                  if (!active) {
                    e.currentTarget.style.backgroundColor = 'transparent'
                    e.currentTarget.style.opacity = '0.7'
                  }
                }}
                title={collapsed ? item.label : undefined}
              >
                <span className="shrink-0">{item.icon}</span>
                {!collapsed && <span>{item.label}</span>}
              </button>
            )
          })}

          {/* 折叠按钮 */}
          <div className="mt-2">
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-center"
              style={{ color: 'var(--sidebar-foreground)', opacity: 0.5 }}
              onClick={() => setCollapsed(!collapsed)}
            >
              {collapsed ? (
                <ChevronRight className="h-4 w-4" />
              ) : (
                <ChevronLeft className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
      </aside>

      {/* ===== 右侧内容区 ===== */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* 顶部栏 */}
        <header
          className="flex h-14 items-center justify-between border-b px-6"
          style={{
            backgroundColor: 'var(--polaroid-white)',
            borderColor: 'var(--polaroid-border)',
          }}
        >
          <h1 className="text-lg font-semibold" style={{ color: 'var(--polaroid-text)' }}>
            {currentTitle}
          </h1>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-9 w-9 rounded-full">
                <Avatar className="h-9 w-9">
                  <AvatarFallback style={{ backgroundColor: 'var(--amber-primary)', color: 'white' }}>
                    {user?.display_name?.charAt(0) ?? 'U'}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <div className="flex items-center gap-2 px-2 py-1.5 text-sm font-medium">
                <User className="h-4 w-4" />
                <span>{user?.display_name ?? '用户'}</span>
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => navigate('/settings')}>
                <Settings className="mr-2 h-4 w-4" />
                <span>个人设置</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout} className="text-destructive focus:text-destructive">
                <LogOut className="mr-2 h-4 w-4" />
                <span>退出登录</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </header>

        {/* 内容区 */}
        <main className="flex-1 overflow-auto p-6">
          <Outlet />
        </main>
      </div>

      {/* AI 助手悬浮窗 */}
      <AiAssistantFloating />
    </div>
  )
}
