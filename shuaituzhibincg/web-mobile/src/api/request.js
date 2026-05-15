import axios from 'axios'
import { ElMessage } from 'element-plus'

// 动态获取API基础URL
// 优先级: window.__API_BASE_URL__ > 环境变量 > 相对路径
const getBaseURL = () => {
  // 1. 检查运行时注入的全局变量（CDN部署时可通过此配置API地址）
  if (typeof window !== 'undefined' && window.__API_BASE_URL__) {
    return window.__API_BASE_URL__
  }
  // 2. 检查环境变量（构建时注入）
  if (import.meta.env.VITE_API_BASE_URL) {
    return import.meta.env.VITE_API_BASE_URL
  }
  // 3. 默认使用相对路径（同域部署）
  return '/v1'
}

const baseURL = getBaseURL()

const request = axios.create({
  baseURL,
  timeout: 30000,
  // 同域部署时携带Cookie，CDN跨域时也需要携带
  withCredentials: true
})

// 请求拦截器
request.interceptors.request.use(
  config => {
    // 使用与后端一致的 session_id cookie 认证方式
    // 同时支持通过 X-Session-ID header 传递（用于跨域场景）
    const sessionId = localStorage.getItem('session_id')
    if (sessionId) {
      config.headers['X-Session-ID'] = sessionId
    }
    return config
  },
  error => Promise.reject(error)
)

// 响应拦截器
request.interceptors.response.use(
  response => response.data,
  error => {
    // 处理CDN跨域等网络错误
    if (!error.response) {
      // 网络错误或CORS错误
      if (error.message.includes('Network Error') || error.message.includes('CORS')) {
        ElMessage.error('网络连接失败，请检查API地址配置或网络连接')
      } else if (error.code === 'ECONNABORTED') {
        ElMessage.error('请求超时，请稍后重试')
      } else {
        ElMessage.error(error.message || '网络请求失败')
      }
      return Promise.reject(error)
    }
    
    // 处理HTTP错误
    const status = error.response.status
    const message = error.response?.data?.message || error.message || '请求失败'
    
    if (status === 401) {
      // 未授权，清除session并跳转登录
      localStorage.removeItem('session_id')
      window.location.href = '/m/#/login'
    } else if (status === 403) {
      ElMessage.error('没有权限访问')
    } else if (status === 404) {
      ElMessage.error('请求的资源不存在')
    } else if (status >= 500) {
      ElMessage.error('服务器错误，请稍后重试')
    } else {
      ElMessage.error(message)
    }
    
    return Promise.reject(error)
  }
)

export default request
