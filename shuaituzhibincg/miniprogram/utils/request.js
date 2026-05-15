/**
 * 网络请求封装 - 根据API文档完整实现
 */
const app = getApp()

/**
 * 发起网络请求
 * @param {Object} options 请求配置
 * @param {string} options.url 请求地址（相对路径）
 * @param {string} options.method 请求方法
 * @param {Object} options.data 请求数据
 * @param {boolean} options.needAuth 是否需要认证
 * @param {boolean} options.needDb 是否需要数据库ID
 */
function request(options) {
  const {
    url,
    method = 'GET',
    data = {},
    needAuth = true,
    needDb = false
  } = options

  return new Promise((resolve, reject) => {
    // 检查是否需要认证
    if (needAuth && !app.globalData.sessionId) {
      if (!app.globalData._loggingOut) {
        wx.reLaunch({
          url: '/pages/login/login'
        })
      }
      reject(new Error('未登录'))
      return
    }

    if (needAuth && app.globalData.sessionValid === false) {
      if (!app.globalData._loggingOut) {
        app.logout()
      }
      reject(new Error('未授权'))
      return
    }

    if (needAuth && app.globalData.sessionValidating) {
      reject(new Error('正在验证登录状态'))
      return
    }

    // 检查是否需要选择数据库
    if (needDb && !app.globalData.databaseId) {
      wx.showModal({
        title: '提示',
        content: '请先选择数据库',
        showCancel: false,
        success: () => {
          wx.redirectTo({
            url: '/pages/database/database'
          })
        }
      })
      reject(new Error('请先选择数据库'))
      return
    }

    // 构建完整URL
    let fullUrl = url.startsWith('http') 
      ? url 
      : `${app.globalData.apiBaseUrl}${url}`
    
    // 添加时间戳防止HTTP缓存（仅GET请求）
    if (method === 'GET') {
      const separator = fullUrl.includes('?') ? '&' : '?'
      fullUrl = `${fullUrl}${separator}_t=${Date.now()}`
    }

    // 构建请求头
    const header = {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Cookie': `session_id=${app.globalData.sessionId || ''}`,
      'X-Session-ID': app.globalData.sessionId || ''
    }

    // 添加数据库ID参数（根据API文档，数据库ID通过db_id参数传递）
    if (needDb && app.globalData.databaseId) {
      data.db_id = app.globalData.databaseId
    }

    wx.request({
      url: fullUrl,
      method,
      data,
      header,
      timeout: 180000, // 设置超时时间为180秒（3分钟）
      success(res) {
        if (res.statusCode === 200) {
          if (res.data.code === 200) {
            resolve(res.data)
          } else if (res.data.code === 401) {
            app.globalData.sessionValid = false
            if (!app.globalData._loggingOut) {
              app.logout()
            }
            reject(new Error(res.data.msg || res.data.message || '未授权'))
          } else if (res.data.code === 403) {
            // 无权限
            wx.showToast({
              title: res.data.msg || res.data.message || '无权限操作',
              icon: 'none',
              duration: 2000
            })
            reject(new Error(res.data.msg || res.data.message || '无权限'))
          } else if (res.data.code === 404) {
            // 资源不存在
            wx.showToast({
              title: res.data.msg || res.data.message || '资源不存在',
              icon: 'none',
              duration: 2000
            })
            reject(new Error(res.data.msg || res.data.message || '资源不存在'))
          } else if (res.data.code === 400 && needDb) {
            var errMsg = res.data.msg || res.data.message || '请求失败'
            if (errMsg.indexOf('数据库') !== -1 || errMsg.indexOf('选择数据库') !== -1) {
              wx.showModal({
                title: '数据库错误',
                content: errMsg,
                confirmText: '重新选择',
                success: function(modalRes) {
                  if (modalRes.confirm) {
                    wx.redirectTo({
                      url: '/pages/database/database'
                    })
                  }
                }
              })
            } else {
              wx.showToast({
                title: errMsg,
                icon: 'none',
                duration: 2000
              })
            }
            reject(new Error(errMsg))
          } else {
            // 其他错误
            wx.showToast({
              title: res.data.msg || res.data.message || '请求失败',
              icon: 'none',
              duration: 2000
            })
            reject(new Error(res.data.msg || res.data.message || '请求失败'))
          }
        } else if (res.statusCode === 401) {
          app.globalData.sessionValid = false
          if (!app.globalData._loggingOut) {
            app.logout()
          }
          reject(new Error('未授权'))
        } else if (res.statusCode === 403) {
          // HTTP层无权限
          wx.showToast({
            title: '无权限操作',
            icon: 'none',
            duration: 2000
          })
          reject(new Error('无权限'))
        } else if (res.statusCode === 404) {
          // HTTP层资源不存在
          wx.showToast({
            title: '接口不存在',
            icon: 'none',
            duration: 2000
          })
          reject(new Error('接口不存在'))
        } else {
          // 其他HTTP错误
          wx.showToast({
            title: `网络错误：${res.statusCode}`,
            icon: 'none',
            duration: 2000
          })
          reject(new Error(`网络错误：${res.statusCode}`))
        }
      },
      fail(err) {
        // 网络错误
        wx.showToast({
          title: '网络连接失败',
          icon: 'none',
          duration: 2000
        })
        reject(err)
      }
    })
  })
}

/**
 * GET请求
 */
function get(url, data = {}, needAuth = true, needDb = false) {
  return request({
    url,
    method: 'GET',
    data,
    needAuth,
    needDb
  })
}

/**
 * POST请求
 */
function post(url, data = {}, needAuth = true, needDb = false) {
  return request({
    url,
    method: 'POST',
    data,
    needAuth,
    needDb
  })
}

/**
 * PUT请求
 */
function put(url, data = {}, needAuth = true, needDb = false) {
  return request({
    url,
    method: 'PUT',
    data,
    needAuth,
    needDb
  })
}

/**
 * DELETE请求
 */
function del(url, data = {}, needAuth = true, needDb = false) {
  return request({
    url,
    method: 'DELETE',
    data,
    needAuth,
    needDb
  })
}

/**
 * 上传文件
 */
function upload(url, filePath, name = 'file', formData = {}) {
  return new Promise((resolve, reject) => {
    if (!app.globalData.sessionId) {
      wx.reLaunch({
        url: '/pages/login/login'
      })
      reject(new Error('未登录'))
      return
    }

    const fullUrl = url.startsWith('http')
      ? url
      : `${app.globalData.apiBaseUrl}${url}`

    wx.uploadFile({
      url: fullUrl,
      filePath,
      name,
      formData,
      header: {
        'Cookie': `session_id=${app.globalData.sessionId}`,
        'X-Session-ID': app.globalData.sessionId
      },
      success(res) {
        const data = JSON.parse(res.data)
        if (data.code === 200) {
          resolve(data)
        } else {
          wx.showToast({
            title: data.message || '上传失败',
            icon: 'none'
          })
          reject(new Error(data.message))
        }
      },
      fail(err) {
        wx.showToast({
          title: '上传失败',
          icon: 'none'
        })
        reject(err)
      }
    })
  })
}

module.exports = {
  request,
  get,
  post,
  put,
  del,
  upload
}
