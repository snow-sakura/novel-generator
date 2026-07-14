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
import { requirementApi, projectApi, type ProjectItem } from '@/lib/api-service'

/**
 * 需求表单页 — 新建/编辑
 */
export default function RequirementFormPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const isEdit = Boolean(id)

  const [projects, setProjects] = useState<ProjectItem[]>([])
  const [form, setForm] = useState({
    project_id: '',
    title: '',
    description: '',
    module: '',
    priority: 'P2',
  })
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(isEdit)

  // 加载项目列表
  useEffect(() => {
    projectApi.list({ page_size: 100 })
      .then((res) => setProjects(res.data.items))
      .catch(() => {})
  }, [])

  // 编辑模式：加载已有数据
  useEffect(() => {
    if (!id) return
    setLoading(true)
    requirementApi.detail(Number(id))
      .then((res) => {
        const r = res.data
        setForm({
          project_id: String(r.project_id),
          title: r.title,
          description: r.description ?? '',
          module: r.module ?? '',
          priority: r.priority,
        })
      })
      .catch(() => navigate('/requirements'))
      .finally(() => setLoading(false))
  }, [id, navigate])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.title.trim() || !form.project_id) return

    setSaving(true)
    try {
      const payload = {
        project_id: Number(form.project_id),
        title: form.title.trim(),
        description: form.description.trim() || undefined,
        module: form.module.trim() || undefined,
        priority: form.priority,
      }

      if (isEdit) {
        await requirementApi.update(Number(id), payload)
      } else {
        await requirementApi.create(payload)
      }
      navigate('/requirements')
    } catch {
      // 错误处理
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
      {/* 返回 */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => navigate('/requirements')}>
          <ArrowLeft className="mr-1 h-4 w-4" />
          返回
        </Button>
        <h2 className="text-lg font-semibold" style={{ color: 'var(--polaroid-text)' }}>
          {isEdit ? '编辑需求' : '新建需求'}
        </h2>
      </div>

      {/* 表单 */}
      <Card className="border-[var(--polaroid-border)] shadow-polaroid">
        <CardHeader className="border-b border-[var(--polaroid-border)] bg-[var(--polaroid-white)]">
          <CardTitle className="text-base" style={{ color: 'var(--polaroid-text)' }}>
            基本信息
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 p-6">
          <form onSubmit={handleSubmit}>
            {/* 项目选择 */}
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

            {/* 需求标题 */}
            <div className="mb-4 space-y-1.5">
              <Label style={{ color: 'var(--polaroid-text)' }}>需求标题 *</Label>
              <Input
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                placeholder="输入需求标题"
                className="border-[var(--polaroid-border)] bg-white"
                required
              />
            </div>

            {/* 模块 */}
            <div className="mb-4 space-y-1.5">
              <Label style={{ color: 'var(--polaroid-text)' }}>所属模块</Label>
              <Input
                value={form.module}
                onChange={(e) => setForm((f) => ({ ...f, module: e.target.value }))}
                placeholder="如：认证模块、支付模块"
                className="border-[var(--polaroid-border)] bg-white"
              />
            </div>

            {/* 优先级 */}
            <div className="mb-4 space-y-1.5">
              <Label style={{ color: 'var(--polaroid-text)' }}>优先级</Label>
              <Select
                value={form.priority}
                onValueChange={(v) => setForm((f) => ({ ...f, priority: v }))}
              >
                <SelectTrigger className="w-32 border-[var(--polaroid-border)] bg-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="P0">P0 紧急</SelectItem>
                  <SelectItem value="P1">P1 高</SelectItem>
                  <SelectItem value="P2">P2 中</SelectItem>
                  <SelectItem value="P3">P3 低</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* 描述 */}
            <div className="mb-6 space-y-1.5">
              <Label style={{ color: 'var(--polaroid-text)' }}>需求描述</Label>
              <textarea
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="详细描述需求内容..."
                rows={5}
                className="w-full rounded-lg border border-[var(--polaroid-border)] bg-white p-3 text-sm outline-none transition-colors focus:border-[var(--amber-primary)]"
              />
            </div>

            {/* 提交按钮 */}
            <div className="flex justify-end gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate('/requirements')}
                className="border-[var(--polaroid-border)]"
              >
                取消
              </Button>
              <Button
                type="submit"
                disabled={saving || !form.title.trim() || !form.project_id}
                className="bg-[var(--amber-primary)] text-white hover:bg-[var(--amber-hover)]"
              >
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
