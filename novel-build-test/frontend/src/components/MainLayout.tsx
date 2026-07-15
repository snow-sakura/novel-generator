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
import { getModulesByGroup, groupOrder } from '@/lib/modules'
import {
  LayoutDashboard,
  ChevronLeft,
  ChevronRight,
  LogOut,
  User,
} from 'lucide-react'

export default function MainLayout() {
  const [collapsed, setCollapsed] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()
  const { user, logout } = useAuthStore()
  const grouped = getModulesByGroup()

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
        <nav className="flex-1 space-y-1 px-2 py-4 overflow-y-auto">
          {/* 首页 */}
          <button
            onClick={() => navigate('/')}
            className={cn(
              'flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
            )}
            style={{
              backgroundColor: isActive('/') ? 'var(--amber-primary)' : 'transparent',
              color: isActive('/') ? 'var(--sidebar-primary-foreground)' : 'var(--sidebar-foreground)',
              opacity: isActive('/') ? 1 : 0.7,
            }}
            onMouseEnter={(e) => {
              if (!isActive('/')) {
                e.currentTarget.style.backgroundColor = 'var(--sidebar-accent)'
                e.currentTarget.style.opacity = '1'
              }
            }}
            onMouseLeave={(e) => {
              if (!isActive('/')) {
                e.currentTarget.style.backgroundColor = 'transparent'
                e.currentTarget.style.opacity = '0.7'
              }
            }}
            title={collapsed ? '首页' : undefined}
          >
            <span className="shrink-0"><LayoutDashboard className="h-5 w-5" /></span>
            {!collapsed && <span>首页</span>}
          </button>

          {/* 按分组显示模块 */}
          {groupOrder.map((group) => {
            const mods = grouped.get(group)
            if (!mods || mods.length === 0) return null
            return (
              <div key={group}>
                {!collapsed && (
                  <div className="mt-4 mb-1 px-3 text-[10px] font-semibold uppercase tracking-wider"
                    style={{ color: 'var(--polaroid-text-muted)' }}>
                    {group}
                  </div>
                )}
                {mods.map((mod) => {
                  const ModIcon = mod.icon
                  const active = location.pathname.startsWith(`/modules/${mod.key}`)
                  return (
                    <button
                      key={mod.key}
                      onClick={() => navigate(`/modules/${mod.key}`)}
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
                      title={collapsed ? mod.title : undefined}
                    >
                      <span className="shrink-0"><ModIcon className="h-5 w-5" /></span>
                      {!collapsed && <span className="truncate">{mod.title}</span>}
                    </button>
                  )
                })}
              </div>
            )
          })}
        </nav>

        {/* 底部折叠按钮 */}
        <div className="border-t px-2 py-2" style={{ borderColor: 'var(--sidebar-border)' }}>
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
            AISQA
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
