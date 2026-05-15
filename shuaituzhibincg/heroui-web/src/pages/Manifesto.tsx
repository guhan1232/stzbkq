import { useState, useEffect, useRef } from 'react'
import {
  ApiEnableGetManifesto,
  ApiDisableGetManifesto,
  ApiGetManifestoList,
  ApiGetManifestoStats,
  ApiDeleteManifestos
} from '../api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
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
import { Play, Square, Trash2, Download, RefreshCcw, Search, X, ScrollText, FileDown } from 'lucide-react'

interface ManifestoItem {
  id: number
  msg_type: number
  title: string
  sub_type: number
  player_id: number
  unknown1: number
  alliance_name: string
  alliance_id: number
  flag: number
  time: number
  content: string
  world_id: number
  server_name: string
  pos: string
  value1: number
  value2: number
  value3: number
  value4: number
  uid: string
  faction: string
}

export default function Manifesto() {
  const [captureEnabled, setCaptureEnabled] = useState(false)
  const [manifestos, setManifestos] = useState<ManifestoItem[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)

  const [page, setPage] = useState(1)
  const [pageSize] = useState(50)
  const [hasMore, setHasMore] = useState(true)

  const [filterAlliance, setFilterAlliance] = useState('')
  const [filterTitle, setFilterTitle] = useState('')
  const [filterContent, setFilterContent] = useState('')
  const [showFilter, setShowFilter] = useState(false)

  const [clearModalOpen, setClearModalOpen] = useState(false)
  const [clearing, setClearing] = useState(false)

  const [detailModalOpen, setDetailModalOpen] = useState(false)
  const [detailContent, setDetailContent] = useState<ManifestoItem | null>(null)
  const [apiAvailable, setApiAvailable] = useState(true)
  const [dbNotSelected, setDbNotSelected] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
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
      const res = await ApiGetManifestoStats()
      if (res.data.code === 200) {
        setCaptureEnabled(res.data.data?.capture_enabled || false)
        setApiAvailable(true)
        setDbNotSelected(false)
      }
    } catch (e: any) {
      handleApiError(e)
    }
  }

  const loadManifestos = async (reset = false) => {
    setLoading(true)
    try {
      const params: any = { page: reset ? 1 : page, page_size: pageSize }
      if (filterAlliance) params.alliance_name = filterAlliance
      if (filterTitle) params.title = filterTitle
      if (filterContent) params.content = filterContent

      const res = await ApiGetManifestoList(params)
      if (res.data.code === 200) {
        const list = res.data.data?.list
        const validList = Array.isArray(list) ? list : []
        if (reset) {
          setManifestos(validList)
          setPage(1)
          setSelectedIds(new Set())
        } else {
          setManifestos(prev => [...prev, ...validList])
        }
        setTotal(res.data.data?.total || 0)
        setHasMore(validList.length >= pageSize)
        setApiAvailable(true)
      }
    } catch (e: any) {
      handleApiError(e)
    } finally {
      setLoading(false)
    }
  }

  const handleToggleCapture = async () => {
    try {
      if (captureEnabled) {
        await ApiDisableGetManifesto()
        setCaptureEnabled(false)
      } else {
        await ApiEnableGetManifesto()
        setCaptureEnabled(true)
      }
    } catch (e: any) {
      if (e?.response?.status === 404) {
        setApiAvailable(false)
        alert('后端暂不支持3788协议抓取，请更新后端服务')
      } else if (e?.response?.status === 400) {
        setDbNotSelected(true)
        alert('请先选择数据库')
      }
    }
  }

  const handleSearch = () => {
    loadManifestos(true)
  }

  const handleReset = () => {
    setFilterAlliance('')
    setFilterTitle('')
    setFilterContent('')
    setTimeout(() => {
      loadManifestos(true)
    }, 0)
  }

  const handleLoadMore = () => {
    setPage(prev => prev + 1)
  }

  useEffect(() => {
    if (page > 1) loadManifestos()
  }, [page])

  const handleRefresh = () => {
    loadManifestos(true)
    loadStats()
  }

  const handleExport = () => {
    const text = manifestos.map(m => {
      const time = formatTime(m.time)
      return `[${time}] [${m.alliance_name}] ${m.title}\n${m.content}`
    }).join('\n\n---\n\n')

    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `manifesto_${Date.now()}.txt`
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleExportSelected = () => {
    const selected = manifestos.filter(m => selectedIds.has(String(m.id)))
    if (selected.length === 0) return
    const text = selected.map(m => {
      const time = formatTime(m.time)
      return `[${time}] [${m.alliance_name}] ${m.title}\n${m.content}`
    }).join('\n\n---\n\n')

    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `manifesto_selected_${Date.now()}.txt`
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleClear = async () => {
    setClearing(true)
    try {
      const res = await ApiDeleteManifestos()
      if (res.data.code === 200) {
        alert(`已清除 ${res.data.data || ''} 条檄文`)
        setManifestos([])
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

  const handleViewDetail = (item: ManifestoItem) => {
    setDetailContent(item)
    setDetailModalOpen(true)
  }

  const startAutoRefresh = () => {
    if (refreshRef.current) clearInterval(refreshRef.current)
    refreshRef.current = setInterval(() => {
      loadStats()
      loadManifestos(true)
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
    loadManifestos(true)
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
    const y = d.getFullYear()
    const m = (d.getMonth() + 1).toString().padStart(2, '0')
    const day = d.getDate().toString().padStart(2, '0')
    const h = d.getHours().toString().padStart(2, '0')
    const min = d.getMinutes().toString().padStart(2, '0')
    return `${y}-${m}-${day} ${h}:${min}`
  }

  const getTypeLabel = (subType: number) => {
    switch (subType) {
      case 1: return '宣战'
      case 2: return '庆典'
      case 3: return '联盟'
      default: return `类型${subType}`
    }
  }

  const getTypeColor = (subType: number) => {
    switch (subType) {
      case 1: return 'bg-red-50 text-red-600'
      case 2: return 'bg-amber-50 text-amber-600'
      case 3: return 'bg-blue-50 text-blue-600'
      default: return 'bg-gray-50 text-gray-600'
    }
  }

  const toggleSelectAll = () => {
    if (selectedIds.size === manifestos.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(manifestos.map(m => String(m.id))))
    }
  }

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  return (
    <div className="max-w-6xl mx-auto space-y-4 pb-12">
      {!apiAvailable && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center gap-3">
          <span className="text-amber-500 text-lg">⚠</span>
          <div>
            <div className="font-semibold text-amber-700 text-sm">后端暂不支持3788协议</div>
            <div className="text-amber-600 text-xs mt-0.5">请更新后端服务以支持檄文抓取功能</div>
          </div>
        </div>
      )}
      {dbNotSelected && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-center gap-3">
          <span className="text-blue-500 text-lg">ℹ</span>
          <div>
            <div className="font-semibold text-blue-700 text-sm">请先选择数据库</div>
            <div className="text-blue-600 text-xs mt-0.5">在左侧菜单中选择一个区服数据库后，即可使用檄文功能</div>
          </div>
        </div>
      )}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-bold text-gray-800">檄文</h2>
          <span className="px-3 py-1 text-xs font-semibold text-gray-600 bg-gray-100 rounded-full">
            3788协议
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
            <Download size={16} className="mr-1" />导出全部
          </Button>

          <Button
            variant="outline"
            onClick={handleExportSelected}
            disabled={selectedIds.size === 0}
            size="sm"
          >
            <FileDown size={16} className="mr-1" />导出选中{selectedIds.size > 0 ? `(${selectedIds.size})` : ''}
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
              placeholder="檄文标题"
              value={filterTitle}
              onChange={e => setFilterTitle(e.target.value)}
              className="w-40 h-9"
            />
            <Input
              placeholder="内容关键词"
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
          <h3 className="font-semibold text-gray-800">檄文列表（共 {total} 条）</h3>
          {selectedIds.size > 0 && (
            <div className="flex items-center gap-3">
              <span className="text-sm text-blue-600 font-medium">已选 {selectedIds.size} 条</span>
              <Button variant="outline" size="sm" onClick={() => setSelectedIds(new Set())}>
                取消选择
              </Button>
            </div>
          )}
        </div>
        <Table>
          <TableHeader>
            <TableRow className="bg-gray-50">
              <TableHead className="w-10">
                <Checkbox
                  checked={manifestos.length > 0 && selectedIds.size === manifestos.length}
                  onCheckedChange={toggleSelectAll}
                />
              </TableHead>
              <TableHead>标题</TableHead>
              <TableHead>类型</TableHead>
              <TableHead>同盟</TableHead>
              <TableHead>势力</TableHead>
              <TableHead>内容预览</TableHead>
              <TableHead className="w-[140px]">时间</TableHead>
              <TableHead className="w-[60px]">详情</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading && manifestos.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8 text-gray-500">加载中...</TableCell>
              </TableRow>
            ) : manifestos.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8 text-gray-500">暂无檄文，请先开启3788协议抓取</TableCell>
              </TableRow>
            ) : (
              manifestos.map((item: ManifestoItem) => (
                <TableRow key={String(item.id)}>
                  <TableCell>
                    <Checkbox
                      checked={selectedIds.has(String(item.id))}
                      onCheckedChange={() => toggleSelect(String(item.id))}
                    />
                  </TableCell>
                  <TableCell>
                    <span className="font-semibold text-gray-800 text-sm">{item.title || '-'}</span>
                  </TableCell>
                  <TableCell>
                    <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${getTypeColor(item.sub_type)}`}>
                      {getTypeLabel(item.sub_type)}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className="inline-block px-2 py-0.5 bg-indigo-50 text-indigo-600 rounded text-xs font-medium max-w-[120px] truncate">
                      {item.alliance_name || '-'}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className="inline-block px-2 py-0.5 bg-orange-50 text-orange-600 rounded text-xs font-medium">
                      {item.faction || '-'}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm text-gray-600 line-clamp-1 max-w-[280px]">{item.content ? item.content.substring(0, 60) + '...' : '-'}</span>
                  </TableCell>
                  <TableCell>
                    <span className="text-xs text-gray-400 whitespace-nowrap">{formatTime(item.time)}</span>
                  </TableCell>
                  <TableCell>
                    <button
                      onClick={() => handleViewDetail(item)}
                      className="p-1.5 hover:bg-blue-50 rounded-lg transition-colors text-blue-500 hover:text-blue-700"
                      title="查看详情"
                    >
                      <ScrollText size={16} />
                    </button>
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
        {!hasMore && manifestos.length > 0 && (
          <div className="p-3 text-center text-xs text-gray-400 border-t border-gray-100">
            没有更多了
          </div>
        )}
      </div>

      <Dialog open={detailModalOpen} onOpenChange={setDetailModalOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              <span>{detailContent?.title || '檄文详情'}</span>
              {detailContent?.sub_type && (
                <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${getTypeColor(detailContent.sub_type)}`}>
                  {getTypeLabel(detailContent.sub_type)}
                </span>
              )}
            </DialogTitle>
          </DialogHeader>
          {detailContent && (
            <div className="space-y-3">
              <div className="flex flex-wrap gap-4 text-sm">
                <div>
                  <span className="text-gray-400">同盟：</span>
                  <span className="font-medium text-indigo-600">{detailContent.alliance_name || '-'}</span>
                </div>
                <div>
                  <span className="text-gray-400">势力：</span>
                  <span className="font-medium text-orange-600">{detailContent.faction || '-'}</span>
                </div>
                <div>
                  <span className="text-gray-400">服务器：</span>
                  <span className="font-medium text-gray-700">{detailContent.server_name || '-'}</span>
                </div>
                <div>
                  <span className="text-gray-400">坐标：</span>
                  <span className="font-mono text-gray-700">{detailContent.pos || '-'}</span>
                </div>
                <div>
                  <span className="text-gray-400">时间：</span>
                  <span className="text-gray-700">{formatTime(detailContent.time)}</span>
                </div>
              </div>
              <div className="border-t border-gray-100 pt-3">
                <div className="text-gray-400 text-xs mb-2">正文内容</div>
                <div className="bg-gray-50 rounded-lg p-4 text-sm text-gray-800 leading-relaxed whitespace-pre-wrap max-h-96 overflow-y-auto">
                  {detailContent.content || '无内容'}
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDetailModalOpen(false)}>关闭</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={clearModalOpen} onOpenChange={setClearModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-red-600">确认清空</DialogTitle>
            <DialogDescription>此操作不可恢复</DialogDescription>
          </DialogHeader>
          <p className="text-gray-600">确定要清空所有檄文数据吗？此操作不可恢复！</p>
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
