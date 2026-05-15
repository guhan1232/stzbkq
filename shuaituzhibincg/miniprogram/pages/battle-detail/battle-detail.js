/**
 * 战报详情页
 */
const api = require('../../utils/api')
const app = getApp()

Page({
  data: {
    loading: true,
    battleId: '',
    detail: null
  },

  onLoad(options) {
    if (!app.requireLogin() || !app.requireDatabase()) return
    // 支持 battle_id 和 id 两种参数名
    const battleId = options.battle_id || options.id
    if (battleId) {
      this.setData({ battleId })
      this.loadDetail()
    } else {
      wx.showToast({ title: '缺少战报ID', icon: 'none' })
      setTimeout(() => wx.navigateBack(), 1500)
    }
  },

  async loadDetail() {
    try {
      this.setData({ loading: true })
      const res = await api.getBattleReportDetail(this.data.battleId)
      if (res.code === 200 && res.data) {
        const detail = {
          ...res.data,
          timeText: this.formatTime(res.data.time)
        }
        this.setData({ detail, loading: false })
      } else {
        this.setData({ loading: false })
        wx.showToast({ title: '战报不存在', icon: 'none' })
      }
    } catch (err) {
      console.error('获取战报详情失败:', err)
      this.setData({ loading: false })
      wx.showToast({ title: '加载失败', icon: 'none' })
    }
  },

  formatTime(timestamp) {
    if (!timestamp) return ''
    const date = new Date(timestamp * 1000)
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
  },

  // 复制战报ID
  copyBattleId() {
    wx.setClipboardData({
      data: this.data.battleId,
      success: () => {
        wx.showToast({ title: '已复制', icon: 'success' })
      }
    })
  },

  // 获取字符串首字符
  firstChar(str) {
    return (str || '未')[0]
  }
})
