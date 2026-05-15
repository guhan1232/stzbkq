Component({
  /**
   * 组件的属性列表
   */
  properties: {
    // 任务数据对象
    task: {
      type: Object,
      value: {},
      observer(newVal) {
        if (newVal && newVal.time) {
          this._formatTaskInfo()
        }
      }
    },
    // 是否显示进度条
    showProgress: {
      type: Boolean,
      value: false
    },
    // 是否可点击
    clickable: {
      type: Boolean,
      value: true
    },
    // 紧凑模式
    compact: {
      type: Boolean,
      value: false
    }
  },

  /**
   * 组件的初始数据
   */
  data: {
    formattedTime: '',
    statusClass: '',
    statusText: '',
    timeDiffText: ''
  },

  /**
   * 组件的方法列表
   */
  methods: {
    // 格式化任务信息
    _formatTaskInfo() {
      const task = this.data.task
      if (!task || !task.time) return

      const now = Date.now() / 1000
      const timeDiff = now - task.time
      
      // 格式化时间
      const date = new Date(task.time * 1000)
      const month = String(date.getMonth() + 1).padStart(2, '0')
      const day = String(date.getDate()).padStart(2, '0')
      const hours = String(date.getHours()).padStart(2, '0')
      const minutes = String(date.getMinutes()).padStart(2, '0')
      const formattedTime = `${month}-${day} ${hours}:${minutes}`

      // 判断状态
      let statusClass = 'warning'
      let statusText = '进行中'
      let timeDiffText = ''

      if (timeDiff < 0) {
        statusText = '未开始'
        statusClass = 'success'
        // 计算倒计时
        const absDiff = Math.abs(timeDiff)
        const days = Math.floor(absDiff / 86400)
        const hours = Math.floor((absDiff % 86400) / 3600)
        const minutes = Math.floor((absDiff % 3600) / 60)
        
        if (days > 0) {
          timeDiffText = `${days}天${hours}小时后`
        } else if (hours > 0) {
          timeDiffText = `${hours}小时${minutes}分钟后`
        } else {
          timeDiffText = `${minutes}分钟后`
        }
      } else if (timeDiff > 86400) {
        statusText = '已结束'
        statusClass = 'error'
        const days = Math.floor(timeDiff / 86400)
        timeDiffText = `${days}天前`
      } else if (timeDiff > 3600) {
        const hours = Math.floor(timeDiff / 3600)
        timeDiffText = `${hours}小时前`
      } else if (timeDiff > 60) {
        const minutes = Math.floor(timeDiff / 60)
        timeDiffText = `${minutes}分钟前`
      } else {
        timeDiffText = '刚刚'
      }

      this.setData({
        formattedTime,
        statusClass,
        statusText,
        timeDiffText
      })
    },

    // 点击事件
    onTap() {
      if (this.data.clickable) {
        const task = this.data.task
        console.log('[TaskCard] ========== onTap 被调用 ==========')
        console.log('[TaskCard] task 对象:', task)
        console.log('[TaskCard] task.id:', task?.id)
        console.log('[TaskCard] task 类型:', typeof task)
        console.log('[TaskCard] task 的所有字段:', Object.keys(task || {}))
        console.log('[TaskCard] JSON.stringify(task):', JSON.stringify(task))
        
        if (!task || !task.id) {
          console.error('[TaskCard] ❌ task对象无效或缺少id字段')
          console.error('[TaskCard] task:', JSON.stringify(task))
          console.error('[TaskCard] task.id:', task?.id)
          return
        }
        
        console.log('[TaskCard] ✅ 触发 tap 事件, task.id:', task.id)
        this.triggerEvent('tap', { task: task })
      }
    },

    // 长按事件
    onLongPress() {
      this.triggerEvent('longpress', { task: this.data.task })
    }
  }
})
