// 战报页面逻辑
const app = getApp()
const api = require('../../utils/api.js')
import Toast from '@vant/weapp/toast/toast'

Page({
  data: {
    searchKeyword: '',
    activeTypeIndex: 0,
    typeFilters: [
      { label: '全部', value: 'all' },
      { label: '进攻', value: 'attack' },
      { label: '防守', value: 'defense' }
    ],
    reports: [],
    filteredReports: [],
    loading: false,
    dbId: '',
    taskId: '',  // 从任务详情页跳转时传入
    isAdmin: false,
    // 抓取状态
    reportEnabled: false,
    battleReportEnabled: false,
    statusLoading: false
  },

  onLoad(options) {
    // 检查登录和数据库选择状态
    if (!app.requireLogin() || !app.requireDatabase()) {
      return
    }
    
    // 检查是否是管理员
    const isAdmin = app.globalData.userInfo && app.globalData.userInfo.role === 'admin'
    const taskId = options.taskId || options.tid || ''
    
    console.log('report onLoad, options:', options, 'taskId:', taskId)
    
    this.setData({ 
      dbId: app.globalData.databaseId || '',
      taskId,
      isAdmin
    })
    this.loadReports()
  },

  onShow() {
    // 检查登录和数据库选择状态
    if (!app.requireLogin() || !app.requireDatabase()) {
      return
    }
    
    // 检查是否有从任务详情页传来的 taskId
    if (app.globalData.viewTaskId) {
      this.setData({ taskId: app.globalData.viewTaskId })
      app.globalData.viewTaskId = '' // 清空
    }
    
    // 刷新数据
    if (this.data.dbId) {
      this.loadReports()
    }
  },

  // 切换类型
  onTypeChange(e) {
    const index = e.detail.index
    this.setData({ activeTypeIndex: index })
    this.applyFilters()
  },

  // 搜索
  onSearchChange(e) {
    this.setData({ searchKeyword: e.detail.value })
    this.applyFilters()
  },

  onSearch() {
    this.applyFilters()
  },

  // 应用筛选
  applyFilters() {
    let filtered = this.data.reports
    
    // 按类型筛选
    const activeFilter = this.data.typeFilters[this.data.activeTypeIndex]
    if (activeFilter && activeFilter.value !== 'all') {
      filtered = filtered.filter(report => report.type === activeFilter.value)
    }
    
    // 按关键词筛选
    const keyword = this.data.searchKeyword.trim().toLowerCase()
    if (keyword) {
      filtered = filtered.filter(report => 
        (report.title || '').toLowerCase().includes(keyword) ||
        (report.desc || '').toLowerCase().includes(keyword)
      )
    }
    
    this.setData({ filteredReports: filtered })
  },

  // 切换战报抓取
  async toggleReport(e) {
    const enabled = e.detail
    
    if (!this.data.isAdmin) {
      Toast.fail('无权限操作')
      return
    }
    
    Toast.loading({ message: '处理中...', forbidClick: true, duration: 0 })
    
    try {
      if (enabled) {
        const res = await api.enableGetReport(0)
        if (res.code === 200) {
          this.setData({ reportEnabled: true })
          Toast.success('已启用')
        } else {
          this.setData({ reportEnabled: false })
          Toast.fail(res.message || '操作失败')
        }
      } else {
        const res = await api.disableGetReport()
        if (res.code === 200) {
          this.setData({ reportEnabled: false })
          Toast.success('已关闭')
        } else {
          this.setData({ reportEnabled: true })
          Toast.fail(res.message || '操作失败')
        }
      }
    } catch (err) {
      console.error('战报抓取操作失败:', err)
      // 恢复原状态
      this.setData({ reportEnabled: !enabled })
      Toast.fail('操作失败')
    }
  },

  // 切换战斗数据抓取
  async toggleBattleReport(e) {
    const enabled = e.detail
    
    if (!this.data.isAdmin) {
      Toast.fail('无权限操作')
      return
    }
    
    Toast.loading({ message: '处理中...', forbidClick: true, duration: 0 })
    
    try {
      if (enabled) {
        const res = await api.enableGetBattleReport()
        if (res.code === 200) {
          this.setData({ battleReportEnabled: true })
          Toast.success('已启用')
        } else {
          this.setData({ battleReportEnabled: false })
          Toast.fail(res.message || '操作失败')
        }
      } else {
        const res = await api.disableGetBattleReport()
        if (res.code === 200) {
          this.setData({ battleReportEnabled: false })
          Toast.success('已关闭')
        } else {
          this.setData({ battleReportEnabled: true })
          Toast.fail(res.message || '操作失败')
        }
      }
    } catch (err) {
      console.error('战斗数据抓取操作失败:', err)
      // 恢复原状态
      this.setData({ battleReportEnabled: !enabled })
      Toast.fail('操作失败')
    }
  },

  // 加载战报列表
  async loadReports() {
    if (!this.data.dbId) {
      wx.showToast({
        title: '请先选择数据库',
        icon: 'none'
      })
      return
    }

    this.setData({ loading: true })

    try {
      let reports = []
      
      console.log('loadReports, taskId:', this.data.taskId)
      
      // 如果有 taskId，获取该任务的战报
      if (this.data.taskId) {
        console.log('加载任务战报, taskId:', this.data.taskId)
        const res = await api.getTaskReportList(this.data.taskId, 1, 100, this.data.searchKeyword)
        console.log('任务战报返回:', res)
        
        if (res.code === 200) {
          // res.data 可能是 {list: [...], total: xxx} 或者直接是数组
          const listData = Array.isArray(res.data) ? res.data : (res.data.list || [])
          reports = listData.map(item => ({
            id: item.id,
            type: item.attack_type === 'attack' ? 'attack' : 'defense',
            result: item.result || 'win',
            title: item.attack_name || '未知玩家',
            desc: item.target_name ? `目标：${item.target_name}` : '',
            time: item.time || '',
            attackName: item.attack_name || '未知玩家',
            targetName: item.target_name || ''
          }))
        } else {
          throw new Error(res.message || '加载失败')
        }
      } else {
        // 否则获取所有战报
        const params = {
          page: 1,
          page_size: 100
        }
        const activeFilter = this.data.typeFilters[this.data.activeTypeIndex]
        if (activeFilter && activeFilter.value !== 'all') {
          params.type = activeFilter.value
        }
        const res = await api.getBattleReportList(params)

        console.log('[Report] getBattleList API响应:', res)
        console.log('[Report] res.data 类型:', typeof res.data)
        console.log('[Report] res.data 内容:', res.data)

        if (res.code === 200) {
          // 后端返回格式: { list: [...], total: N, page: N }
          let dataList = []
          
          if (Array.isArray(res.data)) {
            // 如果 data 直接是数组
            dataList = res.data
          } else if (res.data && Array.isArray(res.data.list)) {
            // 如果 data 是对象，包含 list 字段
            dataList = res.data.list
          } else {
            console.warn('[Report] 数据格式异常，使用空数组')
            dataList = []
          }
          
          console.log('[Report] 处理后的数据列表长度:', dataList.length)
          
          reports = dataList.map(item => ({
            ...item,
            attackName: item.attack_name || item.title || '未知玩家',
            targetName: item.target_name || item.desc || ''
          }))
        } else {
          throw new Error(res.message || '加载失败')
        }
      }

      console.log('最终战报列表:', reports)
      
      this.setData({ 
        reports,
        filteredReports: reports,
        loading: false 
      })
    } catch (error) {
      console.error('加载战报失败:', error)
      wx.showToast({
        title: error.message || '加载失败',
        icon: 'none'
      })
      this.setData({ loading: false })
    }
  },

  // 查看详情
  viewDetail(e) {
    const id = e.currentTarget.dataset.id
    wx.navigateTo({
      url: `/pages/battle-detail/battle-detail?id=${id}`
    })
  },

  // 下拉刷新
  onPullDownRefresh() {
    this.loadReports().then(() => {
      wx.stopPullDownRefresh()
    })
  },

  // 分享功能
  onShareAppMessage() {
    return {
      title: '战报管理 - 同盟管理助手',
      path: '/pages/report/report'
    }
  },

  // 分享到朋友圈
  onShareTimeline() {
    return {
      title: '战报管理 - 同盟管理助手',
      query: ''
    }
  }
})
