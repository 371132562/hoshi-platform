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

  // 获取用户信息的核心逻辑
  const fetchUserInfo = async () => {
    // 如果没有 token，直接判定为认证失败
    if (!token) {
      setStatus(UserInfoStatus.AUTH_FAILED)
      return
    }

    setStatus(UserInfoStatus.LOADING)
    setError(null)

    try {
      // 设置超时处理（10秒）
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('请求超时')), 10000)
      })

      // 执行获取用户信息
      await Promise.race([fetchProfile(), timeoutPromise])

      // 检查执行后的 store 状态
      // fetchProfile 内部会处理 token 清除等逻辑
      const currentToken = useAuthStore.getState().token
      const currentUser = useAuthStore.getState().user

      if (currentToken && currentUser) {
        setStatus(UserInfoStatus.SUCCESS)
      } else {
        // 获取失败或被清除（可能是后端返回了 UNAUTHORIZED）
        setStatus(UserInfoStatus.AUTH_FAILED)
        setError(useAuthStore.getState().error || '登录状态已过期，请重新登录')
      }
    } catch (_err: unknown) {
      // 网络错误或超时
      setStatus(UserInfoStatus.NETWORK_ERROR)
      setError('网络连接失败，请检查网络连接或稍后重试')
    }
  }

  // 当 token 变化或组件挂载时获取用户信息
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
