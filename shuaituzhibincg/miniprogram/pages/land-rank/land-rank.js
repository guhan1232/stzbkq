/**
 * 翻地排行榜页面
 */
const api = require('../../utils/api')
const app = getApp()

Page({
  data: {
    loading: true,
    stats: [],
    refreshing: false
  },

  onLoad() {
    if (!app.requireLogin() || !app.requireDatabase()) return
    this.loadStats()
  },

  onShow() {
    // 每次显示时刷新
  },

  onPullDownRefresh() {
    this.setData({ refreshing: true })
    this.loadStats().then(() => {
      wx.stopPullDownRefresh()
      this.setData({ refreshing: false })
    })
  },

  async loadStats() {
    try {
      this.setData({ loading: true })
      const res = await api.getLandRecordsStats()
      if (res.code === 200 && res.data) {
        // 按成功数排序，并在JS中处理计算
        const stats = (res.data.list || [])
          .sort((a, b) => b.success_count - a.success_count)
          .map(item => {
            const rate = item.total_count > 0 ? (item.success_count / item.total_count * 100) : 0
            return {
              ...item,
              rateText: rate.toFixed(1) + '%',
              isHighRate: rate >= 80
            }
          })
        this.setData({ stats, loading: false })
      } else {
        this.setData({ stats: [], loading: false })
      }
    } catch (err) {
      console.error('获取翻地统计失败:', err)
      this.setData({ stats: [], loading: false })
      wx.showToast({ title: '加载失败', icon: 'none' })
    }
  },

  // 查看玩家详情
  viewPlayerDetail(e) {
    const { name } = e.currentTarget.dataset
    wx.navigateTo({
      url: `/pages/land-records/land-records?player=${encodeURIComponent(name)}`
    })
  },

  // 分享功能
  onShareAppMessage() {
    return {
      title: '翻地排行榜 - 同盟管理助手',
      path: '/pages/land-rank/land-rank'
    }
  },

  // 分享到朋友圈
  onShareTimeline() {
    return {
      title: '翻地排行榜 - 同盟管理助手',
      query: ''
    }
  }
})
