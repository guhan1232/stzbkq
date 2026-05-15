/**
 * 排行榜看板页面
 */
const api = require('../../utils/api')
const app = getApp()

Page({
  data: {
    loading: true,
    activeTab: 0,
    tabs: ['同盟排行', '领地排行', '个人积分'],
    keyword: '',
    eventId: '',
    
    // 同盟排行数据
    unionList: [],
    unionCount: 0,
    
    // 领地排行数据
    territoryList: [],
    territoryCount: 0,
    
    // 个人积分数据
    personalList: [],
    personalCount: 0,
    eventGroups: []
  },

  onLoad() {
    if (!app.requireLogin() || !app.requireDatabase()) return
    this.loadAllData()
  },

  onPullDownRefresh() {
    this.setData({ refreshing: true })
    this.loadAllData().then(() => {
      wx.stopPullDownRefresh()
      this.setData({ refreshing: false })
    })
  },

  onTabChange(e) {
    const index = e.detail.index
    this.setData({ activeTab: index })
  },

  onKeywordInput(e) {
    this.setData({ keyword: e.detail.value })
  },

  onEventIdInput(e) {
    this.setData({ eventId: e.detail.value })
  },

  searchUnion() {
    this.loadUnion()
  },

  searchPersonal() {
    this.loadPersonal()
  },

  clearEventFilter() {
    this.setData({ eventId: '' })
    this.loadPersonal()
  },

  async loadAllData() {
    try {
      this.setData({ loading: true })
      await Promise.all([this.loadUnion(), this.loadTerritory(), this.loadPersonal()])
      this.setData({ loading: false })
    } catch (err) {
      console.error('加载失败:', err)
      this.setData({ loading: false })
      wx.showToast({ title: '加载失败', icon: 'none' })
    }
  },

  async loadUnion() {
    try {
      const params = { limit: 200 }
      if (this.data.keyword) params.name = this.data.keyword
      const res = await api.getUnionLeaderboard(params)
      if (res.code === 200 && res.data) {
        const items = (res.data.items || []).map(item => ({
          ...item,
          refresh_time_text: this.fmtTs(item.refresh_time)
        }))
        this.setData({
          unionList: items,
          unionCount: items.length
        })
      }
    } catch (err) {
      console.error('获取同盟排行失败:', err)
    }
  },

  async loadTerritory() {
    try {
      const res = await api.getTerritoryLeaderboard({ limit: 200 })
      if (res.code === 200 && res.data) {
        const items = (res.data.items || []).map(item => ({
          ...item,
          capture_time_text: this.fmtTs(item.capture_time)
        }))
        this.setData({
          territoryList: items,
          territoryCount: items.length
        })
      }
    } catch (err) {
      console.error('获取领地排行失败:', err)
    }
  },

  async loadPersonal() {
    try {
      const params = { limit: 500 }
      if (this.data.eventId) params.event_id = this.data.eventId
      const res = await api.getPersonalLeaderboard(params)
      if (res.code === 200 && res.data) {
        const items = (res.data.items || []).map(item => ({
          ...item,
          capture_time_text: this.fmtTs(item.capture_time)
        }))
        
        // 计算 eventGroups
        const groupMap = {}
        for (const r of items) {
          const eid = r.event_id
          if (!groupMap[eid]) groupMap[eid] = { event_id: eid, count: 0, max_score: 0 }
          groupMap[eid].count++
          const score = Number(r.param_a) || 0
          if (score > groupMap[eid].max_score) groupMap[eid].max_score = score
        }
        const eventGroups = Object.values(groupMap).sort((a, b) => b.count - a.count)

        this.setData({
          personalList: items,
          personalCount: items.length,
          eventGroups
        })
      }
    } catch (err) {
      console.error('获取个人积分失败:', err)
    }
  },

  fmtTs(ts) {
    if (!ts) return ''
    const d = new Date(Number(ts) * 1000)
    if (Number.isNaN(d.getTime())) return String(ts)
    return d.toLocaleString('zh-CN', { hour12: false })
  },

  tapEventChip(e) {
    const eid = e.currentTarget.dataset.eid
    if (this.data.eventId == String(eid)) {
      this.setData({ eventId: '' })
    } else {
      this.setData({ eventId: String(eid) })
    }
    this.loadPersonal()
  },

  refreshData() {
    this.loadAllData()
  },

  // 分享功能
  onShareAppMessage() {
    return {
      title: '排行榜看板 - 同盟管理助手',
      path: '/pages/leaderboard/leaderboard'
    }
  },

  // 分享到朋友圈
  onShareTimeline() {
    return {
      title: '排行榜看板 - 同盟管理助手',
      query: ''
    }
  }
})
