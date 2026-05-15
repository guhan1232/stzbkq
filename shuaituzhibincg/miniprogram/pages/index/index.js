// pages/index/index.js
const api = require('../../utils/api')
const util = require('../../utils/util')
const app = getApp()

Page({
  data: {
    hasDatabase: false,
    userInfo: null,
    databaseName: '',
    databaseAlliance: '',
    databaseServer: '',
    databaseState: '',
    isAdmin: false,
    stats: {
      memberCount: 0,
      taskCount: 0,
      reportCount: 0,
      battleCount: 0
    },
    recentTasks: []
  },

  _lastRefreshTime: 0,

  onLoad() {
    if (!app.requireLogin() || !app.requireDatabase()) {
      return
    }
    if (app.globalData.sessionValidating) {
      this._waitingForSession = true
      return
    }
    this.checkDatabase()
    this.loadData()
  },

  onShow() {
    if (!app.requireLogin() || !app.requireDatabase()) {
      return
    }
    if (app.globalData.sessionValidating) {
      this._waitingForSession = true
      return
    }
    if (this._waitingForSession) {
      this._waitingForSession = false
      this.checkDatabase()
      this.loadData()
      return
    }
    this.checkDatabase()
    if (this.data.hasDatabase) {
      var now = Date.now()
      if (now - this._lastRefreshTime > 2000) {
        this.loadData()
      }
    }
  },

  checkDatabase() {
    var hasDatabase = !!app.globalData.databaseId
    this.setData({
      hasDatabase: hasDatabase,
      userInfo: app.globalData.userInfo || {},
      databaseName: app.globalData.databaseName || '',
      databaseAlliance: app.globalData.databaseAlliance || '',
      databaseServer: app.globalData.databaseServer || '',
      databaseState: app.globalData.databaseState || '',
      isAdmin: app.isAdmin()
    })
  },

  onAvatarError() {
    this.setData({
      'userInfo.avatar': 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iMzAiIGN5PSIzMCIgcj0iMzAiIGZpbGw9IiNlYmVkZjAiLz48Y2lyY2xlIGN4PSIzMCIgY3k9IjI0IiByPSI5IiBmaWxsPSIjYzhjOWNjIi8+PHBhdGggZD0iTTE1IDUycTAtOSA2LTE1IDYtNiAxNS02IDkgMCAxNSA2IDYgNiA2IDE1djZIMTV2LTZ6IiBmaWxsPSIjYzhjOWNjIi8+PC9zdmc+'
    })
  },

  async loadData() {
    this._lastRefreshTime = Date.now()
    try {
      await Promise.all([
        this.loadStats(),
        this.loadRecentTasks()
      ])
    } catch (err) {
      console.error('[Index] loadData失败:', err)
    }
  },

  async loadStats() {
    try {
      var res = await api.getDatabaseInfo(app.globalData.databaseId)
      if (res && res.data && res.data.stats) {
        var db = res.data.database || {}
        this.setData({
          'stats.memberCount': Number(res.data.stats.team_user_count) || 0,
          'stats.taskCount': Number(res.data.stats.task_count) || 0,
          'stats.reportCount': Number(res.data.stats.report_count) || 0,
          'stats.battleCount': Number(res.data.stats.battle_report_count) || 0,
          databaseName: db.server_name || db.display_name || db.name || '',
          databaseAlliance: db.alliance_name || '',
          databaseServer: db.server || '',
          databaseState: db.state || ''
        })
      }
    } catch (err) {
      console.error('[Index] loadStats失败:', err)
    }
  },

  async loadRecentTasks() {
    try {
      var res = await api.getTaskList()
      if (res && res.data && res.data.length > 0) {
        var recentTasks = res.data.slice(0, 5).map(function(task) {
          var now = Date.now() / 1000
          var timeDiff = now - task.time
          var statusClass = 'warning'
          var statusText = '进行中'
          if (timeDiff < 0) {
            statusText = '未开始'
            statusClass = 'success'
          } else if (timeDiff > 86400) {
            statusText = '已结束'
            statusClass = 'error'
          }
          return {
            id: task.id,
            title: task.title,
            time: task.time,
            timeStr: util.formatTime(task.time, 'MM-dd HH:mm'),
            statusClass: statusClass,
            statusText: statusText
          }
        })
        this.setData({ recentTasks: recentTasks })
      } else {
        this.setData({ recentTasks: [] })
      }
    } catch (err) {
      console.error('[Index] loadRecentTasks失败:', err)
    }
  },

  onSelectDatabase() {
    wx.navigateTo({
      url: '/pages/database/database'
    })
  },

  onNavigateTo(e) {
    var url = e.currentTarget.dataset.url
    var tabBarPages = [
      '/pages/index/index',
      '/pages/task/task',
      '/pages/team-query/team-query',
      '/pages/report/report',
      '/pages/user/user'
    ]
    if (tabBarPages.indexOf(url) !== -1) {
      wx.switchTab({ url: url })
    } else {
      wx.navigateTo({ url: url })
    }
  },

  onTaskDetail(e) {
    var task = e.detail && e.detail.task
    var taskId = task ? task.id : (e.currentTarget.dataset.id)
    if (!taskId) {
      wx.showToast({ title: '任务信息错误', icon: 'none' })
      return
    }
    wx.navigateTo({
      url: '/pages/task-detail/task-detail?id=' + taskId
    })
  },

  onPullDownRefresh() {
    if (this.data.hasDatabase) {
      this.loadData().then(function() {
        wx.stopPullDownRefresh()
      }).catch(function() {
        wx.stopPullDownRefresh()
      })
    } else {
      wx.stopPullDownRefresh()
    }
  },

  onShareAppMessage() {
    return {
      title: (this.data.databaseName || '同盟') + ' - 攻城管理助手',
      path: '/pages/index/index'
    }
  },

  onShareTimeline() {
    return {
      title: (this.data.databaseName || '同盟') + ' - 攻城管理助手',
      query: ''
    }
  }
})
