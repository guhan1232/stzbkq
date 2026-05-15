import { useState, useEffect } from 'react'
import { ApiGetTeamUser } from '../api'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { RefreshCcw, Download, Info } from 'lucide-react'

export default function TeamUser() {
  const [teamUsers, setTeamUsers] = useState<any[]>([])
  const [loading, setLoading] = useState(false)

  const fetchUsers = async () => {
    setLoading(true)
    try {
      const v = await ApiGetTeamUser()
      if (v.data.code === 200) {
        const data = v.data.data
        setTeamUsers(Array.isArray(data) ? data : [])
      } else {
        console.error("请求错误:", v.data.message)
        if (v.data.message === '请先选择数据库') {
          alert('请先在首页选择数据库')
        }
        setTeamUsers([])
      }
    } catch (e: any) {
      console.error(e)
      if (e?.response?.data?.message === '请先选择数据库') {
        alert('请先在首页选择数据库')
      }
      setTeamUsers([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchUsers()
  }, [])

  const syncuser = () => {
    alert('请前往游戏中,点开同盟成员列表即可同步')
  }

  const exportExcel = async () => {
    const XLSX = await import('xlsx')
    let data: any[] = []
    data.push([
      "名字",
      "分组",
      "势力",
      "本周武勋",
      "总贡献",
      "周贡献",
      "位置",
      "进盟时间",
    ])

    teamUsers.forEach(v => {
      data.push([
        v.name,
        v.group,
        v.power,
        v.wu,
        v.contribute_total,
        v.contribute_week,
        splitwid(v.pos),
        formatTimestamp(v.join_time),
      ])
    })

    const ws = XLSX.utils.aoa_to_sheet(data)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Sheet1')
    const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' })
    const blob = new Blob([wbout], { type: 'application/octet-stream' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${formatTimestamp(Math.floor(Date.now() / 1000))}同盟成员表.xlsx`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const formatTimestamp = (timestamp: number) => {
    const date = new Date(timestamp * 1000)
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    const hours = String(date.getHours()).padStart(2, '0')
    const minutes = String(date.getMinutes()).padStart(2, '0')
    const seconds = String(date.getSeconds()).padStart(2, '0')
    return `${year}/${month}/${day} ${hours}:${minutes}:${seconds}`
  }

  const splitwid = (num: number | string) => {
    const numStr = num.toString()
    const lastFour = numStr.slice(-4)
    const firstPart = numStr.slice(0, -4)
    const lastFourNumber = parseInt(lastFour, 10)
    return `${firstPart},${lastFourNumber}`
  }

  return (
    <div className="max-w-6xl mx-auto space-y-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-bold text-gray-800">同盟成员</h2>
          <span className="px-3 py-1 text-xs font-semibold text-blue-600 bg-blue-100 rounded-full">
            共 {teamUsers.length} 人
          </span>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <Button 
            variant="outline" 
            onClick={fetchUsers} 
            isLoading={loading}
            className="flex-1 sm:flex-none"
          >
            <RefreshCcw size={16} className="mr-1" />
            刷新
          </Button>
          <Button 
            variant="outline" 
            onClick={syncuser}
            className="flex-1 sm:flex-none"
          >
            <Info size={16} className="mr-1" />
            同步成员
          </Button>
          <Button 
            onClick={exportExcel}
            className="flex-1 sm:flex-none"
          >
            <Download size={16} className="mr-1" />
            导出表格
          </Button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-gray-50">
              <TableHead>名字</TableHead>
              <TableHead className="text-center">分组</TableHead>
              <TableHead className="text-right">势力</TableHead>
              <TableHead className="text-right">周武勋</TableHead>
              <TableHead className="text-right">总贡献</TableHead>
              <TableHead className="text-right">周贡献</TableHead>
              <TableHead>位置</TableHead>
              <TableHead>进盟时间</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8 text-gray-500">加载中...</TableCell>
              </TableRow>
            ) : teamUsers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8 text-gray-500">暂无数据</TableCell>
              </TableRow>
            ) : (
              teamUsers.map((item: any) => (
                <TableRow key={item.name || item.id || `user-${item.pos}-${item.join_time}`}>
                  <TableCell className="font-medium">{item.name}</TableCell>
                  <TableCell className="text-center">
                    <span className="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded-full font-medium">
                      {item.group}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">{item.power}</TableCell>
                  <TableCell className="text-right text-blue-600 font-semibold">{item.wu}</TableCell>
                  <TableCell className="text-right">{item.contribute_total}</TableCell>
                  <TableCell className="text-right">{item.contribute_week}</TableCell>
                  <TableCell className="font-mono text-sm text-gray-600">{splitwid(item.pos)}</TableCell>
                  <TableCell className="text-sm text-gray-500">{formatTimestamp(item.join_time)}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
