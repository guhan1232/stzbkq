Component({
  /**
   * 组件的属性列表
   */
  properties: {
    // 战报数据对象
    report: {
      type: Object,
      value: {}
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
    resultText: '',
    resultClass: '',
    formattedTime: ''
  },

  /**
   * 生命周期函数
   */
  lifetimes: {
    attached() {
      this._formatReportInfo()
    }
  },

  /**
   * 组件的方法列表
   */
  methods: {
    // 格式化战报信息
    _formatReportInfo() {
      const report = this.data.report
      if (!report) return

      // 判断战报结果
      let resultText = '未知'
      let resultClass = 'unknown'

      if (report.result === 'win' || report.win) {
        resultText = '胜利'
        resultClass = 'win'
      } else if (report.result === 'lose' || report.lose) {
        resultText = '失败'
        resultClass = 'lose'
      } else if (report.result === 'draw') {
        resultText = '平局'
        resultClass = 'draw'
      }

      // 格式化时间
      let formattedTime = ''
      if (report.time) {
        const date = new Date(report.time * 1000)
        const month = String(date.getMonth() + 1).padStart(2, '0')
        const day = String(date.getDate()).padStart(2, '0')
        const hours = String(date.getHours()).padStart(2, '0')
        const minutes = String(date.getMinutes()).padStart(2, '0')
        formattedTime = `${month}-${day} ${hours}:${minutes}`
      }

      this.setData({
        resultText,
        resultClass,
        formattedTime
      })
    },

    // 点击事件
    onTap() {
      this.triggerEvent('tap', { report: this.data.report })
    }
  }
})
