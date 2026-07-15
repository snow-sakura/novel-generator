import { BrowserRouter, Routes, Route, Navigate } from 'react-router'
import { Toaster } from '@/components/ui/toaster'
// 布局
import HomeLayout from '@/components/layout/HomeLayout'
import MainLayout from '@/components/MainLayout'
// 页面
import LoginPage from '@/pages/auth/LoginPage'
import RegisterPage from '@/pages/auth/RegisterPage'
import DashboardPage from '@/pages/dashboard/DashboardPage'
import ModuleDetailPage from '@/pages/modules/ModuleDetailPage'

/**
 * 应用根组件
 * 配置 SPA 路由和全局 Toaster
 *
 * 布局规则：
 *   第一层 — 首页（/）：HomeLayout（无侧边栏，仅顶部栏 + 卡片矩阵）
 *   第二层 — 详情页：MainLayout（顶部栏 + 左侧导航 + 右侧内容）
 */
export default function App() {
  return (
    <>
      <BrowserRouter>
        <Routes>
          {/* 公开路由（无布局） */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />

          {/* ===== 第一层：首页 — 无侧边栏 ===== */}
          <Route element={<HomeLayout />}>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/modules/:moduleKey" element={<ModuleDetailPage />} />
          </Route>

          {/* ===== 第二层：详情页 — 有侧边栏 ===== */}
          <Route element={<MainLayout />}>
            {/* 旧页面路由 — 重定向到首页 */}
            <Route path="/projects" element={<Navigate to="/" replace />} />
            <Route path="/requirements" element={<Navigate to="/" replace />} />
            <Route path="/environments" element={<Navigate to="/" replace />} />
            <Route path="/assets" element={<Navigate to="/" replace />} />
            <Route path="/knowledge" element={<Navigate to="/" replace />} />
            <Route path="/settings" element={<Navigate to="/" replace />} />
            <Route path="/agents" element={<Navigate to="/" replace />} />
            <Route path="/executions" element={<Navigate to="/" replace />} />
            <Route path="/reports" element={<Navigate to="/" replace />} />
            <Route path="/audit" element={<Navigate to="/" replace />} />
          </Route>

          {/* 未匹配路由重定向到首页 */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
      <Toaster />
    </>
  )
}
