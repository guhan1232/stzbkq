// pages/packet-view/packet-view.js
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
    timerInterval: null,
    refreshInterval: null
  },

  onLoad() {
    this.loadStats()
    this.loadPackets()
  },

  onShow() {
    this.loadStats()
    this.loadPackets()
    // 如果正在捕获，启动自动刷新
    if (this.data.stats.is_running) {
      this.startTimer()
      this.startAutoRefresh()
    }
  },

  onUnload() {
    this.stopTimer()
    this.stopAutoRefresh()
  },

  // 加载统计信息
  async loadStats() {
    try {
      const res = await api.request({
        url: '/packet-capture/stats',
        method: 'GET',
        needAuth: false
      })
      
      console.log('统计信息响应:', JSON.stringify(res, null, 2))
      
      // res 本身就是 {code: 200, msg: "ok", data: {...}}
      // res.data 就是实际的统计数据
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
        data: { limit: 100 },
        needAuth: false
      })
      
      // res 是 {code: 200, msg: "ok", data: [...]}
      const packetsArray = res.data || []
      
      // 处理数据包数据
      const packets = packetsArray.map(packet => {
        // 确保 parsed 字段存在且有内容
        const parsed = (packet.parsed && packet.parsed.trim()) ? packet.parsed.trim() : ''
        
        return {
          ...packet,
          display_data: parsed,
          has_data: parsed.length > 0
        }
      })
      
      this.setData({ packets })
    } catch (error) {
      console.error('加载数据包失败:', error)
    }
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

  // 复制数据
  copyData(e) {
    const text = e.currentTarget.dataset.text
    wx.setClipboardData({
      data: text,
      success: () => {
        wx.showToast({ title: '已复制', icon: 'success' })
      }
    })
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
