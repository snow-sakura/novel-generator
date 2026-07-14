"use client"

import { useEffect, useState } from "react"
import { useNavigate, useParams } from "react-router"
import { knowledgeApi, type KnowledgeItem } from "@/lib/api-service"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import PolaroidCard from "@/components/polaroid/PolaroidCard"
import {
  ArrowLeft,
  Save,
  Trash2,
  RefreshCw,
  BookOpen,
  FileText,
  Zap,
  Code,
  Globe,
} from "lucide-react"

const COLLECTION_OPTIONS = [
  { value: "tech_doc_knowledge", label: "技术文档", icon: <BookOpen className="h-4 w-4" /> },
  { value: "test_case_knowledge", label: "用例知识", icon: <FileText className="h-4 w-4" /> },
  { value: "execution_history", label: "执行历史", icon: <Zap className="h-4 w-4" /> },
  { value: "agent_memory", label: "智能体记忆", icon: <Code className="h-4 w-4" /> },
  { value: "bug_knowledge", label: "缺陷知识", icon: <Globe className="h-4 w-4" /> },
]

const SOURCE_OPTIONS = [
  { value: "manual", label: "手动录入" },
  { value: "file", label: "文件导入" },
  { value: "api", label: "API 同步" },
]

interface FormData {
  title: string
  content: string
  source: string
  tags: string
  collection_name: string
}

export default function KnowledgeDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const isNew = !id || id === "new"

  const [loading, setLoading] = useState(!isNew)
  const [saving, setSaving] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [original, setOriginal] = useState<KnowledgeItem | null>(null)
  const [form, setForm] = useState<FormData>({
    title: "",
    content: "",
    source: "manual",
    tags: "",
    collection_name: "tech_doc_knowledge",
  })

  useEffect(() => {
    if (!isNew && id) {
      const fetchItem = async () => {
        try {
          const res = await knowledgeApi.getById(Number(id))
          const data = res.data
          setForm({
            title: data.title,
            content: data.content ?? "",
            source: data.source,
            tags: data.tags ?? "",
            collection_name: data.collection_name,
          })
          setOriginal(data)
        } catch (err) {
          console.error("Failed to fetch knowledge:", err)
        } finally {
          setLoading(false)
        }
      }
      fetchItem()
    }
  }, [id, isNew])

  const handleSave = async () => {
    setSaving(true)
    try {
      if (isNew) {
        await knowledgeApi.create({
          project_id: 1,
          title: form.title,
          content: form.content || null,
          source: form.source,
          tags: form.tags || null,
          collection_name: form.collection_name,
        })
      } else if (id) {
        await knowledgeApi.update(Number(id), {
          title: form.title,
          content: form.content || null,
          source: form.source,
          tags: form.tags || null,
        })
      }
      navigate("/knowledge")
    } catch (err) {
      console.error("Failed to save knowledge:", err)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!id || isNew) return
    if (!window.confirm("确定删除此知识条目？（向量库中的对应数据也将被删除）")) return
    try {
      await knowledgeApi.delete(Number(id))
      navigate("/knowledge")
    } catch (err) {
      console.error("Failed to delete knowledge:", err)
    }
  }

  const handleSync = async () => {
    if (!id || isNew) return
    setSyncing(true)
    try {
      const res = await knowledgeApi.sync(Number(id))
      setOriginal(res.data)
    } catch (err) {
      console.error("Failed to sync:", err)
    } finally {
      setSyncing(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-amber-200 border-t-amber-500" />
      </div>
    )
  }

  return (
    <div className="animate-fade-in space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/knowledge")}
            className="text-stone-500 hover:text-stone-700"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="font-serif text-2xl font-bold text-stone-800">
              {isNew ? "新建知识" : "编辑知识"}
            </h1>
            {original && (
              <p className="flex items-center gap-2 text-xs text-stone-400">
                <span>创建于 {new Date(original.created_at).toLocaleDateString("zh-CN")}</span>
                <span
                  className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 ${
                    original.vector_synced
                      ? "bg-emerald-50 text-emerald-600"
                      : "bg-amber-50 text-amber-600"
                  }`}
                >
                  {original.vector_synced ? "已同步" : "待同步"}
                </span>
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {!isNew && original && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={handleSync}
                disabled={syncing}
                className="border-stone-200 text-stone-600"
              >
                <RefreshCw className={`mr-1.5 h-4 w-4 ${syncing ? "animate-spin" : ""}`} />
                {syncing ? "同步中..." : "同步向量"}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleDelete}
                className="border-red-200 text-red-600 hover:bg-red-50"
              >
                <Trash2 className="mr-1.5 h-4 w-4" />
                删除
              </Button>
            </>
          )}
          <Button
            size="sm"
            onClick={handleSave}
            disabled={saving || !form.title.trim()}
            className="bg-amber-500 text-white shadow-md hover:bg-amber-600 disabled:opacity-50"
          >
            <Save className="mr-1.5 h-4 w-4" />
            {saving ? "保存中..." : "保存"}
          </Button>
        </div>
      </div>

      {/* Form */}
      <PolaroidCard className="max-w-2xl">
        <div className="space-y-5">
          {/* Title */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-stone-700">
              知识标题 <span className="text-red-500">*</span>
            </label>
            <Input
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              placeholder="输入知识标题"
              className="border-stone-200 bg-white text-stone-700"
            />
          </div>

          {/* Collection + Source */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-stone-700">所属集合</label>
              <Select
                value={form.collection_name}
                onValueChange={(v) => setForm((f) => ({ ...f, collection_name: v }))}
              >
                <SelectTrigger className="w-full border-stone-200 bg-white text-stone-700">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {COLLECTION_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      <span className="flex items-center gap-2">
                        {o.icon}
                        {o.label}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-stone-700">来源</label>
              <Select
                value={form.source}
                onValueChange={(v) => setForm((f) => ({ ...f, source: v }))}
              >
                <SelectTrigger className="w-full border-stone-200 bg-white text-stone-700">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SOURCE_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Tags */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-stone-700">
              标签 <span className="text-xs text-stone-400">（逗号分隔）</span>
            </label>
            <Input
              value={form.tags}
              onChange={(e) => setForm((f) => ({ ...f, tags: e.target.value }))}
              placeholder="例如: 接口测试,性能优化,最佳实践"
              className="border-stone-200 bg-white text-stone-700"
            />
          </div>

          {/* Content */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-stone-700">
              正文 <span className="text-xs text-stone-400">（Markdown 格式）</span>
            </label>
            <textarea
              value={form.content}
              onChange={(e) => setForm((f) => ({ ...f, content: e.target.value }))}
              placeholder="输入知识正文（支持 Markdown）..."
              rows={16}
              className="w-full rounded-lg border border-stone-200 bg-white p-3 font-mono text-sm text-stone-700 placeholder:text-stone-400 focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-100"
            />
          </div>
        </div>
      </PolaroidCard>
    </div>
  )
}
