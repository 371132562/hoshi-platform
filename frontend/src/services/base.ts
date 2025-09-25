// 基于axios封装的请求模块
import { notification } from 'antd' // 导入 Ant Design 的 notification 组件
import axios from 'axios'
import { ErrorCode } from 'urbanization-backend/types/response.ts'

// 防抖变量，用于避免短期内重复弹出认证提示
let authNotificationShown = false
let authNotificationTimer: ReturnType<typeof setTimeout> | null = null

// 显示认证提示的函数，带防抖机制
const showAuthNotification = (message: string, description: string) => {
  if (authNotificationShown) {
    return // 如果已经显示过认证提示，则不再显示
  }

  // 设置防抖状态
  authNotificationShown = true

  // 显示通知
  notification.warning({
    message,
    description,
    onClose: () => {
      // 通知关闭后，延迟重置防抖状态，避免立即重置
      if (authNotificationTimer) {
        clearTimeout(authNotificationTimer)
      }
      authNotificationTimer = setTimeout(() => {
        authNotificationShown = false
        authNotificationTimer = null
      }, 3000) // 3秒内不重复显示认证提示
    }
  })

  // 自动重置防抖状态（作为备用方案）
  if (authNotificationTimer) {
    clearTimeout(authNotificationTimer)
  }
  authNotificationTimer = setTimeout(() => {
    authNotificationShown = false
    authNotificationTimer = null
  }, 5000) // 5秒后自动重置防抖状态
}

// 创建axios实例
const http = axios.create({
  baseURL:
    (import.meta.env.VITE_DEPLOY_PATH === '/' ? '' : import.meta.env.VITE_DEPLOY_PATH) +
    import.meta.env.VITE_API_BASE_URL, // API基础URL（从环境变量获取）
  timeout: 10000 // 请求超时时间（毫秒）
})

// 请求拦截器
http.interceptors.request.use(
  config => {
    // 自动携带token
    let token = null
    try {
      // 兼容Zustand persist的auth-storage结构
      const authPersist = JSON.parse(localStorage.getItem('auth-storage') || '{}')
      token = authPersist.state?.token || null
    } catch {
      // 忽略JSON解析错误，token保持为null
    }
    if (token) {
      config.headers = config.headers || {}
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  error => {
    notification.error({
      message: '错误',
      description: '网络请求失败，请稍后再试！'
    })
    return Promise.reject(error)
  }
)

// 响应拦截器
http.interceptors.response.use(
  response => {
    // 检查响应数据是否为Blob类型（文件下载）
    if (response.data instanceof Blob) {
      // 如果是文件流，则直接返回整个响应体，由调用方处理
      return response
    }

    // 处理响应数据
    const { status, data } = response
    const { code, msg } = data // 解构后端返回的 code, msg, data
    // 统一处理后端返回的成功状态（HTTP Status 200）
    if (status === 200) {
      if (code === ErrorCode.SUCCESS) {
        // 业务成功，直接返回后端 data 字段的数据
        return data
      } else {
        const deployPath = (import.meta.env.VITE_DEPLOY_PATH || '/').replace(/\/$/, '')
        const homePath = `${deployPath}/home`
        switch (code) {
          case ErrorCode.TOKEN_EXPIRED:
          case ErrorCode.UNAUTHORIZED:
            // 认证过期或未认证，使用防抖机制显示提示并清空本地 token 跳转到登录页
            showAuthNotification('认证提示', msg)
            localStorage.removeItem('auth-storage')
            if (window.location.pathname !== homePath) {
              window.location.href = homePath
            }
            break
          default:
            // 其他业务错误
            notification.error({
              message: '错误',
              description: msg
            })
            break
        }
        return Promise.reject(data)
      }
    } else {
      // 理论上，如果后端异常过滤器设置得好，不会出现 status 不是 200 的情况
      // 但为了健壮性，仍然保留这部分处理
      notification.error({
        message: '错误',
        description: `HTTP 错误: ${status} - ${msg || '未知错误'}`
      })
      return Promise.reject(new Error(msg || 'HTTP Error'))
    }
  },
  error => {
    // 统一处理所有错误：网络错误、业务错误等
    if (error.response) {
      // HTTP 响应错误（包括业务错误）
      const deployPath = (import.meta.env.VITE_DEPLOY_PATH || '/').replace(/\/$/, '')
      const homePath = `${deployPath}/home`
      const { status, data } = error.response

      // 检查是否是业务错误（HTTP 200 但业务 code 不是 SUCCESS）
      if (status === 200 && data && data.code) {
        // 业务错误处理
        const { code, msg } = data
        switch (code) {
          case ErrorCode.TOKEN_EXPIRED:
          case ErrorCode.UNAUTHORIZED:
            // 认证过期或未认证，使用防抖机制显示提示并清空本地 token 跳转到登录页
            showAuthNotification('认证提示', msg)
            localStorage.removeItem('auth-storage')
            if (window.location.pathname !== homePath) {
              window.location.href = homePath
            }
            break
          default:
            // 其他业务错误
            notification.error({
              message: '错误',
              description: msg
            })
            break
        }
      } else {
        // HTTP 非 200 错误
        let errorMessage = data?.msg || data?.message || '未知错误'
        if (status === 401) {
          errorMessage = '您的认证已过期或无效，请重新登录！'
          // 清空authStore和本地token
          localStorage.removeItem('auth-storage')
          if (window.location.pathname !== homePath) {
            window.location.href = homePath
          }
        }
        notification.error({ message: '错误', description: errorMessage })
      }
    } else if (error.request) {
      // 网络错误
      notification.error({
        message: '错误',
        description: '服务器无响应，请检查网络或稍后再试！'
      })
    } else {
      // 其他错误
      notification.error({
        message: '错误',
        description: '请求发送失败：' + error.message
      })
    }
    return Promise.reject(error)
  }
)

export default http
