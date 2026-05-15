Component({
  properties: {
    title: {
      type: String,
      value: ''
    },
    value: {
      type: String,
      value: '0'
    },
    icon: {
      type: String,
      value: ''
    },
    color: {
      type: String,
      value: 'primary',
      observer(newVal) {
        this.setData({ colorClass: newVal })
      }
    },
    trend: {
      type: Number,
      value: 0
    },
    animated: {
      type: Boolean,
      value: false
    }
  },

  data: {
    colorClass: 'primary'
  },

  methods: {
    onTap() {
      this.triggerEvent('tap')
    }
  }
})
