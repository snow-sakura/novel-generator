import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

/** 需求数据类型 */
interface Requirement {
  id: number
  title: string
  module: string
  priority: 'P0' | 'P1' | 'P2' | 'P3'
  status: 'draft' | 'review' | 'approved' | 'implemented'
  updated_at: string
}

/** 模拟需求数据 */
const mockRequirements: Requirement[] = [
  { id: 1, title: '用户登录功能', module: '认证模块', priority: 'P0', status: 'implemented', updated_at: '2026-07-10' },
  { id: 2, title: '商品搜索与筛选', module: '商品模块', priority: 'P0', status: 'approved', updated_at: '2026-07-08' },
  { id: 3, title: '购物车管理', module: '订单模块', priority: 'P1', status: 'approved', updated_at: '2026-07-05' },
  { id: 4, title: '在线支付', module: '支付模块', priority: 'P0', status: 'review', updated_at: '2026-07-03' },
  { id: 5, title: '订单管理后台', module: '管理后台', priority: 'P1', status: 'draft', updated_at: '2026-06-28' },
  { id: 6, title: '用户反馈系统', module: '客服模块', priority: 'P2', status: 'draft', updated_at: '2026-06-25' },
  { id: 7, title: '多语言支持', module: '系统设置', priority: 'P3', status: 'review', updated_at: '2026-06-20' },
]

/** 优先级颜色映射 */
const priorityMap: Record<string, { label: string; variant: 'default' | 'destructive' | 'secondary' | 'outline' }> = {
  P0: { label: 'P0-关键', variant: 'destructive' },
  P1: { label: 'P1-重要', variant: 'default' },
  P2: { label: 'P2-一般', variant: 'secondary' },
  P3: { label: 'P3-可选', variant: 'outline' },
}

/** 状态映射 */
const statusMap: Record<string, string> = {
  draft: '草稿',
  review: '评审中',
  approved: '已批准',
  implemented: '已实现',
}

/**
 * 需求管理页面
 * 展示需求列表表格
 */
export default function RequirementsPage() {
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">需求列表</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>需求标题</TableHead>
                <TableHead>所属模块</TableHead>
                <TableHead>优先级</TableHead>
                <TableHead>状态</TableHead>
                <TableHead>更新时间</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {mockRequirements.map((req) => (
                <TableRow key={req.id}>
                  <TableCell className="font-medium">{req.title}</TableCell>
                  <TableCell>{req.module}</TableCell>
                  <TableCell>
                    <Badge variant={priorityMap[req.priority].variant}>
                      {priorityMap[req.priority].label}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm">{statusMap[req.status]}</span>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{req.updated_at}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
