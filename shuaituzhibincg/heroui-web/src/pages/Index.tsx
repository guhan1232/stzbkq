import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useUserStore } from '../store/user'
import { 
  ApiEnableGetBattleReport, 
  ApiDisableGetBattleReport, 
  ApiGetDatabases, 
  ApiSelectDatabase, 
  ApiEnableGetLeaderboard, 
  ApiDisableGetLeaderboard,
  ApiStartPacketCapture,
  ApiStopPacketCapture,
  ApiGetPacketCaptureStats,
  ApiEnableGetChatMessage,
  ApiDisableGetChatMessage,
  ApiGetChatMessageStats,
  ApiEnableGetManifesto,
  ApiDisableGetManifesto,
  ApiGetManifestoStats
} from '../api'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { 
  Users, 
  FileText, 
  BarChart2, 
  Trophy, 
  Search, 
  Database, 
  Key,
  ChevronRight,
  Activity,
  MessageSquare,
  ScrollText
} from 'lucide-react'

export default function Index() {
  const navigate = useNavigate()
  const userInfo = useUserStore(state => state.userInfo)
  const setUserInfo = useUserStore(state => state.setUserInfo)
  
  const [loading, setLoading] = useState(false)
  const [battleReportEnabled, setBattleReportEnabled] = useState(false)
  const [leaderboardEnabled, setLeaderboardEnabled] = useState(false)
  const [packetCaptureRunning, setPacketCaptureRunning] = useState(false)
  const [chatMessageEnabled, setChatMessageEnabled] = useState(false)
  const [manifestoEnabled, setManifestoEnabled] = useState(false)
  const [stats, setStats] = useState({ databaseCount: 0, taskCount: 0 })
  const [dbInitialized, setDbInitialized] = useState(false)

  const quickActions = [
    { icon: Users, title: '同盟成员', desc: '查看和管理同盟成员信息', path: '/teamuser', color: 'bg-blue-500' },
    { icon: FileText, title: '攻城任务', desc: '创建和管理攻城任务', path: '/task', color: 'bg-emerald-400' },
    { icon: BarChart2, title: '分组武勋', desc: '统计分组武勋数据', path: '/groupWu', color: 'bg-purple-400' },
    { icon: Trophy, title: '排行榜看板', desc: '查看同盟和个人排行榜', path: '/leaderboard', color: 'bg-amber-400' },
    { icon: Search, title: '队伍查询', desc: '查询玩家队伍配置', path: '/team', color: 'bg-pink-400', external: true },
    { icon: Database, title: '数据库管理', desc: '创建和管理游戏数据库', path: '/database', color: 'bg-blue-400' },
    { icon: Key, title: '修改密码', desc: '更新账户密码', path: '/password', color: 'bg-orange-400' }
  ]

  const enableGetBattleReport = async () => {
    setLoading(true)
    try {
      const v = await ApiEnableGetBattleReport()
      if (v.data.code === 200) {
        setBattleReportEnabled(true)
        alert('开启成功')
      } else {
        alert(v.data.message || '操作失败')
      }
    } catch (e) {
      alert('开启失败')
    } finally {
      setLoading(false)
    }
  }

  const disableGetBattleReport = async () => {
    setLoading(true)
    try {
      const v = await ApiDisableGetBattleReport()
      if (v.data.code === 200) {
        setBattleReportEnabled(false)
        alert('关闭成功')
      } else {
        alert(v.data.message || '操作失败')
      }
    } catch (e) {
      alert('关闭失败')
    } finally {
      setLoading(false)
    }
  }

  const enableGetLeaderboard = async () => {
    setLoading(true)
    try {
      const v = await ApiEnableGetLeaderboard()
      if (v.data.code === 200) {
        setLeaderboardEnabled(true)
        alert('排行榜抓取已开启')
      } else {
        alert(v.data.message || '操作失败')
      }
    } catch (e) {
      alert('开启失败')
    } finally {
      setLoading(false)
    }
  }

  const disableGetLeaderboard = async () => {
    setLoading(true)
    try {
      const v = await ApiDisableGetLeaderboard()
      if (v.data.code === 200) {
        setLeaderboardEnabled(false)
        alert('排行榜抓取已关闭')
      } else {
        alert(v.data.message || '操作失败')
      }
    } catch (e) {
      alert('关闭失败')
    } finally {
      setLoading(false)
    }
  }

  const startPacketCapture = async () => {
    setLoading(true)
    try {
      const v = await ApiStartPacketCapture()
      if (v.data.code === 200) {
        setPacketCaptureRunning(true)
        alert('数据包捕获已开启')
      } else {
        alert(v.data.message || '操作失败')
      }
    } catch (e) {
      alert('开启失败')
    } finally {
      setLoading(false)
    }
  }

  const stopPacketCapture = async () => {
    setLoading(true)
    try {
      const v = await ApiStopPacketCapture()
      if (v.data.code === 200) {
        setPacketCaptureRunning(false)
        alert('数据包捕获已停止')
      } else {
        alert(v.data.message || '操作失败')
      }
    } catch (e) {
      alert('停止失败')
    } finally {
      setLoading(false)
    }
  }

  const enableGetChatMessage = async () => {
    setLoading(true)
    try {
      const v = await ApiEnableGetChatMessage()
      if (v.data.code === 200) {
        setChatMessageEnabled(true)
        alert('聊天消息抓取已开启')
      } else {
        alert(v.data.message || '操作失败')
      }
    } catch (e) {
      alert('开启失败')
    } finally {
      setLoading(false)
    }
  }

  const disableGetChatMessage = async () => {
    setLoading(true)
    try {
      const v = await ApiDisableGetChatMessage()
      if (v.data.code === 200) {
        setChatMessageEnabled(false)
        alert('聊天消息抓取已关闭')
      } else {
        alert(v.data.message || '操作失败')
      }
    } catch (e) {
      alert('关闭失败')
    } finally {
      setLoading(false)
    }
  }

  const enableGetManifesto = async () => {
    setLoading(true)
    try {
      const v = await ApiEnableGetManifesto()
      if (v.data.code === 200) {
        setManifestoEnabled(true)
        alert('檄文抓取已开启')
      } else {
        alert(v.data.message || '操作失败')
      }
    } catch (e) {
      alert('开启失败')
    } finally {
      setLoading(false)
    }
  }

  const disableGetManifesto = async () => {
    setLoading(true)
    try {
      const v = await ApiDisableGetManifesto()
      if (v.data.code === 200) {
        setManifestoEnabled(false)
        alert('檄文抓取已关闭')
      } else {
        alert(v.data.message || '操作失败')
      }
    } catch (e) {
      alert('关闭失败')
    } finally {
      setLoading(false)
    }
  }

  const handleAction = (action: any) => {
    if (action.external) {
      window.open('/data.html#/team', '_blank')
    } else {
      navigate(action.path)
    }
  }

  const initDatabase = async () => {
    try {
      const res = await ApiGetDatabases({ page: 1, page_size: 10 })
      if (res.data.code === 200) {
        const list = Array.isArray(res.data.data?.list) ? res.data.data.list : []
        setStats(s => ({ ...s, databaseCount: res.data.data?.total || 0 }))

        if (list.length > 0) {
          if (userInfo && !userInfo.database_id) {
            await ApiSelectDatabase({ database_id: list[0].id })
            setUserInfo({ ...userInfo, database_id: list[0].id })
          }
        }
      }
    } catch (error) {
      console.error('初始化数据库失败:', error)
    } finally {
      setDbInitialized(true)
    }
  }

  const initCaptureStatus = async () => {
    try {
      const [packetRes, chatRes, manifestoRes] = await Promise.allSettled([
        ApiGetPacketCaptureStats(),
        ApiGetChatMessageStats(),
        ApiGetManifestoStats()
      ])
      if (packetRes.status === 'fulfilled' && packetRes.value.data.code === 200) {
        setPacketCaptureRunning(packetRes.value.data.data.is_running)
      }
      if (chatRes.status === 'fulfilled' && chatRes.value.data.code === 200) {
        setChatMessageEnabled(chatRes.value.data.data.is_enabled)
      }
      if (manifestoRes.status === 'fulfilled' && manifestoRes.value.data.code === 200) {
        setManifestoEnabled(manifestoRes.value.data.data.is_enabled)
      }
    } catch (e) {}
  }

  useEffect(() => {
    initDatabase()
    initCaptureStatus()
  }, [])

  if (!userInfo) return null

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-12">
      <Card className="shadow-sm border border-gray-200">
        <CardContent className="p-6 md:p-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="flex items-center gap-4">
            <Avatar className="w-14 h-14">
              <AvatarFallback className="bg-blue-600 text-white text-xl">
                {userInfo.username?.charAt(0)?.toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div>
              <h2 className="text-xl font-bold text-gray-800">欢迎回来，{userInfo.username}</h2>
              <p className="text-sm text-gray-500">管理你的同盟数据，一切尽在掌握</p>
            </div>
          </div>
          
          <div className="hidden md:flex items-center gap-8 pr-4">
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-600">{stats.databaseCount}</div>
              <div className="text-xs text-gray-500 mt-1">数据库</div>
            </div>
            <div className="w-px h-10 bg-gray-200" />
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-600">{stats.taskCount}</div>
              <div className="text-xs text-gray-500 mt-1">任务</div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div>
        <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-3">控制面板</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card className="shadow-sm border border-gray-200">
            <CardContent className="p-5 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div>
                <h4 className="font-semibold text-gray-800">获取详细战报</h4>
                <p className="text-xs text-gray-500 mt-1">用于队伍查询功能拉取战报，开启时无法获取攻城战报</p>
              </div>
              <div className="flex gap-2 w-full md:w-auto">
                <Button 
                  size="sm" 
                  variant={battleReportEnabled ? "default" : "outline"} 
                  isLoading={loading}
                  onClick={enableGetBattleReport}
                  className="flex-1 md:flex-none"
                >
                  开启
                </Button>
                <Button 
                  size="sm" 
                  variant={!battleReportEnabled ? "destructive" : "outline"} 
                  isLoading={loading}
                  onClick={disableGetBattleReport}
                  className="flex-1 md:flex-none"
                >
                  关闭
                </Button>
              </div>
            </CardContent>
          </Card>
          
          <Card className="shadow-sm border border-gray-200">
            <CardContent className="p-5 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div>
                <h4 className="font-semibold text-gray-800">排行榜数据抓取</h4>
                <p className="text-xs text-gray-500 mt-1">抓取同盟排行(cmd 700)、个人积分(cmd 514/6314)实时数据</p>
              </div>
              <div className="flex gap-2 w-full md:w-auto">
                <Button 
                  size="sm" 
                  variant={leaderboardEnabled ? "default" : "outline"} 
                  isLoading={loading}
                  onClick={enableGetLeaderboard}
                  className="flex-1 md:flex-none"
                >
                  开启
                </Button>
                <Button 
                  size="sm" 
                  variant={!leaderboardEnabled ? "destructive" : "outline"} 
                  isLoading={loading}
                  onClick={disableGetLeaderboard}
                  className="flex-1 md:flex-none"
                >
                  关闭
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <div>
        <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-3">协议抓取控制</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="shadow-sm border border-gray-200">
            <CardContent className="p-5 flex flex-col gap-4">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-blue-500 text-white flex items-center justify-center flex-shrink-0">
                  <Activity size={18} />
                </div>
                <div>
                  <h4 className="font-semibold text-gray-800">数据包捕获</h4>
                  <p className="text-xs text-gray-500">2200协议监控</p>
                </div>
                {packetCaptureRunning && (
                  <span className="ml-auto flex items-center gap-1.5 text-xs font-medium text-emerald-600">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    运行中
                  </span>
                )}
              </div>
              <div className="flex gap-2">
                <Button 
                  size="sm" 
                  variant={packetCaptureRunning ? "default" : "outline"} 
                  isLoading={loading}
                  onClick={startPacketCapture}
                  className="flex-1"
                >
                  开启
                </Button>
                <Button 
                  size="sm" 
                  variant={!packetCaptureRunning ? "destructive" : "outline"} 
                  isLoading={loading}
                  onClick={stopPacketCapture}
                  className="flex-1"
                >
                  停止
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-sm border border-gray-200">
            <CardContent className="p-5 flex flex-col gap-4">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-indigo-500 text-white flex items-center justify-center flex-shrink-0">
                  <MessageSquare size={18} />
                </div>
                <div>
                  <h4 className="font-semibold text-gray-800">聊天消息</h4>
                  <p className="text-xs text-gray-500">724协议抓取</p>
                </div>
                {chatMessageEnabled && (
                  <span className="ml-auto flex items-center gap-1.5 text-xs font-medium text-emerald-600">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    运行中
                  </span>
                )}
              </div>
              <div className="flex gap-2">
                <Button 
                  size="sm" 
                  variant={chatMessageEnabled ? "default" : "outline"} 
                  isLoading={loading}
                  onClick={enableGetChatMessage}
                  className="flex-1"
                >
                  开启
                </Button>
                <Button 
                  size="sm" 
                  variant={!chatMessageEnabled ? "destructive" : "outline"} 
                  isLoading={loading}
                  onClick={disableGetChatMessage}
                  className="flex-1"
                >
                  关闭
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-sm border border-gray-200">
            <CardContent className="p-5 flex flex-col gap-4">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-orange-500 text-white flex items-center justify-center flex-shrink-0">
                  <ScrollText size={18} />
                </div>
                <div>
                  <h4 className="font-semibold text-gray-800">檄文</h4>
                  <p className="text-xs text-gray-500">3788协议抓取</p>
                </div>
                {manifestoEnabled && (
                  <span className="ml-auto flex items-center gap-1.5 text-xs font-medium text-emerald-600">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    运行中
                  </span>
                )}
              </div>
              <div className="flex gap-2">
                <Button 
                  size="sm" 
                  variant={manifestoEnabled ? "default" : "outline"} 
                  isLoading={loading}
                  onClick={enableGetManifesto}
                  className="flex-1"
                >
                  开启
                </Button>
                <Button 
                  size="sm" 
                  variant={!manifestoEnabled ? "destructive" : "outline"} 
                  isLoading={loading}
                  onClick={disableGetManifesto}
                  className="flex-1"
                >
                  关闭
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <div>
        <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-3">快捷入口</h3>
        <div className="grid grid-cols-1 gap-3">
          {quickActions.map((action, idx) => (
            <Card 
              key={action.path || action.title || `action-${idx}`} 
              className="shadow-sm border border-gray-200 hover:border-blue-300 transition-colors w-full cursor-pointer"
              onClick={() => handleAction(action)}
            >
              <CardContent className="p-4 flex flex-row items-center gap-4 w-full">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-white ${action.color} flex-shrink-0`}>
                  <action.icon size={20} />
                </div>
                <div className="flex-1 text-left">
                  <h4 className="font-semibold text-gray-800">{action.title}</h4>
                  <p className="text-xs text-gray-500">{action.desc}</p>
                </div>
                <ChevronRight className="text-gray-300 flex-shrink-0" size={20} />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  )
}
