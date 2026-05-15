// pages/task/task.js
const api = require('../../utils/api')
const util = require('../../utils/util')
const app = getApp()

Page({
  data: {
    tasks: [],
    filteredTasks: [],
    keyword: '',
    loading: false,
    isAdmin: false,
    lastCleanupTimestamp: 0,
    // 状态筛选
    statusFilters: [
      { label: '全部', value: 'all' },
      { label: '未开始', value: 'upcoming' },
      { label: '进行中', value: 'ongoing' },
      { label: '已结束', value: 'ended' }
    ],
    activeStatusIndex: 0
  },

  onLoad() {
    // 检查登录和数据库选择状态
    if (!app.requireLogin() || !app.requireDatabase()) {
      return
    }
    
    this.setData({
      isAdmin: app.isAdmin()
    })
    
    // 首次加载任务列表
    console.log('[Task] onLoad, 开始加载任务列表...')
    this.loadTasks()
  },

  onShow() {
    // 检查登录和数据库选择状态
    if (!app.requireLogin() || !app.requireDatabase()) {
      return
    }
    
    console.log('[Task] onShow, filteredTasks.length:', this.data.filteredTasks.length)
    
    // 从详情页返回时，刷新数据以显示最新状态
    // 使用静默刷新，不显示loading
    this.refreshTasksSilently()
  },

  async loadTasks() {
    this.setData({ loading: true })
    
    try {
      await this._fetchAndProcessTasks()
    } catch (err) {
      console.error('加载任务列表失败:', err)
    } finally {
      this.setData({ loading: false })
    }
  },

  // 静默刷新任务列表（不显示loading）
  async refreshTasksSilently() {
    try {
      await this._fetchAndProcessTasks()
      console.log('[Task] 静默刷新成功, tasks.length:', this.data.tasks.length)
    } catch (err) {
      console.error('静默刷新任务列表失败:', err)
    }
  },

  // 获取并处理任务数据（内部方法）
  async _fetchAndProcessTasks() {
    const res = await api.getTaskList()
    console.log('[Task] API 返回的原始数据:', res)
    console.log('[Task] res.data 长度:', res.data?.length)
    if (res.data && res.data.length > 0) {
      console.log('[Task] 第一个任务的原始数据:', JSON.stringify(res.data[0]))
    }
    
    const now = Date.now() / 1000
    
    const tasks = (res.data || []).map(task => {
      const timeDiff = now - task.time
      
      let statusClass = 'warning'
      let statusText = '进行中'
      let statusType = 'ongoing'
      
      if (timeDiff < 0) {
        statusText = '未开始'
        statusClass = 'success'
        statusType = 'upcoming'
      } else if (timeDiff > 86400) {
        statusText = '已结束'
        statusClass = 'error'
        statusType = 'ended'
      }
      
      const progress = task.target_user_num > 0 
        ? Math.round(task.complete_user_num / task.target_user_num * 100)
        : 0
      
      return {
        ...task,
        id: task.id,  // 确保 id 字段存在
        name: task.title || task.name,
        description: task.description || '',
        participantCount: task.complete_user_num || 0,
        posStr: util.formatPos(task.pos),
        timeStr: util.formatTime(task.time, 'MM-dd HH:mm'),
        targetStr: (task.target || []).join('、'),
        statusClass,
        statusText,
        statusType,
        progress
      }
    })
    
    this.setData({ tasks })
    this.applyFilters()
  },

  // 检查数据清理并刷新
  async checkCleanupAndRefresh() {
    try {
      const res = await api.getLastCleanupTimestamp()
      if (res.code === 200 && res.data) {
        const newTimestamp = res.data.timestamp || 0
        const oldTimestamp = this.data.lastCleanupTimestamp
        
        // 如果时间戳变化了，说明有数据被清理，需要刷新
        if (newTimestamp > oldTimestamp && oldTimestamp > 0) {
          console.log('[Task] 检测到数据清理，自动刷新...')
          wx.showToast({
            title: '数据已更新',
            icon: 'success',
            duration: 1500
          })
          await this.loadTasks()
        } else if (oldTimestamp === 0) {
          // 首次进入或时间戳未初始化，直接加载任务
          console.log('[Task] 首次加载或时间戳未初始化，加载任务列表...')
          await this.loadTasks()
        }
        
        // 更新时间戳
        this.setData({ lastCleanupTimestamp: newTimestamp })
      } else {
        // API返回异常，直接加载任务
        console.log('[Task] API返回异常，加载任务列表...')
        this.loadTasks()
      }
    } catch (err) {
      console.error('检查清理时间戳失败:', err)
      // 出错时也加载任务
      this.loadTasks()
    }
  },

  onSearchInput(e) {
    this.setData({
      keyword: e.detail.value
    })
    this.applyFilters()
  },

  onClearSearch() {
    this.setData({
      keyword: ''
    })
    this.applyFilters()
  },

  // 状态筛选变化
  onStatusChange(e) {
    const { index } = e.detail
    this.setData({
      activeStatusIndex: index
    })
    this.applyFilters()
  },

  // 应用筛选条件
  applyFilters() {
    const { tasks, keyword, activeStatusIndex, statusFilters } = this.data
    const activeFilter = statusFilters[activeStatusIndex]
    
    let filtered = tasks
    
    // 按状态筛选
    if (activeFilter && activeFilter.value !== 'all') {
      filtered = filtered.filter(task => task.statusType === activeFilter.value)
    }
    
    // 按关键词筛选
    if (keyword) {
      const kw = keyword.toLowerCase()
      filtered = filtered.filter(task => {
        return (
          (task.name && task.name.toLowerCase().includes(kw)) ||
          (task.x && String(task.x).includes(kw)) ||
          (task.y && String(task.y).includes(kw)) ||
          (task.description && task.description.toLowerCase().includes(kw))
        )
      })
    }
    
    this.setData({ filteredTasks: filtered })
  },

  onTaskDetail(e) {
    console.log('[Task] 点击任务卡片, e.detail:', JSON.stringify(e.detail))
    console.log('[Task] e.detail.task:', e.detail?.task)
    console.log('[Task] e.detail.task.id:', e.detail?.task?.id)
    
    // 兼容多种事件参数格式
    const task = e.detail?.task || e.detail || e.currentTarget?.dataset?.task
    
    console.log('[Task] 解析后的 task:', task)
    console.log('[Task] task.id:', task?.id)
    console.log('[Task] task 的所有字段:', Object.keys(task || {}))
    
    if (!task || !task.id) {
      console.error('[Task] ❌ 任务信息错误, task:', task)
      console.error('[Task] task.id 值:', task?.id)
      wx.showToast({
        title: '任务信息错误',
        icon: 'none'
      })
      return
    }
    
    console.log('[Task] ✅ 跳转到详情页, taskId:', task.id)
    wx.navigateTo({
      url: `/pages/task-detail/task-detail?id=${task.id}`
    })
  },

  onCreateTask() {
    // 双重保护：检查管理员权限
    if (!app.isAdmin()) {
      wx.showToast({
        title: '只有管理员可以创建任务',
        icon: 'none'
      })
      return
    }
    
    wx.navigateTo({
      url: '/pages/task-create/task-create'
    })
  },

  onPullDownRefresh() {
    this.loadTasks().then(() => {
      wx.stopPullDownRefresh()
    })
  },

  // 分享功能
  onShareAppMessage() {
    return {
      title: '攻城任务列表 - 同盟管理助手',
      path: '/pages/task/task'
    }
  },

  // 分享到朋友圈
  onShareTimeline() {
    return {
      title: '攻城任务列表 - 同盟管理助手',
      query: ''
    }
  }
})
