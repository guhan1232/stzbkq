Component({
  /**
   * 组件的属性列表
   */
  properties: {
    // 筛选项列表
    filters: {
      type: Array,
      value: [],
      observer() {
        this._updateActiveIndex()
      }
    },
    // 当前激活的筛选索引
    activeFilter: {
      type: Number,
      value: 0,
      observer() {
        this._updateActiveIndex()
      }
    },
    // 是否可滚动
    scrollable: {
      type: Boolean,
      value: true
    }
  },

  /**
   * 组件的初始数据
   */
  data: {
    activeIndex: 0
  },

  /**
   * 生命周期函数
   */
  lifetimes: {
    attached() {
      this._updateActiveIndex()
    }
  },

  /**
   * 组件的方法列表
   */
  methods: {
    _updateActiveIndex() {
      this.setData({
        activeIndex: this.data.activeFilter
      })
    },

    // 点击筛选项
    onFilterTap(e) {
      const index = e.currentTarget.dataset.index
      if (index === this.data.activeIndex) return

      this.setData({
        activeIndex: index
      })

      this.triggerEvent('change', {
        index,
        filter: this.data.filters[index]
      })
    }
  }
})
