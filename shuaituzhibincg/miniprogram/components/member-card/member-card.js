Component({
  /**
   * 组件的属性列表
   */
  properties: {
    // 成员数据对象
    member: {
      type: Object,
      value: {}
    },
    // 是否显示统计数据
    showStats: {
      type: Boolean,
      value: false
    },
    // 变体样式：default / compact / detailed
    variant: {
      type: String,
      value: 'default'
    }
  },

  /**
   * 组件的初始数据
   */
  data: {
    roleText: '',
    roleClass: '',
    memberNameFirstChar: '?'
  },

  /**
   * 生命周期函数
   */
  lifetimes: {
    attached() {
      this._formatRoleInfo()
    }
  },

  /**
   * 组件的方法列表
   */
  methods: {
    // 格式化角色信息
    _formatRoleInfo() {
      const member = this.data.member
      if (!member) return

      let roleText = '普通成员'
      let roleClass = 'normal'

      switch (member.role || member.position) {
        case '盟主':
        case 'leader':
          roleText = '盟主'
          roleClass = 'leader'
          break
        case '副盟主':
        case 'co-leader':
          roleText = '副盟主'
          roleClass = 'co-leader'
          break
        case '官员':
        case 'officer':
          roleText = '官员'
          roleClass = 'officer'
          break
        default:
          roleText = '成员'
          roleClass = 'normal'
      }

      // 获取成员名称首字符
      const name = member.name || '?'
      const memberNameFirstChar = name.charAt(0)

      this.setData({ 
        roleText, 
        roleClass,
        memberNameFirstChar
      })
    },

    // 点击事件
    onTap() {
      this.triggerEvent('tap', { member: this.data.member })
    },

    // 头像加载失败
    onAvatarError() {
      this.setData({
        avatarError: true
      })
    }
  }
})
