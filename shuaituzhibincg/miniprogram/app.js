// app.js
const platform = require('./utils/platform.js')

App({
  globalData: {
    userInfo: null,
    sessionId: null,
    databaseId: null,
    databaseName: null,
    databaseFullName: null,
    databaseAlliance: null,
    databaseServer: null,
    databaseState: null,
    apiBaseUrl: 'https://stzb.kaoqin.txy.hanyuxin.cn/v1',
    sessionValidating: false,
    sessionValid: null,
    _loggingOut: false
  },

  onLaunch() {
    this.checkLoginStatus()
  },

  checkLoginStatus() {
    const sessionId = platform.storage.getStorageSync('sessionId')
    const userInfo = platform.storage.getStorageSync('userInfo')
    const databaseId = platform.storage.getStorageSync('databaseId')
    const databaseName = platform.storage.getStorageSync('databaseName')
    const databaseFullName = platform.storage.getStorageSync('databaseFullName')
    const databaseAlliance = platform.storage.getStorageSync('databaseAlliance')
    const databaseServer = platform.storage.getStorageSync('databaseServer')
    const databaseState = platform.storage.getStorageSync('databaseState')

    if (sessionId && userInfo) {
      this.globalData.sessionId = sessionId
      this.globalData.userInfo = userInfo
      this.globalData.databaseId = databaseId
      this.globalData.databaseName = databaseName
      this.globalData.databaseFullName = databaseFullName
      this.globalData.databaseAlliance = databaseAlliance
      this.globalData.databaseServer = databaseServer
      this.globalData.databaseState = databaseState

      this.validateSession()
    } else {
      platform.router.reLaunch('/pages/login/login')
    }
  },

  validateSession() {
    if (this.globalData.sessionValidating) return
    this.globalData.sessionValidating = true
    this.globalData.sessionValid = null

    const that = this
    wx.request({
      url: `${this.globalData.apiBaseUrl}/user/info`,
      method: 'GET',
      header: {
        'Cookie': `session_id=${this.globalData.sessionId}`,
        'X-Session-ID': this.globalData.sessionId
      },
      success(res) {
        that.globalData.sessionValidating = false
        if (res.statusCode === 200) {
          if (res.data.code === 200) {
            that.globalData.sessionValid = true
            that.globalData.userInfo = res.data.data
            platform.storage.setStorageSync('userInfo', res.data.data)

            const serverDbId = res.data.data.database_id
            if (serverDbId && serverDbId > 0) {
              that.globalData.databaseId = serverDbId
              platform.storage.setStorageSync('databaseId', serverDbId)
            }

            if (!that.globalData.databaseId) {
              platform.router.redirectTo('/pages/database/database')
            } else {
              platform.router.switchTab('/pages/index/index')
            }
          } else if (res.data.code === 401) {
            that.globalData.sessionValid = false
            that.logout()
          } else {
            that.globalData.sessionValid = true
            if (!that.globalData.databaseId) {
              platform.router.redirectTo('/pages/database/database')
            } else {
              platform.router.switchTab('/pages/index/index')
            }
          }
        } else {
          that.globalData.sessionValid = true
          if (!that.globalData.databaseId) {
            platform.router.redirectTo('/pages/database/database')
          } else {
            platform.router.switchTab('/pages/index/index')
          }
        }
      },
      fail() {
        that.globalData.sessionValidating = false
        that.globalData.sessionValid = true
        if (!that.globalData.databaseId) {
          platform.router.redirectTo('/pages/database/database')
        } else {
          platform.router.switchTab('/pages/index/index')
        }
      }
    })
  },

  login(sessionId, userInfo) {
    this.globalData.sessionId = sessionId
    this.globalData.userInfo = userInfo
    this.globalData.sessionValid = true
    this.globalData._loggingOut = false
    platform.storage.setStorageSync('sessionId', sessionId)
    platform.storage.setStorageSync('userInfo', userInfo)
  },

  setDatabase(databaseId, databaseName) {
    this.globalData.databaseId = databaseId
    this.globalData.databaseName = databaseName
    platform.storage.setStorageSync('databaseId', databaseId)
    platform.storage.setStorageSync('databaseName', databaseName)
  },

  // 设置数据库完整信息
  setDatabaseInfo(info) {
    this.globalData.databaseId = info.id
    this.globalData.databaseName = info.name       // 区服名称
    this.globalData.databaseFullName = info.fullName  // 完整名称
    this.globalData.databaseAlliance = info.alliance  // 同盟名字
    this.globalData.databaseServer = info.server      // 区服
    this.globalData.databaseState = info.state        // 所在州

    platform.storage.setStorageSync('databaseId', info.id)
    platform.storage.setStorageSync('databaseName', info.name)
    platform.storage.setStorageSync('databaseFullName', info.fullName)
    platform.storage.setStorageSync('databaseAlliance', info.alliance)
    platform.storage.setStorageSync('databaseServer', info.server)
    platform.storage.setStorageSync('databaseState', info.state)
  },

  logout() {
    if (this.globalData._loggingOut) return
    this.globalData._loggingOut = true
    this.globalData.sessionId = null
    this.globalData.userInfo = null
    this.globalData.databaseId = null
    this.globalData.databaseName = null
    this.globalData.databaseFullName = null
    this.globalData.databaseAlliance = null
    this.globalData.databaseServer = null
    this.globalData.databaseState = null
    this.globalData.sessionValid = null
    this.globalData.sessionValidating = false
    platform.storage.removeStorageSync('sessionId')
    platform.storage.removeStorageSync('userInfo')
    platform.storage.removeStorageSync('databaseId')
    platform.storage.removeStorageSync('databaseName')
    platform.storage.removeStorageSync('databaseFullName')
    platform.storage.removeStorageSync('databaseAlliance')
    platform.storage.removeStorageSync('databaseServer')
    platform.storage.removeStorageSync('databaseState')

    platform.router.reLaunch('/pages/login/login')
    setTimeout(() => {
      this.globalData._loggingOut = false
    }, 1000)
  },

  // 检查是否需要登录
  requireLogin() {
    if (!this.globalData.sessionId || !this.globalData.userInfo) {
      platform.router.reLaunch('/pages/login/login')
      return false
    }
    return true
  },

  // 检查是否需要选择数据库
  requireDatabase() {
    if (!this.globalData.databaseId) {
      platform.router.redirectTo('/pages/database/database')
      return false
    }
    return true
  },

  // 检查是否是管理员
  isAdmin() {
    return this.globalData.userInfo && this.globalData.userInfo.role === 'admin'
  },

  // 检查管理员权限，无权限时提示
  requireAdmin() {
    if (!this.isAdmin()) {
      platform.feedback.showToast({
        title: '无权限操作',
        icon: 'none'
      })
      return false
    }
    return true
  }
})
