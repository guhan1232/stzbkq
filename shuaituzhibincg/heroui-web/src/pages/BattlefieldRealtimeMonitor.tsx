import { useState, useEffect, useRef } from 'react'
import {
  ApiGetBattlefieldRealtimeStats,
  ApiEnableBattlefieldRealtime,
  ApiDisableBattlefieldRealtime,
  ApiGetBattlefieldRealtimePackets,
  ApiClearBattlefieldRealtimePackets,
  ApiSearchRealtimeMonitorTeams
} from '../api'
import { herocfg } from '../cfg'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Input } from '@/components/ui/input'
import { Play, Pause, Trash2, Search, Wifi, WifiOff, Loader2 } from 'lucide-react'

interface TeamRow {
  id: string
  player_name: string
  alliance_name: string
  start_coord: string
  target_coord: string
  arrive_time: string
  remain_time: string
  main_camp: string
  middle_army: string
  vanguard: string
  arrive_timestamp?: number
  identity_key?: string
}

export default function BattlefieldRealtimeMonitor() {
  const [stats, setStats] = useState({
    battlefield_realtime_enabled: false,
    total_packets: 0
  })
  
  const [packets, setPackets] = useState<any[]>([])
  const [teamRows, setTeamRows] = useState<TeamRow[]>([])
  const [searchKeyword, setSearchKeyword] = useState('')
  const [searchLoading, setSearchLoading] = useState(false)
  
  const [starting, setStarting] = useState(false)
  const [stopping, setStopping] = useState(false)
  const [clearing, setClearing] = useState(false)
  
  const [wsStatus, setWsStatus] = useState<'disconnected' | 'connecting' | 'connected' | 'error'>('disconnected')

  const wsRef = useRef<WebSocket | null>(null)
  const reconnectTimerRef = useRef<any>(null)
  const pingTimerRef = useRef<any>(null)
  const refreshTimerRef = useRef<any>(null)
  const wsManualCloseRef = useRef(false)

  const getSessionId = () => {
    return localStorage.getItem('session_id') || ''
  }

  const formatArriveTime = (value: number) => {
    if (!value) return '--'
    const date = new Date(value * 1000)
    const pad = (n: number) => String(n).padStart(2, '0')
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
  }

  const formatRemainTime = (value: number) => {
    if (!value) return '--'
    const remain = value - Math.floor(Date.now() / 1000)
    if (remain < 0) return '已到达'
    const minutes = Math.floor(remain / 60)
    const seconds = remain % 60
    return `${minutes}分${seconds}秒`
  }

  const heroMap: Record<string, any> = JSON.parse(herocfg)

  const resolveHeroId = (id: number | undefined): number => {
    if (!id) return 0
    const num = Number(id)
    return num >= 130000 ? num - 30000 : num
  }

  const getHeroName = (id: number | undefined): string => {
    if (!id) return ''
    const hero = heroMap[String(resolveHeroId(id))]
    return hero ? hero.name : `未知(${id})`
  }

  const formatFormationSlot = (slot: any) => {
    if (!slot) return '--'
    const heroId = slot?.main_hero?.id
    if (!heroId) return '--'
    const level = slot?.level ?? '--'
    const star = slot?.star ?? '--'
    const name = getHeroName(heroId)
    return `${name} Lv${level} ${star}红`
  }

  const buildTeamIdentityKey = (team: any) => {
    if (team?.identity_key) return String(team.identity_key)
    const formation = team?.formation || {}
    const allianceName = String(team?.alliance_name ?? team?.attack_union_name ?? '').trim()
    const playerName = String(team?.player_name ?? team?.name ?? '').trim()
    const parts = ['front', 'middle', 'back'].map((pos) => {
      const slot = formation?.[pos] || {}
      const mainHeroId = String(slot?.main_hero?.id || '').trim()
      const subHeroId = String(slot?.sub_hero?.id || '').trim()
      const skillIds = Array.isArray(slot?.skills) ? slot.skills.map((skill: any) => String(skill?.id || '').trim()).join('|') : ''
      return `${pos}:${mainHeroId}/${subHeroId}/${skillIds}`
    })
    return [allianceName, playerName, ...parts].join('||')
  }

  const normalizeTeamRow = (team: any): TeamRow => {
    const arriveTime = Number(team?.arrive_time ?? team?.arrive_timestamp)
    const hasUnixArriveTime = Number.isFinite(arriveTime) && arriveTime > 0
    const formation = team?.formation || {}

    return {
      id: String(team?.id ?? `${team?.player_name ?? team?.name ?? ''}-${team?.wid ?? team?.start_coord ?? ''}-${team?.target_wid ?? team?.target_coord ?? ''}`),
      player_name: String(team?.player_name ?? team?.name ?? ''),
      alliance_name: String(team?.alliance_name ?? team?.attack_union_name ?? ''),
      start_coord: String(team?.start_coord ?? team?.wid ?? ''),
      target_coord: String(team?.target_coord ?? team?.target_wid ?? ''),
      arrive_time: String(team?.arrive_time_text ?? (hasUnixArriveTime ? formatArriveTime(arriveTime) : team?.arrive_time ?? '')),
      remain_time: String(team?.remain_time ?? (hasUnixArriveTime ? formatRemainTime(arriveTime) : '--')),
      main_camp: String(team?.main_camp ?? formatFormationSlot(formation.back)),
      middle_army: String(team?.middle_army ?? formatFormationSlot(formation.middle)),
      vanguard: String(team?.vanguard ?? formatFormationSlot(formation.front)),
      arrive_timestamp: hasUnixArriveTime ? arriveTime : undefined,
      identity_key: buildTeamIdentityKey(team)
    }
  }

  const mergeTeamRows = (rows: any[], reset = false) => {
    setTeamRows(prev => {
      const next = reset ? [] : [...prev]
      const keyToIndex = new Map<string, number>()
      next.forEach((row, index) => keyToIndex.set(row.identity_key || row.id, index))

      rows.forEach(row => {
        const normalized = normalizeTeamRow(row)
        const key = normalized.identity_key || normalized.id
        const index = keyToIndex.get(key)
        if (index !== undefined) {
          next[index] = normalized
        } else {
          keyToIndex.set(key, next.length)
          next.push(normalized)
        }
      })

      next.sort((a, b) => {
        const at = a.arrive_timestamp || 0
        const bt = b.arrive_timestamp || 0
        if (at && bt) return at - bt
        if (at) return -1
        if (bt) return 1
        return 0
      })
      return next
    })
  }

  const loadStats = async () => {
    try {
      const res = await ApiGetBattlefieldRealtimeStats()
      if (res.data.code === 200) {
        setStats(res.data.data)
      }
    } catch (e) {}
  }

  const loadPackets = async () => {
    try {
      const res = await ApiGetBattlefieldRealtimePackets({ limit: 100 })
      if (res.data.code === 200) {
        setPackets(res.data.data?.packets || [])
      }
    } catch (e) {}
  }

  const formatParsedData = (value: any) => {
    if (!value) return ''
    try {
      const parsed = typeof value === 'string' ? JSON.parse(value) : value
      return JSON.stringify(parsed, null, 2)
    } catch {
      return String(value)
    }
  }

  const startAutoRefresh = () => {
    if (refreshTimerRef.current) clearInterval(refreshTimerRef.current)
    refreshTimerRef.current = setInterval(() => {
      loadStats()
      loadPackets()
    }, 2000)
  }

  const stopAutoRefresh = () => {
    if (refreshTimerRef.current) {
      clearInterval(refreshTimerRef.current)
      refreshTimerRef.current = null
    }
  }

  const handleEnable = async () => {
    setStarting(true)
    try {
      const res = await ApiEnableBattlefieldRealtime()
      if (res.data.code === 200) {
        alert('已开启战场实时监控抓包')
        await loadStats()
        await loadPackets()
        startAutoRefresh()
        startWebSocket()
      } else {
        alert('开启失败: ' + (res.data.message || '未知错误'))
      }
    } catch (e: any) {
      alert('开启失败: ' + (e.response?.data?.message || e.message))
    } finally {
      setStarting(false)
    }
  }

  const handleDisable = async () => {
    setStopping(true)
    try {
      const res = await ApiDisableBattlefieldRealtime()
      if (res.data.code === 200) {
        alert('已关闭战场实时监控抓包')
        await loadStats()
        stopAutoRefresh()
      } else {
        alert('关闭失败: ' + (res.data.message || '未知错误'))
      }
    } catch (e: any) {
      alert('关闭失败: ' + (e.response?.data?.message || e.message))
    } finally {
      setStopping(false)
    }
  }

  const handleClear = async () => {
    setClearing(true)
    try {
      const res = await ApiClearBattlefieldRealtimePackets()
      if (res.data.code === 200) {
        setPackets([])
        setTeamRows([])
        await loadStats()
        alert(res.data.message || '已清空战场实时监控包')
      } else {
        alert('清空失败: ' + (res.data.message || '未知错误'))
      }
    } catch (e: any) {
      alert('清空失败: ' + (e.response?.data?.message || e.message))
    } finally {
      setClearing(false)
    }
  }

  const requestTeams = async ({ mainId = '', playerName = '', preferHttp = false, reset = false } = {}) => {
    if (!preferHttp && wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      try {
        wsRef.current.send(JSON.stringify({
          type: 'search_team',
          side: 'all',
          main_id: mainId,
          player_name: playerName,
          request_id: Date.now()
        }))
        return
      } catch {}
    }

    setSearchLoading(true)
    try {
      const keyword = mainId || playerName
      const res = await ApiSearchRealtimeMonitorTeams({ keyword })
      if (res.data.code === 200) {
        mergeTeamRows(Array.isArray(res.data.data) ? res.data.data : [], reset)
      }
    } catch (e: any) {
      alert('搜索失败: ' + (e.response?.data?.message || e.message))
    } finally {
      setSearchLoading(false)
    }
  }

  const handleSearch = async () => {
    const keyword = searchKeyword.trim()
    if (!keyword) return
    const isMainId = /^\d+/.test(keyword)
    await requestTeams({ mainId: isMainId ? keyword : '', playerName: isMainId ? '' : keyword, reset: true })
  }

  const handleClearTeams = () => {
    setTeamRows([])
  }

  const buildWsUrl = () => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const sessionId = getSessionId()
    const url = new URL(`${protocol}//${window.location.host}/v1/ws/realtime-monitor`)
    if (sessionId) {
      url.searchParams.set('session_id', sessionId)
    }
    return url.toString()
  }

  const startWebSocket = () => {
    if (wsRef.current && (wsRef.current.readyState === WebSocket.OPEN || wsRef.current.readyState === WebSocket.CONNECTING)) {
      return
    }

    setWsStatus('connecting')
    try {
      wsRef.current = new WebSocket(buildWsUrl())
    } catch (e) {
      setWsStatus('error')
      scheduleReconnect()
      return
    }

    wsRef.current.onopen = () => {
      setWsStatus('connected')
      if (pingTimerRef.current) clearInterval(pingTimerRef.current)
      pingTimerRef.current = setInterval(() => {
        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
          wsRef.current.send(JSON.stringify({ type: 'ping' }))
        }
      }, 30000)
    }

    wsRef.current.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)
        if (data.type === 'protocol_5028_search_result') {
          const results = Array.isArray(data.results) ? data.results : []
          mergeTeamRows(results)
          return
        }

        if (data.type === 'protocol_5028') {
          if (Array.isArray(data.results) && data.results.length > 0) {
            mergeTeamRows(data.results)
          } else {
            const mainId = String(data?.realtime_context?.main_id || '').trim()
            if (mainId) {
              requestTeams({ mainId })
            }
          }
          return
        }

        if (data.type === 'team_data' && data.team) {
          mergeTeamRows([data.team])
        }
      } catch (e) {}
    }

    wsRef.current.onclose = () => {
      setWsStatus('disconnected')
      if (pingTimerRef.current) {
        clearInterval(pingTimerRef.current)
        pingTimerRef.current = null
      }
      if (!wsManualCloseRef.current) {
        scheduleReconnect()
      }
    }

    wsRef.current.onerror = () => {
      setWsStatus('error')
    }
  }

  const stopWebSocket = () => {
    wsManualCloseRef.current = true
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current)
      reconnectTimerRef.current = null
    }
    if (pingTimerRef.current) {
      clearInterval(pingTimerRef.current)
      pingTimerRef.current = null
    }
    if (wsRef.current) {
      wsRef.current.close()
      wsRef.current = null
    }
    setWsStatus('disconnected')
  }

  const scheduleReconnect = () => {
    if (reconnectTimerRef.current) return
    reconnectTimerRef.current = setTimeout(() => {
      reconnectTimerRef.current = null
      startWebSocket()
    }, 3000)
  }

  useEffect(() => {
    loadStats()
    loadPackets()
    startAutoRefresh()
    startWebSocket()
    return () => {
      stopAutoRefresh()
      stopWebSocket()
    }
  }, [])

  const getWsStatusColor = () => {
    switch (wsStatus) {
      case 'connected': return 'text-emerald-600 bg-emerald-50'
      case 'connecting': return 'text-blue-600 bg-blue-50'
      case 'error': return 'text-red-600 bg-red-50'
      default: return 'text-gray-600 bg-gray-50'
    }
  }

  const getWsStatusText = () => {
    switch (wsStatus) {
      case 'connected': return '已连接'
      case 'connecting': return '连接中...'
      case 'error': return '错误'
      default: return '未连接'
    }
  }

  return (
    <div className="max-w-7xl mx-auto space-y-4 pb-12">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-bold text-gray-800">战场实时监控</h2>
          <span className="px-3 py-1 text-xs font-semibold text-gray-600 bg-gray-100 rounded-full">
            5028协议监控
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 flex items-center gap-4">
          <div className={`w-11 h-11 rounded-xl ${getWsStatusColor().split(' ')[1]} flex items-center justify-center`}>
            {wsStatus === 'connected' ? <Wifi size={20} /> : <WifiOff size={20} />}
          </div>
          <div>
            <div className="text-sm text-gray-500 mb-1">WebSocket</div>
            <div className={`text-lg font-bold ${getWsStatusColor().split(' ')[0]}`}>
              {getWsStatusText()}
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 flex items-center gap-4">
          <div className="w-11 h-11 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center text-xl font-bold">T</div>
          <div>
            <div className="text-sm text-gray-500 mb-1">实时队伍数</div>
            <div className="text-2xl font-bold text-gray-900">{teamRows.length}</div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 flex items-center gap-4">
          <div className={`w-11 h-11 rounded-xl ${stats.battlefield_realtime_enabled ? 'bg-emerald-50' : 'bg-gray-50'} flex items-center justify-center relative`}>
            <span className={`w-3 h-3 rounded-full ${stats.battlefield_realtime_enabled ? 'bg-emerald-500 animate-pulse' : 'bg-gray-400'}`}></span>
          </div>
          <div>
            <div className="text-sm text-gray-500 mb-1">5028 抓包</div>
            <div className={`text-lg font-bold ${stats.battlefield_realtime_enabled ? 'text-emerald-600' : 'text-gray-500'}`}>
              {stats.battlefield_realtime_enabled ? '已开启' : '未开启'}
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 flex items-center gap-4">
          <div className="w-11 h-11 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center text-xl font-bold">P</div>
          <div>
            <div className="text-sm text-gray-500 mb-1">数据包总数</div>
            <div className="text-2xl font-bold text-gray-900">{stats.total_packets || packets.length}</div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
        <div className="flex flex-wrap gap-3 items-center">
          {wsStatus !== 'connected' ? (
            <Button
              className="bg-blue-600 text-white hover:bg-blue-700"
              onClick={startWebSocket}
              disabled={wsStatus === 'connecting'}
            >
              {wsStatus === 'connecting' && <Loader2 size={16} className="mr-1 animate-spin" />}
              <Wifi size={16} className="mr-1" />
              连接WS
            </Button>
          ) : (
            <Button variant="destructive" onClick={stopWebSocket}>
              <WifiOff size={16} className="mr-1" />
              断开WS
            </Button>
          )}

          {!stats.battlefield_realtime_enabled ? (
            <Button
              className="bg-amber-600 text-white hover:bg-amber-700"
              onClick={handleEnable}
              disabled={starting}
            >
              {starting && <Loader2 size={16} className="mr-1 animate-spin" />}
              开启5028抓包
            </Button>
          ) : (
            <Button variant="destructive" onClick={handleDisable} disabled={stopping}>
              {stopping && <Loader2 size={16} className="mr-1 animate-spin" />}
              关闭5028抓包
            </Button>
          )}

          <div className="w-px h-6 bg-gray-200 mx-2 hidden sm:block"></div>

          <Button
            variant="outline"
            onClick={handleClear}
            disabled={packets.length === 0 || clearing}
          >
            {clearing && <Loader2 size={16} className="mr-1 animate-spin" />}
            <Trash2 size={16} className="mr-1" />
            清空数据包
          </Button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
        <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
          <Input
            placeholder="输入 main_id 或玩家名称搜索队伍"
            value={searchKeyword}
            onChange={(e) => setSearchKeyword(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
            className="flex-1"
          />
          <Button
            className="bg-blue-600 text-white hover:bg-blue-700"
            onClick={handleSearch}
            disabled={searchLoading}
          >
            {searchLoading && <Loader2 size={16} className="mr-1 animate-spin" />}
            <Search size={16} className="mr-1" />
            搜索队伍
          </Button>
          <Button
            variant="outline"
            onClick={handleClearTeams}
            disabled={teamRows.length === 0}
          >
            <Trash2 size={16} className="mr-1" />
            清空队伍
          </Button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-4 border-b border-gray-200 flex justify-between items-center">
          <h3 className="font-semibold text-gray-800">
            处理后的队伍列表 ({teamRows.length})
          </h3>
          {wsStatus === 'connected' && (
            <span className="flex items-center gap-2 text-xs font-medium text-emerald-600">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              实时更新中
            </span>
          )}
        </div>

        {teamRows.length === 0 ? (
          <div className="p-12 text-center text-gray-500">
            已收到5028数据包时，如果这里仍为空，说明包内未提取到 main_id 或本地战报库没有匹配队伍
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50">
                <TableHead>玩家</TableHead>
                <TableHead>攻方同盟</TableHead>
                <TableHead>出发坐标</TableHead>
                <TableHead>目标坐标</TableHead>
                <TableHead>到达时间</TableHead>
                <TableHead>剩余时间</TableHead>
                <TableHead>大营</TableHead>
                <TableHead>中军</TableHead>
                <TableHead>前锋</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {teamRows.map((row) => (
                <TableRow key={row.id}>
                  <TableCell className="font-medium">{row.player_name}</TableCell>
                  <TableCell>{row.alliance_name}</TableCell>
                  <TableCell className="font-mono text-sm">{row.start_coord}</TableCell>
                  <TableCell className="font-mono text-sm">{row.target_coord}</TableCell>
                  <TableCell className="text-sm">{row.arrive_time}</TableCell>
                  <TableCell className="text-sm text-orange-600 font-medium">{row.remain_time}</TableCell>
                  <TableCell className="text-sm">{row.main_camp}</TableCell>
                  <TableCell className="text-sm">{row.middle_army}</TableCell>
                  <TableCell className="text-sm">{row.vanguard}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-4 border-b border-gray-200 flex justify-between items-center">
          <h3 className="font-semibold text-gray-800">
            原始5028数据包 ({packets.length})
          </h3>
          {stats.battlefield_realtime_enabled && (
            <span className="flex items-center gap-2 text-xs font-medium text-emerald-600">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              抓包中
            </span>
          )}
        </div>

        {packets.length === 0 ? (
          <div className="p-12 text-center text-gray-500">
            暂无5028数据包
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50">
                <TableHead>时间</TableHead>
                <TableHead>协议</TableHead>
                <TableHead>源地址</TableHead>
                <TableHead>目标地址</TableHead>
                <TableHead>大小</TableHead>
                <TableHead>内容</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {packets.map((packet, index) => (
                <TableRow key={`${packet.timestamp}-${packet.src_ip}-${packet.dst_ip}-${index}`}>
                  <TableCell className="text-sm text-gray-500">{packet.timestamp}</TableCell>
                  <TableCell>
                    <span className="inline-block px-2 py-1 bg-blue-50 text-blue-600 rounded text-xs font-medium font-mono">
                      {packet.cmd_id}
                    </span>
                  </TableCell>
                  <TableCell className="font-mono text-xs text-gray-600">{packet.src_ip}</TableCell>
                  <TableCell className="font-mono text-xs text-gray-600">{packet.dst_ip}</TableCell>
                  <TableCell className="text-sm text-gray-600">{packet.size} B</TableCell>
                  <TableCell>
                    {packet.parsed ? (
                      <div className="max-h-32 overflow-y-auto bg-gray-50 p-2 rounded text-xs font-mono text-gray-600 whitespace-pre-wrap break-all">
                        {formatParsedData(packet.parsed)}
                      </div>
                    ) : (
                      <span className="text-gray-400 text-xs italic">无解析内容</span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  )
}
