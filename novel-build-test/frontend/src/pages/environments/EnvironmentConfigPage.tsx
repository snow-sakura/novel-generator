import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ArrowLeft, Loader2, Save } from 'lucide-react'
import { environmentApi, projectApi, type ProjectItem } from '@/lib/api-service'

/**
 * 环境配置页 — 新建/编辑
 */
export default function EnvironmentConfigPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const isEdit = Boolean(id)

  const [projects, setProjects] = useState<ProjectItem[]>([])
  const [form, setForm] = useState({
    project_id: '',
    name: '',
    type: 'test',
    config_url: '',
    config_db: '',
  })
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(isEdit)

  useEffect(() => {
    projectApi.list({ page_size: 100 })
      .then((res) => setProjects(res.data.items))
      .catch(() => {})
  }, [])

  useEffect(() => {
    if (!id) return
    setLoading(true)
    environmentApi.detail(Number(id))
      .then((res) => {
        const e = res.data
        setForm({
          project_id: String(e.project_id),
          name: e.name,
          type: e.type,
          config_url: e.config?.url ?? '',
          config_db: e.config?.db ?? '',
        })
      })
      .catch(() => navigate('/environments'))
      .finally(() => setLoading(false))
  }, [id, navigate])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name.trim() || !form.project_id) return

    setSaving(true)
    try {
      const payload = {
        project_id: Number(form.project_id),
        name: form.name.trim(),
        type: form.type,
        config: { url: form.config_url, db: form.config_db },
      }

      if (isEdit) {
        await environmentApi.update(Number(id), payload)
      } else {
        await environmentApi.create(payload)
      }
      navigate('/environments')
    } catch {
      // ignore
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin" style={{ color: 'var(--amber-primary)' }} />
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => navigate('/environments')}>
          <ArrowLeft className="mr-1 h-4 w-4" />
          返回
        </Button>
        <h2 className="text-lg font-semibold" style={{ color: 'var(--polaroid-text)' }}>
          {isEdit ? '编辑环境' : '新建环境'}
        </h2>
      </div>

      <Card className="border-[var(--polaroid-border)] shadow-polaroid">
        <CardHeader className="border-b border-[var(--polaroid-border)] bg-[var(--polaroid-white)]">
          <CardTitle className="text-base" style={{ color: 'var(--polaroid-text)' }}>
            环境配置
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <form onSubmit={handleSubmit}>
            <div className="mb-4 space-y-1.5">
              <Label style={{ color: 'var(--polaroid-text)' }}>所属项目 *</Label>
              <Select
                value={form.project_id}
                onValueChange={(v) => setForm((f) => ({ ...f, project_id: v }))}
                disabled={isEdit}
              >
                <SelectTrigger className="border-[var(--polaroid-border)] bg-white">
                  <SelectValue placeholder="选择项目" />
                </SelectTrigger>
                <SelectContent>
                  {projects.map((p) => (
                    <SelectItem key={p.id} value={String(p.id)}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="mb-4 space-y-1.5">
              <Label style={{ color: 'var(--polaroid-text)' }}>环境名称 *</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="如：测试环境、预发布环境"
                className="border-[var(--polaroid-border)] bg-white"
                required
              />
            </div>

            <div className="mb-4 space-y-1.5">
              <Label style={{ color: 'var(--polaroid-text)' }}>环境类型</Label>
              <Select value={form.type} onValueChange={(v) => setForm((f) => ({ ...f, type: v }))}>
                <SelectTrigger className="w-40 border-[var(--polaroid-border)] bg-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="dev">开发环境</SelectItem>
                  <SelectItem value="test">测试环境</SelectItem>
                  <SelectItem value="staging">预发布环境</SelectItem>
                  <SelectItem value="production">生产环境</SelectItem>
                  <SelectItem value="custom">自定义</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="mb-4 space-y-1.5">
              <Label style={{ color: 'var(--polaroid-text)' }}>访问地址</Label>
              <Input
                value={form.config_url}
                onChange={(e) => setForm((f) => ({ ...f, config_url: e.target.value }))}
                placeholder="http://localhost:3000"
                className="border-[var(--polaroid-border)] bg-white"
              />
            </div>

            <div className="mb-6 space-y-1.5">
              <Label style={{ color: 'var(--polaroid-text)' }}>数据库配置</Label>
              <Input
                value={form.config_db}
                onChange={(e) => setForm((f) => ({ ...f, config_db: e.target.value }))}
                placeholder="mysql://user:pass@localhost:3306/db"
                className="border-[var(--polaroid-border)] bg-white"
              />
            </div>

            <div className="flex justify-end gap-3">
              <Button type="button" variant="outline" onClick={() => navigate('/environments')}
                className="border-[var(--polaroid-border)]">
                取消
              </Button>
              <Button type="submit" disabled={saving || !form.name.trim() || !form.project_id}
                className="bg-[var(--amber-primary)] text-white hover:bg-[var(--amber-hover)]">
                <Save className="mr-1 h-4 w-4" />
                {saving ? '保存中...' : '保存'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
