"use client"

import { useEffect, useState } from "react"
import { useNavigate, useParams } from "react-router"
import { assetApi, type AssetResponse, type AssetUpdate } from "@/lib/api-service"
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
  FileCode,
  FileText,
  Database,
  Settings,
  Image,
  Package,
} from "lucide-react"

const ASSET_TYPES = [
  { value: "file", label: "文件", icon: <FileText className="h-4 w-4" /> },
  { value: "script", label: "脚本", icon: <FileCode className="h-4 w-4" /> },
  { value: "data", label: "数据", icon: <Database className="h-4 w-4" /> },
  { value: "config", label: "配置", icon: <Settings className="h-4 w-4" /> },
  { value: "image", label: "图片", icon: <Image className="h-4 w-4" /> },
  { value: "other", label: "其他", icon: <Package className="h-4 w-4" /> },
]

export default function AssetDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const isNew = !id || id === "new"

  const [loading, setLoading] = useState(!isNew)
  const [saving, setSaving] = useState(false)
  const [asset, setAsset] = useState<AssetUpdate>({
    name: "",
    type: "file",
    tags: "",
    content: "",
  })
  const [original, setOriginal] = useState<AssetResponse | null>(null)

  useEffect(() => {
    if (!isNew && id) {
      const fetchAsset = async () => {
        try {
          const res = await assetApi.getById(Number(id))
          const data = res.data
          setAsset({ name: data.name, type: data.type, tags: data.tags ?? "", content: data.content ?? "" })
          setOriginal(data)
        } catch (err) {
          console.error("Failed to fetch asset:", err)
        } finally {
          setLoading(false)
        }
      }
      fetchAsset()
    }
  }, [id, isNew])

  const handleSave = async () => {
    setSaving(true)
    try {
      if (isNew) {
        await assetApi.create({
          project_id: 1,
          name: asset.name,
          type: asset.type ?? "file",
          tags: asset.tags || null,
          content: asset.content || null,
        })
      } else if (id) {
        await assetApi.update(Number(id), asset)
      }
      navigate("/assets")
    } catch (err) {
      console.error("Failed to save asset:", err)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!id || isNew) return
    if (!window.confirm("确定删除此资产？")) return
    try {
      await assetApi.delete(Number(id))
      navigate("/assets")
    } catch (err) {
      console.error("Failed to delete asset:", err)
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
            onClick={() => navigate("/assets")}
            className="text-stone-500 hover:text-stone-700"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="font-serif text-2xl font-bold text-stone-800">
              {isNew ? "新建资产" : "编辑资产"}
            </h1>
            {original && (
              <p className="text-xs text-stone-400">
                版本 v{original.version} · 创建于 {new Date(original.created_at).toLocaleDateString("zh-CN")}
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {!isNew && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleDelete}
              className="border-red-200 text-red-600 hover:bg-red-50"
            >
              <Trash2 className="mr-1.5 h-4 w-4" />
              删除
            </Button>
          )}
          <Button
            size="sm"
            onClick={handleSave}
            disabled={saving || !asset.name.trim()}
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
          {/* Name */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-stone-700">
              资产名称 <span className="text-red-500">*</span>
            </label>
            <Input
              value={asset.name}
              onChange={(e) => setAsset((a) => ({ ...a, name: e.target.value }))}
              placeholder="输入资产名称"
              className="border-stone-200 bg-white text-stone-700"
            />
          </div>

          {/* Type */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-stone-700">资产类型</label>
            <Select
              value={asset.type ?? "file"}
              onValueChange={(v) => setAsset((a) => ({ ...a, type: v }))}
            >
              <SelectTrigger className="w-full border-stone-200 bg-white text-stone-700">
                <SelectValue placeholder="选择类型" />
              </SelectTrigger>
              <SelectContent>
                {ASSET_TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    <span className="flex items-center gap-2">
                      {t.icon}
                      {t.label}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Tags */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-stone-700">
              标签 <span className="text-xs text-stone-400">（逗号分隔）</span>
            </label>
            <Input
              value={asset.tags ?? ""}
              onChange={(e) => setAsset((a) => ({ ...a, tags: e.target.value }))}
              placeholder="例如: 接口测试,登录模块,性能"
              className="border-stone-200 bg-white text-stone-700"
            />
          </div>

          {/* Content */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-stone-700">
              内容 <span className="text-xs text-stone-400">（文本内容）</span>
            </label>
            <textarea
              value={asset.content ?? ""}
              onChange={(e) => setAsset((a) => ({ ...a, content: e.target.value }))}
              placeholder="输入资产内容..."
              rows={12}
              className="w-full rounded-lg border border-stone-200 bg-white p-3 font-mono text-sm text-stone-700 placeholder:text-stone-400 focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-100"
            />
          </div>
        </div>
      </PolaroidCard>
    </div>
  )
}
