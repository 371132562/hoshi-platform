// 基于 fetch 封装的统一请求模块
import { notification } from 'antd' // 导入 Ant Design 的 notification 组件
import { ErrorCode, type ResponseBody } from 'template-backend/src/types/response'

// authStore 用于在认证失败时同步登出态
import { useAuthStore } from '../stores/authStore'

// 防抖变量：避免短时间内重复弹出“认证失效”提示
let authNotificationShown = false
let authNotificationTimer: ReturnType<typeof setTimeout> | null = null

/** 统一处理认证失效：提示、清空状态并跳回首页。 */
const handleAuthFailure = (message: string) => {
  // 1. 先显示带防抖的认证提示。
  showAuthNotification('认证提示', message)

  // 2. 清空 authStore 中的登录态；logout 内部会顺带清 localStorage。
  const logout = useAuthStore.getState().logout
  logout()

  // 3. 最后统一跳回首页，避免停留在需要认证的页面上。
  const deployPath = (import.meta.env.VITE_DEPLOY_PATH || '/').replace(/\/$/, '')
  const homePath = `${deployPath}/home`
  if (window.location.pathname !== homePath) {
    window.location.href = homePath
  }
}

/** 以防抖方式显示认证提示，避免同类错误在短时间内刷屏。 */
const showAuthNotification = (title: string, description: string) => {
  if (authNotificationShown) {
    return // 如果已经显示过认证提示，则不再显示
  }

  // 设置防抖状态，后续同类提示直接忽略。
  authNotificationShown = true

  // 显示通知，并在关闭后延迟重置防抖状态。
  notification.warning({
    message: title,
    description: description,
    onClose: () => {
      if (authNotificationTimer) {
        clearTimeout(authNotificationTimer)
      }
      authNotificationTimer = setTimeout(() => {
        authNotificationShown = false
        authNotificationTimer = null
      }, 3000) // 3秒内不重复显示认证提示
    }
  })

  // 兜底自动重置，覆盖用户不主动关闭通知的场景。
  if (authNotificationTimer) {
    clearTimeout(authNotificationTimer)
  }
  authNotificationTimer = setTimeout(() => {
    authNotificationShown = false
    authNotificationTimer = null
  }, 5000) // 5秒后自动重置防抖状态
}

/** 组合部署路径与 API 根路径，得到最终请求基地址。 */
const getBaseURL = () => {
  return (
    (import.meta.env.VITE_DEPLOY_PATH === '/' ? '' : import.meta.env.VITE_DEPLOY_PATH) +
    import.meta.env.VITE_API_BASE_URL
  )
}

/** 从 Zustand persist 结构中安全读取当前 token。 */
const getToken = (): string | null => {
  try {
    // 兼容 Zustand persist 默认的 auth-storage 结构。
    const authPersist = JSON.parse(localStorage.getItem('auth-storage') || '{}')
    return authPersist.state?.token || null
  } catch {
    // JSON 异常说明本地缓存已损坏，此时直接按未登录处理。
    return null
  }
}

/** 统一处理后端标准响应体，并分流文件下载、业务错误和认证错误。 */
const handleResponse = async <T>(response: Response): Promise<ResponseBody<T>> => {
  // 1. 文件下载接口直接把原始 Response 交给调用方处理。
  const contentType = response.headers.get('content-type')
  if (contentType && contentType.includes('application/octet-stream')) {
    return response as unknown as ResponseBody<T>
  }

  // 2. 普通接口按统一响应协议解析 JSON。
  const data: ResponseBody<T> = await response.json()
  const { code, msg } = data

  // 3. HTTP 200 仍要继续判断业务码；只有 SUCCESS 才算真正成功。
  if (response.status === 200) {
    if (code === ErrorCode.SUCCESS) {
      return data
    } else {
      switch (code) {
        case ErrorCode.TOKEN_EXPIRED:
        case ErrorCode.UNAUTHORIZED:
          handleAuthFailure(msg)
          break
        default:
          notification.error({ message: '请求错误', description: msg })
          break
      }
      return Promise.reject(data)
    }
  } else {
    // 4. HTTP 非 200 错误统一补齐通知提示。
    notification.error({
      message: '请求错误',
      description: `HTTP ${response.status} - ${msg || '未知错误'}`
    })
    return Promise.reject(new Error(msg || 'HTTP Error'))
  }
}

/** 统一处理 fetch 层异常，包括超时、网络错误和普通异常。 */
const handleError = (error: Error | unknown) => {
  if (error instanceof Error && error.name === 'AbortError') {
    notification.error({ message: '请求超时', description: '请稍后再试' })
  } else if (error instanceof Error && error.message) {
    notification.error({ message: '请求失败', description: error.message })
  } else {
    notification.error({ message: '网络错误', description: '服务器无响应，请检查网络或稍后再试' })
  }
  return Promise.reject(error)
}

// 请求缓存：用于短时间内合并完全相同的请求。
const requestCache = new Map<string, Promise<ResponseBody<unknown>>>()

/** 为同一方法、同一 URL、同一参数生成请求去重 key。 */
const generateRequestKey = (method: string, url: string, bodyOrParams: unknown): string => {
  try {
    const safeBody = bodyOrParams ? JSON.stringify(bodyOrParams) : ''
    return `${method}:${url}:${safeBody}`
  } catch {
    // 循环引用等不可序列化数据直接退化为时间戳，避免错误缓存命中。
    return `${method}:${url}:${Date.now()}`
  }
}

/**
 * 统一创建请求：组装 headers、处理超时、做请求去重并接管标准响应解析。
 */
const createRequest = async <T>(
  url: string,
  options: RequestInit = {},
  customTimeout?: number
): Promise<ResponseBody<T>> => {
  const baseURL = getBaseURL()
  const token = getToken()

  // 1. 先拼完整 URL，再读取最新 token 进入请求头。
  const fullUrl = url.startsWith('http') ? url : `${baseURL}${url}`

  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string>)
  }

  // 2. FormData 交给浏览器自动设置 boundary，其他情况统一按 JSON 发送。
  if (!(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json'
  }

  if (token) {
    headers.Authorization = `Bearer ${token}`
  }

  // 3. 生成请求去重 key，相同请求在短时间内共用一个 Promise。
  const method = (options.method || 'GET').toUpperCase()
  const requestKey = generateRequestKey(method, fullUrl, options.body)

  const cachedPromise = requestCache.get(requestKey)
  if (cachedPromise) {
    return cachedPromise as Promise<ResponseBody<T>>
  }

  // 4. 使用 AbortController 为每个请求统一附加超时控制。
  const controller = new AbortController()
  const timeout = customTimeout || 10000
  const timeoutId = setTimeout(() => controller.abort(), timeout)

  const requestPromise = (async () => {
    try {
      const response = await fetch(fullUrl, {
        ...options,
        headers,
        signal: controller.signal
      })

      clearTimeout(timeoutId)

      // 5. 先处理 HTTP 层错误，再交给统一响应解析函数处理业务码。
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
        } catch (parseError) {
          void parseError
        }

        notification.error({
          message: '请求错误',
          description: `HTTP ${response.status} - ${errorMessage}`
        })
        return Promise.reject(new Error(errorMessage))
      }

      return await handleResponse<T>(response)
    } catch (error) {
      clearTimeout(timeoutId)
      // handleResponse 已提示过的业务错误，不在这里重复提示。
      if (error && typeof error === 'object' && 'code' in (error as Record<string, unknown>)) {
        return Promise.reject(error)
      }
      return handleError(error)
    }
  })()

  requestCache.set(requestKey, requestPromise)

  // 6. 2 秒后自动清理缓存，避免长时间持有旧 Promise。
  setTimeout(() => {
    requestCache.delete(requestKey)
  }, 2000)

  return requestPromise
}

// 暴露 axios 风格的最小 http API，供业务层统一调用。
const http = {
  post: async <T>(url: string, data?: unknown): Promise<ResponseBody<T>> => {
    return createRequest<T>(url, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined
    })
  },

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

  put: async <T>(url: string, data?: unknown): Promise<ResponseBody<T>> => {
    return createRequest<T>(url, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined
    })
  },

  delete: async <T>(url: string, data?: unknown): Promise<ResponseBody<T>> => {
    return createRequest<T>(url, {
      method: 'DELETE',
      body: data ? JSON.stringify(data) : undefined
    })
  }
}

export default http
