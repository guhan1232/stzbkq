import { useState, useEffect } from 'react'
import {
  ApiGetDatabases,
  ApiCreateDatabase,
  ApiDeleteDatabase,
  ApiClaimDatabase,
  ApiReleaseDatabase,
  ApiGetDatabaseInfo,
  ApiUpdateDatabase
} from '../api'
import { useUserStore } from '../store/user'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
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
import { Plus, Edit2, Link, Unlink, Trash2, Info } from 'lucide-react'

export default function Database() {
  const userStore = useUserStore()
  const isAdmin = userStore.userInfo?.role === 'admin'
  const userId = userStore.userInfo?.id

  const [loading, setLoading] = useState(false)
  const [databases, setDatabases] = useState<any[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const pageSize = 10

  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const onCreateClose = () => setIsCreateOpen(false)
  const [createForm, setCreateForm] = useState({ name: '', display_name: '', server: '', state: '', alliance_name: '' })
  const [createLoading, setCreateLoading] = useState(false)

  const [isEditOpen, setIsEditOpen] = useState(false)
  const onEditClose = () => setIsEditOpen(false)
  const [editForm, setEditForm] = useState({ display_name: '', server: '', state: '', alliance_name: '', bind_ip: '', priority: 0 })
  const [editLoading, setEditLoading] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)

  const [isDetailOpen, setIsDetailOpen] = useState(false)
  const onDetailClose = () => setIsDetailOpen(false)
  const [currentDb, setCurrentDb] = useState<any>(null)
  const [dbStats, setDbStats] = useState<any>(null)

  const loadDatabases = async (p = page) => {
    setLoading(true)
    try {
      const res = await ApiGetDatabases({ page: p, page_size: pageSize })
      if (res.data.code === 200) {
        const list = res.data.data?.list
        setDatabases(Array.isArray(list) ? list : [])
        setTotal(res.data.data?.total || 0)
        setPage(p)
      }
    } catch (e) {
      alert('加载失败')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadDatabases()
  }, [])

  const handleCreate = async () => {
    if (!createForm.name) return alert('请输入数据库名称')
    setCreateLoading(true)
    try {
      const res = await ApiCreateDatabase(createForm)
      if (res.data.code === 200) {
        alert('创建成功')
        onCreateClose()
        setCreateForm({ name: '', display_name: '', server: '', state: '', alliance_name: '' })
        loadDatabases()
      } else {
        alert(res.data.message || '创建失败')
      }
    } catch (e) {
      alert('创建失败')
    } finally {
      setCreateLoading(false)
    }
  }

  const openEdit = (row: any) => {
    setEditingId(row.id)
    setEditForm({
      display_name: row.display_name || '',
      server: row.server || '',
      state: row.state || '',
      alliance_name: row.alliance_name || '',
      bind_ip: row.bind_ip || '',
      priority: row.priority || 0
    })
    setIsEditOpen(true)
  }

  const handleEdit = async () => {
    if (!editingId) return
    setEditLoading(true)
    try {
      const res = await ApiUpdateDatabase(editingId, editForm)
      if (res.data.code === 200) {
        alert('更新成功')
        onEditClose()
        loadDatabases()
      } else {
        alert(res.data.message || '更新失败')
      }
    } catch (e) {
      alert('更新失败')
    } finally {
      setEditLoading(false)
    }
  }

  const handleAction = async (action: Function, id: number, confirmMsg?: string) => {
    if (confirmMsg && !confirm(confirmMsg)) return
    try {
      const res = await action(id)
      if (res.data.code === 200) {
        alert('操作成功')
        loadDatabases()
      } else {
        alert(res.data.message || '操作失败')
      }
    } catch (e) {
      alert('操作失败')
    }
  }

  const showDetail = async (row: any) => {
    setCurrentDb(row)
    setIsDetailOpen(true)
    try {
      const res = await ApiGetDatabaseInfo(row.id)
      if (res.data.code === 200) setDbStats(res.data.data.stats)
    } catch (e) {}
  }

  const pages = Math.ceil(total / pageSize)

  return (
    <div className="max-w-6xl mx-auto space-y-4 pb-12">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-xl font-bold text-gray-800">区服管理</h2>
        <Button className="bg-blue-600 text-white hover:bg-blue-700" onClick={() => setIsCreateOpen(true)}>
          <Plus size={16} className="mr-1" />新建区服
        </Button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-gray-50">
              <TableHead>ID</TableHead>
              <TableHead>数据库名</TableHead>
              <TableHead>区服</TableHead>
              <TableHead>所在州</TableHead>
              <TableHead>同盟名字</TableHead>
              <TableHead>状态</TableHead>
              <TableHead>内网IP</TableHead>
              <TableHead>优先级</TableHead>
              <TableHead>绑定用户</TableHead>
              <TableHead>操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={10} className="text-center py-8 text-gray-500">加载中...</TableCell>
              </TableRow>
            ) : databases.length === 0 ? (
              <TableRow>
                <TableCell colSpan={10} className="text-center py-8 text-gray-500">暂无数据</TableCell>
              </TableRow>
            ) : (
              databases.map((item: any) => (
                <TableRow key={item.id}>
                  <TableCell>{item.id}</TableCell>
                  <TableCell className="font-medium">{item.name}</TableCell>
                  <TableCell>
                    <span className="px-2 py-1 text-xs bg-blue-100 text-blue-600 rounded-full">{item.server || item.server_name || '-'}</span>
                  </TableCell>
                  <TableCell>{item.state || '-'}</TableCell>
                  <TableCell>{item.alliance_name || '-'}</TableCell>
                  <TableCell>
                    {item.status === 1 ? (
                      <span className="flex items-center gap-1 text-emerald-600 text-sm"><div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />正常</span>
                    ) : (
                      <span className="flex items-center gap-1 text-red-600 text-sm"><div className="w-1.5 h-1.5 rounded-full bg-red-500" />禁用</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {item.bind_ip ? <span className="font-mono text-xs text-gray-600">{item.bind_ip}</span> : <span className="text-gray-400 text-xs">未绑定</span>}
                  </TableCell>
                  <TableCell>{item.priority}</TableCell>
                  <TableCell>
                    {item.owner_id ? <span className="font-mono text-xs text-gray-600">用户#{item.owner_id}</span> : <span className="text-gray-400 text-xs">未绑定</span>}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => showDetail(item)}><Info size={14} /></Button>
                      {(isAdmin || item.owner_id === userId) && (
                        <Button size="sm" variant="outline" className="h-8 text-blue-600 border-blue-200 hover:bg-blue-50" onClick={() => openEdit(item)}><Edit2 size={14} /></Button>
                      )}
                      {isAdmin && item.owner_id === 0 && (
                        <Button size="sm" variant="outline" className="h-8 text-emerald-600 border-emerald-200 hover:bg-emerald-50" onClick={() => handleAction(ApiClaimDatabase, item.id)}><Link size={14} /></Button>
                      )}
                      {(isAdmin || item.owner_id === userId) && item.owner_id !== 0 && (
                        <Button size="sm" variant="outline" className="h-8 text-amber-600 border-amber-200 hover:bg-amber-50" onClick={() => handleAction(ApiReleaseDatabase, item.id)}><Unlink size={14} /></Button>
                      )}
                      {(isAdmin || item.owner_id === userId) && (
                        <Button size="sm" variant="outline" className="h-8 text-red-600 border-red-200 hover:bg-red-50" onClick={() => handleAction(ApiDeleteDatabase, item.id, '确定删除此区服吗？此操作将删除该区服的所有数据，且不可恢复！')}><Trash2 size={14} /></Button>
                      )}
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
                  <PaginationPrevious onClick={() => page > 1 && loadDatabases(page - 1)} className={page <= 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'} />
                </PaginationItem>
                {Array.from({ length: pages }, (_, i) => i + 1).map(p => (
                  <PaginationItem key={p}>
                    <PaginationLink isActive={p === page} onClick={() => loadDatabases(p)} className="cursor-pointer">
                      {p}
                    </PaginationLink>
                  </PaginationItem>
                ))}
                <PaginationItem>
                  <PaginationNext onClick={() => page < pages && loadDatabases(page + 1)} className={page >= pages ? 'pointer-events-none opacity-50' : 'cursor-pointer'} />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          </div>
        )}
      </div>

      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>新建区服</DialogTitle>
            <DialogDescription>创建新的区服数据库</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>数据库名称 <span className="text-red-500">*</span></Label>
              <Input value={createForm.name} onChange={e => setCreateForm({ ...createForm, name: e.target.value })} placeholder="如: 率土有米#5664034_X5536" />
              <p className="text-xs text-gray-500 mt-1">数据库唯一标识，用于数据隔离</p>
            </div>
            <div>
              <Label>区服</Label>
              <Input value={createForm.server} onChange={e => setCreateForm({ ...createForm, server: e.target.value })} placeholder="如: X5536" />
            </div>
            <div>
              <Label>所在州</Label>
              <Input value={createForm.state} onChange={e => setCreateForm({ ...createForm, state: e.target.value })} placeholder="如: 凉州、冀州" />
            </div>
            <div>
              <Label>同盟名字</Label>
              <Input value={createForm.alliance_name} onChange={e => setCreateForm({ ...createForm, alliance_name: e.target.value })} placeholder="如: 率土有米" />
            </div>
            <div>
              <Label>显示名称</Label>
              <Input value={createForm.display_name} onChange={e => setCreateForm({ ...createForm, display_name: e.target.value })} placeholder="自定义显示名称（可选）" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={onCreateClose}>取消</Button>
            <Button className="bg-blue-600 text-white hover:bg-blue-700" disabled={createLoading} onClick={handleCreate}>
              {createLoading ? '创建中...' : '创建'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>编辑区服</DialogTitle>
            <DialogDescription>修改区服配置信息</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>区服</Label>
              <Input value={editForm.server} onChange={e => setEditForm({ ...editForm, server: e.target.value })} />
            </div>
            <div>
              <Label>所在州</Label>
              <Input value={editForm.state} onChange={e => setEditForm({ ...editForm, state: e.target.value })} />
            </div>
            <div>
              <Label>同盟名字</Label>
              <Input value={editForm.alliance_name} onChange={e => setEditForm({ ...editForm, alliance_name: e.target.value })} />
            </div>
            <div>
              <Label>显示名称</Label>
              <Input value={editForm.display_name} onChange={e => setEditForm({ ...editForm, display_name: e.target.value })} />
            </div>
            <div>
              <Label>绑定内网IP</Label>
              <Input value={editForm.bind_ip} onChange={e => setEditForm({ ...editForm, bind_ip: e.target.value })} placeholder="如: 192.168.1.10" />
              <p className="text-xs text-gray-500 mt-1">支持绑定多个IP，逗号分隔</p>
            </div>
            <div>
              <Label>区服优先级</Label>
              <Input type="number" value={editForm.priority.toString()} onChange={e => setEditForm({ ...editForm, priority: parseInt(e.target.value) || 0 })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={onEditClose}>取消</Button>
            <Button className="bg-blue-600 text-white hover:bg-blue-700" disabled={editLoading} onClick={handleEdit}>
              {editLoading ? '保存中...' : '保存'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>区服详情</DialogTitle>
            <DialogDescription>查看区服详细信息与数据统计</DialogDescription>
          </DialogHeader>
          <div>
            {currentDb && (
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div><span className="text-gray-500 block">数据库名</span><span className="font-medium">{currentDb.name}</span></div>
                <div><span className="text-gray-500 block">区服</span><span className="font-medium">{currentDb.server || currentDb.server_name || '-'}</span></div>
                <div><span className="text-gray-500 block">所在州</span><span className="font-medium">{currentDb.state || '-'}</span></div>
                <div><span className="text-gray-500 block">同盟名字</span><span className="font-medium">{currentDb.alliance_name || '-'}</span></div>
                <div><span className="text-gray-500 block">绑定用户</span><span className="font-medium">{currentDb.owner_id ? `用户#${currentDb.owner_id}` : '未绑定'}</span></div>
                <div><span className="text-gray-500 block">绑定内网IP</span><span className="font-medium">{currentDb.bind_ip || '未绑定'}</span></div>
              </div>
            )}
            {dbStats && (
              <div className="mt-4 pt-4 border-t border-gray-200">
                <h4 className="font-bold text-gray-800 mb-3">数据统计</h4>
                <div className="grid grid-cols-4 gap-2 text-center">
                  <div className="bg-gray-50 p-2 rounded"><div className="text-lg font-bold text-blue-600">{dbStats.team_user_count}</div><div className="text-xs text-gray-500">同盟成员</div></div>
                  <div className="bg-gray-50 p-2 rounded"><div className="text-lg font-bold text-blue-600">{dbStats.task_count}</div><div className="text-xs text-gray-500">任务数量</div></div>
                  <div className="bg-gray-50 p-2 rounded"><div className="text-lg font-bold text-blue-600">{dbStats.report_count}</div><div className="text-xs text-gray-500">战报数量</div></div>
                  <div className="bg-gray-50 p-2 rounded"><div className="text-lg font-bold text-blue-600">{dbStats.battle_report_count}</div><div className="text-xs text-gray-500">详细战报</div></div>
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button className="bg-blue-600 text-white hover:bg-blue-700" onClick={onDetailClose}>关闭</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
