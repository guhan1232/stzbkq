Component({
  /**
   * 组件的属性列表
   */
  properties: {
    // 骨架屏类型：card / list / stat / profile
    type: {
      type: String,
      value: 'card'
    },
    // 显示数量（用于列表）
    count: {
      type: Number,
      value: 3
    }
  },

  /**
   * 组件的初始数据
   */
  data: {
    items: []
  },

  /**
   * 生命周期函数
   */
  lifetimes: {
    attached() {
      this._generateItems()
    }
  },

  /**
   * 组件的方法列表
   */
  methods: {
    _generateItems() {
      const items = Array.from({ length: this.data.count }, (_, i) => i)
      this.setData({ items })
    }
  }
})
