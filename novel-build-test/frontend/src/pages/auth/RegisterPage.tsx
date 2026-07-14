import { useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { authApi } from '@/lib/api-service'

/**
 * 注册页面
 * 居中卡片式注册表单，注册成功后跳转到登录页
 */
export default function RegisterPage() {
  const navigate = useNavigate()
  const [form, setForm] = useState({
    username: '',
    email: '',
    displayName: '',
    password: '',
    confirmPassword: '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  /** 更新表单字段 */
  const updateField = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  /** 处理注册提交 */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (form.password !== form.confirmPassword) {
      setError('两次输入的密码不一致')
      return
    }

    setLoading(true)

    try {
      await authApi.register({
        username: form.username,
        email: form.email,
        password: form.password,
        display_name: form.displayName || undefined,
      })
      // 注册成功后跳转到登录页
      navigate('/login')
    } catch {
      setError('注册失败，请稍后重试')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 px-4">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="space-y-1 text-center">
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-primary text-lg font-bold text-primary-foreground">
            A
          </div>
          <CardTitle className="text-2xl font-bold">创建账号</CardTitle>
          <CardDescription>注册 AISQA 测试平台</CardDescription>
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
                value={form.username}
                onChange={(e) => updateField('username', e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">邮箱</Label>
              <Input
                id="email"
                type="email"
                placeholder="请输入邮箱"
                value={form.email}
                onChange={(e) => updateField('email', e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="displayName">显示名称</Label>
              <Input
                id="displayName"
                placeholder="请输入显示名称"
                value={form.displayName}
                onChange={(e) => updateField('displayName', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">密码</Label>
              <Input
                id="password"
                type="password"
                placeholder="请设置密码"
                value={form.password}
                onChange={(e) => updateField('password', e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">确认密码</Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="请再次输入密码"
                value={form.confirmPassword}
                onChange={(e) => updateField('confirmPassword', e.target.value)}
                required
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? '注册中...' : '注册'}
            </Button>
            <p className="text-center text-sm text-muted-foreground">
              已有账号？{' '}
              <Link to="/login" className="text-primary underline-offset-4 hover:underline">
                立即登录
              </Link>
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
