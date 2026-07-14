import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'

/**
 * 个人设置页面
 * 包含基本资料编辑和密码修改功能
 */
export default function SettingsPage() {
  const [profile, setProfile] = useState({
    username: 'admin',
    displayName: '管理员',
    email: 'admin@aisqa.com',
  })

  const [passwords, setPasswords] = useState({
    current: '',
    newPassword: '',
    confirm: '',
  })

  /** 保存个人资料 */
  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault()
    // TODO: 调用 API 保存
  }

  /** 修改密码 */
  const handleChangePassword = (e: React.FormEvent) => {
    e.preventDefault()
    // TODO: 调用 API 修改密码
  }

  return (
    <div className="max-w-2xl space-y-6">
      {/* 个人资料 */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <Avatar className="h-14 w-14">
              <AvatarFallback className="bg-primary text-lg text-primary-foreground">
                {profile.displayName.charAt(0)}
              </AvatarFallback>
            </Avatar>
            <div>
              <CardTitle>个人资料</CardTitle>
              <CardDescription>修改您的基本信息</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSaveProfile} className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="username">用户名</Label>
                <Input
                  id="username"
                  value={profile.username}
                  onChange={(e) => setProfile({ ...profile, username: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="displayName">显示名称</Label>
                <Input
                  id="displayName"
                  value={profile.displayName}
                  onChange={(e) => setProfile({ ...profile, displayName: e.target.value })}
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="email">邮箱</Label>
                <Input
                  id="email"
                  type="email"
                  value={profile.email}
                  onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                />
              </div>
            </div>
            <Button type="submit">保存修改</Button>
          </form>
        </CardContent>
      </Card>

      <Separator />

      {/* 密码修改 */}
      <Card>
        <CardHeader>
          <CardTitle>修改密码</CardTitle>
          <CardDescription>定期更换密码可以提高账号安全性</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleChangePassword} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="currentPassword">当前密码</Label>
              <Input
                id="currentPassword"
                type="password"
                value={passwords.current}
                onChange={(e) => setPasswords({ ...passwords, current: e.target.value })}
                required
              />
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="newPassword">新密码</Label>
                <Input
                  id="newPassword"
                  type="password"
                  value={passwords.newPassword}
                  onChange={(e) => setPasswords({ ...passwords, newPassword: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">确认新密码</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={passwords.confirm}
                  onChange={(e) => setPasswords({ ...passwords, confirm: e.target.value })}
                  required
                />
              </div>
            </div>
            <Button type="submit" variant="outline">更新密码</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
