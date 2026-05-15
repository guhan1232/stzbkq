import { useState, useEffect } from 'react'
import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import { useUserStore } from '../store/user'
import { ApiLogout } from '../api'
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  Home,
  Users,
  UserMinus,
  MapPin,
  FileText,
  BarChart2,
  Trophy,
  Activity,
  Database,
  Settings,
  ShieldCheck,
  Lock,
  Key,
  LogOut,
  Menu,
  ChevronLeft,
  ChevronRight,
  Search,
  MessageSquare,
  ScrollText,
  Swords,
  Radar
} from 'lucide-react'

export default function MainLayout() {
  const navigate = useNavigate()
  const location = useLocation()
  const userInfo = useUserStore(state => state.userInfo)
  const logout = useUserStore(state => state.logout)

  const [collapsed, setCollapsed] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [submenuOpen, setSubmenuOpen] = useState<string | null>(null)

  const isAdmin = userInfo?.role === 'admin'

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth <= 768
      setIsMobile(mobile)
      if (mobile) setCollapsed(true)
    }
    handleResize()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  useEffect(() => {
    if (!userInfo) {
      navigate('/login')
    }
  }, [userInfo, navigate])

  const menuItems = [
    { path: '/', title: '首页概览', icon: Home },
    { path: '/teamuser', title: '同盟成员', icon: Users },
    { path: '/memberhistory', title: '离盟人员', icon: UserMinus },
    { path: '/landrecords', title: '翻地记录', icon: MapPin },
    { path: '/task', title: '攻城任务', icon: FileText },
    { path: '/groupWu', title: '分组武勋', icon: BarChart2 },
    { path: '/leaderboard', title: '排行榜看板', icon: Trophy },
    {
      title: '协议工具',
      icon: Activity,
      children: [
        { path: '/packet-capture', title: '数据包捕获', icon: Activity },
        { path: '/chat-messages', title: '聊天消息', icon: MessageSquare },
        { path: '/manifesto', title: '檄文', icon: ScrollText }
      ]
    },
    { path: '/team-query', title: '队伍查询', icon: Search },
    { path: '/battlefield-stats', title: '战场人数', icon: Swords },
    { path: '/battlefield-realtime-monitor', title: '战场实时监控', icon: Radar },
    { path: '/database', title: '区服管理', icon: Database },
    { path: '/api', title: 'API调试', icon: Settings }
  ]

  if (isAdmin) {
    menuItems.push({ path: '/users', title: '用户管理', icon: Settings })
    menuItems.push({ path: '/ip-whitelist', title: 'IP白名单', icon: Lock })
    menuItems.push({ path: '/host-check', title: '访问控制', icon: ShieldCheck })
    menuItems.push({ path: '/ai-key-manager', title: 'AI密钥管理', icon: Key })
  }

  const handleLogout = async () => {
    try {
      await ApiLogout()
    } catch (e) {}
    logout()
    navigate('/login')
  }

  const findRouteName = (items: any[], pathname: string): string => {
    for (const item of items) {
      if (item.path === pathname) return item.title
      if (item.children) {
        const childName = findRouteName(item.children, pathname)
        if (childName) return childName
      }
    }
    return '首页概览'
  }

  const currentRouteName = findRouteName(menuItems, location.pathname)

  if (!userInfo) return null

  const SidebarContent = () => (
    <div className="flex flex-col h-full bg-white/85 backdrop-blur-xl border-r border-blue-100/60">
      <div className={`flex items-center h-16 border-b border-blue-100/50 ${collapsed && !isMobile ? 'justify-center px-0' : 'px-5 gap-3'}`}>
        <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-500 text-white flex items-center justify-center text-xl flex-shrink-0 shadow-lg shadow-blue-200/60">
          ⚔
        </div>
        {(!collapsed || isMobile) && (
          <div className="flex flex-col overflow-hidden">
            <span className="text-sm font-bold text-gray-800 truncate">人道洛阳花似锦</span>
            <span className="text-xs text-gray-500">v1.0</span>
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto py-5 px-3 space-y-2">
        {menuItems.map((item, index) => {
          const Icon = item.icon
          const hasChildren = (item as any).children
          const isActive = location.pathname === item.path || (hasChildren && (item as any).children?.some((child: any) => child.path === location.pathname))

          if (hasChildren && (!collapsed || isMobile)) {
            const isSubmenuOpen = submenuOpen === item.title
            return (
              <div key={index}>
                <button
                  onClick={() => setSubmenuOpen(isSubmenuOpen ? null : item.title)}
                  className={`w-full flex items-center h-11 rounded-xl transition-all duration-300 ${
                    isActive ? 'bg-gradient-to-r from-blue-50 to-cyan-50 text-blue-700 shadow-md shadow-blue-100/60' : 'text-gray-600 hover:bg-blue-50/50 hover:text-blue-600'
                  } px-4 gap-4`}
                >
                  <Icon size={21} className={isActive ? 'text-blue-600' : 'text-gray-500'} />
                  <span className="text-sm font-semibold whitespace-nowrap flex-1 text-left">{item.title}</span>
                  <ChevronRight size={16} className={`text-gray-400 transition-transform ${isSubmenuOpen ? 'rotate-90' : ''}`} />
                </button>
                {isSubmenuOpen && (
                  <div className="ml-6 mt-1 space-y-1">
                    {(item as any).children.map((child: any) => {
                      const ChildIcon = child.icon
                      const isChildActive = location.pathname === child.path
                      return (
                        <button
                          key={child.path}
                          onClick={() => {
                            navigate(child.path)
                            if (isMobile) setMobileMenuOpen(false)
                          }}
                          className={`w-full flex items-center h-9 rounded-lg transition-all duration-300 px-3 gap-3 text-sm ${
                            isChildActive ? 'bg-blue-100 text-blue-700 font-medium' : 'text-gray-500 hover:bg-blue-50/50 hover:text-blue-600'
                          }`}
                        >
                          <ChildIcon size={16} />
                          <span>{child.title}</span>
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          }

          return (
            <button
              key={item.path || index}
              onClick={() => {
                if ((item as any).external) {
                  window.open(item.path, '_blank')
                } else {
                  navigate(item.path)
                }
                if (isMobile) setMobileMenuOpen(false)
              }}
              className={`w-full flex items-center h-11 rounded-xl transition-all duration-300 ${
                isActive ? 'bg-gradient-to-r from-blue-50 to-cyan-50 text-blue-700 shadow-md shadow-blue-100/60' : 'text-gray-600 hover:bg-blue-50/50 hover:text-blue-600'
              } ${collapsed && !isMobile ? 'justify-center px-0' : 'px-4 gap-4'}`}
              title={collapsed ? item.title : ''}
            >
              <Icon size={21} className={isActive ? 'text-blue-600' : 'text-gray-500'} />
              {(!collapsed || isMobile) && <span className="text-sm font-semibold whitespace-nowrap">{item.title}</span>}
            </button>
          )
        })}
      </div>

      {(!collapsed || isMobile) && (
        <div className="p-5 border-t border-blue-100/50 text-center text-xs text-gray-400">
          © 2024 人道洛阳花似锦
        </div>
      )}
    </div>
  )

  return (
    <div className="flex h-screen w-full bg-gradient-to-br from-blue-50 via-cyan-50/30 overflow-hidden">
      {!isMobile && (
        <aside className={`${collapsed ? 'w-[72px]' : 'w-64'} flex-shrink-0 transition-all duration-400 z-20`}>
          <SidebarContent />
        </aside>
      )}

      {isMobile && mobileMenuOpen && (
        <div className="fixed inset-0 z-50 flex">
          <div className="fixed inset-0 bg-blue-900/40 backdrop-blur-sm" onClick={() => setMobileMenuOpen(false)} />
          <div className="w-64 h-full relative z-10">
            <SidebarContent />
          </div>
        </div>
      )}

      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 bg-white/80 backdrop-blur-xl border-b border-blue-100/60 flex items-center justify-between px-5 sm:px-8">
          <div className="flex items-center gap-4">
            {isMobile ? (
              <button onClick={() => setMobileMenuOpen(true)} className="text-gray-600 hover:text-blue-600 transition-colors p-2 hover:bg-blue-50 rounded-xl">
                <Menu size={24} />
              </button>
            ) : (
              <button onClick={() => setCollapsed(!collapsed)} className="text-gray-600 hover:text-blue-600 transition-colors p-2 hover:bg-blue-50 rounded-xl">
                {collapsed ? <ChevronRight size={21} /> : <ChevronLeft size={21} />}
              </button>
            )}
            {!isMobile && <span className="text-blue-200">/</span>}
            <span className="font-semibold text-gray-800">{currentRouteName}</span>
          </div>

          <div className="flex items-center gap-4">
            {isAdmin && !isMobile && (
              <span className="px-3 py-1.5 text-xs rounded-full bg-gradient-to-r from-amber-100 to-orange-100 text-amber-700 font-semibold border border-amber-200">管理员</span>
            )}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-3 cursor-pointer hover:bg-blue-50/80 p-2 pr-3 rounded-full transition-all duration-300 hover:shadow-md outline-none">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="bg-gradient-to-br from-blue-500 to-cyan-500 text-white text-sm shadow-md shadow-blue-200/70">
                      {userInfo.username?.charAt(0)?.toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  {!isMobile && <span className="text-sm font-semibold text-gray-700">{userInfo.username}</span>}
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem onClick={() => navigate('/password')}>
                  <Key size={16} className="mr-2" />
                  修改密码
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} className="text-destructive focus:text-destructive">
                  <LogOut size={16} className="mr-2" />
                  退出登录
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        <main className="flex-1 overflow-auto p-5 sm:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
