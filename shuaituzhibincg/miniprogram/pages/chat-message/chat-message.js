/**
 * 聊天消息页面 - 724协议
 * 展示：同盟名、玩家名、消息内容
 * 功能：筛选、导出、清除
 */
const api = require('../../utils/api')
const app = getApp()

Page({
  data: {
    loading: true,
    captureEnabled: false,

    list: [],
    total: 0,
    page: 1,
    pageSize: 50,
    hasMore: true,

    allianceName: '',
    playerName: '',
    contentKeyword: '',

    showFilter: false,
    exporting: false
  },

  onLoad() {
    if (!app.requireLogin() || !app.requireDatabase()) return
    this.loadMessages()
    this.checkCaptureStatus()
  },

  onPullDownRefresh() {
    this.setData({ page: 1, hasMore: true })
    this.loadMessages().then(() => wx.stopPullDownRefresh())
  },

  onReachBottom() {
    if (this.data.hasMore && !this.data.loading) {
      this.setData({ page: this.data.page + 1 })
      this.loadMessages()
    }
  },

  async loadMessages() {
    try {
      this.setData({ loading: true })
      const { allianceName, playerName, contentKeyword, page, pageSize } = this.data
      const params = { page, page_size: pageSize }
      if (allianceName) params.alliance_name = allianceName
      if (playerName) params.player_name = playerName
      if (contentKeyword) params.content = contentKeyword

      const res = await api.getChatMessageList(params)
      if (res.code === 200 && res.data) {
        const list = (res.data.list || []).map(item => ({
          ...item,
          timeText: this.formatTime(item.time)
        }))
        this.setData({
          list: page === 1 ? list : [...this.data.list, ...list],
          total: res.data.total || 0,
          hasMore: list.length >= pageSize
        })
      }
    } catch (err) {
      console.error('加载聊天消息失败:', err)
      wx.showToast({ title: '加载失败', icon: 'none' })
    } finally {
      this.setData({ loading: false })
    }
  },

  async checkCaptureStatus() {
    try {
      const res = await api.getChatMessageStats()
      if (res.code === 200 && res.data) {
        this.setData({ captureEnabled: res.data.capture_enabled || false })
      }
    } catch (err) {
      console.error('检查状态失败:', err)
    }
  },

  async toggleCapture() {
    try {
      if (this.data.captureEnabled) {
        await api.disableGetChatMessage()
        wx.showToast({ title: '已关闭抓取', icon: 'success' })
      } else {
        await api.enableGetChatMessage()
        wx.showToast({ title: '已开启抓取', icon: 'success' })
      }
      this.setData({ captureEnabled: !this.data.captureEnabled })
    } catch (err) {
      wx.showToast({ title: err.message || '操作失败', icon: 'none' })
    }
  },

  onAllianceInput(e) {
    this.setData({ allianceName: e.detail.value })
  },

  onPlayerInput(e) {
    this.setData({ playerName: e.detail.value })
  },

  onContentInput(e) {
    this.setData({ contentKeyword: e.detail.value })
  },

  onSearch() {
    this.setData({ page: 1, hasMore: true, list: [] })
    this.loadMessages()
  },

  onResetFilter() {
    this.setData({
      allianceName: '',
      playerName: '',
      contentKeyword: '',
      page: 1,
      hasMore: true,
      list: []
    })
    this.loadMessages()
  },

  toggleFilter() {
    this.setData({ showFilter: !this.data.showFilter })
  },

  async exportMessages() {
    if (this.data.exporting) return
    if (this.data.total === 0) {
      wx.showToast({ title: '没有数据可导出', icon: 'none' })
      return
    }

    const items = [
      { name: '复制到剪贴板', value: 'clipboard' },
      { name: '导出为文件', value: 'file' }
    ]
    const choice = await new Promise(resolve => {
      wx.showActionSheet({
        itemList: items.map(i => i.name),
        success: res => resolve(items[res.tapIndex].value),
        fail: () => resolve(null)
      })
    })
    if (!choice) return

    this.setData({ exporting: true })
    wx.showLoading({ title: '导出中...' })

    try {
      const { allianceName, playerName, contentKeyword } = this.data
      const params = { page: 1, page_size: 9999 }
      if (allianceName) params.alliance_name = allianceName
      if (playerName) params.player_name = playerName
      if (contentKeyword) params.content = contentKeyword

      const res = await api.getChatMessageList(params)
      if (res.code === 200 && res.data) {
        const messages = res.data.list || []
        const text = this.formatExportText(messages)

        if (choice === 'clipboard') {
          wx.setClipboardData({
            data: text,
            success: () => wx.showToast({ title: '已复制到剪贴板', icon: 'success' })
          })
        } else {
          const fs = wx.getFileSystemManager()
          const filePath = `${wx.env.USER_DATA_PATH}/chat_messages_${Date.now()}.txt`
          fs.writeFile({
            filePath,
            data: text,
            encoding: 'utf-8',
            success: () => {
              wx.shareFileMessage({
                filePath,
                success: () => wx.showToast({ title: '导出成功', icon: 'success' }),
                fail: () => {
                  wx.openDocument({
                    filePath,
                    showMenu: true,
                    success: () => wx.showToast({ title: '已打开文件', icon: 'success' })
                  })
                }
              })
            }
          })
        }
      }
    } catch (err) {
      wx.showToast({ title: err.message || '导出失败', icon: 'none' })
    } finally {
      wx.hideLoading()
      this.setData({ exporting: false })
    }
  },

  formatExportText(messages) {
    const lines = messages.map(msg => {
      const time = this.formatTime(msg.time)
      return `[${time}] [${msg.alliance_name}] ${msg.player_name}: ${msg.content}`
    })
    return lines.join('\n')
  },

  async clearMessages() {
    const confirmed = await new Promise(resolve => {
      wx.showModal({
        title: '确认清空',
        content: '确定要清空所有聊天消息吗？此操作不可恢复！',
        confirmColor: '#e74c3c',
        success: res => resolve(res.confirm)
      })
    })
    if (!confirmed) return

    try {
      wx.showLoading({ title: '清除中...' })
      const res = await api.deleteChatMessages()
      wx.hideLoading()
      wx.showToast({ title: `已清除 ${res.data || ''} 条消息`, icon: 'success' })
      this.setData({ page: 1, list: [], hasMore: true, total: 0 })
      this.loadMessages()
    } catch (err) {
      wx.hideLoading()
      wx.showToast({ title: err.message || '清除失败', icon: 'none' })
    }
  },

  formatTime(timestamp) {
    if (!timestamp) return ''
    const date = new Date(timestamp * 1000)
    const m = (date.getMonth() + 1).toString().padStart(2, '0')
    const d = date.getDate().toString().padStart(2, '0')
    const h = date.getHours().toString().padStart(2, '0')
    const min = date.getMinutes().toString().padStart(2, '0')
    return `${m}-${d} ${h}:${min}`
  }
})
