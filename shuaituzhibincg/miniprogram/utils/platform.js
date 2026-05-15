/**
 * 多端平台适配工具
 * 用于统一不同平台的API调用
 */

/**
 * 获取当前运行平台
 * @returns {string} 'wechat' | 'android' | 'ios' | 'harmonyos' | 'web'
 */
function getPlatform() {
  // #ifdef MP-WEIXIN
  return 'wechat'
  // #endif
  
  // #ifdef APP-ANDROID
  return 'android'
  // #endif
  
  // #ifdef APP-IOS
  return 'ios'
  // #endif
  
  // #ifdef APP-HARMONY
  return 'harmonyos'
  // #endif
  
  // 运行时判断
  if (typeof wx !== 'undefined' && wx.getSystemInfoSync) {
    const systemInfo = wx.getSystemInfoSync()
    if (systemInfo.platform === 'android') {
      return 'android'
    } else if (systemInfo.platform === 'ios') {
      return 'ios'
    }
    return 'wechat'
  }
  
  return 'unknown'
}

/**
 * 判断是否为微信小程序环境
 */
function isWechatMiniProgram() {
  return typeof wx !== 'undefined' && wx.getSystemInfoSync
}

/**
 * 判断是否为App环境（Android/iOS）
 */
function isApp() {
  const platform = getPlatform()
  return platform === 'android' || platform === 'ios' || platform === 'harmonyos'
}

/**
 * 统一的存储API
 */
const storage = {
  /**
   * 同步获取存储数据
   */
  getStorageSync(key) {
    try {
      if (isWechatMiniProgram()) {
        return wx.getStorageSync(key)
      }
      // App环境下可能需要不同的处理
      return null
    } catch (e) {
      console.error('Storage get error:', e)
      return null
    }
  },

  /**
   * 同步设置存储数据
   */
  setStorageSync(key, value) {
    try {
      if (isWechatMiniProgram()) {
        wx.setStorageSync(key, value)
      }
    } catch (e) {
      console.error('Storage set error:', e)
    }
  },

  /**
   * 同步移除存储数据
   */
  removeStorageSync(key) {
    try {
      if (isWechatMiniProgram()) {
        wx.removeStorageSync(key)
      }
    } catch (e) {
      console.error('Storage remove error:', e)
    }
  },

  /**
   * 清空所有存储
   */
  clearStorageSync() {
    try {
      if (isWechatMiniProgram()) {
        wx.clearStorageSync()
      }
    } catch (e) {
      console.error('Storage clear error:', e)
    }
  }
}

/**
 * 统一的路由API
 */
const router = {
  /**
   * 保留当前页面，跳转到应用内的某个页面
   */
  navigateTo(url) {
    if (isWechatMiniProgram()) {
      wx.navigateTo({ url })
    }
  },

  /**
   * 关闭当前页面，跳转到应用内的某个页面
   */
  redirectTo(url) {
    if (isWechatMiniProgram()) {
      wx.redirectTo({ url })
    }
  },

  /**
   * 关闭所有页面，打开到应用内的某个页面
   */
  reLaunch(url) {
    if (isWechatMiniProgram()) {
      wx.reLaunch({ url })
    }
  },

  /**
   * 跳转到 tabBar 页面
   */
  switchTab(url) {
    if (isWechatMiniProgram()) {
      wx.switchTab({ url })
    }
  },

  /**
   * 返回上一页面或多级页面
   */
  navigateBack(delta = 1) {
    if (isWechatMiniProgram()) {
      wx.navigateBack({ delta })
    }
  }
}

/**
 * 统一的交互反馈API
 */
const feedback = {
  /**
   * 显示消息提示框
   */
  showToast(options) {
    if (isWechatMiniProgram()) {
      wx.showToast(options)
    }
  },

  /**
   * 隐藏消息提示框
   */
  hideToast() {
    if (isWechatMiniProgram()) {
      wx.hideToast()
    }
  },

  /**
   * 显示 loading 提示框
   */
  showLoading(options) {
    if (isWechatMiniProgram()) {
      wx.showLoading(options)
    }
  },

  /**
   * 隐藏 loading 提示框
   */
  hideLoading() {
    if (isWechatMiniProgram()) {
      wx.hideLoading()
    }
  },

  /**
   * 显示模态对话框
   */
  showModal(options) {
    if (isWechatMiniProgram()) {
      wx.showModal(options)
    }
  }
}

/**
 * 统一的网络请求API
 */
const network = {
  /**
   * 发起网络请求
   */
  request(options) {
    if (isWechatMiniProgram()) {
      return new Promise((resolve, reject) => {
        wx.request({
          ...options,
          success: (res) => {
            if (res.statusCode === 200) {
              resolve(res.data)
            } else {
              reject(new Error(`HTTP ${res.statusCode}`))
            }
          },
          fail: reject
        })
      })
    }
    return Promise.reject(new Error('Network API not available'))
  },

  /**
   * 上传文件
   */
  uploadFile(options) {
    if (isWechatMiniProgram()) {
      return new Promise((resolve, reject) => {
        wx.uploadFile({
          ...options,
          success: (res) => {
            if (res.statusCode === 200) {
              resolve(JSON.parse(res.data))
            } else {
              reject(new Error(`Upload failed: ${res.statusCode}`))
            }
          },
          fail: reject
        })
      })
    }
    return Promise.reject(new Error('Upload API not available'))
  }
}

/**
 * 系统信息API
 */
const system = {
  /**
   * 获取系统信息
   */
  getSystemInfoSync() {
    if (isWechatMiniProgram()) {
      return wx.getSystemInfoSync()
    }
    return null
  },

  /**
   * 获取设备信息
   */
  getDeviceInfo() {
    const info = this.getSystemInfoSync()
    if (!info) return {}
    
    return {
      platform: info.platform,
      model: info.model,
      system: info.system,
      version: info.version,
      SDKVersion: info.SDKVersion,
      brand: info.brand
    }
  }
}

module.exports = {
  getPlatform,
  isWechatMiniProgram,
  isApp,
  storage,
  router,
  feedback,
  network,
  system
}
