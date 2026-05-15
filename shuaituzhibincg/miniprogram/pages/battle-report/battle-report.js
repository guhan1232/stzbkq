/**
 * 战报查询页面
 */
const api = require('../../utils/api')
const app = getApp()

Page({
  data: {
    loading: false,
    list: [],
    total: 0,
    page: 1,
    pageSize: 20,
    hasMore: true,
    
    // 搜索条件
    showFilter: false,
    atkName: '',
    defName: '',
    unionName: '',
    minHp: '',
    nonpc: false,
    
    // 数据清理检测
    lastCleanupTimestamp: 0
  },

  onLoad() {
    if (!app.requireLogin() || !app.requireDatabase()) return
    this.loadList()
  },

  onShow() {
    // 检查是否有数据清理，如果有则刷新数据
    this.checkCleanupAndRefresh()
  },

  onPullDownRefresh() {
    this.setData({ page: 1, list: [], hasMore: true })
    this.loadList().then(() => {
      wx.stopPullDownRefresh()
    })
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
          console.log('[BattleReport] 检测到数据清理，自动刷新...')
          wx.showToast({
            title: '数据已更新',
            icon: 'success',
            duration: 1500
          })
          this.setData({ page: 1, list: [], hasMore: true })
          await this.loadList()
        }
        
        // 更新时间戳
        this.setData({ lastCleanupTimestamp: newTimestamp })
      }
    } catch (err) {
      console.error('检查清理时间戳失败:', err)
    }
  },

  onReachBottom() {
    if (this.data.hasMore && !this.data.loading) {
      this.loadMore()
    }
  },

  async loadList() {
    try {
      this.setData({ loading: true })
      const { atkName, defName, unionName, minHp, nonpc, page, pageSize } = this.data
      const params = { page, page_size: pageSize }
      if (atkName) params.atk_name = atkName
      if (defName) params.def_name = defName
      if (unionName) params.union_name = unionName
      if (minHp) params.min_hp = parseInt(minHp)
      if (nonpc) params.nonpc = '1'

      const res = await api.getBattleReportList(params)
      if (res.code === 200 && res.data) {
        const list = (res.data.list || []).map(item => ({
          ...item,
          timeText: this.formatTime(item.time)
        }))
        this.setData({
          list,
          total: res.data.total || 0,
          hasMore: list.length >= pageSize,
          loading: false
        })
      } else {
        this.setData({ loading: false, hasMore: false })
      }
    } catch (err) {
      console.error('获取战报列表失败:', err)
      this.setData({ loading: false, hasMore: false })
      wx.showToast({ title: '加载失败', icon: 'none' })
    }
  },

  async loadMore() {
    this.setData({ page: this.data.page + 1 })
    await this.loadList()
  },

  formatTime(timestamp) {
    if (!timestamp) return ''
    const date = new Date(timestamp * 1000)
    return `${date.getMonth() + 1}/${date.getDate()} ${date.getHours()}:${String(date.getMinutes()).padStart(2, '0')}`
  },

  // 显示/隐藏筛选
  toggleFilter() {
    this.setData({ showFilter: !this.data.showFilter })
  },

  // 输入事件
  onAtkNameInput(e) {
    this.setData({ atkName: e.detail.value })
  },
  onDefNameInput(e) {
    this.setData({ defName: e.detail.value })
  },
  onUnionNameInput(e) {
    this.setData({ unionName: e.detail.value })
  },
  onMinHpInput(e) {
    this.setData({ minHp: e.detail.value })
  },
  onNonpcChange(e) {
    this.setData({ nonpc: e.detail.value })
  },

  // 搜索
  doSearch() {
    this.setData({ page: 1, list: [], hasMore: true, showFilter: false })
    this.loadList()
  },

  // 重置
  resetFilter() {
    this.setData({
      atkName: '',
      defName: '',
      unionName: '',
      minHp: '',
      nonpc: false,
      page: 1,
      list: [],
      hasMore: true,
      showFilter: false
    })
    this.loadList()
  },

  // 查看战报详情
  viewDetail(e) {
    const { id } = e.currentTarget.dataset
    wx.navigateTo({
      url: `/pages/battle-detail/battle-detail?battle_id=${id}`
    })
  },

  // 分享功能
  onShareAppMessage() {
    return {
      title: '战报查询 - 同盟管理助手',
      path: '/pages/battle-report/battle-report'
    }
  },

  // 分享到朋友圈
  onShareTimeline() {
    return {
      title: '战报查询 - 同盟管理助手',
      query: ''
    }
  }
})
