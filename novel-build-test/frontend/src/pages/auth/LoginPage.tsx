import { useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { useAuthStore } from '@/lib/auth-store'
import { authApi } from '@/lib/api-service'

/**
 * 登录页面
 * 居中卡片式登录表单，带 AISQA Logo
 */
export default function LoginPage() {
  const navigate = useNavigate()
  const { setAuth } = useAuthStore()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  /** 处理登录提交 */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const res = await authApi.login(username, password)
      setAuth(res.data.access_token, res.data.refresh_token, res.data.user)
      navigate('/')
    } catch {
      setError('登录失败，请检查用户名和密码')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 px-4">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="space-y-1 text-center">
          {/* Logo */}
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-primary text-lg font-bold text-primary-foreground">
            A
          </div>
          <CardTitle className="text-2xl font-bold">AISQA</CardTitle>
          <CardDescription>AI 测试平台 · 登录</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {error}
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="username">用户名</Label>
              <Input
                id="username"
                placeholder="请输入用户名"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">密码</Label>
              <Input
                id="password"
                type="password"
                placeholder="请输入密码"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? '登录中...' : '登录'}
            </Button>
            <p className="text-center text-sm text-muted-foreground">
              还没有账号？{' '}
              <Link to="/register" className="text-primary underline-offset-4 hover:underline">
                立即注册
              </Link>
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
