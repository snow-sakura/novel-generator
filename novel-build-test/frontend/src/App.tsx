import { BrowserRouter, Routes, Route, Navigate } from 'react-router'
import { Toaster } from '@/components/ui/toaster'
// 布局
import MainLayout from '@/components/MainLayout'
// 页面
import LoginPage from '@/pages/auth/LoginPage'
import RegisterPage from '@/pages/auth/RegisterPage'
import DashboardPage from '@/pages/dashboard/DashboardPage'
import ProjectListPage from '@/pages/projects/ProjectListPage'
import ProjectDetailPage from '@/pages/projects/ProjectDetailPage'
import RequirementsPage from '@/pages/requirements/RequirementsPage'
import RequirementFormPage from '@/pages/requirements/RequirementFormPage'
// 占位页面（后续批次实现完整 CRUD）
import PlaceholderPage from '@/pages/_placeholder/PlaceholderPage'

/**
 * 应用根组件
 * 配置 SPA 路由和全局 Toaster
 */
export default function App() {
  return (
    <>
      <BrowserRouter>
        <Routes>
          {/* 公开路由 */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />

          {/* 需要登录的路由，使用 MainLayout 包裹 */}
          <Route element={<MainLayout />}>
            {/* 首页 - 卡片矩阵 */}
            <Route path="/" element={<DashboardPage />} />

            {/* 公共模块 */}
            <Route path="/projects" element={<ProjectListPage />} />
            <Route path="/projects/:id" element={<ProjectDetailPage />} />
            <Route path="/requirements" element={<RequirementsPage />} />
            <Route path="/requirements/new" element={<RequirementFormPage />} />
            <Route path="/requirements/:id" element={<RequirementFormPage />} />
            <Route path="/environments" element={<PlaceholderPage title="测试环境" />} />
            <Route path="/assets" element={<PlaceholderPage title="测试资产库" />} />
            <Route path="/knowledge" element={<PlaceholderPage title="AI 知识库" />} />

            {/* 设置 */}
            <Route path="/settings" element={<PlaceholderPage title="系统设置" />} />

            {/* 旧页面路由 — 保留但重定向到首页 */}
            <Route path="/test-cases" element={<Navigate to="/" replace />} />
            <Route path="/executions" element={<Navigate to="/" replace />} />
            <Route path="/reports" element={<Navigate to="/" replace />} />
            <Route path="/agents" element={<Navigate to="/" replace />} />
            <Route path="/agents/debates" element={<Navigate to="/" replace />} />
            <Route path="/agents/costs" element={<Navigate to="/" replace />} />
            <Route path="/ai-native/向量库" element={<Navigate to="/knowledge" replace />} />
            <Route path="/ai-native/rag" element={<Navigate to="/knowledge" replace />} />
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
