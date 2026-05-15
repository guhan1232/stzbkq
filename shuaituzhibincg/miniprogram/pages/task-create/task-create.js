// 创建任务页面逻辑
const api = require('../../utils/api')
const util = require('../../utils/util')
const app = getApp()

Page({
  data: {
    formData: {
      name: '',
      startTime: null,
      startTimeStr: '',
      endTime: null,
      endTimeStr: '',
      posX: '',
      posY: '',
      targetUserNum: '',
      remark: ''
    },
    groups: [],
    selectedGroups: [],
    timeRange: [[], [], [], [], [], []],
    startTimeValue: [0, 0, 0, 0, 0, 0],
    endTimeValue: [0, 0, 0, 0, 0, 0],
    submitting: false
  },

  onLoad() {
    // 检查登录和数据库
    if (!app.requireLogin() || !app.requireDatabase()) {
      return
    }
    
    // 检查管理员权限
    if (!app.requireAdmin()) {
      setTimeout(() => {
        wx.navigateBack()
      }, 1500)
      return
    }
    
    this.initTimePicker()
    this.loadGroups()
  },

  // 初始化时间选择器
  initTimePicker() {
    const now = new Date()
    const year = now.getFullYear()
    const month = now.getMonth() + 1
    
    // 年份列表（当前年份到后年）
    const years = []
    for (let i = year; i <= year + 1; i++) {
      years.push(i + '年')
    }
    
    // 月份列表
    const months = []
    for (let i = 1; i <= 12; i++) {
      months.push(i + '月')
    }
    
    // 日期列表
    const days = []
    for (let i = 1; i <= 31; i++) {
      days.push(i + '日')
    }
    
    // 小时列表
    const hours = []
    for (let i = 0; i < 24; i++) {
      hours.push(i.toString().padStart(2, '0') + '时')
    }
    
    // 分钟列表
    const minutes = []
    for (let i = 0; i < 60; i += 5) {
      minutes.push(i.toString().padStart(2, '0') + '分')
    }
    
    // 秒列表
    const seconds = []
    for (let i = 0; i < 60; i += 5) {
      seconds.push(i.toString().padStart(2, '0') + '秒')
    }
    
    this.setData({
      timeRange: [years, months, days, hours, minutes, seconds],
      startTimeValue: [0, month - 1, now.getDate() - 1, now.getHours(), Math.round(now.getMinutes() / 5), Math.round(now.getSeconds() / 5)],
      endTimeValue: [0, month - 1, now.getDate() - 1, now.getHours() + 1, 0, 0]
    })
  },

  // 加载分组
  async loadGroups() {
    try {
      const res = await api.getTeamGroups()
      if (res.code === 200 && res.data) {
        // API返回的是字符串数组，转为对象数组
        const groups = (res.data || []).map(name => ({
          name: typeof name === 'string' ? name : (name.name || ''),
          checked: false
        }))
        this.setData({ groups })
      }
    } catch (err) {
      console.error('加载分组失败:', err)
    }
  },

  // 输入事件
  onInput(e) {
    const field = e.currentTarget.dataset.field
    this.setData({
      [`formData.${field}`]: e.detail.value
    })
  },

  // 时间选择器列变化
  onTimeColumnChange(e) {
    const { column, value } = e.detail
    // 这里简化处理，因为同时有两个时间选择器，实际应用中可能需要更复杂的处理
    // 主要是处理月份变化时更新日期
    if (column === 1) {
      const year = parseInt(this.data.timeRange[0][0])
      const month = value + 1
      const daysInMonth = new Date(year, month, 0).getDate()
      const days = []
      for (let i = 1; i <= daysInMonth; i++) {
        days.push(i + '日')
      }
      const timeRange = [...this.data.timeRange]
      timeRange[2] = days
      this.setData({ timeRange })
    }
  },

  // 开始时间选择完成
  onStartTimeChange(e) {
    const value = e.detail.value
    const year = parseInt(this.data.timeRange[0][value[0]])
    const month = parseInt(this.data.timeRange[1][value[1]])
    const day = parseInt(this.data.timeRange[2][value[2]])
    const hour = parseInt(this.data.timeRange[3][value[3]])
    const minute = parseInt(this.data.timeRange[4][value[4]])
    const second = parseInt(this.data.timeRange[5][value[5]])
    
    const date = new Date(year, month - 1, day, hour, minute, second)
    const timestamp = Math.floor(date.getTime() / 1000)
    const timeStr = `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')} ${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}:${second.toString().padStart(2, '0')}`
    
    this.setData({
      startTimeValue: value,
      'formData.startTime': timestamp,
      'formData.startTimeStr': timeStr
    })
  },

  // 结束时间选择完成
  onEndTimeChange(e) {
    const value = e.detail.value
    const year = parseInt(this.data.timeRange[0][value[0]])
    const month = parseInt(this.data.timeRange[1][value[1]])
    const day = parseInt(this.data.timeRange[2][value[2]])
    const hour = parseInt(this.data.timeRange[3][value[3]])
    const minute = parseInt(this.data.timeRange[4][value[4]])
    const second = parseInt(this.data.timeRange[5][value[5]])
    
    const date = new Date(year, month - 1, day, hour, minute, second)
    const timestamp = Math.floor(date.getTime() / 1000)
    const timeStr = `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')} ${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}:${second.toString().padStart(2, '0')}`
    
    this.setData({
      endTimeValue: value,
      'formData.endTime': timestamp,
      'formData.endTimeStr': timeStr
    })
  },

  // 切换分组选择
  onGroupToggle(e) {
    const id = e.currentTarget.dataset.id
    const groups = this.data.groups.map(item => {
      if (item.id === id || item.name === id) {
        return { ...item, checked: !item.checked }
      }
      return item
    })
    
    const selectedGroups = groups.filter(item => item.checked).map(item => item.name)
    
    this.setData({ groups, selectedGroups })
  },

  // 设置快捷时间
  setQuickTime(e) {
    const type = e.currentTarget.dataset.type || 'start'
    const minutes = parseInt(e.currentTarget.dataset.minutes)
    const date = new Date()
    date.setMinutes(date.getMinutes() + minutes)
    
    const year = date.getFullYear()
    const month = date.getMonth() + 1
    const day = date.getDate()
    const hour = date.getHours()
    const minute = Math.round(date.getMinutes() / 5) * 5
    const second = Math.round(date.getSeconds() / 5) * 5
    
    // 确保时间值在有效范围内
    const finalMinute = minute >= 60 ? 55 : minute
    const finalSecond = second >= 60 ? 55 : second
    
    const timestamp = Math.floor(date.getTime() / 1000)
    const timeStr = `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')} ${hour.toString().padStart(2, '0')}:${finalMinute.toString().padStart(2, '0')}:${finalSecond.toString().padStart(2, '0')}`
    
    // 计算时间选择器的value
    const years = this.data.timeRange[0]
    const months = this.data.timeRange[1]
    const days = this.data.timeRange[2]
    const hours = this.data.timeRange[3]
    const minutesList = this.data.timeRange[4]
    const secondsList = this.data.timeRange[5]
    
    const yearIndex = years.findIndex(y => y === year + '年')
    const monthIndex = months.findIndex(m => m === month + '月')
    const dayIndex = days.findIndex(d => d === day + '日')
    const hourIndex = hours.findIndex(h => h === hour.toString().padStart(2, '0') + '时')
    const minuteIndex = minutesList.findIndex(m => m === finalMinute.toString().padStart(2, '0') + '分')
    const secondIndex = secondsList.findIndex(s => s === finalSecond.toString().padStart(2, '0') + '秒')
    
    const timeValue = [yearIndex, monthIndex, dayIndex, hourIndex, minuteIndex, secondIndex]
    
    if (type === 'start') {
      this.setData({
        startTimeValue: timeValue,
        'formData.startTime': timestamp,
        'formData.startTimeStr': timeStr
      })
    } else {
      this.setData({
        endTimeValue: timeValue,
        'formData.endTime': timestamp,
        'formData.endTimeStr': timeStr
      })
    }
  },

  // 表单验证
  validateForm() {
    const { formData } = this.data
    
    if (!formData.name.trim()) {
      util.showError('请输入任务名称')
      return false
    }
    
    if (!formData.startTime) {
      util.showError('请选择开始时间')
      return false
    }
    
    if (!formData.endTime) {
      util.showError('请选择结束时间')
      return false
    }
    
    if (formData.startTime >= formData.endTime) {
      util.showError('开始时间必须早于结束时间')
      return false
    }
    
    if (!formData.posX || !formData.posY) {
      util.showError('请输入任务坐标')
      return false
    }
    
    if (!formData.targetUserNum) {
      util.showError('请输入目标人数')
      return false
    }
    
    return true
  },

  // 提交表单
  async onSubmit() {
    if (!this.validateForm()) return
    
    const { formData, selectedGroups } = this.data
    
    this.setData({ submitting: true })
    
    try {
      // 后端字段名：taskname, tasktime, taskpos[], targetgroup[]
      const targetGroups = selectedGroups.length > 0 ? selectedGroups : ['all']
      
      // 构建URL编码的表单字符串，确保数组参数格式正确
      const formParts = []
      formParts.push('taskname=' + encodeURIComponent(formData.name.trim()))
      formParts.push('tasktime=' + encodeURIComponent(formData.startTime))
      formParts.push('endtime=' + encodeURIComponent(formData.endTime))
      formParts.push('taskpos=' + encodeURIComponent(formData.posX.toString()))
      formParts.push('taskpos=' + encodeURIComponent(formData.posY.toString()))
      targetGroups.forEach(g => {
        formParts.push('targetgroup=' + encodeURIComponent(g))
      })
      const formStr = formParts.join('&')
      
      // 直接发送请求（绕过 api.createTask，因为需要自定义表单数据格式）
      const res = await new Promise((resolve, reject) => {
        wx.request({
          url: `${app.globalData.apiBaseUrl}/createTask`,
          method: 'POST',
          data: formStr,
          header: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Cookie': `session_id=${app.globalData.sessionId}`,
            'X-Session-ID': app.globalData.sessionId
          },
          success(res) {
            if (res.statusCode === 200) {
              if (res.data.code === 200) {
                resolve(res.data)
              } else if (res.data.code === 401) {
                app.logout()
                reject(new Error(res.data.msg || '未授权'))
              } else {
                reject(new Error(res.data.msg || '创建失败'))
              }
            } else {
              reject(new Error('网络错误：' + res.statusCode))
            }
          },
          fail(err) {
            reject(new Error('网络连接失败'))
          }
        })
      })
      
      util.showSuccess('创建成功')
      
      // 获取新创建的任务ID
      const newTaskId = res.data?.id
      console.log('[TaskCreate] 新任务ID:', newTaskId)
      
      setTimeout(() => {
        if (newTaskId) {
          // 如果有任务ID，直接跳转到详情页
          console.log('[TaskCreate] 跳转到任务详情页, taskId:', newTaskId)
          wx.redirectTo({
            url: `/pages/task-detail/task-detail?id=${newTaskId}`
          })
        } else {
          // 否则返回上一页
          console.log('[TaskCreate] 返回任务列表页')
          wx.navigateBack()
        }
      }, 1500)
    } catch (err) {
      console.error('创建任务失败:', err)
      util.showError(err.message || '创建失败')
    } finally {
      this.setData({ submitting: false })
    }
  }
})
