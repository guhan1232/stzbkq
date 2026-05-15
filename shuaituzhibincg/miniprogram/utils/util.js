/**
 * 工具函数
 */

/**
 * 格式化时间戳
 * @param {number} timestamp 时间戳（秒）
 * @param {string} format 格式（默认：yyyy-MM-dd HH:mm:ss）
 */
function formatTime(timestamp, format = 'yyyy-MM-dd HH:mm:ss') {
  if (!timestamp) return ''
  
  const date = new Date(timestamp * 1000)
  const year = date.getFullYear()
  const month = date.getMonth() + 1
  const day = date.getDate()
  const hour = date.getHours()
  const minute = date.getMinutes()
  const second = date.getSeconds()

  const formatNumber = n => {
    n = n.toString()
    return n[1] ? n : `0${n}`
  }

  return format
    .replace('yyyy', year)
    .replace('MM', formatNumber(month))
    .replace('dd', formatNumber(day))
    .replace('HH', formatNumber(hour))
    .replace('mm', formatNumber(minute))
    .replace('ss', formatNumber(second))
}

/**
 * 格式化坐标
 * @param {number} pos 坐标整数
 */
function formatPos(pos) {
  if (!pos) return ''
  const posStr = pos.toString()
  if (posStr.length < 4) return posStr
  
  const x = posStr.substring(0, posStr.length - 4)
  const y = posStr.substring(posStr.length - 4)
  // 去掉Y坐标的前导零，保持用户输入原样
  return `${x},${parseInt(y, 10)}`
}

/**
 * 显示加载中
 */
function showLoading(title = '加载中...') {
  wx.showLoading({
    title,
    mask: true
  })
}

/**
 * 隐藏加载中
 */
function hideLoading() {
  wx.hideLoading()
}

/**
 * 显示成功提示
 */
function showSuccess(title) {
  wx.showToast({
    title,
    icon: 'success',
    duration: 2000
  })
}

/**
 * 显示错误提示
 */
function showError(title) {
  wx.showToast({
    title,
    icon: 'none',
    duration: 2000
  })
}

/**
 * 显示确认对话框
 */
function showConfirm(content, title = '提示') {
  return new Promise((resolve, reject) => {
    wx.showModal({
      title,
      content,
      success(res) {
        if (res.confirm) {
          resolve(true)
        } else {
          resolve(false)
        }
      },
      fail: reject
    })
  })
}

/**
 * 页面跳转
 */
function navigateTo(url) {
  wx.navigateTo({ url })
}

/**
 * 页面重定向
 */
function redirectTo(url) {
  wx.redirectTo({ url })
}

/**
 * 返回上一页
 */
function navigateBack(delta = 1) {
  wx.navigateBack({ delta })
}

/**
 * 切换Tab
 */
function switchTab(url) {
  wx.switchTab({ url })
}

/**
 * 防抖函数
 */
function debounce(fn, delay = 500) {
  let timer = null
  return function (...args) {
    if (timer) clearTimeout(timer)
    timer = setTimeout(() => {
      fn.apply(this, args)
    }, delay)
  }
}

/**
 * 节流函数
 */
function throttle(fn, delay = 500) {
  let last = 0
  return function (...args) {
    const now = Date.now()
    if (now - last > delay) {
      last = now
      fn.apply(this, args)
    }
  }
}

/**
 * 深拷贝
 */
function deepClone(obj) {
  if (obj === null || typeof obj !== 'object') return obj
  
  const clone = Array.isArray(obj) ? [] : {}
  for (const key in obj) {
    if (obj.hasOwnProperty(key)) {
      clone[key] = deepClone(obj[key])
    }
  }
  return clone
}

/**
 * 检查是否为管理员
 */
function isAdmin() {
  const app = getApp()
  return app.globalData.userInfo && app.globalData.userInfo.role === 'admin'
}

/**
 * 检查是否已登录
 */
function isLoggedIn() {
  const app = getApp()
  return !!app.globalData.sessionId
}

/**
 * 检查是否已选择数据库
 */
function hasDatabase() {
  const app = getApp()
  return !!app.globalData.databaseId
}

module.exports = {
  formatTime,
  formatPos,
  showLoading,
  hideLoading,
  showSuccess,
  showError,
  showConfirm,
  navigateTo,
  redirectTo,
  navigateBack,
  switchTab,
  debounce,
  throttle,
  deepClone,
  isAdmin,
  isLoggedIn,
  hasDatabase
}
