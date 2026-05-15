/**
 * 登录页面 - Vant Weapp
 */
const api = require('../../utils/api')
const app = getApp()
import Toast from '@vant/weapp/toast/toast'

Page({
  data: {
    username: '',
    password: '',
    showPassword: false,
    loading: false,
    // 注册相关
    showRegister: false,
    regUsername: '',
    regPassword: '',
    regPassword2: '',
    regNickname: '',
    regLoading: false
  },

  onLoad() {
    // 检查是否已登录
    if (app.globalData.sessionId) {
      wx.switchTab({ url: '/pages/index/index' })
    }
  },

  // 输入事件 - 原生input的bindinput事件
  onUsernameInput(e) {
    this.setData({ username: e.detail.value })
  },
  onPasswordInput(e) {
    this.setData({ password: e.detail.value })
  },
  togglePassword() {
    this.setData({ showPassword: !this.data.showPassword })
  },

  // 登录
  async onLogin() {
    console.log('[Login] onLogin 被点击')
    const { username, password, loading } = this.data
    console.log('[Login] 当前状态 - username:', username, 'password:', password, 'loading:', loading)
    
    if (loading) {
      console.log('[Login] 正在加载中，忽略点击')
      return
    }
    
    if (!username || !username.trim()) {
      console.log('[Login] 用户名为空')
      wx.showToast({ title: '请输入用户名', icon: 'none' })
      return
    }
    if (!password) {
      console.log('[Login] 密码为空')
      wx.showToast({ title: '请输入密码', icon: 'none' })
      return
    }

    console.log('[Login] 开始登录，用户名:', username.trim())
    this.setData({ loading: true })
    try {
      const res = await api.login(username.trim(), password)
      console.log('[Login] 登录 API 响应:', res)
      
      if (res.code === 200 && res.data) {
        app.login(res.data.session_id, res.data.user)
        wx.showToast({ title: '登录成功', icon: 'success' })
        
        // 跳转到数据库选择页
        setTimeout(() => {
          wx.redirectTo({ url: '/pages/database/database' })
        }, 1000)
      } else {
        throw new Error(res.message || '登录失败')
      }
    } catch (err) {
      console.error('[Login] 登录失败:', err)
      wx.showToast({ title: err.message || '登录失败', icon: 'none' })
    } finally {
      this.setData({ loading: false })
      console.log('[Login] 登录流程结束')
    }
  },

  // 显示注册弹窗
  showRegisterDialog() {
    this.setData({ showRegister: true })
  },
  hideRegister() {
    this.setData({ showRegister: false })
  },

  // 注册输入 - 原生input的bindinput事件
  onRegUsernameInput(e) { this.setData({ regUsername: e.detail.value }) },
  onRegPasswordInput(e) { this.setData({ regPassword: e.detail.value }) },
  onRegPassword2Input(e) { this.setData({ regPassword2: e.detail.value }) },
  onRegNicknameInput(e) { this.setData({ regNickname: e.detail.value }) },

  // 注册
  async onRegister() {
    const { regUsername, regPassword, regPassword2, regNickname, regLoading } = this.data
    if (regLoading) return

    if (!regUsername || !regUsername.trim()) {
      wx.showToast({ title: '请输入用户名', icon: 'none' })
      return
    }
    if (!regPassword || regPassword.length < 6) {
      wx.showToast({ title: '密码至少6位', icon: 'none' })
      return
    }
    if (regPassword !== regPassword2) {
      wx.showToast({ title: '两次密码不一致', icon: 'none' })
      return
    }

    this.setData({ regLoading: true })
    try {
      const res = await api.register(regUsername.trim(), regPassword, regNickname ? regNickname.trim() : regUsername.trim())
      if (res.code === 200 && res.data) {
        app.login(res.data.session_id, res.data.user)
        wx.showToast({ title: '注册成功', icon: 'success' })
        this.hideRegister()
        
        setTimeout(() => {
          wx.redirectTo({ url: '/pages/database/database' })
        }, 1000)
      } else {
        throw new Error(res.message || '注册失败')
      }
    } catch (err) {
      console.error('注册失败:', err)
      wx.showToast({ title: err.message || '注册失败', icon: 'none' })
    } finally {
      this.setData({ regLoading: false })
    }
  }
})
