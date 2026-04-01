import { useEffect, useState } from 'react'

import { useAuthStore } from '../stores/authStore'

// 用户信息加载状态枚举
export enum UserInfoStatus {
  /** 初始状态 */
  IDLE = 'idle',
  /** 加载中 */
  LOADING = 'loading',
  /** 加载成功 */
  SUCCESS = 'success',
  /** 网络错误 */
  NETWORK_ERROR = 'network_error',
  /** 认证失败（未登录或登录过期） */
  AUTH_FAILED = 'auth_failed'
}

interface UseUserInfoResult {
  /** 当前状态 */
  status: UserInfoStatus
  /** 错误信息 */
  error: string | null
}

/**
 * 用户信息获取 Hook
 * 提供加载状态管理和错误处理
 */
export const useUserInfo = (): UseUserInfoResult => {
  const [status, setStatus] = useState<UserInfoStatus>(UserInfoStatus.IDLE)
  const [error, setError] = useState<string | null>(null)

  const token = useAuthStore(s => s.token)
  const fetchProfile = useAuthStore(s => s.fetchProfile)
  const storeError = useAuthStore(s => s.error)

  /** 拉取并校验当前登录用户信息，统一管理加载状态与失败类型。 */
  const fetchUserInfo = async () => {
    // 没有 token 时无需请求后端，直接按认证失败处理。
    if (!token) {
      setStatus(UserInfoStatus.AUTH_FAILED)
      return
    }

    setStatus(UserInfoStatus.LOADING)
    setError(null)

    try {
      // 通过 race 加一个 10 秒超时，避免网络异常时页面长时间悬停在 loading。
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('请求超时')), 10000)
      })

      await Promise.race([fetchProfile(), timeoutPromise])

      // fetchProfile 内部已经处理了 token 失效与本地清理，这里只读取最终状态。
      // 下游：AdminLayout 根据这里产出的 status 决定是渲染菜单+业务页，还是跳登录/无权限页。
      const currentToken = useAuthStore.getState().token
      const currentUser = useAuthStore.getState().user

      if (currentToken && currentUser) {
        setStatus(UserInfoStatus.SUCCESS)
      } else {
        setStatus(UserInfoStatus.AUTH_FAILED)
        setError(useAuthStore.getState().error || '登录状态已过期，请重新登录')
      }
    } catch (_err: unknown) {
      setStatus(UserInfoStatus.NETWORK_ERROR)
      setError('网络连接失败，请检查网络连接或稍后重试')
    }
  }

  // token 变化或组件首次挂载时，都要尝试同步用户信息。
  useEffect(() => {
    const init = async () => {
      await fetchUserInfo()
    }
    init()
  }, [token])

  return {
    status,
    error: error || storeError
  }
}
