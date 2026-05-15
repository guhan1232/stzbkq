import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { getUserInfo, login, logout } from '@/api/auth'

export const useUserStore = defineStore('user', () => {
  const userInfo = ref(null)
  const sessionId = ref(localStorage.getItem('session_id') || '')

  const isLoggedIn = computed(() => !!sessionId.value)
  const isAdmin = computed(() => userInfo.value?.role === 'admin')

  const setSessionId = (newSessionId) => {
    sessionId.value = newSessionId
    if (newSessionId) {
      localStorage.setItem('session_id', newSessionId)
    } else {
      localStorage.removeItem('session_id')
    }
  }

  const setUserInfo = (user) => {
    userInfo.value = user
  }

  const handleLogin = async (username, password) => {
    try {
      const res = await login({ username, password })
      if (res.code === 200 && res.data) {
        // 后端返回 session_id，同时通过 cookie 设置
        if (res.data.session_id) {
          setSessionId(res.data.session_id)
        }
        if (res.data.user) {
          setUserInfo(res.data.user)
        }
        return { success: true }
      }
      return { success: false, message: res.message || '登录失败' }
    } catch (error) {
      // 处理网络错误
      const errorMsg = error.response?.data?.message || error.message || '网络连接失败，请检查网络或API配置'
      return { success: false, message: errorMsg }
    }
  }

  const handleLogout = async () => {
    try {
      await logout()
    } catch (e) {
      // 忽略登出错误
    }
    setSessionId('')
    setUserInfo(null)
  }

  const fetchUserInfo = async () => {
    if (!sessionId.value) return
    try {
      const res = await getUserInfo()
      if (res.code === 200 && res.data) {
        setUserInfo(res.data)
      }
    } catch (e) {
      // 获取用户信息失败，清除session
      setSessionId('')
      setUserInfo(null)
    }
  }

  // 初始化时获取用户信息
  if (sessionId.value) {
    fetchUserInfo()
  }

  return {
    userInfo,
    sessionId,
    isLoggedIn,
    isAdmin,
    setSessionId,
    setUserInfo,
    handleLogin,
    handleLogout,
    fetchUserInfo
  }
})
