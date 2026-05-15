import { useState, useEffect } from 'react'
import {
  ApiGetTeamGroup,
  ApiCreateTask,
  ApiGetTaskList,
  ApiDelTask,
  ApiEnableGetReport,
  ApiDisableGetReport,
  ApiGetReportNumByTaskId,
  ApiStatisticsReport,
  ApiGetTask,
  ApiDelTaskReport,
  ApiSetTaskUserLeave
} from '../api'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { RefreshCcw, Download, Trash2, Eraser, Play, Info, Send, ArrowLeft, FileSpreadsheet, Square, BarChart3 } from 'lucide-react'

type PanelMode = 'create' | 'detail' | 'report'

async function loadXlsx() {
  return import('xlsx')
}

export default function Task() {
  const [tasks, setTasks] = useState<any[]>([])
  const [grouplist, setGrouplist] = useState<any[]>([])
  const [selectedTasks, setSelectedTasks] = useState<any[]>([])

  const [taskname, setTaskname] = useState("")
  const [taskpos, setTaskpos] = useState("")
  const [targetgroup, setTargetgroup] = useState<any>([])
  const [tasktimeStart, setTasktimeStart] = useState("")
  const [tasktimeEnd, setTasktimeEnd] = useState("")
  const [creating, setCreating] = useState(false)

  const [panelMode, setPanelMode] = useState<PanelMode>('create')
  const [getReporting, setGetReporting] = useState(false)
  const [reportNum, setReportNum] = useState(0)
  const [inStatistics, setInStatistics] = useState(false)
  const [curtaskid, setCurtaskid] = useState(0)
  const [curTaskName, setCurTaskName] = useState("")
  const [reportTimer, setReportTimer] = useState<any>(null)

  const [taskDetail, setTaskDetail] = useState<any>({})

  const [exporting, setExporting] = useState(false)
  const [exportProgress, setExportProgress] = useState('')

  const isAllSelected = tasks.length > 0 && selectedTasks.length === tasks.length

  const toggleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedTasks(tasks.map(t => t.id))
    } else {
      setSelectedTasks([])
    }
  }

  const fetchTasks = async () => {
    try {
      const v = await ApiGetTaskList()
      if (v.status === 200 && v.data.code === 200) {
        const data = v.data.data
        setTasks(Array.isArray(data) ? data : [])
      }
    } catch (e) {
      console.error(e)
    }
  }

  useEffect(() => {
    fetchTasks()
    ApiGetTeamGroup().then(v => {
      if (v.data.code === 200 && v.data.data) {
        const data = v.data.data
        const groups = Array.isArray(data) ? data : []
        setGrouplist(groups.map((g: string) => ({ label: g, value: g })))
      }
    }).catch(err => {
      console.error('获取分组列表失败:', err)
    })
    return () => clearInterval(reportTimer)
  }, [])

  const handleCreateTask = async () => {
    let taskposArr: string[] = []
    if (taskpos) {
      const parts = taskpos.split(',')
      if (parts.length === 2) taskposArr = [parts[0].trim(), parts[1].trim()]
    }

    if (!taskname.trim()) {
      alert("请输入任务名称")
      return
    }
    if (taskposArr.length !== 2) {
      alert("任务坐标格式错误，请使用格式:70,1092")
      return
    }
    if (!tasktimeStart || !tasktimeEnd) {
      alert("请选择完整的任务时间范围")
      return
    }
    if (targetgroup.length === 0) {
      alert("请至少选择一个目标分组")
      return
    }

    setCreating(true)
    try {
      const v = await ApiCreateTask({
        taskname,
        tasktime: Math.floor(new Date(tasktimeStart).getTime() / 1000),
        taskendtime: Math.floor(new Date(tasktimeEnd).getTime() / 1000),
        targetgroup: Array.from(targetgroup),
        taskpos: taskposArr,
      })
      if (v.data.code === 200) {
        setTaskname("")
        setTaskpos("")
        setTargetgroup([])
        setTasktimeStart("")
        setTasktimeEnd("")
        fetchTasks()
      } else {
        alert(v.data.message || '创建失败')
      }
    } catch (e) {
      alert("创建失败")
    } finally {
      setCreating(false)
    }
  }

  const handleDeleteTask = (id: number) => {
    if (!confirm('确认删除该任务吗?')) return
    ApiDelTask(id).then(v => {
      if (v.data.code === 200) fetchTasks()
      else alert(v.data.message || '删除失败')
    })
  }

  const handleClearReport = (id: number) => {
    if (!confirm('确认清理战报吗? 数据删除后无法恢复。')) return
    ApiDelTaskReport(id).then(v => {
      if (v.data.code === 200) fetchTasks()
      else alert(v.data.message || '清理失败')
    })
  }

  const enableGetReport = (id: number, name: string, pos: any, startTime: number, endTime: number) => {
    setCurtaskid(id)
    setCurTaskName(name)
    setReportNum(0)
    setGetReporting(true)
    setInStatistics(false)
    setPanelMode('report')

    ApiEnableGetReport({ pos, start_time: startTime, end_time: endTime })

    const timer = setInterval(() => {
      ApiGetReportNumByTaskId(id).then(v => {
        if (v.status === 200 && v.data.code === 200) {
          setReportNum(v.data.data.count)
        }
      })
    }, 1000)
    setReportTimer(timer)
  }

  const disableGetReport = async () => {
    clearInterval(reportTimer)
    setGetReporting(false)
    try {
      await ApiDisableGetReport()
    } catch (e) {
      console.error(e)
    }
  }

  const statistics = async () => {
    clearInterval(reportTimer)
    setGetReporting(false)
    try {
      await ApiDisableGetReport()
    } catch (e) {}
    setInStatistics(true)
    try {
      const v = await ApiStatisticsReport(curtaskid)
      if (v.data.code === 200) {
        fetchTasks()
        const detailRes = await ApiGetTask(curtaskid)
        if (detailRes.data.code === 200 && detailRes.data.data) {
          setTaskDetail(detailRes.data.data)
          setPanelMode('detail')
        } else {
          setPanelMode('create')
        }
      } else {
        alert(v.data.message || '统计失败')
      }
    } catch (e) {
      alert("统计失败")
    } finally {
      setInStatistics(false)
    }
  }

  const getTaskDetail = async (id: number) => {
    try {
      const v = await ApiGetTask(id)
      if (v.data.code === 200) {
        setTaskDetail(v.data.data)
        setPanelMode('detail')
      } else {
        alert(v.data.message || '获取考勤详情失败')
      }
    } catch (e) {
      alert("获取考勤详情失败")
    }
  }

  const setUserLeave = async (user: any, isLeave: boolean) => {
    if (!taskDetail?.id || !user?.id) return
    let reason = user.leave_reason || ''
    if (isLeave) {
      const input = prompt(`请输入 ${user.name} 的请假原因（可留空）`, reason)
      if (input === null) return
      reason = input.trim()
    } else if (!confirm(`取消 ${user.name} 的请假状态？`)) {
      return
    }

    try {
      const v = await ApiSetTaskUserLeave(taskDetail.id, {
        user_id: user.id,
        is_leave: isLeave ? 1 : 0,
        reason,
      })
      if (v.data.code === 200) {
        const detailRes = await ApiGetTask(taskDetail.id)
        if (detailRes.data.code === 200 && detailRes.data.data) {
          setTaskDetail(detailRes.data.data)
        }
        fetchTasks()
      } else {
        alert(v.data.message || '保存请假状态失败')
      }
    } catch (e) {
      alert('保存请假状态失败')
    }
  }

  const generateTaskExportData = (taskData: any) => {
    const rows: any[] = []
    const userList = taskData.user_list || {}
    const groupMap: any = {}

    Object.values(userList).forEach((user: any) => {
      const g = user.group || '未分组'
      if (!groupMap[g]) groupMap[g] = []
      groupMap[g].push(user)
    })

    const sortedGroups = Object.keys(groupMap).sort()
    const leaveCount = Object.values(userList).filter((u: any) => u.is_leave && !u.atk_num && !u.dis_num).length
    rows.push([`【${taskData.name}】 坐标:${splitwid(taskData.pos)} 目标:${taskData.target_user_num}人 实到:${taskData.complete_user_num}人 请假:${leaveCount}人`])

    let totalAtkTeam = 0, totalDisTeam = 0, totalAtkNum = 0, totalDisNum = 0
    Object.values(userList).forEach((u: any) => {
      totalAtkTeam += u.atk_team_num || 0
      totalDisTeam += u.dis_team_num || 0
      totalAtkNum += u.atk_num || 0
      totalDisNum += u.dis_num || 0
    })

    rows.push([`汇总: 主力${totalAtkTeam}队/拆迁${totalDisTeam}队 主力${totalAtkNum}次/拆迁${totalDisNum}次`])
    rows.push(["名字", "分组", "主力(队)", "拆迁(队)", "主力次数", "拆迁次数", "请假", "请假原因"])

    sortedGroups.forEach(groupName => {
      rows.push([`── ${groupName} ──`])
      let groupAtkTeam = 0, groupDisTeam = 0, groupAtkNum = 0, groupDisNum = 0

      groupMap[groupName].forEach((user: any) => {
        rows.push([
          user.name,
          user.group,
          user.atk_team_num || 0,
          user.dis_team_num || 0,
          user.atk_num || 0,
          user.dis_num || 0,
          user.is_leave ? '是' : '',
          user.leave_reason || ''
        ])
        groupAtkTeam += user.atk_team_num || 0
        groupDisTeam += user.dis_team_num || 0
        groupAtkNum += user.atk_num || 0
        groupDisNum += user.dis_num || 0
      })
      rows.push([`${groupName}小计`, '', groupAtkTeam, groupDisTeam, groupAtkNum, groupDisNum])
    })
    rows.push([])
    return rows
  }

  const downloadXlsx = async (wb: any, fileName: string) => {
    const XLSX = await loadXlsx()
    const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' })
    const blob = new Blob([wbout], { type: 'application/octet-stream' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = fileName
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const exportExcel = async () => {
    setExporting(true)
    setExportProgress('加载导出组件...')
    try {
      const XLSX = await loadXlsx()
      setExportProgress('获取任务数据...')

      let data = taskDetail
      if (data && data.id) {
        try {
          const v = await ApiGetTask(data.id, true)
          if (v.data.code === 200 && v.data.data) {
            data = v.data.data
            setTaskDetail(data)
          }
        } catch (e) {
          console.warn('刷新数据失败，使用现有数据')
        }
      }

      if (!data || !data.user_list) {
        alert('暂无考勤数据')
        return
      }

      setExportProgress('生成Excel...')
      const rows = generateTaskExportData(data)
      const ws = XLSX.utils.aoa_to_sheet(rows)
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, '考勤表')

      const safeName = (data.name || '考勤表').replace(/[\\/:*?"<>|]/g, '_')
      setExportProgress('下载文件...')
      await downloadXlsx(wb, `${safeName}考勤表.xlsx`)
    } catch (e) {
      console.error('导出失败', e)
      alert('导出失败: ' + (e as Error).message)
    } finally {
      setExporting(false)
      setExportProgress('')
    }
  }

  const batchExportExcel = async () => {
    if (selectedTasks.length === 0) {
      alert('请选择任务')
      return
    }
    setExporting(true)
    setExportProgress('加载导出组件...')
    try {
      const XLSX = await loadXlsx()
      const allRows: any[] = []
      allRows.push([`攻城考勤汇总 (${new Date().toLocaleDateString()})`])
      allRows.push([])

      const total = selectedTasks.length
      const promises = selectedTasks.map((id, index) =>
        ApiGetTask(id, true).then(v => {
          setExportProgress(`获取任务数据 ${index + 1}/${total}...`)
          if (v.data.code === 200 && v.data.data) {
            return v.data.data
          }
          return null
        }).catch(e => {
          console.error(`任务${id}获取失败`, e)
          return null
        })
      )

      const results = await Promise.all(promises)

      let hasData = false
      for (const taskData of results) {
        if (taskData) {
          allRows.push(...generateTaskExportData(taskData))
          hasData = true
        }
      }

      if (hasData && allRows.length > 2) {
        setExportProgress('生成Excel...')
        const ws = XLSX.utils.aoa_to_sheet(allRows)
        const wb = XLSX.utils.book_new()
        XLSX.utils.book_append_sheet(wb, ws, '考勤汇总')

        const dateStr = new Date().toISOString().slice(0, 10)
        setExportProgress('下载文件...')
        await downloadXlsx(wb, `攻城考勤汇总_${dateStr}.xlsx`)
      } else {
        alert('无数据可导出')
      }
    } catch (e) {
      console.error('批量导出失败', e)
      alert('批量导出失败: ' + (e as Error).message)
    } finally {
      setExporting(false)
      setExportProgress('')
    }
  }

  const formatTimestamp = (timestamp: number) => {
    if (!timestamp) return ''
    const date = new Date(timestamp * 1000)
    return date.toLocaleString('zh-CN', {
      year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit'
    })
  }

  const splitwid = (num: any) => {
    if (!num) return ''
    const str = num.toString()
    if (str.length < 4) return str
    return `${str.slice(0, -4)},${parseInt(str.slice(-4), 10)}`
  }

  const backToCreate = () => {
    clearInterval(reportTimer)
    setGetReporting(false)
    setInStatistics(false)
    setPanelMode('create')
  }

  const inputCls = "w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-blue-400"
  const labelCls = "block text-xs font-medium text-gray-500 mb-1"

  const detailUsers = Object.values(taskDetail?.user_list || {}) as any[]
  const detailGroupMap: Record<string, any[]> = {}
  let totalAtkTeam = 0, totalDisTeam = 0, totalAtkNum = 0, totalDisNum = 0
  let leaveUserNum = 0
  detailUsers.forEach((u: any) => {
    const g = u.group || '未分组'
    if (!detailGroupMap[g]) detailGroupMap[g] = []
    detailGroupMap[g].push(u)
    totalAtkTeam += u.atk_team_num || 0
    totalDisTeam += u.dis_team_num || 0
    totalAtkNum += u.atk_num || 0
    totalDisNum += u.dis_num || 0
    if (u.is_leave && !u.atk_num && !u.dis_num) leaveUserNum++
  })
  const absentUserNum = Math.max(0, detailUsers.length - (taskDetail.complete_user_num || 0) - leaveUserNum)

  return (
    <div className="flex gap-6 h-full">
      <div className="flex-1 min-w-0 space-y-4 pb-12">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-bold text-gray-800">攻城任务</h2>
            <span className="px-2.5 py-0.5 text-xs font-semibold text-blue-600 bg-blue-50 rounded-full">
              {tasks.length}
            </span>
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={fetchTasks}>
              <RefreshCcw size={14} className="mr-1" />
              刷新
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={selectedTasks.length === 0}
              onClick={batchExportExcel}
            >
              <Download size={14} className="mr-1" />
              {exporting && exportProgress ? exportProgress : `导出 ${selectedTasks.length > 0 ? `(${selectedTasks.length})` : ''}`}
            </Button>
          </div>
        </div>

        {tasks.length > 0 && (
          <div className="flex items-center gap-3 px-3 py-2 bg-gray-50 rounded-lg text-sm text-gray-600">
            <label className="inline-flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                checked={isAllSelected}
                onChange={(e) => toggleSelectAll(e.target.checked)}
              />
              <span>全选</span>
            </label>
            {selectedTasks.length > 0 && <span className="text-blue-500">已选 {selectedTasks.length} 个</span>}
          </div>
        )}

        <div className="space-y-3">
          {tasks.map(task => (
            <Card key={task.id} className="shadow-sm border border-gray-200">
              <CardContent className="p-4">
                <div className="flex justify-between items-start mb-3">
                  <div className="flex items-center gap-2.5">
                    <input
                      type="checkbox"
                      className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                      checked={selectedTasks.includes(task.id)}
                      onChange={(e) => {
                        const checked = e.target.checked
                        setSelectedTasks(prev => checked ? [...prev, task.id] : prev.filter(id => id !== task.id))
                      }}
                    />
                    <h3 className="font-bold text-gray-800">{task.name}</h3>
                    <span className="font-mono text-xs bg-gray-100 px-1.5 py-0.5 rounded text-gray-500">{splitwid(task.pos)}</span>
                  </div>
                  <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${task.status == 1 ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>
                    {task.status == 1 ? '已完成' : '待考勤'}
                  </span>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-3 text-sm">
                  <div>
                    <div className="text-[11px] text-gray-400">目标分组</div>
                    <div className="flex flex-wrap gap-0.5 mt-0.5">
                      {(task.target || []).map((g: string) => (
                        <span key={g} className="px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded text-[11px]">{g}</span>
                      ))}
                    </div>
                  </div>
                  <div>
                    <div className="text-[11px] text-gray-400">目标人数</div>
                    <div className="font-medium">{task.target_user_num}</div>
                  </div>
                  <div>
                    <div className="text-[11px] text-gray-400">实到人数</div>
                    <div className="font-bold text-blue-600">{task.complete_user_num}</div>
                  </div>
                  <div>
                    <div className="text-[11px] text-gray-400">请假人数</div>
                    <div className="font-bold text-amber-600">{task.leave_user_num || 0}</div>
                  </div>
                  <div>
                    <div className="text-[11px] text-gray-400">任务时间</div>
                    <div className="text-xs text-gray-600">
                      <div>{formatTimestamp(task.time)}</div>
                      <div className="text-gray-400">至 {formatTimestamp(task.end_time)}</div>
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap gap-1.5 pt-3 border-t border-gray-100">
                  <Button size="sm" variant="outline" onClick={() => getTaskDetail(task.id)}>
                    <Info size={13} className="mr-1" />详情
                  </Button>
                  <Button size="sm" variant="outline" className="text-blue-600 border-blue-200 hover:bg-blue-50" onClick={() => enableGetReport(task.id, task.name, task.pos, task.time, task.end_time)}>
                    <Play size={13} className="mr-1" />考勤
                  </Button>
                  <Button size="sm" variant="outline" className="text-amber-600 border-amber-200 hover:bg-amber-50" onClick={() => handleClearReport(task.id)}>
                    <Eraser size={13} className="mr-1" />清理
                  </Button>
                  <Button size="sm" variant="outline" className="text-red-600 border-red-200 hover:bg-red-50" onClick={() => handleDeleteTask(task.id)}>
                    <Trash2 size={13} className="mr-1" />删除
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}

          {tasks.length === 0 && (
            <div className="text-center py-16 text-gray-400">
              <p className="text-sm">暂无攻城任务，在右侧创建</p>
            </div>
          )}
        </div>
      </div>

      <div className="w-80 shrink-0">
        <div className="sticky top-4 bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">

          {panelMode === 'create' && (
            <>
              <div className="px-4 py-3 border-b border-gray-100 bg-gray-50/80">
                <h3 className="text-sm font-semibold text-gray-700">创建攻城任务</h3>
              </div>
              <div className="p-4 space-y-3">
                <div>
                  <label className={labelCls}>任务名称 <span className="text-red-400">*</span></label>
                  <input className={inputCls} placeholder="例如：内黄LV5" value={taskname} onChange={e => setTaskname(e.target.value)} />
                </div>
                <div>
                  <label className={labelCls}>任务坐标 <span className="text-red-400">*</span></label>
                  <input className={inputCls} placeholder="例如：100,200" value={taskpos} onChange={e => setTaskpos(e.target.value)} />
                </div>
                <div>
                  <label className={labelCls}>开始时间 <span className="text-red-400">*</span></label>
                  <input type="datetime-local" className={inputCls} value={tasktimeStart} onChange={e => setTasktimeStart(e.target.value)} />
                </div>
                <div>
                  <label className={labelCls}>结束时间 <span className="text-red-400">*</span></label>
                  <input type="datetime-local" className={inputCls} value={tasktimeEnd} onChange={e => setTasktimeEnd(e.target.value)} />
                </div>
                <div>
                  <label className={labelCls}>目标分组 <span className="text-red-400">*</span></label>
                  {grouplist.length > 0 ? (
                    <div className="flex flex-wrap gap-x-3 gap-y-1 p-2.5 border border-gray-200 rounded-lg bg-white max-h-36 overflow-y-auto">
                      {grouplist.map((g) => (
                        <label key={g.value} className="inline-flex items-center gap-1 cursor-pointer select-none">
                          <input
                            type="checkbox"
                            className="w-3.5 h-3.5 rounded border-gray-300 text-blue-500 focus:ring-blue-400"
                            checked={targetgroup.includes(g.value)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setTargetgroup([...targetgroup, g.value])
                              } else {
                                setTargetgroup(targetgroup.filter((v: string) => v !== g.value))
                              }
                            }}
                          />
                          <span className="text-xs text-gray-700">{g.label}</span>
                        </label>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-gray-400 p-2.5 border border-dashed border-gray-200 rounded-lg">暂无分组，请先同步同盟成员</p>
                  )}
                  {targetgroup.length > 0 && (
                    <p className="text-[11px] text-blue-500 mt-0.5">已选 {targetgroup.length} 个分组</p>
                  )}
                </div>
                <Button className="w-full" disabled={creating} onClick={handleCreateTask}>
                  {!creating && <Send size={14} className="mr-1" />}
                  创建任务
                </Button>
              </div>
            </>
          )}

          {panelMode === 'detail' && (
            <>
              <div className="px-4 py-3 border-b border-gray-100 bg-gray-50/80 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <button onClick={backToCreate} className="p-1 rounded hover:bg-gray-200 text-gray-500">
                    <ArrowLeft size={14} />
                  </button>
                  <h3 className="text-sm font-semibold text-gray-700">考勤详情</h3>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={exportExcel}
                  disabled={exporting}
                >
                  <FileSpreadsheet size={13} className="mr-1" />
                  {exporting && exportProgress ? exportProgress : '导出'}
                </Button>
              </div>
              <div className="p-3">
                <div className="mb-3 px-1">
                  <div className="text-sm font-semibold text-gray-800">{taskDetail.name}</div>
                  <div className="flex gap-3 mt-1 text-[11px] text-gray-500">
                    <span>坐标 {splitwid(taskDetail.pos)}</span>
                    <span>目标 {taskDetail.target_user_num}人</span>
                    <span className="text-blue-600 font-medium">实到 {taskDetail.complete_user_num}人</span>
                    <span className="text-amber-600 font-medium">请假 {leaveUserNum}人</span>
                    <span>未到 {absentUserNum}人</span>
                  </div>
                  {(totalAtkTeam > 0 || totalDisTeam > 0 || totalAtkNum > 0 || totalDisNum > 0) && (
                    <div className="flex gap-3 mt-1.5 text-[11px]">
                      <span className="text-blue-500">主力{totalAtkTeam}队/{totalAtkNum}次</span>
                      <span className="text-orange-500">拆迁{totalDisTeam}队/{totalDisNum}次</span>
                    </div>
                  )}
                </div>
                <div className="space-y-2 max-h-[calc(100vh-220px)] overflow-y-auto">
                  {Object.entries(detailGroupMap).sort(([a], [b]) => a.localeCompare(b)).map(([groupName, users]) => {
                    let gAtkTeam = 0, gDisTeam = 0, gAtkNum = 0, gDisNum = 0
                    users.forEach((u: any) => {
                      gAtkTeam += u.atk_team_num || 0
                      gDisTeam += u.dis_team_num || 0
                      gAtkNum += u.atk_num || 0
                      gDisNum += u.dis_num || 0
                    })
                    return (
                    <div key={groupName}>
                      <div className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide px-1 py-1">{groupName} ({users.length}人)</div>
                      <div className="space-y-0.5">
                        {users.map((u: any, i: number) => (
                          <div key={u.name || i} className={`flex items-center justify-between px-2 py-1.5 rounded hover:bg-gray-50 text-xs ${u.is_leave ? 'bg-amber-50/60' : ''}`}>
                            <div className="min-w-0 mr-2">
                              <div className="flex items-center gap-1.5">
                                <span className="font-medium text-gray-800 truncate">{u.name}</span>
                                {u.is_leave && <span className="shrink-0 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] text-amber-700">请假</span>}
                              </div>
                              {u.is_leave && u.leave_reason && (
                                <div className="mt-0.5 truncate text-[10px] text-amber-600">{u.leave_reason}</div>
                              )}
                            </div>
                            <div className="flex items-center gap-2 text-[11px] text-gray-500 shrink-0">
                              <span className="text-blue-500" title="主力队">{u.atk_team_num || 0}主</span>
                              <span className="text-orange-500" title="拆迁队">{u.dis_team_num || 0}拆</span>
                              <span title="主力次数">{u.atk_num || 0}次</span>
                              <span title="拆迁次数">{u.dis_num || 0}次</span>
                              <button
                                type="button"
                                className={`rounded border px-1.5 py-0.5 ${u.is_leave ? 'border-gray-200 text-gray-500 hover:bg-gray-100' : 'border-amber-200 text-amber-600 hover:bg-amber-50'}`}
                                onClick={() => setUserLeave(u, !u.is_leave)}
                              >
                                {u.is_leave ? '销假' : '请假'}
                              </button>
                            </div>
                          </div>
                        ))}
                        {(gAtkTeam > 0 || gDisTeam > 0 || gAtkNum > 0 || gDisNum > 0) && (
                          <div className="flex items-center justify-between px-2 py-1 bg-gray-50 rounded text-[11px] text-gray-500">
                            <span>{groupName}小计</span>
                            <div className="flex items-center gap-2">
                              <span className="text-blue-500">{gAtkTeam}主</span>
                              <span className="text-orange-500">{gDisTeam}拆</span>
                              <span>{gAtkNum}次</span>
                              <span>{gDisNum}次</span>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                    )
                  })}
                  {detailUsers.length === 0 && (
                    <div className="text-center py-8 text-xs text-gray-400">暂无考勤数据</div>
                  )}
                </div>
              </div>
            </>
          )}

          {panelMode === 'report' && (
            <>
              <div className="px-4 py-3 border-b border-gray-100 bg-gray-50/80 flex items-center gap-2">
                <button onClick={backToCreate} className="p-1 rounded hover:bg-gray-200 text-gray-500">
                  <ArrowLeft size={14} />
                </button>
                <h3 className="text-sm font-semibold text-gray-700">攻城考勤</h3>
              </div>
              <div className="p-4 space-y-4">
                <div className="px-3 py-2 bg-blue-50 rounded-lg">
                  <div className="text-sm font-semibold text-blue-800">{curTaskName}</div>
                  <div className="text-[11px] text-blue-500 mt-0.5">正在获取该任务的战报数据</div>
                </div>

                <div className="text-xs text-gray-600 leading-relaxed space-y-1">
                  <p>1. 前往游戏中，到攻城任务坐标位置</p>
                  <p>2. 查看同盟战报，勾选守城军士</p>
                  <p>3. 一直往下滑直到没有战报为止</p>
                  <p className="text-gray-400 mt-1">系统只获取任务时间范围内的战报</p>
                </div>

                <div className="text-center py-3">
                  <div className="text-[11px] text-gray-400 mb-1">已获取战报</div>
                  <div className="text-4xl font-bold text-blue-600">{reportNum}</div>
                  <div className="text-[11px] text-gray-400 mt-1">封</div>
                </div>

                {getReporting && (
                  <div className="flex items-center justify-center gap-1.5 text-xs text-emerald-600">
                    <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                    正在获取战报中...
                  </div>
                )}

                <div className="space-y-2 pt-2 border-t border-gray-100">
                  <div className="flex gap-2">
                    {getReporting ? (
                      <Button
                        variant="outline"
                        className="flex-1 text-red-600 border-red-200 hover:bg-red-50"
                        onClick={disableGetReport}
                        size="sm"
                      >
                        <Square size={12} className="mr-1" />
                        关闭考勤
                      </Button>
                    ) : (
                      <Button
                        variant="outline"
                        className="flex-1 text-blue-600 border-blue-200 hover:bg-blue-50"
                        onClick={() => {
                          const task = tasks.find(t => t.id === curtaskid)
                          if (task) enableGetReport(task.id, task.name, task.pos, task.time, task.end_time)
                        }}
                        size="sm"
                      >
                        <Play size={12} className="mr-1" />
                        重新开启
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      className="flex-1"
                      onClick={statistics}
                      size="sm"
                    >
                      <BarChart3 size={12} className="mr-1" />
                      统计
                    </Button>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
