// 自定义TabBar
Component({
  data: {
    selected: 0,
    list: [
      {
        pagePath: "/pages/index/index",
        text: "首页",
        icon: "🏠"
      },
      {
        pagePath: "/pages/task/task",
        text: "任务",
        icon: "📋"
      },
      {
        pagePath: "/pages/team-query/team-query",
        text: "队伍",
        icon: "👥"
      },
      {
        pagePath: "/pages/report/report",
        text: "战报",
        icon: "📊"
      },
      {
        pagePath: "/pages/user/user",
        text: "我的",
        icon: "👤"
      }
    ]
  },

  methods: {
    switchTab(e) {
      const data = e.currentTarget.dataset
      const url = data.path
      
      wx.switchTab({ url })
      
      this.setData({
        selected: data.index
      })
    }
  }
})
