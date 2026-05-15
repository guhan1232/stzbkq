// 个人中心页面逻辑 - Vant Weapp
const app = getApp()
const api = require('../../utils/api.js')
import Dialog from '@vant/weapp/dialog/dialog'

Page({
  data: {
    userInfo: {},
    currentDbName: '',
    isAdmin: false
  },

  onLoad() {
    // 检查登录状态
    if (!app.requireLogin()) {
      return
    }
    this.setData({
      isAdmin: app.isAdmin()
    })
    this.loadUserInfo()
  },

  onShow() {
    if (!app.requireLogin()) {
      return
    }
    this.loadUserInfo()
    this.loadCurrentDb()
  },

  // 加载用户信息
  async loadUserInfo() {
    try {
      const res = await api.getUserInfo()
      if (res.code === 200 && res.data) {
        this.setData({ 
          userInfo: res.data,
          isAdmin: res.data.role === 'admin'
        })
        app.globalData.userInfo = res.data
      }
    } catch (error) {
      console.error('获取用户信息失败:', error)
      if (error.statusCode === 401) {
        app.logout()
      }
    }
  },

  // 头像加载失败
  onAvatarError() {
    // 使用默认头像（用户图标）
    this.setData({
      'userInfo.avatar': 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iODAiIGhlaWdodD0iODAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iNDAiIGN5PSI0MCIgcj0iNDAiIGZpbGw9IiNlYmVkZjAiLz48Y2lyY2xlIGN4PSI0MCIgY3k9IjMyIiByPSIxMiIgZmlsbD0iI2M4YzljYyIvPjxwYXRoIGQ9Ik0yMCA2NHEwLTEyIDgtMjAgOC04IDIwLTggMTIgMCAyMCA4IDggOCA4IDIwdjhoLTU2di04eiIgZmlsbD0iI2M4YzljYyIvPjwvc3ZnPg=='
    })
  },

  // 加载当前数据库信息
  loadCurrentDb() {
    const dbId = app.globalData.currentDbId
    if (dbId) {
      // 从缓存中获取数据库名称
      const dbList = wx.getStorageSync('dbList') || []
      const currentDb = dbList.find(db => db.id === dbId)
      if (currentDb) {
        this.setData({ currentDbName: currentDb.name })
      }
    }
  },

  // 跳转到数据库管理
  goToDatabase() {
    wx.navigateTo({
      url: '/pages/database/database'
    })
  },

  // 跳转到同盟成员
  goToTeam() {
    wx.navigateTo({
      url: '/pages/team/team'
    })
  },

  // 跳转到数据包捕获
  goToPacketCapture() {
    wx.navigateTo({
      url: '/pages/packet-capture/packet-capture'
    })
  },

  // 查看统计数据
  viewStatistics() {
    wx.showToast({
      title: '功能开发中',
      icon: 'none'
    })
  },

  // 用户管理（管理员）
  goToUserManage() {
    wx.showToast({
      title: '功能开发中',
      icon: 'none'
    })
  },

  // 系统配置（管理员）
  goToConfig() {
    wx.showToast({
      title: '功能开发中',
      icon: 'none'
    })
  },

  // 跳转到AI数据导出
  goToAIDataExport() {
    wx.navigateTo({
      url: '/pages/ai-data-export/ai-data-export'
    })
  },

  // 清除缓存
  clearCache() {
    wx.showModal({
      title: '提示',
      content: '确定要清除缓存吗？',
      success: (res) => {
        if (res.confirm) {
          // 清除所有缓存（除了token和登录信息）
          const token = wx.getStorageSync('token')
          const userInfo = wx.getStorageSync('userInfo')
          wx.clearStorageSync()
          wx.setStorageSync('token', token)
          wx.setStorageSync('userInfo', userInfo)
          
          wx.showToast({
            title: '清除成功',
            icon: 'success'
          })
        }
      }
    })
  },

  // 关于我们
  showAbout() {
    wx.showModal({
      title: '关于我们',
      content: '率土之滨助手 v1.0.0\n\n一款专为率土之滨游戏设计的辅助工具，提供任务管理、战报查看、数据分析等功能。',
      showCancel: false
    })
  },

  // 退出登录
  handleLogout() {
    wx.showModal({
      title: '提示',
      content: '确定要退出登录吗？',
      success: async (res) => {
        if (res.confirm) {
          try {
            await api.logout()
          } catch (error) {
            console.error('登出失败:', error)
          }
          
          // 使用app的logout方法清除所有数据并跳转
          app.logout()
        }
      }
    })
  },

  // 分享功能
  onShareAppMessage() {
    return {
      title: '同盟管理助手 - 个人中心',
      path: '/pages/index/index'
    }
  }
})
