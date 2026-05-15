import { useState, useEffect, useRef } from 'react'
import {
  ApiGetUnionLeaderboard,
  ApiGetPersonalLeaderboard,
  ApiGetTerritoryLeaderboard
} from '../api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
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
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs'
import { RefreshCcw, Info } from 'lucide-react'

const REGION_MAP: Record<number, string> = {
  1: '凉州', 2: '并州', 3: '幽州', 4: '益州', 5: '荆州',
  6: '扬州', 7: '冀州', 8: '兖州', 9: '豫州', 10: '徐州',
  11: '青州', 12: '司隶', 13: '雍州',
}

export default function Leaderboard() {
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState<string>('union')

  const [unionKeyword, setUnionKeyword] = useState('')
  const [unionRows, setUnionRows] = useState<any[]>([])

  const [personalKeyword, setPersonalKeyword] = useState('')
  const [personalRows, setPersonalRows] = useState<any[]>([])

  const [territoryRows, setTerritoryRows] = useState<any[]>([])

  const timerRef = useRef<any>(null)

  const loadUnion = async () => {
    try {
      const res = await ApiGetUnionLeaderboard({ limit: 200, name: unionKeyword })
      const items = res?.data?.data?.items || []
      setUnionRows(Array.isArray(items) ? items.map((item: any, idx: number) => ({ ...item, id: item.id || item.rank || `union-${idx}` })) : [])
    } catch (err: any) {
      setUnionRows([])
      if (err?.response?.data?.message === '请先选择数据库') {
        alert('请先在首页选择数据库')
        stopAutoRefresh()
      }
    }
  }

  const loadPersonal = async () => {
    try {
      const params: any = { limit: 500 }
      if (personalKeyword) params.name = personalKeyword
      const res = await ApiGetPersonalLeaderboard(params)
      const items = res?.data?.data?.items || []
      setPersonalRows(Array.isArray(items) ? items.map((item: any, idx: number) => ({ ...item, id: item.id || item.user_id || `personal-${idx}` })) : [])
    } catch (err: any) {
      setPersonalRows([])
    }
  }

  const loadTerritory = async () => {
    try {
      const res = await ApiGetTerritoryLeaderboard({ limit: 200 })
      const backendData = res?.data || {}
      let items: any[] = []
      if (backendData.code === 200 && backendData.data) {
        const dataObj = backendData.data
        if (dataObj && typeof dataObj === 'object' && Array.isArray(dataObj.items)) {
          items = dataObj.items
        } else if (Array.isArray(dataObj)) {
          items = dataObj
        }
      } else if (Array.isArray(backendData.data)) {
        items = backendData.data
      } else if (Array.isArray(backendData)) {
        items = backendData
      }
      setTerritoryRows(Array.isArray(items) ? items.map((item: any, idx: number) => ({ ...item, id: item.id || item.rank || `territory-${idx}` })) : [])
    } catch (err: any) {
      setTerritoryRows([])
    }
  }

  const loadData = async () => {
    setLoading(true)
    await Promise.allSettled([loadUnion(), loadPersonal(), loadTerritory()])
    setLoading(false)
  }

  const startAutoRefresh = () => {
    stopAutoRefresh()
    timerRef.current = setInterval(() => {
      loadTerritory()
    }, 5000)
  }

  const stopAutoRefresh = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
  }

  useEffect(() => {
    loadData()
    startAutoRefresh()
    return () => stopAutoRefresh()
  }, [])

  const fmtTs = (ts: any) => {
    const n = Number(ts)
    if (!n || n <= 0) return '-'
    const d = new Date(n * 1000)
    if (Number.isNaN(d.getTime()) || d.getFullYear() < 2020) return '-'
    return d.toLocaleString('zh-CN', { hour12: false })
  }

  const getRegionName = (region: number) => {
    return REGION_MAP[region] || `州${region}`
  }

  return (
    <div className="max-w-6xl mx-auto space-y-4 pb-12">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-bold text-gray-800">排行榜看板</h2>
          <span className="px-3 py-1 text-xs font-semibold text-gray-600 bg-gray-100 rounded-full">
            实时抓包数据
          </span>
        </div>
        <Button variant="outline" size="sm" disabled={loading} onClick={loadData}>
          <RefreshCcw size={14} className="mr-1" />
          {loading ? '加载中...' : '刷新数据'}
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 flex items-center gap-4">
          <div className="w-11 h-11 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center text-xl font-bold">U</div>
          <div>
            <div className="text-sm text-gray-500 mb-1">同盟排行 (cmd 700)</div>
            <div className="text-2xl font-bold text-gray-900">{unionRows.length}</div>
            <div className="text-xs text-gray-400 mt-1">{unionRows.length === 0 ? '请在游戏内打开同盟排行榜' : '条记录'}</div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 flex items-center gap-4">
          <div className="w-11 h-11 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center text-xl font-bold">P</div>
          <div>
            <div className="text-sm text-gray-500 mb-1">个人排行 (cmd 700)</div>
            <div className="text-2xl font-bold text-gray-900">{personalRows.length}</div>
            <div className="text-xs text-gray-400 mt-1">{personalRows.length === 0 ? '请在游戏内打开个人排行榜' : '条排名记录'}</div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 flex items-center gap-4">
          <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center text-xl font-bold">T</div>
          <div>
            <div className="text-sm text-gray-500 mb-1">个人领地排行 (cmd 6314)</div>
            <div className="text-2xl font-bold text-gray-900">{territoryRows.length}</div>
            <div className="text-xs text-gray-400 mt-1">{territoryRows.length === 0 ? '请在游戏内打开个人排行榜' : '条排名记录'}</div>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 p-3 bg-blue-50 border border-blue-100 rounded-lg text-sm text-blue-700">
        <Info size={16} className="flex-shrink-0" />
        <span>需要在游戏内打开对应排行榜界面才能触发抓包。同盟榜和个人榜均为 cmd 700 数据包，系统会自动识别。</span>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-2 sm:p-4">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="union">同盟排行榜</TabsTrigger>
            <TabsTrigger value="personal">个人排行榜</TabsTrigger>
            <TabsTrigger value="territory">个人领地排行</TabsTrigger>
          </TabsList>
          <TabsContent value="union">
            <div className="py-4 space-y-4">
              <div className="flex gap-2">
                <Input
                  placeholder="按同盟名过滤"
                  value={unionKeyword}
                  onChange={e => setUnionKeyword(e.target.value)}
                  className="w-64 h-9"
                  onKeyDown={(e) => e.key === 'Enter' && loadUnion()}
                />
                <Button size="sm" onClick={loadUnion}>查询</Button>
              </div>
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50">
                    <TableHead>排名</TableHead>
                    <TableHead>同盟名称</TableHead>
                    <TableHead>势力值</TableHead>
                    <TableHead>成员数</TableHead>
                    <TableHead>城池数</TableHead>
                    <TableHead>区域</TableHead>
                    <TableHead>刷新时间</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {unionRows.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-gray-500">暂无数据，请在游戏内打开【同盟排行榜】触发抓包后刷新</TableCell>
                    </TableRow>
                  ) : (
                    unionRows.map((item: any) => (
                      <TableRow key={item.id}>
                        <TableCell><span className="font-bold text-gray-700">{item.rank}</span></TableCell>
                        <TableCell><span className="font-medium text-gray-900">{item.name}</span></TableCell>
                        <TableCell><span className="text-blue-600 font-medium">{item.power?.toLocaleString()}</span></TableCell>
                        <TableCell>{item.total_member}</TableCell>
                        <TableCell>{item.total_npc_city}</TableCell>
                        <TableCell>{item.region}</TableCell>
                        <TableCell className="text-sm text-gray-500">{fmtTs(item.refresh_time)}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </TabsContent>
          <TabsContent value="personal">
            <div className="py-4 space-y-4">
              <div className="flex gap-2">
                <Input
                  placeholder="按玩家名过滤"
                  value={personalKeyword}
                  onChange={e => setPersonalKeyword(e.target.value)}
                  className="w-64 h-9"
                  onKeyDown={(e) => e.key === 'Enter' && loadPersonal()}
                />
                <Button size="sm" onClick={loadPersonal}>查询</Button>
              </div>
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50">
                    <TableHead>排名</TableHead>
                    <TableHead>玩家名称</TableHead>
                    <TableHead>势力值</TableHead>
                    <TableHead>领地数</TableHead>
                    <TableHead>要塞数</TableHead>
                    <TableHead>分城数</TableHead>
                    <TableHead>蜀城数</TableHead>
                    <TableHead>所在州</TableHead>
                    <TableHead>刷新时间</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {personalRows.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center py-8 text-gray-500">暂无数据，请在游戏内打开【个人排行榜】触发 cmd 700 抓包后刷新</TableCell>
                    </TableRow>
                  ) : (
                    personalRows.map((item: any) => (
                      <TableRow key={item.id}>
                        <TableCell>
                          <span className={`font-bold ${item.rank <= 3 ? 'text-amber-600' : 'text-gray-700'}`}>
                            {item.rank}
                          </span>
                        </TableCell>
                        <TableCell><span className="font-medium text-gray-900">{item.name}</span></TableCell>
                        <TableCell><span className="text-blue-600 font-medium">{item.power?.toLocaleString()}</span></TableCell>
                        <TableCell><span className="text-emerald-600 font-medium">{item.land_count}</span></TableCell>
                        <TableCell>{item.fort_count}</TableCell>
                        <TableCell>{item.branch_city_count}</TableCell>
                        <TableCell>{item.shu_cheng_count}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs">{getRegionName(item.region)}</Badge>
                        </TableCell>
                        <TableCell className="text-sm text-gray-500">{fmtTs(item.refresh_time)}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </TabsContent>
          <TabsContent value="territory">
            <div className="py-4 space-y-4">
              <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-600">
                cmd 6314 是打开个人排行榜时服务端下发的领地数据。每条记录包含：玩家坐标位置 + 同盟ID + 领地ID列表。
              </div>
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50">
                    <TableHead>排名</TableHead>
                    <TableHead>玩家名</TableHead>
                    <TableHead>坐标位置</TableHead>
                    <TableHead>同盟ID</TableHead>
                    <TableHead>领地数</TableHead>
                    <TableHead>抓取时间</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {territoryRows.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-gray-500">暂无数据，请在游戏内打开【个人排行榜】触发 cmd 6314 后刷新</TableCell>
                    </TableRow>
                  ) : (
                    territoryRows.map((item: any) => (
                      <TableRow key={item.id}>
                        <TableCell><span className="font-bold text-gray-700">{item.rank}</span></TableCell>
                        <TableCell><span className="font-medium text-gray-900">{item.player_name || '(未知)'}</span></TableCell>
                        <TableCell>{item.player_pos}</TableCell>
                        <TableCell>{item.alliance_id}</TableCell>
                        <TableCell><span className="text-emerald-600 font-medium">{item.territory_count}</span></TableCell>
                        <TableCell className="text-sm text-gray-500">{fmtTs(item.capture_time)}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
