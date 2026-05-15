/**
* 数据库选择页面 - 深色主题
*/
const api = require('../../utils/api')
const app = getApp()

Page({
  data: {
    databases: [],
    selectedId: null,
    loading: false,
    loadError: false,
    errorMsg: ''
  },

  onLoad() {
    if (!app.requireLogin()) return
    this.loadDatabases()
  },

  onShow() {
    // 每次显示时刷新选中状态
    this.setData({
      selectedId: app.globalData.databaseId
    })
  },

  async loadDatabases() {
    this.setData({ loading: true, loadError: false })
    
    try {
      console.log('[Database] 开始加载数据库列表...')
      const res = await api.getDatabases(1, 100)
      console.log('[Database] API响应:', res)
      
      const list = (res.data && res.data.list) || []
      console.log('[Database] 数据库列表长度:', list.length)
      console.log('[Database] 数据库列表详情:', list)
      
      this.setData({
        databases: list,
        selectedId: app.globalData.databaseId,
        loading: false
      })
      
      // 如果列表为空，给出提示
      if (list.length === 0) {
        console.warn('[Database] 数据库列表为空！')
        this.setData({ 
          loadError: true,
          errorMsg: '暂无可用的数据库，请联系管理员创建'
        })
      }
    } catch (err) {
      console.error('[Database] 加载数据库列表失败:', err)
      this.setData({ 
        loading: false, 
        loadError: true,
        errorMsg: '加载失败：' + (err.message || '网络错误')
      })
    }
  },

  async onSelectDatabase(e) {
    const { id, name, fullname, alliance, server, state } = e.currentTarget.dataset

    if (this.data.selectedId === id) {
      wx.switchTab({ url: '/pages/index/index' })
      return
    }

    wx.showLoading({ title: '切换中...', mask: true })

    try {
      await api.selectDatabase(id)
      // 保存完整信息到 app.globalData
      app.setDatabaseInfo({
        id: id,
        name: name,          // 用于显示的区服名（如 X5536）
        fullName: fullname,  // 完整名称
        alliance: alliance,  // 同盟名字（如 率土有米）
        server: server,      // 区服（如 X5536）
        state: state         // 所在州（如 凉州）
      })

      wx.hideLoading()
      wx.showToast({ title: '切换成功', icon: 'success' })

      setTimeout(() => {
        wx.switchTab({ url: '/pages/index/index' })
      }, 1000)
    } catch (err) {
      console.error('切换数据库失败:', err)
      wx.hideLoading()
      wx.showToast({ title: '切换失败', icon: 'none' })
    }
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
          app.logout()
        }
      }
    })
  },

  // 下拉刷新
  onPullDownRefresh() {
    this.loadDatabases().then(() => {
      wx.stopPullDownRefresh()
    })
  }
})
