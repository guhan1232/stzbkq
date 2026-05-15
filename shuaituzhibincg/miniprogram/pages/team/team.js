// 同盟成员页面逻辑
const app = getApp()
const api = require('../../utils/api.js')

Page({
  data: {
    activeGroup: 'all',
    groups: [],
    members: [],
    allMembers: [],
    searchText: '',
    loading: false,
    totalCount: 0,
    onlineCount: 0,
    offlineCount: 0,
    dbId: ''
  },

  onLoad(options) {
    const dbId = options.dbId || app.globalData.databaseId || ''
    if (!dbId) {
      wx.showToast({ title: '请先选择数据库', icon: 'none' })
      return
    }
    this.setData({ dbId })
    this.loadGroups()
    this.loadMembers()
  },

  onShow() {
    if (this.data.dbId) {
      this.loadMembers()
    }
  },

  // 加载分组
  async loadGroups() {
    try {
      const res = await api.getGroupList(this.data.dbId)
      if (res.code === 200 && res.data) {
        this.setData({ groups: res.data || [] })
      }
    } catch (error) {
      console.error('加载分组失败:', error)
    }
  },

  // 加载成员列表
  async loadMembers() {
    this.setData({ loading: true })

    try {
      const res = await api.getMemberList(this.data.dbId)
      if (res.code === 200 && res.data) {
        // 为每个成员添加首字符和必要的字段
        const members = (res.data || []).map(m => ({
          ...m,
          name: m.name || m.player_name || '未知',
          role: m.role || m.position || '普通成员',
          alliance: m.alliance || '',
          x: m.x || m.pos_x,
          y: m.y || m.pos_y,
          power: m.power || m.force_value || 0,
          landCount: m.land_count || m.landCount || 0,
          taskCompleted: m.task_completed || m.taskCompleted || 0,
          online: m.online || false,
          avatar: m.avatar || ''
        }))
        this.setData({
          allMembers: members,
          loading: false
        })
        this.filterMembers()
        this.calculateStats()
      } else {
        throw new Error(res.message || '加载失败')
      }
    } catch (error) {
      console.error('加载成员失败:', error)
      wx.showToast({
        title: error.message || '加载失败',
        icon: 'none'
      })
      this.setData({ loading: false })
    }
  },

  // 切换分组
  switchGroup(e) {
    const group = e.currentTarget.dataset.group
    this.setData({ activeGroup: group })
    this.filterMembers()
  },

  // 搜索输入
  onSearchInput(e) {
    this.setData({ searchText: e.detail.value })
  },

  // 执行搜索
  onSearch() {
    this.filterMembers()
  },

  // 过滤成员
  filterMembers() {
    let members = this.data.allMembers

    // 按分组过滤
    if (this.data.activeGroup !== 'all') {
      members = members.filter(m => m.group === this.data.activeGroup)
    }

    // 按搜索文本过滤
    if (this.data.searchText) {
      const keyword = this.data.searchText.toLowerCase()
      members = members.filter(m => 
        m.name.toLowerCase().includes(keyword)
      )
    }

    this.setData({ members })
  },

  // 计算统计信息
  calculateStats() {
    const allMembers = this.data.allMembers
    const onlineCount = allMembers.filter(m => m.online).length
    const offlineCount = allMembers.length - onlineCount

    this.setData({
      totalCount: allMembers.length,
      onlineCount,
      offlineCount
    })
  },

  // 点击成员卡片
  onMemberTap(e) {
    const member = e.detail.member
    console.log('点击成员:', member)
    // TODO: 可以跳转到成员详情页或显示详情弹窗
    wx.showToast({
      title: member.name,
      icon: 'none'
    })
  },

  // 下拉刷新
  onPullDownRefresh() {
    this.loadMembers().then(() => {
      wx.stopPullDownRefresh()
    })
  },

  // 分享功能
  onShareAppMessage() {
    return {
      title: '同盟成员列表 - 同盟管理助手',
      path: '/pages/team/team'
    }
  },

  // 分享到朋友圈
  onShareTimeline() {
    return {
      title: '同盟成员列表 - 同盟管理助手',
      query: ''
    }
  }
})
