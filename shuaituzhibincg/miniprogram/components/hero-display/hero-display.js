Component({
  /**
   * 组件的属性列表
   */
  properties: {
    // 武将数据对象
    hero: {
      type: Object,
      value: {}
    },
    // 是否显示技能
    showSkills: {
      type: Boolean,
      value: false
    },
    // 显示模式：card / compact / detailed
    mode: {
      type: String,
      value: 'card'
    }
  },

  /**
   * 组件的初始数据
   */
  data: {
    starIcons: [],
    heroNameFirstChar: '?',
    avatarError: false // 头像加载失败标志
  },

  /**
   * 生命周期函数
   */
  lifetimes: {
    attached() {
      this._formatHeroInfo()
    },
    // 监听 hero 属性变化
    observers: {
      'hero': function(hero) {
        if (hero) {
          this.setData({ avatarError: false })
          this._formatHeroInfo()
        }
      }
    }
  },

  /**
   * 组件的方法列表
   */
  methods: {
    _formatHeroInfo() {
      const hero = this.data.hero
      if (!hero) return

      // 生成星级图标数组
      const stars = hero.star || 0
      const starIcons = Array.from({ length: stars }, () => '⭐')
      
      // 获取武将名称首字符
      const name = hero.name || '?'
      const heroNameFirstChar = name.charAt(0)
      
      this.setData({ 
        starIcons,
        heroNameFirstChar
      })
    },

    // 点击事件
    onTap() {
      this.triggerEvent('tap', { hero: this.data.hero })
    },

    // 头像加载失败处理
    onAvatarError() {
      this.setData({
        avatarError: true
      })
    }
  }
})
