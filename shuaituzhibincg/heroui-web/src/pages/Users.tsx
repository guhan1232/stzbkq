import { useState, useEffect } from 'react'
import { ApiGetUsers, ApiUpdateUserStatus, ApiResetPassword, ApiDeleteUser, ApiUpdateUserRole, ApiExecuteCleanup } from '../api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
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
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationPrevious,
  PaginationNext,
} from '@/components/ui/pagination'
import { RefreshCcw, Trash2, Key, ShieldAlert } from 'lucide-react'

export default function Users() {
  const [users, setUsers] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const pageSize = 10

  const [cleanupType, setCleanupType] = useState('auto')
  const [cleanupLoading, setCleanupLoading] = useState(false)

  const [isResetOpen, setIsResetOpen] = useState(false)
  const [resetUserId, setResetUserId] = useState<number | null>(null)
  const [resetUsername, setResetUsername] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [resetLoading, setResetLoading] = useState(false)

  const loadUsers = async (p = page) => {
    setLoading(true)
    try {
      const res = await ApiGetUsers({ page: p, page_size: pageSize })
      if (res.data.code === 200) {
        const list = res.data.data?.list
        setUsers(Array.isArray(list) ? list : [])
        setTotal(res.data.data?.total || 0)
        setPage(p)
      }
    } catch (e) {
      alert('加载用户列表失败')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadUsers()
  }, [])

  const handleStatusChange = async (userId: number, checked: boolean) => {
    try {
      const res = await ApiUpdateUserStatus({ user_id: userId, status: checked ? 1 : 0 })
      if (res.data.code === 200) loadUsers()
      else alert(res.data.message || '操作失败')
    } catch (e) {
      alert('状态更新失败')
    }
  }

  const handleRoleChange = async (userId: number, role: string) => {
    try {
      const res = await ApiUpdateUserRole({ user_id: userId, role })
      if (res.data.code === 200) loadUsers()
      else alert(res.data.message || '操作失败')
    } catch (e) {
      alert('角色更新失败')
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm('确定删除此用户吗？')) return
    try {
      const res = await ApiDeleteUser(id)
      if (res.data.code === 200) loadUsers()
      else alert(res.data.message || '操作失败')
    } catch (e) {
      alert('删除失败')
    }
  }

  const openResetModal = (id: number, username: string) => {
    setResetUserId(id)
    setResetUsername(username)
    setNewPassword('')
    setIsResetOpen(true)
  }

  const handleResetPassword = async () => {
    if (!newPassword || newPassword.length < 6) return alert('请输入至少6字符的新密码')
    setResetLoading(true)
    try {
      const res = await ApiResetPassword({ user_id: resetUserId, new_password: newPassword })
      if (res.data.code === 200) {
        alert('密码重置成功')
        setIsResetOpen(false)
      } else {
        alert(res.data.message || '密码重置失败')
      }
    } catch (e) {
      alert('密码重置失败')
    } finally {
      setResetLoading(false)
    }
  }

  const handleCleanup = async () => {
    const isAll = cleanupType === 'all_reports'
    const msg = isAll
      ? '确定要清理所有战报吗？这将删除数据库中的全部战报数据，此操作不可恢复！'
      : '确定要执行数据清理吗？这将删除超过7天的任务和战报，此操作不可恢复！'
    if (!confirm(msg)) return

    setCleanupLoading(true)
    try {
      const res = await ApiExecuteCleanup(cleanupType)
      if (res.data.code === 200) alert(res.data.message || '清理任务已启动')
      else alert(res.data.message || '清理失败')
    } catch (e) {
      alert('清理失败')
    } finally {
      setCleanupLoading(false)
    }
  }

  const pages = Math.ceil(total / pageSize)

  return (
    <div className="max-w-6xl mx-auto space-y-4 pb-12">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-bold text-gray-800">用户管理</h2>
          <span className="px-3 py-1 text-xs font-semibold text-gray-600 bg-gray-100 rounded-full">
            共 {total} 个用户
          </span>
        </div>
        <div className="flex gap-2 items-center flex-wrap">
          <Select value={cleanupType} onValueChange={setCleanupType}>
            <SelectTrigger className="w-40 h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="auto">自动清理(7天)</SelectItem>
              <SelectItem value="all_reports">清理所有战报</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" className="text-red-600 border-red-200 hover:bg-red-50" size="sm" disabled={cleanupLoading} onClick={handleCleanup}>
            <ShieldAlert size={14} className="mr-1" />
            {cleanupLoading ? '清理中...' : '执行清理'}
          </Button>
          <Button variant="outline" size="sm" onClick={() => loadUsers()}>
            <RefreshCcw size={14} className="mr-1" />刷新
          </Button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-gray-50">
              <TableHead>ID</TableHead>
              <TableHead>用户名</TableHead>
              <TableHead>昵称</TableHead>
              <TableHead>角色</TableHead>
              <TableHead className="text-center">状态</TableHead>
              <TableHead>最后登录</TableHead>
              <TableHead>注册时间</TableHead>
              <TableHead>操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8 text-gray-500">加载中...</TableCell>
              </TableRow>
            ) : users.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8 text-gray-500">暂无数据</TableCell>
              </TableRow>
            ) : (
              users.map((item: any) => (
                <TableRow key={item.id}>
                  <TableCell>{item.id}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Avatar className="h-6 w-6">
                        <AvatarFallback className="text-xs bg-blue-100 text-blue-600">{item.username?.charAt(0)?.toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <span className="font-medium">{item.username}</span>
                    </div>
                  </TableCell>
                  <TableCell>{item.nickname}</TableCell>
                  <TableCell>
                    <Select value={item.role} onValueChange={(val) => handleRoleChange(item.id, val)}>
                      <SelectTrigger className="w-28 h-8">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="admin">管理员</SelectItem>
                        <SelectItem value="user">普通用户</SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell className="text-center">
                    <Switch
                      checked={item.status === 1}
                      onCheckedChange={(checked) => handleStatusChange(item.id, checked)}
                    />
                  </TableCell>
                  <TableCell className="text-sm text-gray-500">{item.last_login_at || '-'}</TableCell>
                  <TableCell className="text-sm text-gray-500">{item.created_at || '-'}</TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => openResetModal(item.id, item.username)}>
                        <Key size={14} className="mr-1" />重置密码
                      </Button>
                      <Button size="sm" variant="outline" className="text-red-600 border-red-200 hover:bg-red-50 h-8 w-8 p-0" onClick={() => handleDelete(item.id)}>
                        <Trash2 size={14} />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
        {pages > 0 && (
          <div className="flex justify-end p-4 border-t border-gray-100">
            <Pagination>
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious onClick={() => page > 1 && loadUsers(page - 1)} className={page <= 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'} />
                </PaginationItem>
                {Array.from({ length: pages }, (_, i) => i + 1).map(p => (
                  <PaginationItem key={p}>
                    <PaginationLink isActive={p === page} onClick={() => loadUsers(p)} className="cursor-pointer">
                      {p}
                    </PaginationLink>
                  </PaginationItem>
                ))}
                <PaginationItem>
                  <PaginationNext onClick={() => page < pages && loadUsers(page + 1)} className={page >= pages ? 'pointer-events-none opacity-50' : 'cursor-pointer'} />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          </div>
        )}
      </div>

      <Dialog open={isResetOpen} onOpenChange={setIsResetOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>重置密码</DialogTitle>
            <DialogDescription>为用户设置新密码</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-gray-600">为用户 <strong className="text-gray-900">{resetUsername}</strong> 设置新密码</p>
            <div>
              <Label>新密码</Label>
              <Input
                type="password"
                placeholder="请输入新密码（至少6字符）"
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsResetOpen(false)}>取消</Button>
            <Button className="bg-blue-600 text-white hover:bg-blue-700" disabled={resetLoading} onClick={handleResetPassword}>
              {resetLoading ? '重置中...' : '确认重置'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
