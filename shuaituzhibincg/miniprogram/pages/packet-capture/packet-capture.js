// pages/packet-capture/packet-capture.js
const app = getApp()
const api = require('../../utils/api.js')

Page({
  data: {
    stats: {
      total_packets: 0,
      is_running: false,
      interfaces: 0,
      start_time: null
    },
    packets: [],
    duration: '00:00',
    starting: false,
    stopping: false,
    timerInterval: null,
    refreshInterval: null
  },

  onLoad() {
    this.loadStats()
    this.loadPackets()
  },

  onUnload() {
    this.stopTimer()
    this.stopAutoRefresh()
  },

  // 开始捕获
  async startCapture() {
    this.setData({ starting: true })
    
    try {
      const res = await api.request({
        url: '/packet-capture/start',
        method: 'POST',
        needAuth: false
      })
      if (res.data.success) {
        wx.showToast({ title: '开始捕获数据包', icon: 'success' })
        await this.loadStats()
        this.startTimer()
        this.startAutoRefresh()
      }
    } catch (error) {
      wx.showToast({ 
        title: error.message || '启动失败', 
        icon: 'none' 
      })
    } finally {
      this.setData({ starting: false })
    }
  },

  // 停止捕获
  async stopCapture() {
    this.setData({ stopping: true })
    
    try {
      const res = await api.request({
        url: '/packet-capture/stop',
        method: 'POST',
        needAuth: false
      })
      wx.showToast({ title: '已停止捕获', icon: 'success' })
      await this.loadStats()
      this.stopTimer()
      this.stopAutoRefresh()
    } catch (error) {
      wx.showToast({ 
        title: error.message || '停止失败', 
        icon: 'none' 
      })
    } finally {
      this.setData({ stopping: false })
    }
  },

  // 加载统计信息
  async loadStats() {
    try {
      const res = await api.request({
        url: '/packet-capture/stats',
        method: 'GET',
        needAuth: false
      })
      this.setData({ stats: res.data })
      
      if (res.data.is_running && !this.data.timerInterval) {
        this.startTimer()
        this.startAutoRefresh()
      }
    } catch (error) {
      console.error('加载统计信息失败:', error)
    }
  },

  // 加载数据包
  async loadPackets() {
    try {
      const res = await api.request({
        url: '/packet-capture/packets',
        method: 'GET',
        data: { limit: 50 },
        needAuth: false
      })
      this.setData({ packets: res.data })
    } catch (error) {
      console.error('加载数据包失败:', error)
    }
  },

  // 刷新数据包列表
  async refreshPackets() {
    await this.loadPackets()
    wx.showToast({ title: '已刷新', icon: 'success' })
  },

  // 导出CSV
  exportCSV() {
    const url = `${app.globalData.baseUrl}/v1/packet-capture/export/csv`
    wx.downloadFile({
      url: url,
      header: {
        'Authorization': `Bearer ${wx.getStorageSync('token')}`
      },
      success: (res) => {
        if (res.statusCode === 200) {
          wx.openDocument({
            filePath: res.tempFilePath,
            showMenu: true,
            success: () => {
              wx.showToast({ title: '打开成功', icon: 'success' })
            }
          })
        }
      },
      fail: () => {
        wx.showToast({ title: '下载失败', icon: 'none' })
      }
    })
  },

  // 导出JSON
  exportJSON() {
    const url = `${app.globalData.baseUrl}/v1/packet-capture/export/json`
    wx.downloadFile({
      url: url,
      header: {
        'Authorization': `Bearer ${wx.getStorageSync('token')}`
      },
      success: (res) => {
        if (res.statusCode === 200) {
          wx.openDocument({
            filePath: res.tempFilePath,
            showMenu: true,
            success: () => {
              wx.showToast({ title: '打开成功', icon: 'success' })
            }
          })
        }
      },
      fail: () => {
        wx.showToast({ title: '下载失败', icon: 'none' })
      }
    })
  },

  // 格式化解析数据
  formatParsedData(data) {
    try {
      // 尝试格式化JSON
      const parsed = JSON.parse(data)
      return JSON.stringify(parsed, null, 2)
    } catch (e) {
      // 如果不是JSON，直接返回
      return data
    }
  },

  // 启动计时器
  startTimer() {
    if (this.data.timerInterval) clearInterval(this.data.timerInterval)
    
    const interval = setInterval(() => {
      if (this.data.stats.start_time) {
        const startTime = new Date(this.data.stats.start_time)
        const diff = Math.floor((new Date() - startTime) / 1000)
        const minutes = Math.floor(diff / 60).toString().padStart(2, '0')
        const seconds = (diff % 60).toString().padStart(2, '0')
        this.setData({ duration: `${minutes}:${seconds}` })
      }
    }, 1000)
    
    this.setData({ timerInterval: interval })
  },

  // 停止计时器
  stopTimer() {
    if (this.data.timerInterval) {
      clearInterval(this.data.timerInterval)
      this.setData({ timerInterval: null })
    }
  },

  // 启动自动刷新
  startAutoRefresh() {
    if (this.data.refreshInterval) clearInterval(this.data.refreshInterval)
    
    const interval = setInterval(() => {
      this.loadPackets()
      this.loadStats()
    }, 3000) // 每3秒刷新一次
    
    this.setData({ refreshInterval: interval })
  },

  // 停止自动刷新
  stopAutoRefresh() {
    if (this.data.refreshInterval) {
      clearInterval(this.data.refreshInterval)
      this.setData({ refreshInterval: null })
    }
  }
})
