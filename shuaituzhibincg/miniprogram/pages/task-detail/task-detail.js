// pages/task-detail/task-detail.js
const api = require('../../utils/api')
const util = require('../../utils/util')
const app = getApp()

Page({
  data: {
    taskId: null,
    task: {},
    statsLoading: false,
    activeTab: 'attended',
    attendedList: [],  // 已到人员
    leaveList: [],      // 请假人员
    absentList: [],     // 未到人员
    attendedGroups: [], // 已到人员按团分组
    leaveGroups: [],    // 请假人员按团分组
    absentGroups: [],   // 未到人员按团分组
    attendedDisplayGroups: [], // 已到 - 筛选后的显示数据
    leaveDisplayGroups: [],    // 请假 - 筛选后的显示数据
    absentDisplayGroups: [],   // 未到 - 筛选后的显示数据
    filterGroup: '',    // 当前筛选的团，空表示全部
    isAdmin: false,
    reportEnabled: false  // 考勤抓取状态
  },

  onLoad(options) {
    // 检查登录和数据库选择状态
    if (!app.requireLogin() || !app.requireDatabase()) {
      return
    }
    
    const taskId = options.id || options.tid
    console.log('task-detail onLoad, taskId:', taskId, 'options:', options)
    
    // 确保 taskId 是数字类型
    const numericTaskId = taskId ? parseInt(taskId) : null
    
    if (!numericTaskId || isNaN(numericTaskId)) {
      console.error('任务ID无效:', taskId)
      wx.showToast({
        title: '任务ID错误',
        icon: 'none'
      })
      setTimeout(() => {
        wx.navigateBack()
      }, 1500)
      return
    }
    
    this.setData({
      taskId: numericTaskId,
      isAdmin: app.isAdmin()
    })
    this.loadTaskDetail()
  },

  // 切换Tab
  switchTab(e) {
    const tab = e.currentTarget.dataset.tab
    const { attendedGroups, leaveGroups, absentGroups } = this.data
    this.setData({
      activeTab: tab,
      filterGroup: '',
      attendedDisplayGroups: attendedGroups,
      leaveDisplayGroups: leaveGroups,
      absentDisplayGroups: absentGroups
    })
  },

  // 切换团筛选
  switchFilterGroup(e) {
    const groupName = e.currentTarget.dataset.group
    const { attendedGroups, leaveGroups, absentGroups } = this.data
    const attendedDisplayGroups = groupName
      ? attendedGroups.filter(g => g.name === groupName)
      : attendedGroups
    const leaveDisplayGroups = groupName
      ? leaveGroups.filter(g => g.name === groupName)
      : leaveGroups
    const absentDisplayGroups = groupName
      ? absentGroups.filter(g => g.name === groupName)
      : absentGroups
    this.setData({
      filterGroup: groupName,
      attendedDisplayGroups,
      leaveDisplayGroups,
      absentDisplayGroups
    })
  },

  async loadTaskDetail() {
    util.showLoading('加载中...')
    
    try {
      const res = await api.getTaskDetail(this.data.taskId)
      const task = res.data || {}
      
      console.log('完整 task 对象:', JSON.stringify(task, null, 2))
      console.log('task keys:', Object.keys(task))
      
      // 处理人员列表
      // user_list 是一个 map，键是用户ID，需要转换为数组
      let allTargetUsers = []
      let attendedList = []
      let leaveList = []
      let absentList = []
      const userMap = task.user_list || {}
      
      // 将 map 转换为数组，并区分已到/未到
      Object.keys(userMap).forEach(key => {
        const user = userMap[key]
        if (user && user.name) {
          const userInfo = {
            ...user,
            id: user.id || parseInt(key),
            firstChar: (user.name || '?')[0],
            // 判断是否实际参与：有攻城或拆迁次数
            isAttended: (user.atk_num > 0 || user.dis_num > 0)
          }
          allTargetUsers.push(userInfo)
          
          // 根据是否参与分类
          if (userInfo.isAttended) {
            attendedList.push(userInfo)
          } else if (userInfo.is_leave) {
            leaveList.push(userInfo)
          } else {
            absentList.push(userInfo)
          }
        }
      })
      
      // 使用实际数据计算统计
      const targetUserNum = allTargetUsers.length || task.target_user_num || 0
      const completeUserNum = attendedList.length || task.complete_user_num || 0
      const leaveUserNum = leaveList.length || task.leave_user_num || 0
      const notAttendedUsers = absentList.length || Math.max(0, targetUserNum - completeUserNum - leaveUserNum)
      const progress = targetUserNum > 0 
        ? Math.round(completeUserNum / targetUserNum * 100)
        : 0
      
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
      const leaveGroups = groupByTeam(leaveList)
      const absentGroups = groupByTeam(absentList)
      
      this.setData({
        task: {
          ...task,
          posStr: util.formatPos(task.pos),
          timeStr: util.formatTime(task.time, 'yyyy-MM-dd HH:mm'),
          targetStr: (task.target || []).join('、'),
          target_user_num: targetUserNum,
          complete_user_num: completeUserNum,
          leave_user_num: leaveUserNum,
          notAttendedUsers,
          progress
        },
        attendedList,
        leaveList,
        absentList,
        attendedGroups,
        leaveGroups,
        absentGroups,
        attendedDisplayGroups: attendedGroups,
        leaveDisplayGroups: leaveGroups,
        absentDisplayGroups: absentGroups
      })
    } catch (err) {
      console.error('加载任务详情失败:', err)
      wx.showToast({
        title: '加载失败',
        icon: 'none'
      })
    } finally {
      util.hideLoading()
    }
  },

  onSetLeave(e) {
    if (!app.requireAdmin()) return

    const userId = parseInt(e.currentTarget.dataset.userId)
    const name = e.currentTarget.dataset.name || ''
    const isLeave = e.currentTarget.dataset.leave === '1'

    const saveLeave = async (reason = '') => {
      util.showLoading('保存中...')
      try {
        await api.setTaskUserLeave(this.data.taskId, userId, isLeave, reason)
        util.hideLoading()
        wx.showToast({ title: '保存成功', icon: 'success' })
        this.loadTaskDetail()
      } catch (err) {
        util.hideLoading()
        wx.showToast({ title: err.message || '保存失败', icon: 'none' })
      }
    }

    if (isLeave) {
      wx.showModal({
        title: '设置请假',
        content: `给 ${name} 标记请假`,
        editable: true,
        placeholderText: '请假原因（可留空）',
        success: (res) => {
          if (res.confirm) {
            saveLeave((res.content || '').trim())
          }
        }
      })
    } else {
      wx.showModal({
        title: '取消请假',
        content: `确认取消 ${name} 的请假状态吗？`,
        success: (res) => {
          if (res.confirm) {
            saveLeave('')
          }
        }
      })
    }
  },

  async onStatistics() {
    const confirmed = await util.showConfirm('确定要统计该任务的考勤吗？')
    if (!confirmed) return
    
    this.setData({ statsLoading: true })
    util.showLoading('统计中...')
    
    try {
      const res = await api.statisticsReport(this.data.taskId)
      util.hideLoading()
      wx.showToast({
        title: res.message || '统计成功',
        icon: 'success',
        duration: 1500
      })
      // 延迟刷新数据
      setTimeout(() => {
        this.loadTaskDetail()
      }, 1500)
    } catch (err) {
      console.error('统计考勤失败:', err)
      util.hideLoading()
      wx.showToast({
        title: err.message || '统计失败',
        icon: 'none'
      })
    } finally {
      this.setData({ statsLoading: false })
    }
  },

  onViewReports() {
    const taskId = this.data.taskId
    console.log('查看战报, taskId:', taskId)
    
    if (!taskId) {
      wx.showToast({
        title: '任务ID不存在',
        icon: 'none'
      })
      return
    }
    
    // 战报页面是 tabBar 页面，需要用 switchTab
    // 先存储 taskId 到全局
    app.globalData.viewTaskId = taskId
    
    wx.switchTab({
      url: '/pages/report/report',
      fail: (err) => {
        console.error('跳转失败:', err)
        wx.showToast({
          title: '跳转失败',
          icon: 'none'
        })
      }
    })
  },

  // 开启考勤（战报抓取）
  async onEnableReport() {
    if (!app.requireAdmin()) return
    
    const { task } = this.data
    if (!task.pos) {
      wx.showToast({ title: '任务坐标不存在', icon: 'none' })
      return
    }
    
    const confirmed = await util.showConfirm('确定要开启考勤抓取吗？系统将自动抓取该坐标的战报数据。')
    if (!confirmed) return
    
    util.showLoading('开启中...')
    try {
      await api.enableGetReport(task.pos)
      util.hideLoading()
      this.setData({ reportEnabled: true })
      wx.showToast({ title: '考勤已开启', icon: 'success' })
    } catch (err) {
      util.hideLoading()
      console.error('开启考勤失败:', err)
      wx.showToast({ title: err.message || '开启失败', icon: 'none' })
    }
  },

  // 关闭考勤（战报抓取）
  async onDisableReport() {
    if (!app.requireAdmin()) return
    
    const confirmed = await util.showConfirm('确定要关闭考勤抓取吗？')
    if (!confirmed) return
    
    util.showLoading('关闭中...')
    try {
      await api.disableGetReport()
      util.hideLoading()
      this.setData({ reportEnabled: false })
      wx.showToast({ title: '考勤已关闭', icon: 'success' })
    } catch (err) {
      util.hideLoading()
      console.error('关闭考勤失败:', err)
      wx.showToast({ title: err.message || '关闭失败', icon: 'none' })
    }
  },

  // 删除任务
  async onDeleteTask() {
    if (!app.requireAdmin()) return

    const { task } = this.data
    const confirmed = await util.showConfirm(`确定要删除任务「${task.name || ''}」吗？删除后不可恢复！`)
    if (!confirmed) return

    // 二次确认
    const confirmed2 = await util.showConfirm('再次确认：此操作不可撤销，确定删除？')
    if (!confirmed2) return

    util.showLoading('删除中...')
    try {
      await api.deleteTask(this.data.taskId)
      util.hideLoading()
      wx.showToast({ title: '删除成功', icon: 'success', duration: 1500 })
      setTimeout(() => {
        wx.navigateBack()
      }, 1500)
    } catch (err) {
      util.hideLoading()
      console.error('删除任务失败:', err)
      wx.showToast({ title: err.message || '删除失败', icon: 'none' })
    }
  },

  // 分享功能 - 分享特定任务
  onShareAppMessage() {
    const { task } = this.data
    const dbId = app.globalData.databaseId
    return {
      title: `【攻城任务】${task.name || '任务详情'} - ${task.timeStr || ''}`,
      path: `/pages/share-task/share-task?tid=${this.data.taskId}&db_id=${dbId}`
    }
  },

  // 分享到朋友圈
  onShareTimeline() {
    const { task } = this.data
    const dbId = app.globalData.databaseId
    return {
      title: `【攻城任务】${task.name || '任务详情'}`,
      query: `tid=${this.data.taskId}&db_id=${dbId}`
    }
  }
})
