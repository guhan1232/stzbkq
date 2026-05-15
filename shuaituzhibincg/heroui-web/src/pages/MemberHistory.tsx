import { useState, useEffect } from 'react'
import { ApiGetMemberHistory } from '../api'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { RefreshCcw } from 'lucide-react'

export default function MemberHistory() {
  const [loading, setLoading] = useState(false)
  const [history, setHistory] = useState<any[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const pageSize = 20
  const [actionFilter, setActionFilter] = useState<string>('all')

  const loadHistory = async (p = page, action = actionFilter) => {
    setLoading(true)
    try {
      const res = await ApiGetMemberHistory({
        page: p,
        page_size: pageSize,
        action: action === 'all' ? '' : action
      })
      if (res.data.code === 200) {
        const list = res.data.data?.list
        setHistory(Array.isArray(list) ? list : [])
        setTotal(res.data.data?.total || 0)
        setPage(p)
      }
    } catch (error) {
      alert('加载失败')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadHistory(1, actionFilter)
  }, [actionFilter])

  const formatTime = (timestamp: number) => {
    if (!timestamp) return '-'
    const date = new Date(timestamp * 1000)
    return date.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const pages = Math.ceil(total / pageSize)

  return (
    <div className="max-w-6xl mx-auto space-y-4 pb-12">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-bold text-gray-800">成员变动记录</h2>
          <span className="px-3 py-1 text-xs font-semibold text-gray-600 bg-gray-100 rounded-full">
            共 {total} 条记录
          </span>
        </div>
        <div className="flex gap-2 items-center w-full sm:w-auto">
          <Select value={actionFilter} onValueChange={(v) => setActionFilter(v)}>
            <SelectTrigger className="w-32 h-9">
              <SelectValue placeholder="筛选类型" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部</SelectItem>
              <SelectItem value="join">加入</SelectItem>
              <SelectItem value="leave">退出</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={() => loadHistory()}>
            <RefreshCcw size={14} className="mr-1" />
            刷新
          </Button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-gray-50">
              <TableHead>玩家名称</TableHead>
              <TableHead className="text-center">操作类型</TableHead>
              <TableHead>当时分组</TableHead>
              <TableHead className="text-right">当时势力</TableHead>
              <TableHead>时间</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-gray-500">加载中...</TableCell>
              </TableRow>
            ) : history.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-gray-500">暂无数据</TableCell>
              </TableRow>
            ) : (
              history.map((item: any) => (
                <TableRow key={item.id}>
                  <TableCell>
                    <span className="font-medium text-gray-900">{item.player_name}</span>
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant={item.action === 'join' ? 'default' : 'destructive'}>
                      {item.action === 'join' ? '加入' : '退出'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <span className="inline-block px-2 py-1 bg-blue-50 text-blue-600 rounded text-xs font-medium">
                      {item.group_name || '-'}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <span className="font-medium text-gray-900">{item.power || '-'}</span>
                  </TableCell>
                  <TableCell className="text-sm text-gray-500">
                    {formatTime(item.action_time)}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
        {pages > 0 && (
          <div className="flex items-center justify-end gap-2 p-4 border-t border-gray-100">
            <span className="text-sm text-gray-600">共 {total} 条，{pages} 页</span>
            <Button
              variant="outline"
              size="sm"
              disabled={page === 1}
              onClick={() => loadHistory(page - 1)}
            >
              上一页
            </Button>
            <span className="text-sm text-gray-700">{page} / {pages}</span>
            <Button
              variant="outline"
              size="sm"
              disabled={page === pages}
              onClick={() => loadHistory(page + 1)}
            >
              下一页
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
