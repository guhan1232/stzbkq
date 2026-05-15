import { useState, useEffect } from 'react'
import { ApiGetGroupWu } from '../api'
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
import { RefreshCcw } from 'lucide-react'

export default function GroupWu() {
  const [loading, setLoading] = useState(false)
  const [groupData, setGroupData] = useState<any[]>([])

  const loadData = async () => {
    setLoading(true)
    try {
      const res = await ApiGetGroupWu()
      if (res.data.code === 200) {
        const data = res.data.data
        if (Array.isArray(data)) {
          const validData = data.map((item: any, idx: number) => ({
            ...item,
            id: item.id || item.group || `group-${idx}`
          }))
          setGroupData(validData)
        } else {
          console.error('分组武勋数据格式错误，期望数组:', data)
          setGroupData([])
        }
      } else {
        console.error('API返回错误:', res.data)
        if (res.data.message === '请先选择数据库') {
          alert('请先在首页选择数据库')
        }
        setGroupData([])
      }
    } catch (error: any) {
      console.error('获取分组武勋数据异常:', error)
      if (error?.response?.data?.message === '请先选择数据库') {
        alert('请先在首页选择数据库')
      }
      setGroupData([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  return (
    <div className="max-w-4xl mx-auto space-y-4 pb-12">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-bold text-gray-800">分组武勋</h2>
          <span className="px-3 py-1 text-xs font-semibold text-amber-700 bg-amber-50 rounded-full border border-amber-200">
            更新武勋数据请同步成员数据
          </span>
        </div>
        <Button variant="outline" size="sm" onClick={loadData}>
          <RefreshCcw size={14} className="mr-1" />
          刷新
        </Button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-gray-50">
              <TableHead>分组名称</TableHead>
              <TableHead className="text-center">人数</TableHead>
              <TableHead className="text-right">总武勋</TableHead>
              <TableHead className="text-right">平均武勋</TableHead>
              <TableHead className="text-center">0武勋人数</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-gray-500">加载中...</TableCell>
              </TableRow>
            ) : groupData.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-gray-500">暂无数据</TableCell>
              </TableRow>
            ) : (
              groupData.map((item: any) => (
                <TableRow key={item.id}>
                  <TableCell>
                    <span className="inline-block px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-xs font-medium">
                      {item.group}
                    </span>
                  </TableCell>
                  <TableCell className="text-center">
                    <span className="text-gray-800 font-medium">{item.member_count}</span>
                  </TableCell>
                  <TableCell className="text-right">
                    <span className="text-blue-600 font-bold">{item.total_wu}</span>
                  </TableCell>
                  <TableCell className="text-right">
                    <span className="text-gray-800 font-semibold">{item.average_wu}</span>
                  </TableCell>
                  <TableCell className="text-center">
                    {item.zero_wu_count > 0 ? (
                      <Badge variant="destructive">{item.zero_wu_count}</Badge>
                    ) : (
                      <span className="text-gray-400">0</span>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
