import { useState, useEffect, useRef } from 'react'
import {
  ApiStartPacketCapture,
  ApiStopPacketCapture,
  ApiGetPacketCaptureStats,
  ApiGetPackets
} from '../api'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Play, Square, Download, RefreshCcw } from 'lucide-react'

export default function PacketCapture() {
  const [stats, setStats] = useState({
    total_packets: 0,
    is_running: false,
    interfaces: 0,
    start_time: null as string | null
  })

  const [packets, setPackets] = useState<any[]>([])
  const [duration, setDuration] = useState('00:00')
  const [starting, setStarting] = useState(false)
  const [stopping, setStopping] = useState(false)

  const timerRef = useRef<any>(null)
  const refreshRef = useRef<any>(null)

  const loadStats = async () => {
    try {
      const res = await ApiGetPacketCaptureStats()
      if (res.data.code === 200) {
        setStats(res.data.data)
        if (res.data.data.is_running && !timerRef.current) {
          startTimer(res.data.data.start_time)
          startAutoRefresh()
        }
      }
    } catch (e) {}
  }

  const loadPackets = async () => {
    try {
      const res = await ApiGetPackets({ limit: 100 })
      if (res.data.code === 200) {
        const data = res.data.data
        setPackets(Array.isArray(data) ? data.map((item: any, idx: number) => ({ ...item, id: item.id || `packet-${idx}` })) : [])
      }
    } catch (e) {}
  }

  const handleStart = async () => {
    setStarting(true)
    try {
      const res = await ApiStartPacketCapture()
      if (res.data.code === 200) {
        alert('开始捕获数据包')
        await loadStats()
        startAutoRefresh()
      } else {
        alert('启动失败: ' + (res.data.message || '未知错误'))
      }
    } catch (e: any) {
      alert('启动失败: ' + (e.response?.data?.message || e.message))
    } finally {
      setStarting(false)
    }
  }

  const handleStop = async () => {
    setStopping(true)
    try {
      const res = await ApiStopPacketCapture()
      if (res.data.code === 200) {
        alert('已停止捕获')
        await loadStats()
        stopTimer()
        stopAutoRefresh()
      } else {
        alert('停止失败: ' + (res.data.message || '未知错误'))
      }
    } catch (e: any) {
      alert('停止失败: ' + e.message)
    } finally {
      setStopping(false)
    }
  }

  const handleRefresh = async () => {
    await loadPackets()
    alert('已刷新')
  }

  const handleExportCSV = () => {
    window.open('/v1/packet-capture/export/csv', '_blank')
  }

  const handleExportJSON = () => {
    window.open('/v1/packet-capture/export/json', '_blank')
  }

  const startTimer = (startTimeStr: string | null) => {
    if (timerRef.current) clearInterval(timerRef.current)
    if (!startTimeStr) return

    timerRef.current = setInterval(() => {
      const startTime = new Date(startTimeStr).getTime()
      const diff = Math.floor((Date.now() - startTime) / 1000)
      if (diff < 0) return
      const minutes = Math.floor(diff / 60).toString().padStart(2, '0')
      const seconds = (diff % 60).toString().padStart(2, '0')
      setDuration(`${minutes}:${seconds}`)
    }, 1000)
  }

  const stopTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
  }

  const startAutoRefresh = () => {
    if (refreshRef.current) clearInterval(refreshRef.current)
    refreshRef.current = setInterval(() => {
      loadPackets()
      loadStats()
    }, 2000)
  }

  const stopAutoRefresh = () => {
    if (refreshRef.current) {
      clearInterval(refreshRef.current)
      refreshRef.current = null
    }
  }

  useEffect(() => {
    loadStats()
    loadPackets()
    return () => {
      stopTimer()
      stopAutoRefresh()
    }
  }, [])

  useEffect(() => {
    if (stats.start_time && stats.is_running) {
      startTimer(stats.start_time)
    }
  }, [stats.start_time, stats.is_running])

  const formatParsedData = (data: any) => {
    if (!data) return ''
    try {
      if (typeof data === 'string') {
        const parsed = JSON.parse(data)
        return JSON.stringify(parsed, null, 2)
      }
      return JSON.stringify(data, null, 2)
    } catch {
      return String(data)
    }
  }

  return (
    <div className="max-w-6xl mx-auto space-y-4 pb-12">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-bold text-gray-800">数据包捕获工具</h2>
          <span className="px-3 py-1 text-xs font-semibold text-gray-600 bg-gray-100 rounded-full">
            2200协议监控
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 flex items-center gap-4">
          <div className="w-11 h-11 rounded-xl bg-gray-50 flex items-center justify-center relative">
            <span className={`w-3 h-3 rounded-full ${stats.is_running ? 'bg-emerald-500 animate-pulse' : 'bg-gray-400'}`}></span>
          </div>
          <div>
            <div className="text-sm text-gray-500 mb-1">捕获状态</div>
            <div className={`text-lg font-bold ${stats.is_running ? 'text-emerald-600' : 'text-gray-500'}`}>
              {stats.is_running ? '运行中' : '已停止'}
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 flex items-center gap-4">
          <div className="w-11 h-11 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center text-xl font-bold">P</div>
          <div>
            <div className="text-sm text-gray-500 mb-1">数据包总数</div>
            <div className="text-2xl font-bold text-gray-900">{stats.total_packets}</div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 flex items-center gap-4">
          <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center text-xl font-bold">I</div>
          <div>
            <div className="text-sm text-gray-500 mb-1">监听接口数</div>
            <div className="text-2xl font-bold text-gray-900">{stats.interfaces}</div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 flex items-center gap-4">
          <div className="w-11 h-11 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center text-xl font-bold">T</div>
          <div>
            <div className="text-sm text-gray-500 mb-1">运行时长</div>
            <div className="text-2xl font-bold text-gray-900">{duration}</div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
        <div className="flex flex-wrap gap-3 items-center">
          <Button
            className="bg-blue-600 text-white hover:bg-blue-700"
            onClick={handleStart}
            disabled={stats.is_running || starting}
          >
            {!starting && <Play size={16} className="mr-1" />}
            {starting ? '启动中...' : '开始捕获'}
          </Button>
          <Button
            variant="destructive"
            onClick={handleStop}
            disabled={!stats.is_running || stopping}
          >
            {!stopping && <Square size={16} className="mr-1" />}
            {stopping ? '停止中...' : '停止捕获'}
          </Button>
          <div className="w-px h-6 bg-gray-200 mx-2 hidden sm:block"></div>
          <Button
            variant="outline"
            onClick={handleExportCSV}
            disabled={stats.total_packets === 0}
          >
            <Download size={16} className="mr-1" />导出CSV
          </Button>
          <Button
            variant="outline"
            onClick={handleExportJSON}
            disabled={stats.total_packets === 0}
          >
            <Download size={16} className="mr-1" />导出JSON
          </Button>
          <Button
            variant="outline"
            onClick={handleRefresh}
            disabled={stats.total_packets === 0}
          >
            <RefreshCcw size={16} className="mr-1" />刷新列表
          </Button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-4 border-b border-gray-200 flex justify-between items-center">
          <h3 className="font-semibold text-gray-800">实时数据包列表 (最近{packets.length}条)</h3>
          {stats.is_running && (
            <span className="flex items-center gap-2 text-xs font-medium text-emerald-600">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              实时更新中
            </span>
          )}
        </div>
        <Table>
          <TableHeader>
            <TableRow className="bg-gray-50">
              <TableHead>时间戳</TableHead>
              <TableHead>协议号</TableHead>
              <TableHead>源IP</TableHead>
              <TableHead>目标IP</TableHead>
              <TableHead className="text-right">大小</TableHead>
              <TableHead>解析内容</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {packets.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-gray-500">暂无数据包，点击开始捕获按钮开始监控</TableCell>
              </TableRow>
            ) : (
              packets.map((item: any) => (
                <TableRow key={item.id}>
                  <TableCell><span className="text-gray-500 text-sm">{item.timestamp}</span></TableCell>
                  <TableCell>
                    <span className="inline-block px-2 py-1 bg-blue-50 text-blue-600 rounded text-xs font-medium font-mono">
                      {item.cmd_id}
                    </span>
                  </TableCell>
                  <TableCell><span className="font-mono text-sm text-gray-600">{item.src_ip}</span></TableCell>
                  <TableCell><span className="font-mono text-sm text-gray-600">{item.dst_ip}</span></TableCell>
                  <TableCell className="text-right"><span className="text-gray-600 text-sm tabular-nums">{item.size} B</span></TableCell>
                  <TableCell>
                    {item.parsed ? (
                      <div className="max-h-32 overflow-y-auto bg-gray-50 p-2 rounded text-xs font-mono text-gray-600 whitespace-pre-wrap break-all">
                        {formatParsedData(item.parsed)}
                      </div>
                    ) : (
                      <span className="text-gray-400 text-xs italic">无数据</span>
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
