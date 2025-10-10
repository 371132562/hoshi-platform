// 基于fetch封装的请求模块
import { message } from 'antd' // 导入 Ant Design 的 message 组件
import { ErrorCode, type ResponseBody } from 'template-backend/types/response'

// 导入authStore用于状态同步
import { useAuthStore } from '../stores/authStore'

// 防抖变量，用于避免短期内重复弹出认证提示
let authNotificationShown = false
let authNotificationTimer: ReturnType<typeof setTimeout> | null = null

// 处理认证失败的统一函数
const handleAuthFailure = (message: string) => {
  // 显示认证提示（带防抖机制，避免重复提示）
  showAuthNotification('认证提示', message)

  // 清空authStore状态（logout方法内部会清空localStorage）
  const logout = useAuthStore.getState().logout
  logout()

  // 跳转到首页
  const deployPath = (import.meta.env.VITE_DEPLOY_PATH || '/').replace(/\/$/, '')
  const homePath = `${deployPath}/home`
  if (window.location.pathname !== homePath) {
    window.location.href = homePath
  }
}

// 显示认证提示的函数，带防抖机制
const showAuthNotification = (title: string, description: string) => {
  if (authNotificationShown) {
    return // 如果已经显示过认证提示，则不再显示
  }

  // 设置防抖状态
  authNotificationShown = true

  // 显示通知
  message.open({
    type: 'warning',
    content: `${title}：${description}`,
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

// 获取基础URL
const getBaseURL = () => {
  return (
    (import.meta.env.VITE_DEPLOY_PATH === '/' ? '' : import.meta.env.VITE_DEPLOY_PATH) +
    import.meta.env.VITE_API_BASE_URL
  )
}

// 获取token
const getToken = (): string | null => {
  try {
    // 兼容Zustand persist的auth-storage结构
    const authPersist = JSON.parse(localStorage.getItem('auth-storage') || '{}')
    return authPersist.state?.token || null
  } catch {
    // 忽略JSON解析错误，token保持为null
    return null
  }
}

// 处理响应数据
const handleResponse = async <T>(response: Response): Promise<ResponseBody<T>> => {
  // 检查响应数据是否为Blob类型（文件下载）
  const contentType = response.headers.get('content-type')
  if (contentType && contentType.includes('application/octet-stream')) {
    // 如果是文件流，则直接返回整个响应体，由调用方处理
    return response as unknown as ResponseBody<T>
  }

  // 解析JSON响应
  const data: ResponseBody<T> = await response.json()
  const { code, msg } = data

  // 统一处理后端返回的成功状态（HTTP Status 200）
  if (response.status === 200) {
    if (code === ErrorCode.SUCCESS) {
      // 业务成功，直接返回后端 data 字段的数据
      return data
    } else {
      switch (code) {
        case ErrorCode.TOKEN_EXPIRED:
        case ErrorCode.UNAUTHORIZED:
          // 认证过期或未认证，使用统一处理函数
          handleAuthFailure(msg)
          break
        default:
          // 其他业务错误
          message.open({ type: 'error', content: `错误：${msg}` })
          break
      }
      return Promise.reject(data)
    }
  } else {
    // HTTP 非 200 错误
    message.open({ type: 'error', content: `错误：HTTP ${response.status} - ${msg || '未知错误'}` })
    return Promise.reject(new Error(msg || 'HTTP Error'))
  }
}

// 处理错误
const handleError = (error: Error | unknown) => {
  if (error instanceof Error && error.name === 'AbortError') {
    // 请求超时
    message.open({ type: 'error', content: '错误：请求超时，请稍后再试！' })
  } else if (error instanceof Error && error.message) {
    // 其他错误
    message.open({ type: 'error', content: '错误：请求发送失败：' + error.message })
  } else {
    // 网络错误
    message.open({ type: 'error', content: '错误：服务器无响应，请检查网络或稍后再试！' })
  }
  return Promise.reject(error)
}

// 创建fetch请求函数
const createRequest = async <T>(
  url: string,
  options: RequestInit = {}
): Promise<ResponseBody<T>> => {
  const baseURL = getBaseURL()
  const token = getToken()

  // 构建完整URL
  const fullUrl = url.startsWith('http') ? url : `${baseURL}${url}`

  // 构建请求头
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>)
  }

  // 添加认证token
  if (token) {
    headers.Authorization = `Bearer ${token}`
  }

  // 创建AbortController用于超时控制
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 10000) // 10秒超时

  try {
    const response = await fetch(fullUrl, {
      ...options,
      headers,
      signal: controller.signal
    })

    clearTimeout(timeoutId)

    // 处理HTTP错误状态
    if (!response.ok) {
      if (response.status === 401) {
        const errorMessage = '您的认证已过期或无效，请重新登录！'
        handleAuthFailure(errorMessage)
        return Promise.reject(new Error(errorMessage))
      }

      let errorMessage = '未知错误'
      try {
        const errorData = await response.json()
        errorMessage = errorData?.msg || errorData?.message || errorMessage
      } catch {
        // 如果无法解析错误响应，使用默认错误信息
      }

      message.open({ type: 'error', content: `错误：HTTP ${response.status} - ${errorMessage}` })
      return Promise.reject(new Error(errorMessage))
    }

    return await handleResponse<T>(response)
  } catch (error) {
    clearTimeout(timeoutId)
    // 若是业务错误（handleResponse 已提示过），避免二次通知
    if (error && typeof error === 'object' && 'code' in (error as Record<string, unknown>)) {
      return Promise.reject(error)
    }
    return handleError(error)
  }
}

// 创建http对象，模拟axios的API
const http = {
  // POST请求
  post: async <T>(url: string, data?: unknown): Promise<ResponseBody<T>> => {
    return createRequest<T>(url, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined
    })
  },

  // GET请求
  get: async <T>(
    url: string,
    params?: Record<string, string | number>
  ): Promise<ResponseBody<T>> => {
    let fullUrl = url
    if (params) {
      const searchParams = new URLSearchParams()
      Object.entries(params).forEach(([key, value]) => {
        searchParams.append(key, String(value))
      })
      fullUrl += `?${searchParams.toString()}`
    }
    return createRequest<T>(fullUrl, {
      method: 'GET'
    })
  },

  // PUT请求
  put: async <T>(url: string, data?: unknown): Promise<ResponseBody<T>> => {
    return createRequest<T>(url, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined
    })
  },

  // DELETE请求
  delete: async <T>(url: string, data?: unknown): Promise<ResponseBody<T>> => {
    return createRequest<T>(url, {
      method: 'DELETE',
      body: data ? JSON.stringify(data) : undefined
    })
  }
}

export default http
