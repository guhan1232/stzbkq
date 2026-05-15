/**
 * 分享任务查看页面 - 无需登录
 */
const api = require('../../utils/api')
const app = getApp()

Page({
  data: {
    loading: true,
    taskId: '',
    dbId: '',
    task: null,
    reportList: [],
    stats: null,
    activeTab: 'attended',
    attendedList: [],
    absentList: [],
    attendedGroups: [],
    absentGroups: [],
    attendedDisplayGroups: [],
    absentDisplayGroups: [],
    filterGroup: '',    // 当前筛选的团，空表示全部
  },

  onLoad(options) {
    const { tid, db_id } = options
    if (!tid || !db_id) {
      wx.showToast({ title: '参数错误', icon: 'none' })
      setTimeout(() => wx.navigateBack(), 1500)
      return
    }
    
    this.setData({ taskId: tid, dbId: db_id })
    this.loadTaskDetail()
  },

  async loadTaskDetail() {
    try {
      this.setData({ loading: true })
      
      // 使用分享接口获取任务详情
      const res = await api.shareTaskDetail(this.data.taskId, this.data.dbId)
      if (res.code === 200 && res.data) {
        const task = {
          ...res.data,
          timeStr: this.formatTime(res.data.time),
          posStr: this.formatPos(res.data.pos)
        }
        this.setData({ task, loading: false })
        
        // 加载战报列表
        this.loadReportList()
      } else {
        this.setData({ loading: false })
        wx.showToast({ title: '任务不存在', icon: 'none' })
      }
    } catch (err) {
      console.error('加载任务详情失败:', err)
      this.setData({ loading: false })
      wx.showToast({ title: '加载失败', icon: 'none' })
    }
  },

  async loadReportList() {
    try {
      const res = await api.shareTaskReportList(this.data.taskId, this.data.dbId)
      if (res.code === 200 && res.data) {
        const reportList = (res.data.list || []).map(item => ({
          ...item,
          timeStr: this.formatTime(item.time)
        }))
        
        // 处理考勤人员数据
        const userList = res.data.user_list || {}
        let attendedList = []
        let absentList = []
        Object.keys(userList).forEach(key => {
          const user = userList[key]
          if (user && user.name) {
            const userInfo = {
              ...user,
              id: user.id || parseInt(key),
              firstChar: (user.name || '?')[0],
              isAttended: (user.atk_num > 0 || user.dis_num > 0)
            }
            if (userInfo.isAttended) {
              attendedList.push(userInfo)
            } else {
              absentList.push(userInfo)
            }
          }
        })
        
        // 按团分组
        const groupByTeam = (list) => {
          const map = {}
          list.forEach(user => {
            const g = user.group || '未分组'
            if (!map[g]) map[g] = { name: g, list: [], count: 0 }
            map[g].list.push(user)
            map[g].count++
          })
          return Object.values(map).sort((a, b) => a.name.localeCompare(b.name, 'zh'))
        }
        
        const attendedGroups = groupByTeam(attendedList)
        const absentGroups = groupByTeam(absentList)
        
        this.setData({ 
          reportList,
          stats: {
            total: res.data.total,
            attended: attendedList.length,
            notAttended: absentList.length
          },
          attendedList,
          absentList,
          attendedGroups,
          absentGroups,
          attendedDisplayGroups: attendedGroups,
          absentDisplayGroups: absentGroups
        })
      }
    } catch (err) {
      console.error('加载战报列表失败:', err)
    }
  },
  
  // 切换Tab
  switchTab(e) {
    const tab = e.currentTarget.dataset.tab
    const { attendedGroups, absentGroups } = this.data
    this.setData({
      activeTab: tab,
      filterGroup: '',
      attendedDisplayGroups: attendedGroups,
      absentDisplayGroups: absentGroups
    })
  },

  // 切换团筛选
  switchFilterGroup(e) {
    const groupName = e.currentTarget.dataset.group
    const { attendedGroups, absentGroups } = this.data
    const attendedDisplayGroups = groupName
      ? attendedGroups.filter(g => g.name === groupName)
      : attendedGroups
    const absentDisplayGroups = groupName
      ? absentGroups.filter(g => g.name === groupName)
      : absentGroups
    this.setData({
      filterGroup: groupName,
      attendedDisplayGroups,
      absentDisplayGroups
    })
  },

  formatTime(timestamp) {
    if (!timestamp) return ''
    const date = new Date(timestamp * 1000)
    return `${date.getMonth() + 1}/${date.getDate()} ${date.getHours()}:${String(date.getMinutes()).padStart(2, '0')}`
  },

  formatPos(pos) {
    if (!pos) return ''
    if (Array.isArray(pos)) {
      return pos.join(',')
    }
    const str = String(pos)
    if (str.length >= 4) {
      return `${str.slice(0, 3)},${str.slice(3)}`
    }
    return pos
  },

  // 分享
  onShareAppMessage() {
    const { task, taskId, dbId } = this.data
    return {
      title: task ? `攻城任务: ${task.name}` : '攻城任务详情',
      path: `/pages/share-task/share-task?tid=${taskId}&db_id=${dbId}`
    }
  },

  // 分享到朋友圈
  onShareTimeline() {
    const { task, taskId, dbId } = this.data
    return {
      title: task ? `攻城任务: ${task.name}` : '攻城任务详情',
      query: `tid=${taskId}&db_id=${dbId}`
    }
  }
})
