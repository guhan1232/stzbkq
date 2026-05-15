import { useState, useEffect, useRef } from 'react'
import {
  ApiEnableGetChatMessage,
  ApiDisableGetChatMessage,
  ApiGetChatMessageList,
  ApiGetChatMessageStats,
  ApiDeleteChatMessages,
  ApiGetPackets
} from '../api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Play, Square, Trash2, Download, RefreshCcw, Search, X } from 'lucide-react'

interface ChatMsg {
  id: number
  msg_id: number
  content: string
  time: number
  player_id: number
  player_name: string
  player_full_name: string
  alliance_name: string
  alliance_id: number
}

export default function ChatMessage() {
  const [captureEnabled, setCaptureEnabled] = useState(false)
  const [messages, setMessages] = useState<ChatMsg[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)

  const [page, setPage] = useState(1)
  const [pageSize] = useState(50)
  const [hasMore, setHasMore] = useState(true)

  const [filterAlliance, setFilterAlliance] = useState('')
  const [filterPlayer, setFilterPlayer] = useState('')
  const [filterContent, setFilterContent] = useState('')
  const [showFilter, setShowFilter] = useState(false)

  const [clearModalOpen, setClearModalOpen] = useState(false)
  const [clearing, setClearing] = useState(false)
  const [apiAvailable, setApiAvailable] = useState(true)
  const [dbNotSelected, setDbNotSelected] = useState(false)
  const [packetError, setPacketError] = useState('')
  const [chatPackets, setChatPackets] = useState<any[]>([])
  const refreshRef = useRef<any>(null)

  const handleApiError = (e: any) => {
    if (e?.response?.status === 404) {
      setApiAvailable(false)
      setDbNotSelected(false)
    } else if (e?.response?.status === 400) {
      setApiAvailable(true)
      setDbNotSelected(true)
    }
  }

  const loadStats = async () => {
    try {
      const res = await ApiGetChatMessageStats()
      if (res.data.code === 200) {
        setCaptureEnabled(res.data.data?.capture_enabled || false)
        setApiAvailable(true)
        setDbNotSelected(false)
      }
    } catch (e: any) {
      handleApiError(e)
    }
  }

  const loadPackets = async () => {
    try {
      const res = await ApiGetPackets({ limit: 20, cmd_id: 724 })
      if (res.data.code === 200) {
        const data = res.data.data
        setChatPackets(Array.isArray(data) ? data.map((item: any, idx: number) => ({ ...item, id: item.id || `chat-packet-${idx}` })) : [])
        setPacketError('')
      }
    } catch (e: any) {
      setPacketError(e.response?.data?.message || e.message || '无法获取724数据包')
    }
  }

  const loadMessages = async (reset = false) => {
    setLoading(true)
    try {
      const params: any = { page: reset ? 1 : page, page_size: pageSize }
      if (filterAlliance) params.alliance_name = filterAlliance
      if (filterPlayer) params.player_name = filterPlayer
      if (filterContent) params.content = filterContent

      const res = await ApiGetChatMessageList(params)
      if (res.data.code === 200) {
        const list = res.data.data?.list
        const validList = Array.isArray(list) ? list : []
        if (reset) {
          setMessages(validList)
          setPage(1)
        } else {
          setMessages(prev => [...prev, ...validList])
        }
        setTotal(res.data.data?.total || 0)
        setHasMore(validList.length >= pageSize)
        setApiAvailable(true)
        setDbNotSelected(false)
      }
    } catch (e: any) {
      handleApiError(e)
    }
    finally {
      setLoading(false)
    }
  }

  const handleToggleCapture = async () => {
    try {
      if (captureEnabled) {
        await ApiDisableGetChatMessage()
        setCaptureEnabled(false)
      } else {
        await ApiEnableGetChatMessage()
        setCaptureEnabled(true)
        await loadMessages(true)
        await loadPackets()
      }
      setApiAvailable(true)
    } catch (e: any) {
      handleApiError(e)
      if (e?.response?.status === 404) {
        alert('后端暂不支持724协议抓取，请更新后端服务')
      } else if (e?.response?.status === 400) {
        alert('请先选择数据库')
      }
    }
  }

  const handleSearch = () => {
    loadMessages(true)
  }

  const handleReset = () => {
    setFilterAlliance('')
    setFilterPlayer('')
    setFilterContent('')
    setTimeout(() => {
      loadMessages(true)
    }, 0)
  }

  const handleLoadMore = () => {
    setPage(prev => prev + 1)
  }

  useEffect(() => {
    if (page > 1) loadMessages()
  }, [page])

  const handleRefresh = () => {
    loadMessages(true)
    loadStats()
    loadPackets()
  }

  const handleExport = () => {
    const text = messages.map(m => {
      const time = formatTime(m.time)
      return `[${time}] [${m.alliance_name}] ${m.player_name}: ${m.content}`
    }).join('\n')

    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `chat_messages_${Date.now()}.txt`
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleClear = async () => {
    setClearing(true)
    try {
      const res = await ApiDeleteChatMessages()
      if (res.data.code === 200) {
        alert(`已清除 ${res.data.data || ''} 条消息`)
        setMessages([])
        setTotal(0)
        setClearModalOpen(false)
      } else {
        alert(res.data.message || '清除失败')
      }
    } catch (e: any) {
      const msg = e.response?.data?.message || e.message || '清除失败'
      alert(msg)
    }
    finally {
      setClearing(false)
    }
  }

  const startAutoRefresh = () => {
    if (refreshRef.current) clearInterval(refreshRef.current)
    refreshRef.current = setInterval(() => {
      loadStats()
      loadMessages(true)
      loadPackets()
    }, 3000)
  }

  const stopAutoRefresh = () => {
    if (refreshRef.current) {
      clearInterval(refreshRef.current)
      refreshRef.current = null
    }
  }

  useEffect(() => {
    loadStats()
    loadMessages(true)
    loadPackets()
    return stopAutoRefresh
  }, [])

  useEffect(() => {
    if (captureEnabled) {
      startAutoRefresh()
    } else {
      stopAutoRefresh()
    }
  }, [captureEnabled])

  const formatTime = (ts: number) => {
    if (!ts) return ''
    const d = new Date(ts * 1000)
    const m = (d.getMonth() + 1).toString().padStart(2, '0')
    const day = d.getDate().toString().padStart(2, '0')
    const h = d.getHours().toString().padStart(2, '0')
    const min = d.getMinutes().toString().padStart(2, '0')
    return `${m}-${day} ${h}:${min}`
  }

  const formatPacketTime = (value: any) => {
    if (!value) return '-'
    if (typeof value === 'number') return formatTime(value)
    return String(value)
  }

  const formatPacketData = (data: any) => {
    if (!data) return '无数据'
    try {
      if (typeof data === 'string') return JSON.stringify(JSON.parse(data), null, 2)
      return JSON.stringify(data, null, 2)
    } catch {
      return String(data)
    }
  }

  return (
    <div className="max-w-6xl mx-auto space-y-4 pb-12">
      {!apiAvailable && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
          <div className="font-semibold text-amber-700 text-sm">后端暂不支持724协议</div>
          <div className="text-amber-600 text-xs mt-0.5">请更新后端服务以支持聊天消息抓取功能</div>
        </div>
      )}
      {dbNotSelected && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
          <div className="font-semibold text-blue-700 text-sm">请先选择数据库</div>
          <div className="text-blue-600 text-xs mt-0.5">在左侧菜单中选择一个区服数据库后，即可显示已入库的聊天消息</div>
        </div>
      )}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-bold text-gray-800">聊天消息</h2>
          <span className="px-3 py-1 text-xs font-semibold text-gray-600 bg-gray-100 rounded-full">
            724协议
          </span>
          <span className={`px-3 py-1 text-xs font-semibold rounded-full ${captureEnabled ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>
            {captureEnabled ? '抓取中' : '已停止'}
          </span>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
        <div className="flex flex-wrap gap-3 items-center">
          <Button
            variant={captureEnabled ? 'destructive' : 'default'}
            className={captureEnabled ? '' : 'bg-blue-600 text-white hover:bg-blue-700'}
            onClick={handleToggleCapture}
            size="sm"
          >
            {captureEnabled ? <Square size={16} className="mr-1" /> : <Play size={16} className="mr-1" />}
            {captureEnabled ? '停止抓取' : '开始抓取'}
          </Button>

          <Button
            variant="outline"
            onClick={() => setShowFilter(!showFilter)}
            size="sm"
          >
            <Search size={16} className="mr-1" />筛选
          </Button>

          <Button
            variant="outline"
            onClick={handleExport}
            disabled={total === 0}
            size="sm"
          >
            <Download size={16} className="mr-1" />导出TXT
          </Button>

          <Button
            variant="outline"
            onClick={handleRefresh}
            size="sm"
          >
            <RefreshCcw size={16} className="mr-1" />刷新
          </Button>

          <Button
            variant="outline"
            className="text-red-600 border-red-200 hover:bg-red-50"
            onClick={() => setClearModalOpen(true)}
            disabled={total === 0}
            size="sm"
          >
            <Trash2 size={16} className="mr-1" />清除全部
          </Button>
        </div>

        {showFilter && (
          <div className="mt-4 pt-4 border-t border-gray-200 flex flex-wrap gap-3 items-end">
            <Input
              placeholder="同盟名称"
              value={filterAlliance}
              onChange={e => setFilterAlliance(e.target.value)}
              className="w-40 h-9"
            />
            <Input
              placeholder="玩家名称"
              value={filterPlayer}
              onChange={e => setFilterPlayer(e.target.value)}
              className="w-40 h-9"
            />
            <Input
              placeholder="消息关键词"
              value={filterContent}
              onChange={e => setFilterContent(e.target.value)}
              className="w-48 h-9"
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            />
            <Button size="sm" className="bg-blue-600 text-white hover:bg-blue-700" onClick={handleSearch}>搜索</Button>
            <Button variant="outline" size="sm" onClick={handleReset}>重置</Button>
            <button onClick={() => setShowFilter(false)} className="ml-auto p-1 hover:bg-gray-100 rounded">
              <X size={16} className="text-gray-400" />
            </button>
          </div>
        )}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-4 border-b border-gray-200 flex justify-between items-center">
          <h3 className="font-semibold text-gray-800">消息列表（共 {total} 条）</h3>
        </div>
        <Table>
          <TableHeader>
            <TableRow className="bg-gray-50">
              <TableHead>同盟</TableHead>
              <TableHead>玩家</TableHead>
              <TableHead>消息内容</TableHead>
              <TableHead className="w-[120px]">时间</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading && messages.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-8 text-gray-500">加载中...</TableCell>
              </TableRow>
            ) : messages.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-8 text-gray-500">暂无聊天消息，请先开启724协议抓取</TableCell>
              </TableRow>
            ) : (
              messages.map((item: ChatMsg) => (
                <TableRow key={item.msg_id}>
                  <TableCell>
                    <span className="inline-block px-2 py-0.5 bg-indigo-50 text-indigo-600 rounded text-xs font-medium max-w-[140px] truncate">
                      {item.alliance_name || '-'}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className="font-medium text-gray-800 text-sm">{item.player_name || '-'}</span>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm text-gray-700 break-all">{item.content}</span>
                  </TableCell>
                  <TableCell>
                    <span className="text-xs text-gray-400 whitespace-nowrap">{formatTime(item.time)}</span>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>

        {hasMore && !loading && (
          <div className="p-3 text-center border-t border-gray-100">
            <Button variant="outline" size="sm" onClick={handleLoadMore}>
              加载更多
            </Button>
          </div>
        )}
        {!hasMore && messages.length > 0 && (
          <div className="p-3 text-center text-xs text-gray-400 border-t border-gray-100">
            没有更多了
          </div>
        )}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-4 border-b border-gray-200 flex justify-between items-center">
          <h3 className="font-semibold text-gray-800">最近724数据包（{chatPackets.length} 条）</h3>
          {packetError && <span className="text-xs text-red-500">{packetError}</span>}
        </div>
        <Table>
          <TableHeader>
            <TableRow className="bg-gray-50">
              <TableHead>时间戳</TableHead>
              <TableHead>源IP</TableHead>
              <TableHead>目标IP</TableHead>
              <TableHead className="text-right">大小</TableHead>
              <TableHead>解析内容</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {chatPackets.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-gray-500">暂无724数据包，请先开启数据包捕获并触发聊天消息</TableCell>
              </TableRow>
            ) : (
              chatPackets.map((item: any) => (
                <TableRow key={item.id}>
                  <TableCell><span className="text-gray-500 text-sm">{formatPacketTime(item.timestamp)}</span></TableCell>
                  <TableCell><span className="font-mono text-sm text-gray-600">{item.src_ip || '-'}</span></TableCell>
                  <TableCell><span className="font-mono text-sm text-gray-600">{item.dst_ip || '-'}</span></TableCell>
                  <TableCell className="text-right"><span className="text-gray-600 text-sm tabular-nums">{item.size || 0} B</span></TableCell>
                  <TableCell>
                    <div className="max-h-24 overflow-y-auto bg-gray-50 p-2 rounded text-xs font-mono text-gray-600 whitespace-pre-wrap break-all">
                      {formatPacketData(item.parsed)}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={clearModalOpen} onOpenChange={setClearModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-red-600">确认清空</DialogTitle>
            <DialogDescription>此操作不可恢复</DialogDescription>
          </DialogHeader>
          <p className="text-gray-600">确定要清空所有聊天消息吗？此操作不可恢复！</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setClearModalOpen(false)}>取消</Button>
            <Button variant="destructive" disabled={clearing} onClick={handleClear}>
              {clearing ? '清除中...' : '确认清除'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
