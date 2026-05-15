/**
 * 翻地记录详情页
 */
const api = require('../../utils/api')
const app = getApp()

Page({
  data: {
    loading: true,
    list: [],
    total: 0,
    page: 1,
    pageSize: 20,
    hasMore: true,
    playerName: '',
    
    // 新增筛选条件
    onlyMembers: true, // 默认只显示同盟成员
    groupName: '', // 按团筛选
    startTime: '', // 开始日期
    endTime: '', // 结束日期
    showFilterPanel: false, // 是否显示筛选面板
    successFilter: '', // 结果筛选：空/1/0
    successFilterIndex: 0, // 结果筛选索引（用于picker）
    successFilterText: '全部' // 结果筛选项文本
  },

  onLoad(options) {
    if (!app.requireLogin() || !app.requireDatabase()) return
    if (options.player) {
      this.setData({ playerName: decodeURIComponent(options.player) })
    }
    this.loadRecords()
  },

  onPullDownRefresh() {
    this.setData({ page: 1, list: [], hasMore: true })
    this.loadRecords().then(() => wx.stopPullDownRefresh())
  },

  onReachBottom() {
    if (this.data.hasMore && !this.data.loading) {
      this.loadMore()
    }
  },

  // 切换筛选面板
  toggleFilterPanel() {
    this.setData({ showFilterPanel: !this.data.showFilterPanel })
  },

  // 仅同盟成员开关变化
  onOnlyMembersChange(e) {
    this.setData({ onlyMembers: e.detail.value })
  },

  // 团名输入
  onGroupNameInput(e) {
    this.setData({ groupName: e.detail.value })
  },

  // 玩家名称输入
  onPlayerNameInput(e) {
    this.setData({ playerName: e.detail.value })
  },

  // 结果筛选变化
  onSuccessFilterChange(e) {
    const values = ['', '1', '0']
    const texts = ['全部', '成功', '失败']
    const index = e.detail.value
    this.setData({
      successFilter: values[index],
      successFilterIndex: index,
      successFilterText: texts[index]
    })
  },

  // 开始日期变化
  onStartTimeChange(e) {
    this.setData({ startTime: e.detail.value })
  },

  // 结束日期变化
  onEndTimeChange(e) {
    this.setData({ endTime: e.detail.value })
  },

  // 重置筛选
  resetFilter() {
    this.setData({
      onlyMembers: true,
      groupName: '',
      startTime: '',
      endTime: '',
      successFilter: '',
      successFilterIndex: 0,
      successFilterText: '全部',
      playerName: ''
    })
    this.refreshList()
  },

  // 应用筛选
  applyFilter() {
    this.refreshList()
    this.setData({ showFilterPanel: false })
  },

  // 刷新列表
  refreshList() {
    this.setData({ page: 1, list: [], hasMore: true })
    this.loadRecords()
  },

  async loadRecords() {
    try {
      this.setData({ loading: true })
      const { playerName, page, pageSize, onlyMembers, groupName, startTime, endTime, successFilter } = this.data
      
      const params = { 
        page, 
        page_size: pageSize,
        only_members: onlyMembers ? '1' : '0'
      }
      
      if (playerName) params.player_name = playerName
      if (groupName) params.group_name = groupName
      if (successFilter) params.is_success = successFilter
      
      // 处理时间范围
      if (startTime) {
        const startDate = new Date(startTime)
        params.start_time = Math.floor(startDate.getTime() / 1000)
      }
      if (endTime) {
        const endDate = new Date(endTime)
        endDate.setHours(23, 59, 59, 999)
        params.end_time = Math.floor(endDate.getTime() / 1000)
      }

      const res = await api.getLandRecords(params)
      if (res.code === 200 && res.data) {
        const list = (res.data.list || []).map(item => ({
          ...item,
          timeText: this.formatTime(item.attack_time),
          posText: this.formatPos(item.land_pos)
        }))
        this.setData({
          list: page === 1 ? list : [...this.data.list, ...list],
          total: res.data.total || 0,
          hasMore: list.length >= pageSize,
          loading: false
        })
      } else {
        this.setData({ loading: false, hasMore: false })
      }
    } catch (err) {
      console.error('获取翻地记录失败:', err)
      this.setData({ loading: false, hasMore: false })
      wx.showToast({ title: '加载失败', icon: 'none' })
    }
  },

  async loadMore() {
    this.setData({ page: this.data.page + 1 })
    await this.loadRecords()
  },

  formatTime(timestamp) {
    if (!timestamp) return ''
    const date = new Date(timestamp * 1000)
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
  },

  formatPos(pos) {
    if (!pos) return ''
    const str = String(pos)
    if (str.length >= 4) {
      return `${str.slice(0, -4)},${parseInt(str.slice(-4))}`
    }
    return pos
  }
})
