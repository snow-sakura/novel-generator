"use client"

import { useEffect, useState } from "react"
import { useNavigate } from "react-router"
import { knowledgeApi, type KnowledgeItem } from "@/lib/api-service"
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
import { Plus, Search, BookOpen, FileText, Code, Globe, Library, Zap } from "lucide-react"

const COLLECTION_CONFIG: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  test_case_knowledge: { label: "用例知识", icon: <FileText className="h-4 w-4" />, color: "text-blue-600" },
  tech_doc_knowledge: { label: "技术文档", icon: <BookOpen className="h-4 w-4" />, color: "text-emerald-600" },
  execution_history: { label: "执行历史", icon: <Zap className="h-4 w-4" />, color: "text-purple-600" },
  agent_memory: { label: "智能体记忆", icon: <Code className="h-4 w-4" />, color: "text-amber-600" },
  bug_knowledge: { label: "缺陷知识", icon: <Globe className="h-4 w-4" />, color: "text-rose-600" },
}

const SOURCE_LABELS: Record<string, string> = {
  manual: "手动录入",
  file: "文件导入",
  api: "API 同步",
}

export default function KnowledgeListPage() {
  const navigate = useNavigate()
  const [items, setItems] = useState<KnowledgeItem[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [pageSize] = useState(20)
  const [search, setSearch] = useState("")
  const [collectionFilter, setCollectionFilter] = useState("")
  const [loading, setLoading] = useState(true)

  const fetchItems = async () => {
    setLoading(true)
    try {
      const res = await knowledgeApi.list({
        page,
        pageSize,
        collection: collectionFilter || undefined,
        search: search || undefined,
      })
      const data = res.data
      setItems(data.items)
      setTotal(data.total)
    } catch (err) {
      console.error("Failed to fetch knowledge:", err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchItems()
  }, [page, collectionFilter])

  const handleSearch = () => {
    setPage(1)
    fetchItems()
  }

  const totalPages = Math.ceil(total / pageSize)

  return (
    <div className="animate-fade-in space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-serif text-3xl font-bold tracking-tight text-stone-800">
            AI 知识库
          </h1>
          <p className="mt-1 text-sm text-stone-500">
            管理测试知识文档，自动同步到向量数据库供语义检索
          </p>
        </div>
        <Button
          onClick={() => navigate("/knowledge/new")}
          className="bg-amber-500 text-white shadow-md hover:bg-amber-600"
        >
          <Plus className="mr-1.5 h-4 w-4" />
          新建知识
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
          <Input
            placeholder="搜索知识标题..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            className="border-stone-200 bg-white pl-9 text-stone-700 placeholder:text-stone-400"
          />
        </div>
        <Select
          value={collectionFilter}
          onValueChange={(v) => { setCollectionFilter(v); setPage(1) }}
        >
          <SelectTrigger className="w-36 border-stone-200 bg-white text-stone-700">
            <SelectValue placeholder="全部分类" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value=" ">全部分类</SelectItem>
            {Object.entries(COLLECTION_CONFIG).map(([key, cfg]) => (
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
          共 {total} 篇
        </div>
      </div>

      {/* Knowledge Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-amber-200 border-t-amber-500" />
        </div>
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-stone-400">
          <Library className="mb-3 h-12 w-12" />
          <p className="text-lg font-medium">知识库为空</p>
          <p className="mt-1 text-sm">点击"新建知识"开始构建知识库</p>
        </div>
      ) : (
        <>
          <PolaroidGrid>
            {items.map((item) => {
              const colCfg = COLLECTION_CONFIG[item.collection_name] ?? COLLECTION_CONFIG.tech_doc_knowledge
              return (
                <PolaroidCard
                  key={item.id}
                  onClick={() => navigate(`/knowledge/${item.id}`)}
                  className="cursor-pointer"
                >
                  <div className="space-y-3">
                    {/* Badge row */}
                    <div className="flex items-center justify-between">
                      <span
                        className={`inline-flex items-center gap-1 rounded-full bg-stone-100 px-2.5 py-0.5 text-xs font-medium ${colCfg.color}`}
                      >
                        {colCfg.icon}
                        {colCfg.label}
                      </span>
                      <span className="text-xs text-stone-400">
                        {SOURCE_LABELS[item.source] ?? item.source}
                      </span>
                    </div>

                    {/* Title */}
                    <h3 className="font-serif text-lg font-semibold leading-tight text-stone-800 line-clamp-2">
                      {item.title}
                    </h3>

                    {/* Preview */}
                    {item.content && (
                      <p className="line-clamp-3 text-xs leading-relaxed text-stone-500">
                        {item.content}
                      </p>
                    )}

                    {/* Footer */}
                    <div className="flex items-center justify-between border-t border-stone-100 pt-2 text-xs text-stone-400">
                      <span>{new Date(item.updated_at).toLocaleDateString("zh-CN")}</span>
                      <span className={item.vector_synced ? "text-emerald-500" : "text-amber-500"}>
                        {item.vector_synced ? "已同步" : "待同步"}
                      </span>
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
