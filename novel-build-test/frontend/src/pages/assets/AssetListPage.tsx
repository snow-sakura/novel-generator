"use client"

import { useEffect, useState } from "react"
import { useNavigate } from "react-router"
import { assetApi, type AssetResponse } from "@/lib/api-service"
import PolaroidCard from "@/components/polaroid/PolaroidCard"
import PolaroidGrid from "@/components/polaroid/PolaroidGrid"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Plus, Search, FileCode, FileText, Database, Settings, Image, Package } from "lucide-react"

const ASSET_TYPE_CONFIG: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  file: { label: "文件", icon: <FileText className="h-4 w-4" />, color: "text-blue-600" },
  script: { label: "脚本", icon: <FileCode className="h-4 w-4" />, color: "text-emerald-600" },
  data: { label: "数据", icon: <Database className="h-4 w-4" />, color: "text-purple-600" },
  config: { label: "配置", icon: <Settings className="h-4 w-4" />, color: "text-amber-600" },
  image: { label: "图片", icon: <Image className="h-4 w-4" />, color: "text-rose-600" },
  other: { label: "其他", icon: <Package className="h-4 w-4" />, color: "text-stone-600" },
}

export default function AssetListPage() {
  const navigate = useNavigate()
  const [assets, setAssets] = useState<AssetResponse[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [pageSize] = useState(20)
  const [search, setSearch] = useState("")
  const [typeFilter, setTypeFilter] = useState("")
  const [loading, setLoading] = useState(true)

  const fetchAssets = async () => {
    setLoading(true)
    try {
      const res = await assetApi.list({ page, pageSize, type: typeFilter || undefined, search: search || undefined })
      const data = res.data
      setAssets(data.items)
      setTotal(data.total)
    } catch (err) {
      console.error("Failed to fetch assets:", err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAssets()
  }, [page, typeFilter])

  const handleSearch = () => {
    setPage(1)
    fetchAssets()
  }

  const totalPages = Math.ceil(total / pageSize)

  return (
    <div className="animate-fade-in space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-serif text-3xl font-bold tracking-tight text-stone-800">
            测试资产库
          </h1>
          <p className="mt-1 text-sm text-stone-500">
            管理测试脚本、配置文件、测试数据等各类资产
          </p>
        </div>
        <Button
          onClick={() => navigate("/assets/new")}
          className="bg-amber-500 text-white shadow-md hover:bg-amber-600"
        >
          <Plus className="mr-1.5 h-4 w-4" />
          新建资产
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
          <Input
            placeholder="搜索资产名称..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            className="border-stone-200 bg-white pl-9 text-stone-700 placeholder:text-stone-400"
          />
        </div>
        <Select value={typeFilter} onValueChange={(v) => { setTypeFilter(v); setPage(1) }}>
          <SelectTrigger className="w-32 border-stone-200 bg-white text-stone-700">
            <SelectValue placeholder="全部分类" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value=" ">全部分类</SelectItem>
            {Object.entries(ASSET_TYPE_CONFIG).map(([key, cfg]) => (
              <SelectItem key={key} value={key}>
                <span className="flex items-center gap-2">
                  {cfg.icon}
                  {cfg.label}
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="text-sm text-stone-400">
          共 {total} 项
        </div>
      </div>

      {/* Asset Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-amber-200 border-t-amber-500" />
        </div>
      ) : assets.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-stone-400">
          <Package className="mb-3 h-12 w-12" />
          <p className="text-lg font-medium">暂无资产</p>
          <p className="mt-1 text-sm">点击"新建资产"开始添加</p>
        </div>
      ) : (
        <>
          <PolaroidGrid>
            {assets.map((asset) => {
              const typeCfg = ASSET_TYPE_CONFIG[asset.type] ?? ASSET_TYPE_CONFIG.other
              return (
                <PolaroidCard
                  key={asset.id}
                  onClick={() => navigate(`/assets/${asset.id}`)}
                  className="cursor-pointer"
                >
                  <div className="space-y-3">
                    {/* Type Badge */}
                    <div className="flex items-center justify-between">
                      <span className={`inline-flex items-center gap-1 rounded-full bg-stone-100 px-2.5 py-0.5 text-xs font-medium ${typeCfg.color}`}>
                        {typeCfg.icon}
                        {typeCfg.label}
                      </span>
                      <span className="text-xs text-stone-400">
                        v{asset.version}
                      </span>
                    </div>

                    {/* Name */}
                    <h3 className="font-serif text-lg font-semibold leading-tight text-stone-800 line-clamp-2">
                      {asset.name}
                    </h3>

                    {/* Tags */}
                    {asset.tags && (
                      <div className="flex flex-wrap gap-1">
                        {asset.tags.split(",").map((tag) => (
                          <span
                            key={tag.trim()}
                            className="rounded bg-amber-50 px-2 py-0.5 text-xs text-amber-700"
                          >
                            {tag.trim()}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Preview */}
                    {asset.content && (
                      <p className="line-clamp-3 text-xs leading-relaxed text-stone-500">
                        {asset.content}
                      </p>
                    )}

                    {/* Footer */}
                    <div className="flex items-center justify-between border-t border-stone-100 pt-2 text-xs text-stone-400">
                      <span>{new Date(asset.updated_at).toLocaleDateString("zh-CN")}</span>
                      {asset.file_size > 0 && (
                        <span>{asset.file_size > 1024 ? `${(asset.file_size / 1024).toFixed(1)} KB` : `${asset.file_size} B`}</span>
                      )}
                    </div>
                  </div>
                </PolaroidCard>
              )
            })}
          </PolaroidGrid>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 pt-4">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
                className="border-stone-200 text-stone-600"
              >
                上一页
              </Button>
              <span className="px-3 text-sm text-stone-500">
                {page} / {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="border-stone-200 text-stone-600"
              >
                下一页
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
