import { Outlet, useNavigate } from 'react-router'
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
  LogOut,
  User,
} from 'lucide-react'

/**
 * 首页布局 — 无侧边栏，仅顶部栏 + 内容区
 *
 * 根据设计规范（前端设计规范.md）：
 *   第一层：首页卡片矩阵（无侧边栏，点击卡片进入详情）
 *   第二层：详情页内部（左侧导航 + 右侧内容）
 */
export default function HomeLayout() {
  const navigate = useNavigate()
  const { user, logout } = useAuthStore()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <div
      className="flex h-screen flex-col overflow-hidden"
      style={{ backgroundColor: 'var(--polaroid-cream)' }}
    >
      {/* ===== 顶部栏 ===== */}
      <header
        className="flex h-14 items-center justify-between border-b px-6"
        style={{
          backgroundColor: 'var(--polaroid-white)',
          borderColor: 'var(--polaroid-border)',
        }}
      >
        <div className="flex items-center gap-3">
          <span
            className="text-xl font-bold tracking-wide"
            style={{ color: 'var(--amber-primary)' }}
          >
            AISQA
          </span>
          <span className="text-sm text-muted-foreground">· AI 测试平台</span>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="relative h-9 w-9 rounded-full">
              <Avatar className="h-9 w-9">
                <AvatarFallback
                  style={{ backgroundColor: 'var(--amber-primary)', color: 'white' }}
                >
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
            <DropdownMenuItem
              onClick={handleLogout}
              className="text-destructive focus:text-destructive"
            >
              <LogOut className="mr-2 h-4 w-4" />
              <span>退出登录</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </header>

      {/* ===== 内容区（无侧边栏，全宽） ===== */}
      <main className="flex-1 overflow-hidden">
        <Outlet />
      </main>

      {/* AI 助手悬浮窗 */}
      <AiAssistantFloating />
    </div>
  )
}
