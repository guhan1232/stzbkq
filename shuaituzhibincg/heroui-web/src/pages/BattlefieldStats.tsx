import { useState, useEffect, useCallback } from 'react'
import { ApiGetBattlefieldStats, ApiGetBattleReports, ApiDeleteBattleReports, ApiMigrateWidFormat } from '../api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { RefreshCcw, Search, X, Swords, MapPin, Plus, Trash2, Download, ChevronLeft, ChevronRight, AlertTriangle } from 'lucide-react'

interface BattlefieldInfo {
  wid: string
  wid_name: string
  attack_count: number
  defend_count: number
  report_count: number
  attack_unions: string
  defend_unions: string
  x: number
  y: number
}

interface BattleReportDetail {
  id: number
  battle_id: number
  time: number
  wid: string
  wid_name: string
  attack_name: string
  attack_union_name: string
  attack_clan_name: string
  defend_name: string
  defend_union_name: string
  defend_clan_name: string
  attack_idu: string
  defend_idu: string
  attack_advance: string
  attack_all_hero_info: string
  attacker_gear_info: string
  defend_advance: string
  defend_all_hero_info: string
  defender_gear_info: string
  attack_hero_type: string
  attack_hero_type_advance: string
  defend_hero_type: string
  defend_hero_type_advance: string
  attack_hp: number
  defend_hp: number
  npc: number
  result: number
  attack_total_star: number
  defend_total_star: number
  attack_help_id: string
}

interface RangePreset {
  name: string
  minX: number
  maxX: number
  minY: number
  maxY: number
}

const STORAGE_KEY = 'battlefield_range_presets'

const defaultPresets: RangePreset[] = [
  { name: '洛阳', minX: 400, maxX: 600, minY: 400, maxY: 600 },
  { name: '虎牢关', minX: 550, maxX: 650, minY: 350, maxY: 450 },
  { name: '潼关', minX: 300, maxX: 400, minY: 350, maxY: 450 },
  { name: '司隶', minX: 350, maxX: 650, minY: 350, maxY: 650 },
  { name: '雍州', minX: 100, maxX: 350, minY: 250, maxY: 500 },
  { name: '兖州', minX: 550, maxX: 800, minY: 200, maxY: 450 },
  { name: '豫州', minX: 400, maxX: 650, minY: 450, maxY: 700 },
  { name: '冀州', minX: 500, maxX: 800, minY: 450, maxY: 750 },
  { name: '荆州', minX: 250, maxX: 550, minY: 550, maxY: 850 },
  { name: '益州', minX: 50, maxX: 300, minY: 450, maxY: 750 },
  { name: '凉州', minX: 0, maxX: 200, minY: 200, maxY: 450 },
  { name: '并州', minX: 300, maxX: 600, minY: 600, maxY: 900 },
  { name: '幽州', minX: 600, maxX: 900, minY: 650, maxY: 950 },
  { name: '青州', minX: 750, maxX: 1000, minY: 300, maxY: 600 },
  { name: '徐州', minX: 700, maxX: 950, minY: 450, maxY: 700 },
  { name: '扬州', minX: 550, maxX: 850, minY: 650, maxY: 950 },
  { name: '交州', minX: 100, maxX: 450, minY: 750, maxY: 1000 },
]

function loadPresets(): RangePreset[] {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) {
      const parsed = JSON.parse(saved)
      if (Array.isArray(parsed) && parsed.length > 0) return parsed
    }
  } catch {}
  return defaultPresets
}

function savePresets(presets: RangePreset[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(presets))
}

function formatTime(timestamp: number) {
  if (!timestamp) return '-'
  const d = new Date(timestamp * 1000)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function parseHeroDisplay(heroInfo: string): string {
  if (!heroInfo) return '-'
  const heroes = heroInfo.split('|')
  const names: string[] = []
  for (const h of heroes) {
    const parts = h.split(',')
    if (parts.length >= 3 && parts[2]) names.push(parts[2])
  }
  return names.length > 0 ? names.join(' / ') : heroInfo.length > 60 ? heroInfo.slice(0, 60) + '...' : heroInfo
}

function getResultText(result: number) {
  if (result === 1) return '进攻方胜'
  if (result === 2) return '防守方胜'
  return `结果${result}`
}

export default function BattlefieldStats() {
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<BattlefieldInfo[]>([])
  const [unionName, setUnionName] = useState('')
  const [minHp, setMinHp] = useState('')
  const [nonpc, setNonpc] = useState(false)
  const [widName, setWidName] = useState('')
  const [minX, setMinX] = useState('')
  const [maxX, setMaxX] = useState('')
  const [minY, setMinY] = useState('')
  const [maxY, setMaxY] = useState('')
  const [showFilter, setShowFilter] = useState(false)
  const [activePreset, setActivePreset] = useState<string>('')
  const [presets, setPresets] = useState<RangePreset[]>(loadPresets)
  const [showAddPreset, setShowAddPreset] = useState(false)
  const [newPresetName, setNewPresetName] = useState('')
  const [newPresetMinX, setNewPresetMinX] = useState('')
  const [newPresetMaxX, setNewPresetMaxX] = useState('')
  const [newPresetMinY, setNewPresetMinY] = useState('')
  const [newPresetMaxY, setNewPresetMaxY] = useState('')
  const [addError, setAddError] = useState('')

  const [detailWid, setDetailWid] = useState<string | null>(null)
  const [detailWidName, setDetailWidName] = useState('')
  const [detailLoading, setDetailLoading] = useState(false)
  const [detailData, setDetailData] = useState<BattleReportDetail[]>([])
  const [detailTotal, setDetailTotal] = useState(0)
  const [detailPage, setDetailPage] = useState(1)
  const detailPageSize = 20
  const [selectedIds, setSelectedIds] = useState<number[]>([])
  const [deleteLoading, setDeleteLoading] = useState(false)

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const params: any = {}
      if (unionName) params.union_name = unionName
      if (minHp) params.min_hp = minHp
      if (nonpc) params.nonpc = '1'
      if (widName) params.wid_name = widName
      if (minX) params.min_x = minX
      if (maxX) params.max_x = maxX
      if (minY) params.min_y = minY
      if (maxY) params.max_y = maxY
      const res = await ApiGetBattlefieldStats(params)
      if (res.data.code === 200) {
        const list = res.data.data
        setData(Array.isArray(list) ? list : [])
      } else {
        setData([])
      }
    } catch (e) {
      setData([])
    } finally {
      setLoading(false)
    }
  }, [unionName, minHp, nonpc, widName, minX, maxX, minY, maxY])

  useEffect(() => {
    loadData()
  }, [loadData])

  const loadDetail = async (wid: string, widName: string, page: number = 1) => {
    setDetailWid(wid)
    setDetailWidName(widName)
    setDetailPage(page)
    setSelectedIds([])
    setDetailLoading(true)
    try {
      const res = await ApiGetBattleReports({ wid, page, page_size: detailPageSize })
      if (res.data.code === 200) {
        setDetailData(res.data.data.list || [])
        setDetailTotal(res.data.data.total || 0)
      } else {
        setDetailData([])
        setDetailTotal(0)
      }
    } catch {
      setDetailData([])
      setDetailTotal(0)
    } finally {
      setDetailLoading(false)
    }
  }

  const handleRowClick = (item: BattlefieldInfo) => {
    loadDetail(item.wid, item.wid_name || item.wid)
  }

  const closeDetail = () => {
    setDetailWid(null)
    setDetailData([])
    setSelectedIds([])
  }

  const toggleSelectId = (id: number) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    )
  }

  const toggleSelectAll = () => {
    if (selectedIds.length === detailData.length) {
      setSelectedIds([])
    } else {
      setSelectedIds(detailData.map(r => r.id))
    }
  }

  const handleDeleteSelected = async () => {
    if (selectedIds.length === 0) return
    if (!confirm(`确定要删除选中的 ${selectedIds.length} 条战报吗？`)) return
    setDeleteLoading(true)
    try {
      await ApiDeleteBattleReports({ ids: selectedIds.join(',') })
      setSelectedIds([])
      if (detailWid) {
        loadDetail(detailWid, detailWidName, detailPage)
      }
      loadData()
    } catch {}
    setDeleteLoading(false)
  }

  const handleDeleteAll = async () => {
    if (!detailWid) return
    if (!confirm(`确定要删除该战场（${detailWidName}）的全部 ${detailTotal} 条战报吗？此操作不可恢复！`)) return
    setDeleteLoading(true)
    try {
      await ApiDeleteBattleReports({ wid: detailWid })
      closeDetail()
      loadData()
    } catch {}
    setDeleteLoading(false)
  }

  const handlePresetClick = (preset: RangePreset) => {
    if (activePreset === preset.name) {
      setActivePreset('')
      setMinX('')
      setMaxX('')
      setMinY('')
      setMaxY('')
    } else {
      setActivePreset(preset.name)
      setMinX(String(preset.minX))
      setMaxX(String(preset.maxX))
      setMinY(String(preset.minY))
      setMaxY(String(preset.maxY))
    }
  }

  const handleReset = () => {
    setUnionName('')
    setMinHp('')
    setNonpc(false)
    setWidName('')
    setMinX('')
    setMaxX('')
    setMinY('')
    setMaxY('')
    setActivePreset('')
  }

  const handleOpenAddPreset = () => {
    setNewPresetName('')
    setNewPresetMinX('')
    setNewPresetMaxX('')
    setNewPresetMinY('')
    setNewPresetMaxY('')
    setAddError('')
    setShowAddPreset(true)
  }

  const handleAddPreset = () => {
    setAddError('')
    if (!newPresetName.trim()) {
      setAddError('请输入名称')
      return
    }
    if (!newPresetMinX || !newPresetMaxX || !newPresetMinY || !newPresetMaxY) {
      setAddError('请填写完整的坐标范围')
      return
    }
    if (presets.some(p => p.name === newPresetName.trim())) {
      setAddError('该名称已存在')
      return
    }
    let px1 = Number(newPresetMinX), px2 = Number(newPresetMaxX)
    let py1 = Number(newPresetMinY), py2 = Number(newPresetMaxY)
    if (isNaN(px1) || isNaN(px2) || isNaN(py1) || isNaN(py2)) {
      setAddError('坐标必须为数字')
      return
    }
    if (px1 > px2) { [px1, px2] = [px2, px1] }
    if (py1 > py2) { [py1, py2] = [py2, py1] }
    const newPreset: RangePreset = {
      name: newPresetName.trim(),
      minX: px1,
      maxX: px2,
      minY: py1,
      maxY: py2,
    }
    const updated = [...presets, newPreset]
    setPresets(updated)
    savePresets(updated)
    setActivePreset(newPreset.name)
    setMinX(String(px1))
    setMaxX(String(px2))
    setMinY(String(py1))
    setMaxY(String(py2))
    setShowAddPreset(false)
  }

  const handleDeletePreset = (name: string, e: React.MouseEvent) => {
    e.stopPropagation()
    const updated = presets.filter(p => p.name !== name)
    setPresets(updated)
    savePresets(updated)
    if (activePreset === name) {
      setActivePreset('')
      setMinX('')
      setMaxX('')
      setMinY('')
      setMaxY('')
    }
  }

  const handleExportCSV = () => {
    if (data.length === 0) return
    const headers = ['战场名称', '坐标', 'X', 'Y', '进攻方人数', '防守方人数', '战报数', '进攻方同盟', '防守方同盟']
    const rows = data.map(item => [
      item.wid_name || '',
      item.wid,
      String(item.x),
      String(item.y),
      String(item.attack_count),
      String(item.defend_count),
      String(item.report_count),
      item.attack_unions || '',
      item.defend_unions || '',
    ])
    const csvContent = '\uFEFF' + [headers, ...rows].map(row => row.map(cell => `"${cell.replace(/"/g, '""')}"`).join(',')).join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    const rangeStr = activePreset ? `_${activePreset}` : (minX || maxX || minY || maxY ? `_${minX || 0}-${maxX || 0}_${minY || 0}-${maxY || 0}` : '')
    link.download = `战场统计${rangeStr}_${new Date().toLocaleDateString('zh-CN').replace(/\//g, '-')}.csv`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  const totalAttack = data.reduce((sum, item) => sum + item.attack_count, 0)
  const totalDefend = data.reduce((sum, item) => sum + item.defend_count, 0)
  const totalReports = data.reduce((sum, item) => sum + item.report_count, 0)

  const splitUnions = (s: string) => {
    if (!s) return []
    return [...new Set(s.split(',').filter(u => u && u !== '无'))]
  }

  const hasRangeFilter = minX || maxX || minY || maxY
  const isCustomPreset = (name: string) => !defaultPresets.some(d => d.name === name)

  const totalPages = Math.ceil(detailTotal / detailPageSize)

  return (
    <div className="max-w-6xl mx-auto space-y-4 pb-12">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-bold text-gray-800">战场人数统计</h2>
          <span className="px-3 py-1 text-xs font-semibold text-gray-600 bg-gray-100 rounded-full">
            战报分析
          </span>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" disabled={loading || data.length === 0} onClick={handleExportCSV}>
            <Download size={14} className="mr-1" />
            导出CSV
          </Button>
          <Button variant="outline" size="sm" disabled={loading} onClick={async () => {
            if (!confirm('确定要修正数据库中的坐标格式吗？这会将纯数字坐标转换为逗号格式。')) return
            try {
              const res = await ApiMigrateWidFormat()
              if (res.data.code === 200) {
                alert(`修正完成，共修正 ${res.data.data.migrated} 条记录`)
                loadData()
              } else {
                alert('修正失败: ' + res.data.message)
              }
            } catch {
              alert('修正请求失败')
            }
          }}>
            <MapPin size={14} className="mr-1" />
            修正坐标格式
          </Button>
          <Button variant="outline" size="sm" disabled={loading} onClick={loadData}>
            <RefreshCcw size={14} className="mr-1" />
            {loading ? '加载中...' : '刷新'}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 flex items-center gap-4">
          <div className="w-11 h-11 rounded-xl bg-red-50 text-red-600 flex items-center justify-center">
            <Swords size={22} />
          </div>
          <div>
            <div className="text-sm text-gray-500 mb-1">进攻方总人数</div>
            <div className="text-2xl font-bold text-gray-900">{totalAttack}</div>
            <div className="text-xs text-gray-400 mt-1">去重统计</div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 flex items-center gap-4">
          <div className="w-11 h-11 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
            <Swords size={22} />
          </div>
          <div>
            <div className="text-sm text-gray-500 mb-1">防守方总人数</div>
            <div className="text-2xl font-bold text-gray-900">{totalDefend}</div>
            <div className="text-xs text-gray-400 mt-1">去重统计</div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 flex items-center gap-4">
          <div className="w-11 h-11 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center text-xl font-bold">R</div>
          <div>
            <div className="text-sm text-gray-500 mb-1">战报总数</div>
            <div className="text-2xl font-bold text-gray-900">{totalReports}</div>
            <div className="text-xs text-gray-400 mt-1">共 {data.length} 个战场</div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
        <div className="flex items-center gap-2 mb-3">
          <MapPin size={16} className="text-gray-500" />
          <span className="text-sm font-medium text-gray-700">战场范围</span>
          <span className="text-xs text-gray-400">点击自动统计</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {presets.map((preset) => (
            <div
              key={preset.name}
              className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium transition-all cursor-pointer ${
                activePreset === preset.name
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-gray-50 text-gray-700 hover:bg-blue-50 hover:text-blue-700 border border-gray-200'
              }`}
              onClick={() => handlePresetClick(preset)}
            >
              <span>{preset.name}</span>
              <span className={`text-[10px] ${activePreset === preset.name ? 'text-blue-200' : 'text-gray-400'}`}>
                ({preset.minX},{preset.minY})-({preset.maxX},{preset.maxY})
              </span>
              {isCustomPreset(preset.name) && (
                <button
                  onClick={(e) => handleDeletePreset(preset.name, e)}
                  className={`ml-1 p-0.5 rounded transition-colors ${
                    activePreset === preset.name
                      ? 'text-blue-200 hover:text-white hover:bg-blue-700'
                      : 'text-gray-300 hover:text-red-500 hover:bg-red-50'
                  }`}
                  title="删除此预设"
                >
                  <Trash2 size={12} />
                </button>
              )}
            </div>
          ))}
          <button
            onClick={handleOpenAddPreset}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium text-gray-500 hover:text-blue-600 hover:bg-blue-50 border border-dashed border-gray-300 hover:border-blue-300 transition-all"
          >
            <Plus size={14} />
            自定义
          </button>
        </div>

        {showAddPreset && (
          <div className="mt-3 pt-3 border-t border-gray-100">
            <div className="flex flex-wrap gap-2 items-end">
              <div className="space-y-1">
                <label className="text-xs text-gray-500">名称</label>
                <Input
                  placeholder="如：洛阳周边"
                  value={newPresetName}
                  onChange={e => setNewPresetName(e.target.value)}
                  className="w-28 h-8 text-sm"
                  onKeyDown={(e) => e.key === 'Enter' && handleAddPreset()}
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-gray-500">X最小</label>
                <Input placeholder="X min" type="number" value={newPresetMinX} onChange={e => setNewPresetMinX(e.target.value)} className="w-20 h-8 text-sm" />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-gray-500">X最大</label>
                <Input placeholder="X max" type="number" value={newPresetMaxX} onChange={e => setNewPresetMaxX(e.target.value)} className="w-20 h-8 text-sm" />
              </div>
              <span className="text-gray-300 h-8 flex items-center text-xs">×</span>
              <div className="space-y-1">
                <label className="text-xs text-gray-500">Y最小</label>
                <Input placeholder="Y min" type="number" value={newPresetMinY} onChange={e => setNewPresetMinY(e.target.value)} className="w-20 h-8 text-sm" />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-gray-500">Y最大</label>
                <Input placeholder="Y max" type="number" value={newPresetMaxY} onChange={e => setNewPresetMaxY(e.target.value)} className="w-20 h-8 text-sm" />
              </div>
              <Button size="sm" className="h-8 bg-blue-600 text-white hover:bg-blue-700 text-xs" onClick={handleAddPreset}>保存</Button>
              <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => setShowAddPreset(false)}>取消</Button>
            </div>
            {addError && (<div className="mt-2 text-xs text-red-500">{addError}</div>)}
          </div>
        )}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
        <div className="flex flex-wrap gap-3 items-center">
          <Button variant="outline" onClick={() => setShowFilter(!showFilter)} size="sm">
            <Search size={16} className="mr-1" />更多筛选
          </Button>
          {(unionName || minHp || nonpc || widName) && (
            <div className="flex flex-wrap gap-1.5">
              {unionName && <span className="px-2 py-0.5 bg-blue-50 text-blue-600 rounded text-xs">同盟: {unionName}</span>}
              {widName && <span className="px-2 py-0.5 bg-purple-50 text-purple-600 rounded text-xs">战场: {widName}</span>}
              {minHp && <span className="px-2 py-0.5 bg-amber-50 text-amber-600 rounded text-xs">兵力≥{minHp}</span>}
              {nonpc && <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs">排除NPC</span>}
            </div>
          )}
          {hasRangeFilter && (
            <Button variant="ghost" size="sm" className="text-xs text-gray-400 hover:text-red-500 h-7" onClick={handleReset}>
              <X size={12} className="mr-1" />清除范围
            </Button>
          )}
        </div>

        {showFilter && (
          <div className="mt-4 pt-4 border-t border-gray-200 space-y-4">
            <div className="flex flex-wrap gap-3 items-end">
              <div className="space-y-1">
                <label className="text-xs text-gray-500">战场名称</label>
                <Input placeholder="如：洛阳" value={widName} onChange={e => setWidName(e.target.value)} className="w-32 h-9" onKeyDown={(e) => e.key === 'Enter' && loadData()} />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-gray-500">同盟名称</label>
                <Input placeholder="同盟名" value={unionName} onChange={e => setUnionName(e.target.value)} className="w-32 h-9" onKeyDown={(e) => e.key === 'Enter' && loadData()} />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-gray-500">最小兵力</label>
                <Input placeholder="兵力" type="number" value={minHp} onChange={e => setMinHp(e.target.value)} className="w-24 h-9" onKeyDown={(e) => e.key === 'Enter' && loadData()} />
              </div>
              <label className="flex items-center gap-2 text-sm text-gray-600 h-9">
                <input type="checkbox" checked={nonpc} onChange={e => setNonpc(e.target.checked)} className="rounded" />排除NPC
              </label>
            </div>
            <div className="flex gap-2 items-center">
              <Button size="sm" className="bg-blue-600 text-white hover:bg-blue-700" onClick={loadData}>搜索</Button>
              <Button variant="outline" size="sm" onClick={handleReset}>重置</Button>
              <button onClick={() => setShowFilter(false)} className="ml-auto p-1 hover:bg-gray-100 rounded"><X size={16} className="text-gray-400" /></button>
            </div>
          </div>
        )}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-4 border-b border-gray-200 flex justify-between items-center">
          <h3 className="font-semibold text-gray-800">
            各战场人数统计（共 {data.length} 个战场）
            {activePreset && <span className="ml-2 text-sm font-normal text-blue-600">· {activePreset}</span>}
          </h3>
        </div>
        <Table>
          <TableHeader>
            <TableRow className="bg-gray-50">
              <TableHead>战场</TableHead>
              <TableHead>坐标</TableHead>
              <TableHead className="text-center">进攻方人数</TableHead>
              <TableHead className="text-center">防守方人数</TableHead>
              <TableHead className="text-center">战报数</TableHead>
              <TableHead>进攻方同盟</TableHead>
              <TableHead>防守方同盟</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={7} className="text-center py-8 text-gray-500">加载中...</TableCell></TableRow>
            ) : data.length === 0 ? (
              <TableRow><TableCell colSpan={7} className="text-center py-8 text-gray-500">暂无战报数据，请先开启战报抓取</TableCell></TableRow>
            ) : (
              data.map((item) => {
                const atkUnions = splitUnions(item.attack_unions)
                const defUnions = splitUnions(item.defend_unions)
                return (
                  <TableRow key={item.wid} className="cursor-pointer hover:bg-blue-50/50 transition-colors" onClick={() => handleRowClick(item)}>
                    <TableCell>
                      <span className="font-medium text-gray-900">{item.wid_name || '-'}</span>
                    </TableCell>
                    <TableCell>
                      {item.x > 0 || item.y > 0 ? (
                        <span className="text-sm text-gray-600 font-mono">({item.x}, {item.y})</span>
                      ) : (
                        <span className="text-sm text-gray-400 font-mono">{item.wid}</span>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      <span className="inline-flex items-center justify-center w-10 h-8 rounded-lg bg-red-50 text-red-700 font-bold text-sm">{item.attack_count}</span>
                    </TableCell>
                    <TableCell className="text-center">
                      <span className="inline-flex items-center justify-center w-10 h-8 rounded-lg bg-blue-50 text-blue-700 font-bold text-sm">{item.defend_count}</span>
                    </TableCell>
                    <TableCell className="text-center">
                      <span className="text-sm font-medium text-gray-700">{item.report_count}</span>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {atkUnions.length > 0 ? atkUnions.map((u, i) => (
                          <span key={i} className="px-2 py-0.5 bg-red-50 text-red-600 rounded text-xs font-medium max-w-[120px] truncate">{u}</span>
                        )) : <span className="text-xs text-gray-400">-</span>}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {defUnions.length > 0 ? defUnions.map((u, i) => (
                          <span key={i} className="px-2 py-0.5 bg-blue-50 text-blue-600 rounded text-xs font-medium max-w-[120px] truncate">{u}</span>
                        )) : <span className="text-xs text-gray-400">-</span>}
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </div>

      {detailWid && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4 pt-16" onClick={closeDetail}>
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-5xl my-4" onClick={e => e.stopPropagation()}>
            <div className="p-4 border-b border-gray-200 flex items-center justify-between sticky top-0 bg-white rounded-t-xl z-10">
              <div>
                <h3 className="font-semibold text-gray-800 text-base">
                  战场详情 - {detailWidName || detailWid}
                </h3>
                <p className="text-xs text-gray-400 mt-0.5">共 {detailTotal} 条战报 · 点击行可查看单条详情</p>
              </div>
              <div className="flex items-center gap-2">
                {selectedIds.length > 0 && (
                  <Button variant="destructive" size="sm" disabled={deleteLoading} onClick={handleDeleteSelected}>
                    <Trash2 size={14} className="mr-1" />删除选中({selectedIds.length})
                  </Button>
                )}
                <Button variant="destructive" size="sm" disabled={deleteLoading} onClick={handleDeleteAll}>
                  <AlertTriangle size={14} className="mr-1" />清空全部
                </Button>
                <button onClick={closeDetail} className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"><X size={18} className="text-gray-500" /></button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50">
                    <TableHead className="w-10">
                      <input type="checkbox" checked={selectedIds.length === detailData.length && detailData.length > 0} onChange={toggleSelectAll} className="rounded" />
                    </TableHead>
                    <TableHead>时间</TableHead>
                    <TableHead>进攻方</TableHead>
                    <TableHead>进攻同盟</TableHead>
                    <TableHead className="text-center">进攻兵力</TableHead>
                    <TableHead>队伍ID</TableHead>
                    <TableHead>武将</TableHead>
                    <TableHead>防守方</TableHead>
                    <TableHead>防守同盟</TableHead>
                    <TableHead className="text-center">防守兵力</TableHead>
                    <TableHead className="text-center">结果</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {detailLoading ? (
                    <TableRow><TableCell colSpan={11} className="text-center py-8 text-gray-500">加载中...</TableCell></TableRow>
                  ) : detailData.length === 0 ? (
                    <TableRow><TableCell colSpan={11} className="text-center py-8 text-gray-500">暂无战报数据</TableCell></TableRow>
                  ) : (
                    detailData.map((r) => (
                      <TableRow key={r.id} className={`${selectedIds.includes(r.id) ? 'bg-red-50/30' : ''} hover:bg-gray-50`}>
                        <TableCell>
                          <input type="checkbox" checked={selectedIds.includes(r.id)} onChange={() => toggleSelectId(r.id)} className="rounded" />
                        </TableCell>
                        <TableCell>
                          <span className="text-xs text-gray-500 whitespace-nowrap">{formatTime(r.time)}</span>
                        </TableCell>
                        <TableCell>
                          <span className="font-medium text-gray-900 text-sm">{r.attack_name}</span>
                          {r.npc === 1 && <span className="ml-1 px-1.5 py-0.5 bg-orange-50 text-orange-600 rounded text-[10px]">NPC</span>}
                        </TableCell>
                        <TableCell>
                          <span className="px-2 py-0.5 bg-red-50 text-red-600 rounded text-xs font-medium">{r.attack_union_name || '-'}</span>
                        </TableCell>
                        <TableCell className="text-center">
                          <span className="text-sm font-semibold text-red-700">{r.attack_hp.toLocaleString()}</span>
                        </TableCell>
                        <TableCell>
                          <span className="text-xs text-gray-500 font-mono">{r.attack_idu || '-'}</span>
                        </TableCell>
                        <TableCell>
                          <span className="text-xs text-gray-600 max-w-[140px] block truncate" title={r.attack_all_hero_info}>{parseHeroDisplay(r.attack_all_hero_info)}</span>
                        </TableCell>
                        <TableCell>
                          <span className="font-medium text-gray-900 text-sm">{r.defend_name}</span>
                        </TableCell>
                        <TableCell>
                          <span className="px-2 py-0.5 bg-blue-50 text-blue-600 rounded text-xs font-medium">{r.defend_union_name || '-'}</span>
                        </TableCell>
                        <TableCell className="text-center">
                          <span className="text-sm font-semibold text-blue-700">{r.defend_hp.toLocaleString()}</span>
                        </TableCell>
                        <TableCell className="text-center">
                          <span className={`text-xs font-medium px-1.5 py-0.5 rounded ${r.result === 1 ? 'bg-red-100 text-red-700' : r.result === 2 ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'}`}>
                            {getResultText(r.result)}
                          </span>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>

            {totalPages > 1 && (
              <div className="p-3 border-t border-gray-200 flex items-center justify-between">
                <span className="text-xs text-gray-400">第 {detailPage}/{totalPages} 页，共 {detailTotal} 条</span>
                <div className="flex gap-1">
                  <Button variant="outline" size="sm" disabled={detailPage <= 1} onClick={() => loadDetail(detailWid!, detailWidName, detailPage - 1)}>
                    <ChevronLeft size={14} />
                  </Button>
                  <Button variant="outline" size="sm" disabled={detailPage >= totalPages} onClick={() => loadDetail(detailWid!, detailWidName, detailPage + 1)}>
                    <ChevronRight size={14} />
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
