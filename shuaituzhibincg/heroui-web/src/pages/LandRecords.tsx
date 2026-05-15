import { useState, useEffect } from 'react'
import { ApiGetLandRecords, ApiGetLandRecordsStats, getExportLandRecordsUrl } from '../api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
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
import { Search, Download, RefreshCcw, List, BarChart2 } from 'lucide-react'

export default function LandRecords() {
  const [loading, setLoading] = useState(false)
  const [records, setRecords] = useState<any[]>([])
  const [stats, setStats] = useState<any[]>([])
  const [total, setTotal] = useState(0)

  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize] = useState(50)
  const [playerNameFilter, setPlayerNameFilter] = useState('')
  const [successFilter, setSuccessFilter] = useState('')
  const [onlyMembers, setOnlyMembers] = useState(true)
  const [groupNameFilter, setGroupNameFilter] = useState('')
  const [startTime, setStartTime] = useState('')
  const [endTime, setEndTime] = useState('')
  const [activeView, setActiveView] = useState<'list' | 'stats'>('list')

  const loadRecords = async (page = currentPage) => {
    setLoading(true)
    try {
      const params: any = {
        page,
        page_size: pageSize,
        player_name: playerNameFilter,
        is_success: successFilter,
        only_members: onlyMembers ? '1' : '0',
        group_name: groupNameFilter
      }

      if (startTime) {
        const [y, m, d] = startTime.split('-').map(Number)
        const date = new Date(y, m - 1, d, 0, 0, 0, 0)
        params.start_time = Math.floor(date.getTime() / 1000)
      }
      if (endTime) {
        const [y, m, d] = endTime.split('-').map(Number)
        const date = new Date(y, m - 1, d, 23, 59, 59, 999)
        params.end_time = Math.floor(date.getTime() / 1000)
      }

      const res = await ApiGetLandRecords(params)
      if (res.data.code === 200) {
        const dataList = res.data.data?.list
        const totalData = res.data.data?.total || 0
        const recordsData = Array.isArray(dataList) ? dataList : []
        setRecords(recordsData)
        setTotal(totalData)
        setCurrentPage(page)
      } else {
        console.error('翻地记录API返回错误:', res.data)
      }
    } catch (error) {
      console.error('翻地记录加载异常:', error)
      alert('加载失败: ' + (error instanceof Error ? error.message : String(error)))
    } finally {
      setLoading(false)
    }
  }

  const loadStats = async () => {
    setLoading(true)
    try {
      const res = await ApiGetLandRecordsStats({
        player_name: playerNameFilter
      })
      if (res.data.code === 200) {
        setStats(Array.isArray(res.data.data?.list) ? res.data.data.list : [])
      }
    } catch (error) {
      alert('加载统计失败')
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = () => {
    if (activeView === 'list') {
      loadRecords(1)
    } else {
      loadStats()
    }
  }

  useEffect(() => {
    if (activeView === 'list') {
      loadRecords(1)
    } else {
      loadStats()
    }
  }, [activeView])

  const handleExport = () => {
    const params: any = {
      player_name: playerNameFilter,
      is_success: successFilter,
      only_members: onlyMembers ? '1' : '0',
      group_name: groupNameFilter
    }

    if (startTime) {
      const [y, m, d] = startTime.split('-').map(Number)
      const date = new Date(y, m - 1, d, 0, 0, 0, 0)
      params.start_time = Math.floor(date.getTime() / 1000)
    }
    if (endTime) {
      const [y, m, d] = endTime.split('-').map(Number)
      const date = new Date(y, m - 1, d, 23, 59, 59, 999)
      params.end_time = Math.floor(date.getTime() / 1000)
    }

    const url = getExportLandRecordsUrl(params, "")
    const link = document.createElement('a')
    link.href = url

    let fileName = '翻地记录'
    if (groupNameFilter) fileName = `${groupNameFilter}-翻地记录`
    if (startTime || endTime) fileName += `_${startTime || '开始'}_至_${endTime || '现在'}`
    fileName += '.xlsx'

    link.download = fileName
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp * 1000)
    return date.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const splitPos = (pos: any) => {
    if (!pos) return ''
    const posStr = pos.toString()
    if (posStr.length < 4) return pos.toString()
    const x = posStr.slice(0, -4)
    const y = posStr.slice(-4)
    return `${x},${parseInt(y)}`
  }

  const pages = Math.ceil(total / pageSize)

  return (
    <div className="max-w-7xl mx-auto space-y-4">
      <div className="flex items-center gap-3">
        <h2 className="text-xl font-bold text-gray-800">翻地记录</h2>
        <span className="px-3 py-1 text-xs font-semibold text-gray-600 bg-gray-100 rounded-full">
          共 {total} 条记录
        </span>
      </div>

      <div className="flex gap-2 mb-4">
        <Button
          variant={activeView === 'list' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setActiveView('list')}
        >
          <List size={16} className="mr-1" />
          记录列表
        </Button>
        <Button
          variant={activeView === 'stats' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setActiveView('stats')}
        >
          <BarChart2 size={16} className="mr-1" />
          统计排名
        </Button>
      </div>

      {activeView === 'list' && (
        <div className="space-y-4">
          <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
            <div className="flex flex-wrap items-center gap-3">
              <Input
                className="w-40 h-9"
                placeholder="搜索玩家名称"
                value={playerNameFilter}
                onChange={e => setPlayerNameFilter(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              />
              <Input
                className="w-32 h-9"
                placeholder="按团筛选"
                value={groupNameFilter}
                onChange={e => setGroupNameFilter(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              />
              <Select value={successFilter || 'all'} onValueChange={(v) => setSuccessFilter(v === 'all' ? '' : v)}>
                <SelectTrigger className="w-32 h-9">
                  <SelectValue placeholder="结果筛选" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部</SelectItem>
                  <SelectItem value="1">成功</SelectItem>
                  <SelectItem value="0">失败</SelectItem>
                </SelectContent>
              </Select>
              <div className="flex items-center gap-2">
                <Checkbox
                  checked={onlyMembers}
                  onCheckedChange={(checked) => setOnlyMembers(checked === true)}
                />
                <span className="text-sm text-gray-700">仅同盟成员</span>
              </div>
              <input
                type="date"
                className="w-40 px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
              />
              <span className="text-gray-500 text-sm">至</span>
              <input
                type="date"
                className="w-40 px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
              />
              <Button size="sm" onClick={handleSearch}>
                <Search size={16} className="mr-1" />
                搜索
              </Button>
              <Button variant="outline" size="sm" onClick={handleExport} className="text-emerald-600 border-emerald-200 hover:bg-emerald-50">
                <Download size={16} className="mr-1" />
                导出Excel
              </Button>
              <Button variant="outline" size="sm" onClick={() => loadRecords()}>
                <RefreshCcw size={16} className="mr-1" />
                刷新
              </Button>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50">
                    <TableHead>玩家名称</TableHead>
                    <TableHead>土地位置</TableHead>
                    <TableHead>土地名称</TableHead>
                    <TableHead className="text-center">土地等级</TableHead>
                    <TableHead className="text-center">结果</TableHead>
                    <TableHead>防守方</TableHead>
                    <TableHead>时间</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-gray-500">加载中...</TableCell>
                    </TableRow>
                  ) : records.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-gray-500">暂无数据</TableCell>
                    </TableRow>
                  ) : (
                    records.map((item: any) => (
                      <TableRow key={item.id}>
                        <TableCell className="font-medium text-gray-800">{item.player_name}</TableCell>
                        <TableCell className="font-mono text-sm text-gray-600">{splitPos(item.land_pos)}</TableCell>
                        <TableCell>{item.land_name || '-'}</TableCell>
                        <TableCell className="text-center">
                          <span className="px-2 py-1 text-xs bg-blue-100 text-blue-600 rounded-full font-medium">
                            {item.land_level}级
                          </span>
                        </TableCell>
                        <TableCell className="text-center">
                          {item.is_success === 1 ? (
                            <span className="px-2 py-1 text-xs bg-emerald-100 text-emerald-700 rounded-full font-medium">成功</span>
                          ) : (
                            <span className="px-2 py-1 text-xs bg-red-100 text-red-700 rounded-full font-medium">失败</span>
                          )}
                        </TableCell>
                        <TableCell>{item.defender_name || '-'}</TableCell>
                        <TableCell className="text-sm text-gray-500">{formatTime(item.attack_time)}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
            {total > 0 && (
              <div className="flex items-center justify-end gap-2 p-4 border-t border-gray-100">
                <span className="text-sm text-gray-600">共 {total} 条，{pages} 页</span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage === 1}
                  onClick={() => loadRecords(currentPage - 1)}
                >
                  上一页
                </Button>
                <span className="text-sm text-gray-700">{currentPage} / {pages}</span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage === pages}
                  onClick={() => loadRecords(currentPage + 1)}
                >
                  下一页
                </Button>
              </div>
            )}
          </div>
        </div>
      )}

      {activeView === 'stats' && (
        <>
          <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 mb-4">
            <div className="flex flex-wrap items-center gap-3">
              <Input
                className="w-40 h-9"
                placeholder="搜索玩家名称"
                value={playerNameFilter}
                onChange={e => setPlayerNameFilter(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              />
              <Button size="sm" onClick={handleSearch}>
                <Search size={16} className="mr-1" />
                搜索
              </Button>
              <Button variant="outline" size="sm" onClick={loadStats}>
                <RefreshCcw size={16} className="mr-1" />
                刷新
              </Button>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50">
                  <TableHead className="text-center">排名</TableHead>
                  <TableHead>玩家名称</TableHead>
                  <TableHead className="text-right">总翻地数</TableHead>
                  <TableHead className="text-center">成功数</TableHead>
                  <TableHead className="text-center">失败数</TableHead>
                  <TableHead className="text-right">成功率</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-4 text-gray-500">加载中...</TableCell>
                  </TableRow>
                ) : stats.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-4 text-gray-500">暂无数据</TableCell>
                  </TableRow>
                ) : (
                  stats.map((item: any, index: number) => {
                    const isTop = index < 3
                    const rate = item.total_count > 0 ? (item.success_count / item.total_count * 100) : 0
                    return (
                      <TableRow key={item.player_name}>
                        <TableCell className="text-center">
                          <div className={`w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold mx-auto ${isTop ? 'bg-amber-100 text-amber-600' : 'bg-gray-100 text-gray-500'}`}>
                            {index + 1}
                          </div>
                        </TableCell>
                        <TableCell className="font-medium">{item.player_name}</TableCell>
                        <TableCell className="text-right font-semibold text-blue-600">{item.total_count}</TableCell>
                        <TableCell className="text-center text-emerald-600 font-medium">{item.success_count}</TableCell>
                        <TableCell className="text-center text-red-600 font-medium">{item.fail_count}</TableCell>
                        <TableCell className="text-right">
                          <span className={`font-semibold ${rate >= 80 ? 'text-emerald-600' : 'text-amber-600'}`}>
                            {rate.toFixed(1)}%
                          </span>
                        </TableCell>
                      </TableRow>
                    )
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </>
      )}
    </div>
  )
}
